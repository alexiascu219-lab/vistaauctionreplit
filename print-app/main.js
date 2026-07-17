const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { printJob, DEFAULT_ZPL } = require('./print/engine');

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const PS_PATH = path.join(__dirname, 'assets', 'send-raw.ps1');

const DEFAULT_CONFIG = {
  serverUrl: '',
  agentKey: '',
  supabaseUrl: '',
  supabaseAnonKey: '',
  agentName: os.hostname(),
  mode: 'network', // network | windows | zebradesigner
  host: '',
  port: 9100,
  printerName: '',
  designsFolder: '',
  watchFolder: '',
  labelFile: '',
  pollSeconds: 4,
  running: false,
  autoStart: false,
};

let config = { ...DEFAULT_CONFIG };
let win = null;
let tray = null;
let pollTimer = null;
let engineOn = false;

// ---- Config persistence ----------------------------------------------------
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) config = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch (e) {
    log(`Could not read config: ${e.message}`);
  }
}
function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (e) {
    log(`Could not save config: ${e.message}`);
  }
}

function engineConfig() {
  return {
    mode: config.mode,
    host: config.host,
    port: parseInt(config.port, 10) || 9100,
    printerName: config.printerName,
    watchFolder: config.watchFolder,
    labelFile: config.labelFile,
    zplTemplate: config.zplTemplate || DEFAULT_ZPL,
    psPath: PS_PATH,
  };
}

// ---- Renderer messaging ----------------------------------------------------
function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}
function log(message) {
  const line = `${new Date().toLocaleTimeString()}  ${message}`;
  send('engine:log', line);
  console.log(line);
}
function pushStatus() {
  send('engine:status', { running: engineOn, mode: config.mode });
  if (tray) tray.setToolTip(`Vista Print Station — printing ${engineOn ? 'ON' : 'off'}`);
}

// ---- Print queue transport -------------------------------------------------
async function claimJobs() {
  const url = `${config.serverUrl.replace(/\/$/, '')}/api/print?agent=${encodeURIComponent(config.agentName)}`;
  const r = await fetch(url, { headers: { 'x-api-key': config.agentKey } });
  if (!r.ok) throw new Error(`poll ${r.status}: ${(await r.text()).slice(0, 160)}`);
  return (await r.json()).jobs || [];
}
async function reportComplete(id, status, error) {
  try {
    await fetch(`${config.serverUrl.replace(/\/$/, '')}/api/print-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': config.agentKey },
      body: JSON.stringify({ id, status, error: error || null, agent: config.agentName }),
    });
  } catch (e) {
    log(`Could not report job ${id}: ${e.message}`);
  }
}

async function tick() {
  if (!config.serverUrl || !config.agentKey) return;
  let jobs = [];
  try {
    jobs = await claimJobs();
  } catch (e) {
    log(`Poll error: ${e.message}`);
    return;
  }
  for (const job of jobs) {
    const label = `${job.title || job.template} x${job.quantity || 1}`;
    try {
      await printJob(engineConfig(), job);
      await reportComplete(job.id, 'printed');
      log(`✓ printed  ${label}`);
    } catch (e) {
      await reportComplete(job.id, 'error', e.message);
      log(`✗ failed   ${label} — ${e.message}`);
    }
  }
  if (jobs.length) refreshQueue();
}

function startEngine() {
  if (engineOn) return;
  if (!config.serverUrl || !config.agentKey) {
    log('Set the server URL and agent key in Settings first.');
    return;
  }
  engineOn = true;
  config.running = true;
  saveConfig();
  const loop = async () => {
    await tick();
    pollTimer = setTimeout(loop, Math.max(1, config.pollSeconds) * 1000);
  };
  loop();
  log(`Printing started — mode: ${config.mode}`);
  pushStatus();
}
function stopEngine() {
  engineOn = false;
  config.running = false;
  saveConfig();
  if (pollTimer) clearTimeout(pollTimer);
  pollTimer = null;
  log('Printing stopped.');
  pushStatus();
}

// ---- Queue display (reads Supabase directly for history) -------------------
async function refreshQueue() {
  if (!config.supabaseUrl || !config.supabaseAnonKey) return;
  try {
    const url = `${config.supabaseUrl.replace(/\/$/, '')}/rest/v1/vista_print_jobs?select=*&order=created_at.desc&limit=60`;
    const r = await fetch(url, { headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}` } });
    if (!r.ok) return;
    send('queue:update', await r.json());
  } catch {
    /* ignore */
  }
}

// ---- IPC -------------------------------------------------------------------
ipcMain.handle('config:get', () => config);
ipcMain.handle('config:set', (_e, patch) => {
  config = { ...config, ...patch };
  saveConfig();
  pushStatus();
  return config;
});
ipcMain.handle('engine:toggle', (_e, on) => {
  if (on) startEngine();
  else stopEngine();
  return engineOn;
});
ipcMain.handle('print:test', async (_e, cart) => {
  const job = { id: 'test', title: `Cart ${cart}`, template: 'cart_label', quantity: 1, data: { cart_number: String(cart || '00'), zone: 'Test', spot: 'Test print' } };
  try {
    await printJob(engineConfig(), job);
    log(`✓ test print sent (cart ${cart || '00'})`);
    return { ok: true };
  } catch (e) {
    log(`✗ test print failed — ${e.message}`);
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('designs:list', () => {
  const dir = config.designsFolder;
  if (!dir || !fs.existsSync(dir)) return [];
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => /\.(nlbl|lbl|zpl|prn|label)$/i.test(f))
      .map((f) => ({ name: f, path: path.join(dir, f) }));
  } catch {
    return [];
  }
});
ipcMain.handle('dialog:pickFolder', async () => {
  const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('shell:open', (_e, p) => (p ? shell.openPath(p) : null));
ipcMain.handle('queue:fetch', async () => {
  await refreshQueue();
  return true;
});

// ---- Window + tray ---------------------------------------------------------
function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 700,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: '#faf9f7',
    title: 'Vista Print Station',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

function createTray() {
  try {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
    tray = new Tray(icon);
    const menu = Menu.buildFromTemplate([
      { label: 'Open Print Station', click: () => (win ? win.show() : createWindow()) },
      { type: 'separator' },
      { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
    ]);
    tray.setToolTip('Vista Print Station');
    tray.setContextMenu(menu);
    tray.on('click', () => (win ? (win.isVisible() ? win.hide() : win.show()) : createWindow()));
  } catch (e) {
    console.log('Tray unavailable:', e.message);
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => win && (win.show(), win.focus()));
  app.whenReady().then(() => {
    loadConfig();
    createWindow();
    createTray();
    pushStatus();
    if (config.autoStart) startEngine();
    app.on('activate', () => BrowserWindow.getAllWindows().length === 0 && createWindow());
  });
  app.on('window-all-closed', () => {
    /* keep running in the tray */
  });
  app.on('before-quit', () => (app.isQuitting = true));
}
