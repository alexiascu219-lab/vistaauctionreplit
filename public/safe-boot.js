// TRACK BOOT START & ERROR HANDLING
(function () {
    try {
        const startLog = { m: 'BOOT_CHECK_START', t: new Date().toISOString() };
        const raw = localStorage.getItem('RESCUE_LOG');
        const logs = raw ? JSON.parse(raw) : [];
        logs.push(startLog);
        localStorage.setItem('RESCUE_LOG', JSON.stringify(logs.slice(-3)));
    } catch (e) { }

    let rescueTimeout = null;
    function logRescueError(errData) {
        if (rescueTimeout) return; // Basic throttle
        rescueTimeout = setTimeout(() => { rescueTimeout = null; }, 500);

        try {
            let logs = [];
            try {
                const raw = localStorage.getItem('RESCUE_LOG');
                logs = raw ? JSON.parse(raw) : [];
            } catch (e) { logs = []; }
            logs.push(errData);
            localStorage.setItem('RESCUE_LOG', JSON.stringify(logs.slice(-3)));
        } catch (e) {
            try { localStorage.removeItem('RESCUE_LOG'); } catch (e2) { }
        }
    }

    window.onerror = function (msg, url, line, col, err) {
        const data = { m: msg, u: url, l: line, c: col, s: err ? err.stack : 'N/A', t: new Date().toISOString() };
        logRescueError(data);
        console.error('🚀 VISTA ERROR:', data);

        // SHOW ON SCREEN IMMEDIATELY
        var rec = document.getElementById('emergency-recovery');
        if (rec) {
            rec.style.display = 'flex';
            var code = document.getElementById('recovery-code');
            if (code) code.innerText = "CRASH: " + data.m + " @ " + data.u + ":" + data.l;
        }
    };

    window.onunhandledrejection = function (e) {
        const data = { m: 'Promise Rejection', r: e.reason, t: new Date().toISOString() };
        logRescueError(data);
        console.error('🚀 VISTA PROMISE ERROR:', data);

        var rec = document.getElementById('emergency-recovery');
        if (rec) {
            rec.style.display = 'flex';
            var code = document.getElementById('recovery-code');
            if (code) code.innerText = "PROMISE_CRASH: " + data.r;
        }
    };

    // Fail-safe: If #root is still empty after 6 seconds, show recovery UI
    setTimeout(function () {
        var root = document.getElementById('root');
        var loader = document.getElementById('vista-boot-loader');
        var logs = localStorage.getItem('RESCUE_LOG');

        // If root is still empty it means React hasn't rendered anything
        if (root && root.innerHTML === "") {
            if (loader) loader.style.display = 'none';
            var rec = document.getElementById('emergency-recovery');
            if (rec) rec.style.display = 'flex';
            var code = document.getElementById('recovery-code');
            if (code) code.innerText = logs ? logs.substring(0, 100) : 'BOOT_STALL: Supabase or JS execution is hanging.';
        }
    }, 6000);

    // Track network errors for scripts
    window.addEventListener('error', function (e) {
        if (e.target && e.target.tagName === 'SCRIPT') {
            logRescueError({ m: 'Script Load Error', u: e.target.src, t: new Date().toISOString() });
        }
    }, true);

    // Attach Recovery Button Listener (safer than inline onclick)
    window.addEventListener('DOMContentLoaded', () => {
        const btn = document.getElementById('emergency-reset-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                try { localStorage.clear(); } catch (e) { }
                window.location.reload();
            });
        }
    });
})();
