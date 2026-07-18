const { app, BrowserWindow, Tray, Menu, ipcMain, dialog, shell, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { printJob, DEFAULT_ZPL } = require('./print/engine');

// ---- Hardcoded config (turnkey — no setup needed except your printer) ------
// The full Vista Auction site (carts, labels, design studio, print queue) loads
// right inside the app. Supabase is public/RLS-gated, so the print engine claims
// and completes jobs straight from the database — no API/agent key required.
const VISTA_URL = process.env.VISTA_URL || 'https://vistaauction.vercel.app';
const STATION_URL = `${VISTA_URL.replace(/\/$/, '')}/station`;
const SUPABASE_URL = 'https://lovfbqnuxdihjidxacet.supabase.co';
const SUPABASE_ANON = 'sb_publishable_xnr_6Ad9e9_-tgfOrXsGtw_z6oxB6X_';

const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');
const PS_PATH = path.join(__dirname, 'assets', 'send-raw.ps1');

const DEFAULT_CONFIG = {
  vistaUrl: VISTA_URL,
  supabaseUrl: SUPABASE_URL,
  supabaseAnonKey: SUPABASE_ANON,
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
  autoStart: true,
};

let config = { ...DEFAULT_CONFIG };
let win = null; // the website window
let panel = null; // the control-panel window (printer settings + queue)
let tray = null;
let pollTimer = null;
let engineOn = false;
let trayRebuild = () => {};

// ---- Config persistence ----------------------------------------------------
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) config = { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')) };
  } catch (e) {
    log(`Could not read config: ${e.message}`);
  }
  // Always keep the hardcoded connection values current.
  config.vistaUrl = VISTA_URL;
  config.supabaseUrl = SUPABASE_URL;
  config.supabaseAnonKey = SUPABASE_ANON;
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

function printerReady() {
  if (config.mode === 'network') return !!config.host;
  if (config.mode === 'windows') return !!config.printerName;
  if (config.mode === 'zebradesigner') return !!config.watchFolder;
  return false;
}

// ---- Renderer messaging (to the station window + control panel) ------------
function send(channel, payload) {
  for (const w of [win, panel]) if (w && !w.isDestroyed()) w.webContents.send(channel, payload);
}
function log(message) {
  const line = `${new Date().toLocaleTimeString()}  ${message}`;
  send('engine:log', line);
  console.log(line);
}
function pushStatus() {
  send('engine:status', { running: engineOn, mode: config.mode });
  if (tray) tray.setToolTip(`Vista Print Station — printing ${engineOn ? 'ON' : 'off'}`);
  trayRebuild();
}

// ---- Supabase REST (direct claim/complete — no agent key) ------------------
function sbHeaders() {
  return {
    apikey: SUPABASE_ANON,
    Authorization: `Bearer ${SUPABASE_ANON}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

async function claimJobs() {
  const base = `${SUPABASE_URL}/rest/v1/vista_print_jobs`;
  const q = await fetch(`${base}?status=eq.queued&order=created_at.asc&limit=10`, { headers: sbHeaders() });
  if (!q.ok) throw new Error(`poll ${q.status}: ${(await q.text()).slice(0, 140)}`);
  const queued = await q.json();
  if (!queued.length) return [];
  const ids = queued.map((j) => j.id).join(',');
  // Claim only rows still queued, so a second station can't double-print.
  const u = await fetch(`${base}?id=in.(${ids})&status=eq.queued`, {
    method: 'PATCH',
    headers: sbHeaders(),
    body: JSON.stringify({ status: 'printing', claimed_at: new Date().toISOString(), agent: config.agentName }),
  });
  if (!u.ok) throw new Error(`claim ${u.status}: ${(await u.text()).slice(0, 140)}`);
  return await u.json();
}

async function reportComplete(id, status, error) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/vista_print_jobs?id=eq.${id}`, {
      method: 'PATCH',
      headers: sbHeaders(),
      body: JSON.stringify({
        status,
        error: error ? String(error).slice(0, 500) : null,
        printed_at: status === 'printed' ? new Date().toISOString() : null,
        agent: config.agentName,
      }),
    });
  } catch (e) {
    log(`Could not report job ${id}: ${e.message}`);
  }
}

