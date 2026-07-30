/**
 * Barcode scanning.
 *
 * Two engines, chosen at runtime:
 *
 *   BarcodeDetector — native, hardware-accelerated, near-instant. Chrome and
 *     Android WebView have it; Safari's support has been inconsistent enough
 *     that it cannot be relied on. Used as a progressive enhancement.
 *
 *   ZXing — pure JS fallback, works everywhere, costs ~250KB and more CPU.
 *     Loaded with a dynamic import so it is a separate chunk: a visitor to the
 *     careers site never downloads a barcode decoder, and even on this page it
 *     only loads if the native detector is missing.
 *
 * Both are wrapped in the same start/stop interface so the view does not care
 * which one it got.
 */

// Warehouse labels are overwhelmingly Code 128 / Code 39. QR and the EAN family
// are included because scanning the wrong symbology and getting silence is worse
// than scanning it and getting a miss logged.
const FORMATS = ['code_128', 'code_39', 'code_93', 'itf', 'ean_13', 'ean_8', 'upc_a', 'upc_e', 'qr_code'];

export function hasNativeDetector() {
  return typeof window !== 'undefined' && 'BarcodeDetector' in window;
}

/**
 * Rear camera, as high-res as the device will give us without being silly.
 *
 * `focusMode: continuous` matters more than resolution here: staff scan at
 * arm's length while moving, and a fixed-focus stream reads almost nothing.
 * It is an advanced constraint, so it is requested best-effort.
 */
async function openStream() {
  const constraints = {
    audio: false,
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 },
      advanced: [{ focusMode: 'continuous' }],
    },
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    // Some devices reject the advanced block wholesale. Retry without it before
    // giving up, otherwise a perfectly capable phone looks like it has no camera.
    if (err && (err.name === 'OverconstrainedError' || err.name === 'NotFoundError')) {
      return navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: 'environment' } },
      });
    }
    throw err;
  }
}

/**
 * Start scanning into a <video> element.
 *
 * onResult fires with the raw decoded text — normalization is the caller's job,
 * because an unreadable read is still worth logging.
 *
 * Returns a controller with stop() and, where the hardware supports it,
 * torch support. A warehouse aisle at 6am needs the torch.
 */
export async function startScanner(video, { onResult, onError } = {}) {
  const stream = await openStream();
  video.srcObject = stream;
  video.setAttribute('playsinline', 'true'); // iOS refuses to inline-play without this
  await video.play().catch(() => {});

  const track = stream.getVideoTracks()[0];
  const capabilities = track?.getCapabilities?.() || {};

  let stopped = false;
  let rafId = null;
  let zxingControls = null;

  const emit = (text) => {
    if (stopped || !text) return;
    onResult?.(String(text));
  };

  if (hasNativeDetector()) {
    const detector = new window.BarcodeDetector({ formats: FORMATS });

    const tick = async () => {
      if (stopped) return;
      try {
        if (video.readyState >= 2) {
          const codes = await detector.detect(video);
          if (codes && codes.length) emit(codes[0].rawValue);
        }
      } catch (err) {
        // A transient detect() failure on a dropped frame is normal; only a
        // sustained failure is worth surfacing, and the caller can decide.
        onError?.(err);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  } else {
    const { BrowserMultiFormatReader } = await import('@zxing/browser');
    const reader = new BrowserMultiFormatReader();
    zxingControls = await reader.decodeFromVideoElement(video, (result, err) => {
      if (stopped) return;
      if (result) emit(result.getText());
      // ZXing reports NotFoundException on every frame without a barcode. That
      // is the normal case, not an error, so it is deliberately swallowed.
      else if (err && err.name && err.name !== 'NotFoundException') onError?.(err);
    });
  }

  return {
    engine: hasNativeDetector() ? 'barcode_detector' : 'camera',

    hasTorch: Boolean(capabilities.torch),
    async setTorch(on) {
      if (!capabilities.torch || !track) return false;
      try {
        await track.applyConstraints({ advanced: [{ torch: Boolean(on) }] });
        return true;
      } catch {
        return false;
      }
    },

    stop() {
      stopped = true;
      if (rafId) cancelAnimationFrame(rafId);
      try {
        zxingControls?.stop();
      } catch {
        // Already torn down.
      }
      for (const t of stream.getTracks()) t.stop();
      if (video) video.srcObject = null;
    },
  };
}

/**
 * Why the camera could not be opened, in words a warehouse worker can act on.
 * A raw DOMException name on screen helps nobody standing in an aisle.
 */
export function cameraErrorMessage(err) {
  const name = err?.name || '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Camera access was blocked. Allow the camera for this site in your browser settings, then reload.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found on this device. Use Type instead.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The camera is being used by another app. Close it and try again.';
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'The camera only works over HTTPS.';
  }
  return 'Could not start the camera. Use Type instead.';
}
