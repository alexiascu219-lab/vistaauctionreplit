// Print engine for the Vista Print Station. Renders a job to ZPL and sends it
// to the Zebra, or hands the job to ZebraDesigner Automation for .nlbl labels.
const net = require('net');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

function renderTemplate(tpl, vars) {
  return tpl.replace(/\$\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

function buildVars(job) {
  const d = job.data || {};
  const cart = d.cart_number ?? '';
  const zone = d.zone ? String(d.zone) : '';
  const spot = d.spot ? String(d.spot) : '';
  const subtitle = [zone, spot].filter(Boolean).join('  •  ') || 'Vista Auction cart';
  return {
    cart_number: String(cart),
    barcode: String(cart).replace(/[^A-Za-z0-9-]/g, '') || String(cart) || '0',
    zone,
    spot,
    subtitle,
    header: d.header || 'Cart tracking',
    date: new Date().toISOString().slice(0, 10),
    ...d,
  };
}

function printNetwork(zpl, { host, port }) {
  return new Promise((resolve, reject) => {
    if (!host) return reject(new Error('Printer IP is not set (network mode)'));
    const socket = net.connect(port || 9100, host, () => socket.write(zpl, 'latin1', () => socket.end()));
    socket.setTimeout(12000);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Timed out talking to printer at ${host}:${port || 9100}`));
    });
    socket.on('error', reject);
    socket.on('close', () => resolve());
  });
}

function printWindows(zpl, { printerName, psPath }) {
  return new Promise((resolve, reject) => {
    if (!printerName) return reject(new Error('Windows printer name is not set (driver mode)'));
    const tmp = path.join(os.tmpdir(), `vista-zpl-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    fs.writeFileSync(tmp, zpl, 'latin1');
    execFile(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', psPath, '-PrinterName', printerName, '-Path', tmp],
      (err, _out, stderr) => {
        try { fs.unlinkSync(tmp); } catch { /* ignore */ }
        if (err) return reject(new Error((stderr || err.message || 'PowerShell print failed').trim()));
        resolve();
      },
    );
  });
}

// Hand the job to ZebraDesigner Automation: drop a data file (+ the chosen
// .nlbl name) into a watched folder. ZebraDesigner opens the real label and
// fills the fields. Requires ZebraDesigner Automation to be watching the folder.
function printZebraDesigner(job, vars, qty, { watchFolder, labelFile }) {
  if (!watchFolder) throw new Error('ZebraDesigner watch folder is not set');
  fs.mkdirSync(watchFolder, { recursive: true });
  const cols = ['cart_number', 'zone', 'spot', 'quantity', 'label'];
  const row = { ...vars, quantity: qty, label: labelFile || '' };
  const csv = `${cols.join(',')}\n${cols.map((c) => csvCell(row[c])).join(',')}\n`;
  const base = path.join(watchFolder, `job-${job.id}`);
  fs.writeFileSync(`${base}.csv`, csv, 'utf8');
  fs.writeFileSync(`${base}.json`, JSON.stringify({ id: job.id, label: labelFile || null, quantity: qty, data: vars }, null, 2));
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// config: { mode, host, port, printerName, watchFolder, labelFile, zplTemplate, psPath }
async function printJob(config, job) {
  const vars = buildVars(job);
  const qty = Math.max(1, Math.min(50, job.quantity || 1));

  if (config.mode === 'zebradesigner') {
    printZebraDesigner(job, vars, qty, config);
    return { rendered: null };
  }

  const tpl = config.zplTemplate || DEFAULT_ZPL;
  const one = renderTemplate(tpl, vars);
  const batch = Array.from({ length: qty }, () => one).join('\n');

  if (config.mode === 'windows') await printWindows(batch, config);
  else await printNetwork(batch, config);
  return { rendered: batch };
}

const DEFAULT_ZPL = `^XA
^CI28
^PW609
^LL406
^LH0,0
^FO28,26^A0N,36,36^FDVISTA AUCTION^FS
^FO30,72^A0N,22,22^FD\${header}^FS
^FO28,102^GB553,3,3^FS
^FO28,130^A0N,40,40^FDCART^FS
^FO24,172^A0N,164,164^FD\${cart_number}^FS
^FO28,352^A0N,28,28^FD\${subtitle}^FS
^FO368,150^BY3^BCN,120,N,N,N^FD\${barcode}^FS
^FO368,278^A0N,24,24^FD#\${barcode}^FS
^XZ`;

module.exports = { printJob, renderTemplate, buildVars, DEFAULT_ZPL };
