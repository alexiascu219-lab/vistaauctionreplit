const $ = (id) => document.getElementById(id);
let config = {};
let designs = [];

const FIELDS = ['serverUrl', 'agentKey', 'supabaseUrl', 'supabaseAnonKey', 'agentName', 'mode', 'host', 'port', 'printerName', 'watchFolder', 'designsFolder', 'pollSeconds'];

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---- Tabs ------------------------------------------------------------------
document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach((p) => p.classList.remove('active'));
    tab.classList.add('active');
    $(`tab-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'designs') loadDesigns();
    if (tab.dataset.tab === 'queue') api.fetchQueue();
  });
});

// ---- Config ----------------------------------------------------------------
function applyMode() {
  const m = $('mode').value;
  document.querySelectorAll('.mode-field').forEach((el) => (el.style.display = 'none'));
  document.querySelectorAll(`.mode-${m}`).forEach((el) => (el.style.display = m === 'network' ? 'grid' : 'block'));
}

async function loadConfig() {
  config = await api.getConfig();
  FIELDS.forEach((f) => { if ($(f) != null && config[f] != null) $(f).value = config[f]; });
  $('autoStart').checked = !!config.autoStart;
  applyMode();
}

async function saveConfig() {
  const patch = {};
  FIELDS.forEach((f) => (patch[f] = $(f).value.trim()));
  patch.port = parseInt(patch.port, 10) || 9100;
  patch.pollSeconds = Math.max(1, parseInt(patch.pollSeconds, 10) || 4);
  patch.autoStart = $('autoStart').checked;
  config = await api.setConfig(patch);
  toast('Settings saved');
  api.fetchQueue();
}

$('mode').addEventListener('change', applyMode);
$('saveBtn').addEventListener('click', saveConfig);
document.querySelectorAll('[data-pick]').forEach((btn) =>
  btn.addEventListener('click', async () => {
    const dir = await api.pickFolder();
    if (dir) $(btn.dataset.pick).value = dir;
  }),
);

// ---- Engine toggle ---------------------------------------------------------
let running = false;
$('toggleBtn').addEventListener('click', async () => {
  running = await api.toggleEngine(!running);
});
api.onStatus((s) => {
  running = s.running;
  $('statusPill').className = `pill ${s.running ? 'pill-on' : 'pill-off'}`;
  $('statusText').textContent = s.running ? `Printing · ${s.mode}` : 'Printing off';
  $('toggleBtn').textContent = s.running ? 'Stop printing' : 'Start printing';
  $('toggleBtn').classList.toggle('on', s.running);
});

// ---- Test print ------------------------------------------------------------
$('testBtn').addEventListener('click', async () => {
  const r = await api.testPrint($('testCart').value.trim() || '12');
  toast(r.ok ? 'Test sent to printer' : `Failed: ${r.error}`);
});

// ---- Log -------------------------------------------------------------------
api.onLog((line) => {
  const log = $('log');
  log.textContent += (log.textContent ? '\n' : '') + line;
  log.scrollTop = log.scrollHeight;
});

// ---- Queue -----------------------------------------------------------------
const TAG = { queued: 'Queued', printing: 'Printing', printed: 'Printed', error: 'Error', canceled: 'Canceled' };
function renderQueue(jobs) {
  const list = $('queueList');
  if (!jobs || !jobs.length) {
    list.innerHTML = '<p class="empty">No print jobs yet.</p>';
    return;
  }
  list.innerHTML = jobs
    .map((j) => {
      const when = new Date(j.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
      const meta = [j.source, j.quantity > 1 ? `x${j.quantity}` : '', j.requested_by, when].filter(Boolean).join(' · ');
      const err = j.status === 'error' && j.error ? `<div class="job-meta" style="color:var(--red)">${escapeHtml(j.error)}</div>` : '';
      return `<div class="job"><div class="job-main"><div class="job-title">${escapeHtml(j.title || j.template)}</div><div class="job-meta">${escapeHtml(meta)}</div>${err}</div><span class="tag t-${j.status}">${TAG[j.status] || j.status}</span></div>`;
    })
    .join('');
}
api.onQueue(renderQueue);
$('refreshQueue').addEventListener('click', () => { api.fetchQueue(); toast('Refreshed'); });

// ---- Designs ---------------------------------------------------------------
async function loadDesigns() {
  designs = await api.listDesigns();
  const list = $('designsList');
  if (!designs.length) {
    list.innerHTML = '<p class="empty">No design files found. Set a designs folder in Settings.</p>';
    return;
  }
  list.innerHTML = designs
    .map((d) => {
      const chosen = config.labelFile === d.path ? '<span class="chosen">✓ cart labels</span>' : '';
      return `<div class="design"><span class="design-name">${escapeHtml(d.name)}</span>${chosen}<button class="btn btn-ghost" data-open="${escapeAttr(d.path)}">Open</button><button class="btn btn-ghost" data-use="${escapeAttr(d.path)}">Use for carts</button></div>`;
    })
    .join('');
  list.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => api.openPath(b.dataset.open)));
  list.querySelectorAll('[data-use]').forEach((b) =>
    b.addEventListener('click', async () => {
      config = await api.setConfig({ labelFile: b.dataset.use });
      loadDesigns();
      toast('Set as the cart-label design');
    }),
  );
}
$('refreshDesigns').addEventListener('click', loadDesigns);

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, '&quot;');
}

// ---- Boot ------------------------------------------------------------------
(async () => {
  await loadConfig();
  await api.fetchQueue();
})();
