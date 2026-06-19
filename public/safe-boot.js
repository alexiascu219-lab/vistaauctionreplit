// Pre-mount safety net. Shows the emergency recovery UI ONLY when the app
// genuinely fails to boot — not for benign runtime errors after it has mounted
// (e.g. the opaque cross-origin "Script error." that browser extensions and the
// mobile share sheet throw, or routine network/promise rejections).
(function () {
    function appMounted() {
        var root = document.getElementById('root');
        return !!(root && root.children && root.children.length > 0);
    }

    function showRecovery(codeText) {
        // Never hijack a working app.
        if (appMounted()) return;
        var loader = document.getElementById('vista-boot-loader');
        if (loader) loader.style.display = 'none';
        var rec = document.getElementById('emergency-recovery');
        if (rec) {
            rec.style.display = 'flex';
            var code = document.getElementById('recovery-code');
            if (code) code.innerText = String(codeText == null ? '' : codeText).substring(0, 140);
        }
    }

    // Best-effort boot breadcrumb
    try {
        var raw = localStorage.getItem('RESCUE_LOG');
        var logs = raw ? JSON.parse(raw) : [];
        logs.push({ m: 'BOOT_CHECK_START', t: new Date().toISOString() });
        localStorage.setItem('RESCUE_LOG', JSON.stringify(logs.slice(-3)));
    } catch (e) { }

    var rescueTimeout = null;
    function logRescueError(errData) {
        if (rescueTimeout) return; // basic throttle
        rescueTimeout = setTimeout(function () { rescueTimeout = null; }, 500);
        try {
            var logs = [];
            try {
                var raw = localStorage.getItem('RESCUE_LOG');
                logs = raw ? JSON.parse(raw) : [];
            } catch (e) { logs = []; }
            logs.push(errData);
            localStorage.setItem('RESCUE_LOG', JSON.stringify(logs.slice(-3)));
        } catch (e) {
            try { localStorage.removeItem('RESCUE_LOG'); } catch (e2) { }
        }
    }

    window.onerror = function (msg, url, line, col, err) {
        logRescueError({ m: msg, u: url, l: line, c: col, s: err ? err.stack : 'N/A', t: new Date().toISOString() });
        console.error('Vista error:', msg, url, line);

        // Opaque cross-origin "Script error." (no real error object) is noise from
        // extensions / third-party scripts — never treat it as an app crash.
        var opaque = (msg === 'Script error.' || msg === 'Script error') && !err;

        // Only take over the screen if the app never mounted in the first place.
        if (!opaque) showRecovery('CRASH: ' + msg + ' @ ' + (url || '') + ':' + (line || 0));
        return false;
    };

    window.onunhandledrejection = function (e) {
        var reason = e && e.reason;
        logRescueError({ m: 'Promise Rejection', r: String(reason), t: new Date().toISOString() });
        console.error('Vista promise rejection:', reason);
        // Network/Supabase promise rejections are common and non-fatal. Only show
        // recovery if the app hasn't booted at all (showRecovery guards on mount).
        showRecovery('PROMISE_CRASH: ' + String(reason).substring(0, 90));
    };

    // Boot-stall fail-safe: if React still hasn't rendered after 8s, offer recovery.
    setTimeout(function () {
        if (!appMounted()) {
            var logs = '';
            try { logs = localStorage.getItem('RESCUE_LOG') || ''; } catch (e) { }
            showRecovery(logs ? logs.substring(0, 100) : 'BOOT_STALL: JS execution is hanging.');
        }
    }, 8000);

    // Main-bundle / script load failures (only meaningful before mount).
    window.addEventListener('error', function (e) {
        if (e.target && e.target.tagName === 'SCRIPT') {
            logRescueError({ m: 'Script Load Error', u: e.target.src, t: new Date().toISOString() });
            showRecovery('SCRIPT_LOAD_FAIL: ' + (e.target.src || ''));
        }
    }, true);

    // Recovery button: purge local cache + reload.
    window.addEventListener('DOMContentLoaded', function () {
        var btn = document.getElementById('emergency-reset-btn');
        if (btn) {
            btn.addEventListener('click', function () {
                try { localStorage.clear(); } catch (e) { }
                window.location.reload();
            });
        }
    });
})();
