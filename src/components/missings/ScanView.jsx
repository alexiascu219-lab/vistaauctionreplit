import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flashlight, Keyboard, Loader2 } from 'lucide-react';

import { startScanner, cameraErrorMessage, hasNativeDetector } from '../../lib/missings/scanner';
import { resolveScan } from '../../lib/missings/sync';

/**
 * Live camera scanning.
 *
 * The camera is the default view because it is where staff spend nearly all of
 * their time. Everything here is in service of one number: how long between
 * pointing the phone at a label and knowing the answer.
 */
export default function ScanView({ onResult, paused }) {
  const videoRef = useRef(null);
  const controllerRef = useRef(null);
  const busyRef = useRef(false);
  const lastCodeRef = useRef({ text: null, at: 0 });

  const [status, setStatus] = useState('starting'); // starting | live | error
  const [message, setMessage] = useState(null);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);

  const handleCode = useCallback(
    async (text) => {
      // Barcode readers fire the same code many times a second. Ignore repeats
      // of the SAME code within 2.5s, but let a different code through instantly
      // so scanning two items back to back stays fast.
      const now = Date.now();
      if (busyRef.current) return;
      if (lastCodeRef.current.text === text && now - lastCodeRef.current.at < 2500) return;

      lastCodeRef.current = { text, at: now };
      busyRef.current = true;

      try {
        const result = await resolveScan(text, {
          source: hasNativeDetector() ? 'barcode_detector' : 'camera',
        });
        onResult(result);
      } finally {
        busyRef.current = false;
      }
    },
    [onResult],
  );

  useEffect(() => {
    // Release the camera whenever a verdict is showing. Leaving it running
    // behind a full-screen overlay wastes battery on a device that has to last
    // a whole shift, and keeps the lens warm for no reason.
    if (paused) {
      controllerRef.current?.stop();
      controllerRef.current = null;
      return undefined;
    }

    let cancelled = false;

    (async () => {
      setStatus('starting');
      try {
        const controller = await startScanner(videoRef.current, {
          onResult: handleCode,
          onError: () => {},
        });
        if (cancelled) {
          controller.stop();
          return;
        }
        controllerRef.current = controller;
        setHasTorch(controller.hasTorch);
        setStatus('live');
      } catch (err) {
        if (cancelled) return;
        setMessage(cameraErrorMessage(err));
        setStatus('error');
      }
    })();

    return () => {
      cancelled = true;
      controllerRef.current?.stop();
      controllerRef.current = null;
    };
  }, [paused, handleCode]);

  const toggleTorch = async () => {
    const next = !torchOn;
    const ok = await controllerRef.current?.setTorch(next);
    if (ok) setTorchOn(next);
  };

  if (status === 'error') {
    return (
      <div className="px-1 py-6">
        <div className="fl-card p-6 text-center">
          <p className="font-fl-display text-2xl uppercase tracking-wide text-slate-100">
            Camera unavailable
          </p>
          <p className="mx-auto mt-3 max-w-xs font-fl-ui text-base leading-relaxed text-slate-400">
            {message}
          </p>
          <Link to="/missings/lookup" className="fl-btn-primary mt-6">
            <Keyboard className="h-5 w-5" aria-hidden="true" />
            Type the number
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-xl border border-floor-hairline bg-black">
        {/* 3:4 portrait — matches how a phone is held when scanning a shelf. */}
        <div className="relative aspect-[3/4] w-full">
          <video
            ref={videoRef}
            muted
            playsInline
            className="absolute inset-0 h-full w-full object-cover"
          />

          {/* Vignette: darkens the periphery so the eye goes to the reticle. */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at center, transparent 34%, rgba(10,14,20,0.72) 100%)' }}
          />

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="fl-reticle relative h-40 w-[78%]">
              {/* The sweep is the only motion on screen — it reads as "actively
                  looking" without competing with the camera feed. */}
              <div className="absolute inset-x-3 top-1/2 h-[3px] animate-fl-sweep rounded-full bg-floor-brand shadow-[0_0_14px_2px_rgba(255,107,26,0.65)]" />
            </div>
          </div>

          {status === 'starting' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-floor-ink/85">
              <Loader2 className="h-8 w-8 animate-spin text-floor-brand" aria-hidden="true" />
              <p className="font-fl-ui text-sm uppercase tracking-[0.18em] text-slate-400">
                Starting camera
              </p>
            </div>
          )}

          {hasTorch && status === 'live' && (
            <button
              type="button"
              onClick={toggleTorch}
              aria-pressed={torchOn}
              aria-label="Toggle light"
              className={`absolute right-3 top-3 flex h-14 w-14 items-center justify-center rounded-xl border backdrop-blur transition-colors ${
                torchOn
                  ? 'border-floor-brand bg-floor-brand text-floor-ink'
                  : 'border-floor-hairline bg-floor-ink/70 text-slate-200'
              }`}
            >
              <Flashlight className="h-6 w-6" aria-hidden="true" />
            </button>
          )}
        </div>

        <p className="border-t border-floor-hairline bg-floor-panel px-4 py-3 text-center font-fl-ui text-sm uppercase tracking-[0.16em] text-slate-500">
          Point at any barcode
        </p>
      </div>

      <Link to="/missings/lookup" className="fl-btn-ghost">
        <Keyboard className="h-5 w-5" aria-hidden="true" />
        Type instead
      </Link>
    </div>
  );
}