async function refreshQueue() {
  try {
    const url = `${SUPABASE_URL}/rest/v1/vista_print_jobs?select=*&order=created_at.desc&limit=60`;
    const r = await fetch(url, { headers: sbHeaders() });
    if (!r.ok) return;
    send('queue:update', await r.json());
  } catch {
    /* ignore */
  }
}

async function tick() {
  if (!printerReady()) return;
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
  if (!printerReady()) {
    log('Open the Control Panel and set your Zebra printer to start printing.');
    if (!panel) createControlPanel();
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

// ---- IPC (from the control panel) ------------------------------------------
ipcMain.handle('config:get', () => config);
ipcMain.handle('config:set', (_e, patch) => {
  config = { ...config, ...patch };
  saveConfig();
  pushStatus();
  if (config.autoStart && !engineOn && printerReady()) startEngine();
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
  const r = await dialog.showOpenDialog(panel || win, { properties: ['openDirectory'] });
  return r.canceled ? null : r.filePaths[0];
});
ipcMain.handle('shell:open', (_e, p) => (p ? shell.openPath(p) : null));
ipcMain.handle('win:minimize', () => win && win.minimize());
ipcMain.handle('win:maximizeToggle', () => {
  if (!win) return false;
  if (win.isMaximized()) win.unmaximize(); else win.maximize();
  return win.isMaximized();
});
ipcMain.handle('win:close', () => win && win.close());
ipcMain.handle('win:isMaximized', () => !!(win && win.isMaximized()));
ipcMain.handle('queue:fetch', async () => {
  await refreshQueue();
  return true;
});

// ---- Windows + tray --------------------------------------------------------
// The main window loads the bespoke Print Station workspace (/station) — the
// custom design/queue/printers UI. The preload bridge is attached so the
// Printers panel can drive the local print engine over IPC.
function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    frame: false, // custom in-app title bar (see /station)
    backgroundColor: '#14181f',
    title: 'Vista Print Station',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.setMenuBarVisibility(false);
  win.on('maximize', () => send('win:state', { maximized: true }));
  win.on('unmaximize', () => send('win:state', { maximized: false }));
  win.loadURL(STATION_URL);
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      win.hide();
    }
  });
}

// The control panel is the local UI: printer settings, engine on/off, live log,
// and the print queue. It uses the preload bridge for IPC.
function createControlPanel() {
  if (panel && !panel.isDestroyed()) {
    panel.show();
    panel.focus();
    return;
  }
  panel = new BrowserWindow({
    width: 1000,
    height: 720,
    minWidth: 720,
    minHeight: 520,
    backgroundColor: '#faf9f7',
    title: 'Vista Print Station — Control Panel',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  panel.setMenuBarVisibility(false);
  panel.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  panel.on('closed', () => { panel = null; });
}

function createTray() {
  try {
    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
    tray = new Tray(icon);
    tray.setToolTip('Vista Print Station');
    tray.on('click', () => (win ? (win.isVisible() ? win.hide() : win.show()) : createWindow()));
    // Rebuild the menu whenever engine state changes so its label stays accurate.
    trayRebuild = () => {
      if (!tray) return;
      tray.setContextMenu(Menu.buildFromTemplate([
        { label: 'Open Vista Auction', click: () => (win ? win.show() : createWindow()) },
        { label: 'Control Panel (printer & queue)', click: () => createControlPanel() },
        { type: 'separator' },
        { label: engineOn ? 'Stop printing' : 'Start printing', click: () => (engineOn ? stopEngine() : startEngine()) },
        { type: 'separator' },
        { label: 'Quit', click: () => { app.isQuitting = true; app.quit(); } },
      ]));
    };
    trayRebuild();
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
    // A hidden menu keeps recovery accelerators alive on the frameless window
    // (Reload / DevTools / Quit) so it can never get stuck.
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      { label: 'App', submenu: [
        { role: 'reload' }, { role: 'forceReload' }, { role: 'toggleDevTools' },
        { type: 'separator' }, { role: 'quit', accelerator: 'CmdOrCtrl+Q' },
      ] },
      { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    ]));
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
