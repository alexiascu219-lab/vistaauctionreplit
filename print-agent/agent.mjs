#!/usr/bin/env node
/**
 * Vista Auction — Zebra Print Agent
 * ---------------------------------
 * Runs on the Windows PC that's connected to the Zebra printer. It polls the
 * cloud print queue (/api/print), prints each sticker on the Zebra, and reports
 * the result back (/api/print-complete). Zero npm dependencies — just Node 18+.
 *
 *   node agent.mjs           # run forever, polling for jobs
 *   node agent.mjs --once    # poll a single time, then exit
 *   node agent.mjs --test 12 # print one test sticker for cart "12"
 *   node agent.mjs --dry-run # render jobs but print to the console instead
 *
 * Configure it with print-agent/config.json (copy config.example.json) or with
 * environment variables. See README.md.
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import net from 'node:net';
import os from 'node:os';
import { execFile } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const hasFlag = (f) => argv.includes(f);

if (typeof fetch !== 'function') {
  console.error('This agent needs Node 18 or newer (for built-in fetch). Run `node -v` to check.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Config: config.json  <  environment variables
// ---------------------------------------------------------------------------
function loadConfig() {
  const path = join(__dirname, 'config.json');
  let file = {};
  if (existsSync(path)) {
    try {
      file = JSON.parse(readFileSync(path, 'utf8'));
    } catch (e) {
      console.error(`Could not parse config.json: ${e.message}`);
      process.exit(1);
    }
  }
  const env = process.env;
  return {
    apiBase: (env.PRINT_API_BASE || file.apiBase || '').replace(/\/$/, ''),
    agentKey: env.PRINT_AGENT_KEY || file.agentKey || '',
    agentName: env.PRINT_AGENT_NAME || file.agentName || os.hostname(),
    printMode: env.PRINT_MODE || file.printMode || 'network', // network | windows | folder
    printerHost: env.PRINTER_HOST || file.printerHost || '',
    printerPort: parseInt(env.PRINTER_PORT || file.printerPort || '9100', 10),
    printerName: env.PRINTER_NAME || file.printerName || '',
    watchFolder: env.WATCH_FOLDER || file.watchFolder || '',
    pollSeconds: Math.max(1, parseFloat(env.POLL_SECONDS || file.pollSeconds || '4')),
    templatesDir: file.templatesDir ? resolve(__dirname, file.templatesDir) : join(__dirname, 'templates'),
    dryRun: hasFlag('--dry-run'),
  };
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
function templatePath(cfg, template) {
  const file = `${String(template || 'cart_label').replace(/_/g, '-')}.zpl`;
  return join(cfg.templatesDir, file);
}

function buildVars(job) {
  const d = job.data || {};
  const cart = d.cart_number ?? '';
  const zone = d.zone ? String(d.zone) : '';
  const spot = d.spot ? String(d.spot) : '';
  const subtitle = [zone, spot].filter(Boolean).join('  •  ') || 'Vista Auction cart';
  return {
    cart_number: String(cart),
    // Code128 is happiest with plain alphanumerics.
    barcode: String(cart).replace(/[^A-Za-z0-9-]/g, '') || String(cart) || '0',
    zone,
    spot,
    subtitle,
    header: d.header || 'Cart tracking',
    date: new Date().toISOString().slice(0, 10),
    ...d,
  };
}

function render(template, vars) {
  return template.replace(/\$\{(\w+)\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

// ---------------------------------------------------------------------------
// Printing backends
// ---------------------------------------------------------------------------
function printNetwork(zpl, cfg) {
  return new Promise((resolvePromise, reject) => {
    if (!cfg.printerHost) return reject(new Error('printerHost is not set (network mode)'));
    const socket = net.connect(cfg.printerPort, cfg.printerHost, () => {
      socket.write(zpl, 'latin1', () => socket.end());
    });
    socket.setTimeout(12000);
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error(`Timed out talking to printer at ${cfg.printerHost}:${cfg.printerPort}`));
    });
    socket.on('error', reject);
    socket.on('close', () => resolvePromise());
  });
}

function printWindows(zpl, cfg) {
  return new Promise((resolvePromise, reject) => {
    if (!cfg.printerName) return reject(new Error('printerName is not set (windows mode)'));
    const tmp = join(os.tmpdir(), `vista-zpl-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`);
    writeFileSync(tmp, zpl, 'latin1');
    const ps = join(__dirname, 'send-raw.ps1');
    execFile(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', ps, '-PrinterName', cfg.printerName, '-Path', tmp],
      (err, _stdout, stderr) => {
        try {
          unlinkSync(tmp);
        } catch {
          /* ignore */
        }
        if (err) return reject(new Error((stderr || err.message || 'PowerShell print failed').trim()));
        resolvePromise();
      },
    );
  });
}

// Hand the job to ZebraDesigner Automation by dropping a data file in a watched
// folder. ZebraDesigner opens YOUR designed label and fills in the columns.
function printFolder(job, vars, qty, cfg) {
  if (!cfg.watchFolder) throw new Error('watchFolder is not set (folder mode)');
  mkdirSync(cfg.watchFolder, { recursive: true });
  const cols = ['cart_number', 'zone', 'spot', 'quantity'];
  const row = { ...vars, quantity: qty };
  const csv = `${cols.join(',')}\n${cols.map((c) => csvCell(row[c])).join(',')}\n`;
  const base = join(cfg.watchFolder, `job-${job.id}`);
  writeFileSync(`${base}.csv`, csv, 'utf8');
  writeFileSync(`${base}.json`, JSON.stringify({ id: job.id, template: job.template, quantity: qty, data: vars }, null, 2));
}

