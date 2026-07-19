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

// Hand the job to ZebraDesigner (Automation or Professional): drop a CSV data
// file (+ a JSON trigger naming the .nlbl) into a watched folder. ZebraDesigner
// opens the real label, binds its variables to the CSV columns, and prints ONE
// label per row — so a whole number range prints from a single job.
//
// - Automation tier: point a File trigger at this folder → fully hands-off.
// - Professional: bind the .nlbl to <folder>/vista-data.csv and Print (all
//   records); every job also rewrites vista-data.csv so the range is current.
function printZebraDesigner(job, vars, qty, { watchFolder, labelFile }) {
  if (!watchFolder) throw new Error('ZebraDesigner watch folder is not set');
  fs.mkdirSync(watchFolder, { recursive: true });

  const bridge = job.data && job.data.bridge;
  // Rows: an explicit bridge range, else a single row from this job's vars.
  const rows = bridge && Array.isArray(bridge.rows) && bridge.rows.length
    ? bridge.rows.map((r) => ({ ...r }))
    : [{ ...vars }];
  const label = (bridge && bridge.label) || labelFile || '';

  // Column set = every key seen across the rows, plus quantity + label.
  const keys = [];
  for (const r of rows) for (const k of Object.keys(r)) if (!keys.includes(k)) keys.push(k);
  const cols = [...keys.filter((k) => k !== 'quantity' && k !== 'label'), 'quantity', 'label'];

  const line = (r) => cols.map((c) => csvCell(c === 'quantity' ? (r.quantity ?? qty) : c === 'label' ? label : r[c])).join(',');
  const csv = `${cols.join(',')}\n${rows.map(line).join('\n')}\n`;

  const base = path.join(watchFolder, `job-${job.id}`);
  fs.writeFileSync(`${base}.csv`, csv, 'utf8');
  // Stable filenames Professional binds to permanently (always the latest range):
  //  - vista-data.csv           : the most recent job, any label
  //  - vista-<label>.csv        : per-label, so multiple .nlbl bindings don't
  //                               clobber each other
  fs.writeFileSync(path.join(watchFolder, 'vista-data.csv'), csv, 'utf8');
  const slug = labelSlug(label);
  if (slug) fs.writeFileSync(path.join(watchFolder, `vista-${slug}.csv`), csv, 'utf8');
  fs.writeFileSync(`${base}.json`, JSON.stringify({ id: job.id, label: label || null, dataFile: slug ? `vista-${slug}.csv` : 'vista-data.csv', quantity: qty, count: rows.length, rows }, null, 2));
  return rows.length;
}

// A filesystem-safe stem from a label file name: "Cart Tag.nlbl" -> "cart-tag".
function labelSlug(label) {
  return String(label || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

// Probe a network Zebra with ~HS (host status) — a quick reachability + status
// check used by the Printers panel. Resolves { online, detail } and never
// rejects, so the UI can show a red/green dot.
function probeNetwork({ host, port }) {
  return new Promise((resolve) => {
    if (!host) return resolve({ online: false, detail: 'No IP set' });
    let buf = '';
    let done = false;
    const finish = (online, detail) => { if (!done) { done = true; try { socket.destroy(); } catch { /* noop */ } resolve({ online, detail }); } };
    const socket = net.connect(port || 9100, host, () => socket.write('~HS', 'latin1'));
    socket.setTimeout(3500);
    socket.on('data', (d) => { buf += d.toString('latin1'); if (buf.length > 20) finish(true, statusFromHS(buf)); });
    socket.on('timeout', () => finish(!!buf, buf ? statusFromHS(buf) : `No response from ${host}:${port || 9100}`));
    socket.on('error', (e) => finish(false, e.code === 'ECONNREFUSED' ? 'Connection refused' : e.message));
    socket.on('close', () => finish(!!buf, buf ? statusFromHS(buf) : 'Reachable'));
  });
}

// Decode the first line of a ~HS response (comma-separated status flags).
function statusFromHS(raw) {
  const clean = raw.replace(/[\r]/g, '');
  const first = (clean.split('\n').find((l) => l.includes(',')) || '').split(',');
  if (first.length < 2) return 'Online';
  const paused = first[1] === '1';
  const paperOut = first[8] === '1' || first[2] === '1';
  if (paperOut) return 'Media out';
  if (paused) return 'Paused';
  return 'Ready';
}

// List installed Windows printers (name + whether it looks like a Zebra) via
// PowerShell Get-Printer. Resolves [] on any failure or non-Windows host.
function listWindowsPrinters() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve([]);
    execFile('powershell', ['-NoProfile', '-Command', 'Get-Printer | Select-Object Name,DriverName,PortName | ConvertTo-Json -Compress'], { timeout: 8000 }, (err, out) => {
      if (err || !out) return resolve([]);
      try {
        let parsed = JSON.parse(out);
        if (!Array.isArray(parsed)) parsed = [parsed];
        resolve(parsed.map((p) => ({ name: p.Name, driver: p.DriverName || '', port: p.PortName || '', zebra: /zebra|zdesigner|zpl/i.test(`${p.Name} ${p.DriverName}`) })));
      } catch {
        resolve([]);
      }
    });
  });
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// config: { mode, host, port, printerName, watchFolder, labelFile, zplTemplate, psPath }
async function printJob(config, job) {
  const vars = buildVars(job);
  const qty = Math.max(1, Math.min(50, job.quantity || 1));

  // A bridge job (or the whole station in ZebraDesigner mode) prints through
  // ZebraDesigner rather than our ZPL engine, whatever the station's mode.
  if (config.mode === 'zebradesigner' || (job.data && job.data.bridge)) {
    const count = printZebraDesigner(job, vars, qty, config);
    return { rendered: null, bridged: count };
  }

  // A job from Label Studio carries finished ZPL; otherwise render the template.
  const one =
    job.data && typeof job.data.zpl === 'string' && job.data.zpl.trim()
      ? job.data.zpl
      : renderTemplate(config.zplTemplate || DEFAULT_ZPL, vars);
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

module.exports = { printJob, renderTemplate, buildVars, probeNetwork, listWindowsPrinters, DEFAULT_ZPL };
