// Shared pointer-drag helper for the floor-plan editor. Works with mouse and
// touch, and tells the caller on release whether the gesture was a real drag or
// just a tap (moved less than `threshold` px) so cart tokens can do both.
export function startPointerDrag(e, { onMove, onEnd, threshold = 4 } = {}) {
  e.preventDefault();
  e.stopPropagation();
  const sx = e.clientX;
  const sy = e.clientY;
  let moved = false;

  const move = (ev) => {
    const dx = ev.clientX - sx;
    const dy = ev.clientY - sy;
    if (!moved && Math.hypot(dx, dy) > threshold) moved = true;
    if (moved && onMove) onMove(dx, dy);
  };
  const end = (ev) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', end);
    window.removeEventListener('pointercancel', end);
    if (onEnd) onEnd(moved, ev);
  };

  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
}

export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Percentage helpers relative to a canvas element's box.
export function pxToPct(dxPx, dyPx, rect) {
  return { dx: (dxPx / rect.width) * 100, dy: (dyPx / rect.height) * 100 };
}