function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function printJob(cfg, job) {
  const vars = buildVars(job);
  const qty = Math.max(1, Math.min(50, job.quantity || 1));

  if (cfg.printMode === 'folder') {
    printFolder(job, vars, qty, cfg);
    return;
  }

  // A job from Label Studio carries finished ZPL; otherwise render the template.
  const one =
    job.data && typeof job.data.zpl === 'string' && job.data.zpl.trim()
      ? job.data.zpl
      : render(readFileSync(templatePath(cfg, job.template), 'utf8'), vars);
  const batch = Array.from({ length: qty }, () => one).join('\n');

  if (cfg.dryRun) {
    console.log(`\n----- ZPL for "${job.title}" ×${qty} -----\n${batch}\n----------------------------------------\n`);
    return;
  }
  if (cfg.printMode === 'windows') return printWindows(batch, cfg);
  return printNetwork(batch, cfg);
}

// ---------------------------------------------------------------------------
// Queue transport
// ---------------------------------------------------------------------------
async function claimJobs(cfg) {
  const url = `${cfg.apiBase}/api/print?agent=${encodeURIComponent(cfg.agentName)}`;
  const r = await fetch(url, { headers: { 'x-api-key': cfg.agentKey } });
  if (!r.ok) throw new Error(`poll failed (${r.status}): ${(await r.text()).slice(0, 200)}`);
  const body = await r.json();
  return body.jobs || [];
}

async function reportComplete(cfg, id, status, error) {
  try {
    await fetch(`${cfg.apiBase}/api/print-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': cfg.agentKey },
      body: JSON.stringify({ id, status, error: error || null, agent: cfg.agentName }),
    });
  } catch (e) {
    console.error(`  ! could not report job ${id}: ${e.message}`);
  }
}

async function tick(cfg) {
  const jobs = await claimJobs(cfg);
  for (const job of jobs) {
    const label = `${job.title || job.template} ×${job.quantity || 1}`;
    try {
      await printJob(cfg, job);
      await reportComplete(cfg, job.id, 'printed');
      console.log(`  ✓ printed  ${label}`);
    } catch (e) {
      await reportComplete(cfg, job.id, 'error', e.message);
      console.error(`  ✗ failed   ${label} — ${e.message}`);
    }
  }
  return jobs.length;
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------
function validate(cfg) {
  const problems = [];
  if (!cfg.apiBase && !hasFlag('--test')) problems.push('apiBase (your deployed site URL, e.g. https://vista.vercel.app)');
  if (!cfg.agentKey && !hasFlag('--test') && !cfg.dryRun) problems.push('agentKey (must match PRINT_AGENT_KEY on the server)');
  if (cfg.printMode === 'network' && !cfg.printerHost && !cfg.dryRun) problems.push('printerHost (the Zebra printer IP address)');
  if (cfg.printMode === 'windows' && !cfg.printerName && !cfg.dryRun) problems.push('printerName (the Windows printer name)');
  if (cfg.printMode === 'folder' && !cfg.watchFolder) problems.push('watchFolder (the ZebraDesigner Automation watch folder)');
  if (problems.length) {
    console.error('Missing configuration:\n' + problems.map((p) => `  - ${p}`).join('\n'));
    console.error('\nEdit config.json (copy config.example.json) or set the matching env vars. See README.md.');
    process.exit(1);
  }
}

async function main() {
  const cfg = loadConfig();

  // --test <cart>: print one sticker locally without touching the queue.
  const testIdx = argv.indexOf('--test');
  if (testIdx !== -1) {
    const cart = argv[testIdx + 1] || '00';
    console.log(`Test print: cart ${cart} via ${cfg.printMode}${cfg.dryRun ? ' (dry-run)' : ''}`);
    validate(cfg);
    await printJob(cfg, { id: 'test', title: `Cart ${cart}`, template: 'cart_label', quantity: 1, data: { cart_number: cart, zone: 'Inside', spot: 'Test print' } });
    console.log('Done.');
    return;
  }

  validate(cfg);
  console.log(`Vista Zebra Print Agent`);
  console.log(`  server   ${cfg.apiBase}`);
  console.log(`  agent    ${cfg.agentName}`);
  console.log(`  mode     ${cfg.printMode}${cfg.printMode === 'network' ? ` → ${cfg.printerHost}:${cfg.printerPort}` : ''}${cfg.printMode === 'windows' ? ` → ${cfg.printerName}` : ''}${cfg.printMode === 'folder' ? ` → ${cfg.watchFolder}` : ''}`);
  console.log(`  polling  every ${cfg.pollSeconds}s${cfg.dryRun ? ' (dry-run)' : ''}\n`);

  if (hasFlag('--once')) {
    const n = await tick(cfg).catch((e) => (console.error(e.message), 0));
    console.log(`Polled once — ${n} job(s).`);
    return;
  }

  let backoff = 0;
  for (;;) {
    try {
      await tick(cfg);
      backoff = 0;
    } catch (e) {
      backoff = Math.min(backoff + 1, 5);
      console.error(`poll error: ${e.message} (retrying)`);
    }
    await sleep((cfg.pollSeconds + backoff * cfg.pollSeconds) * 1000);
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
