import React, { useRef, useState } from 'react';
import { CART_STATUS } from '../../../config/cartsConfig';
import { startPointerDrag, clamp } from './planDrag';

// A cart shown as a draggable puck on the floor plan. Drag to reposition;
// tap (without moving) to open its move sheet.
const PlanCart = ({ cart, draggable, getRect, onDropCommit, onTap }) => {
  const [drag, setDrag] = useState(null);
  const latest = useRef(null);
  const status = CART_STATUS[cart.status] || CART_STATUS.active;

  const x = drag ? drag.x : cart.pos_x;
  const y = drag ? drag.y : cart.pos_y;

  const begin = (e) => {
    if (!draggable) return;
    const rect = getRect();
    if (!rect) return;
    const start = { x: cart.pos_x ?? 50, y: cart.pos_y ?? 50 };
    latest.current = start;
    startPointerDrag(e, {
      onMove: (dxPx, dyPx) => {
        const nx = clamp(start.x + (dxPx / rect.width) * 100, 2, 98);
        const ny = clamp(start.y + (dyPx / rect.height) * 100, 2, 98);
        latest.current = { x: nx, y: ny };
        setDrag({ x: nx, y: ny });
      },
      onEnd: (moved) => {
        setDrag(null);
        if (moved) onDropCommit(cart, latest.current.x, latest.current.y);
        else onTap(cart);
      },
    });
  };

  return (
    <button
      onPointerDown={begin}
      style={{ left: `${x}%`, top: `${y}%` }}
      className={`absolute z-30 -translate-x-1/2 -translate-y-1/2 touch-none focus:outline-none ${
        draggable ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
      }`}
      title={`Cart ${cart.cart_number}${cart.spot ? ' · ' + cart.spot : ''}`}
    >
      <span
        className={`grid h-10 w-10 place-items-center rounded-full border-2 border-white bg-white font-fraunces text-[15px] font-medium text-slate-900 tnum shadow-lift transition-transform ${
          drag ? 'scale-110' : ''
        }`}
        style={{ boxShadow: '0 6px 16px -6px rgba(15,23,42,0.4)' }}
      >
        {cart.cart_number}
        <span className={`absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full ring-2 ring-white ${status.dot}`} />
      </span>
    </button>
  );
};

export default PlanCart;
