import React from 'react';
import { Link } from 'react-router-dom';

// Minimal Atelier-light header for the Pickups pages: logo lockup only.
const PickupsHeader = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="backdrop-blur-xl bg-white/72 border-b border-stone-200/80">
        <div className="mx-auto max-w-[1240px] px-5 sm:px-8">
          <div className="flex h-[72px] items-center">
            <Link to="/pickups" className="flex items-center gap-3 group" aria-label="Vista Auction Pickups — home">
              <span className="relative grid h-11 w-11 place-items-center rounded-2xl bg-slate-900 text-white shadow-soft ring-1 ring-slate-900/10 overflow-hidden transition-transform group-hover:scale-[1.03]">
                <svg viewBox="0 0 24 24" fill="none" className="h-[22px] w-[22px]" aria-hidden="true">
                  <path d="M12 2.6 21 7v10l-9 4.4L3 17V7l9-4.4Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M3 7l9 4.5L21 7M12 11.5V21.4" stroke="white" strokeWidth="1.6" strokeLinejoin="round" opacity=".85" />
                  <path d="M7.5 4.7 16.5 9.2" stroke="#F97316" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </span>
              <span className="flex flex-col leading-none">
                <span className="font-fraunces text-[19px] font-medium tracking-tight text-slate-900">Pickups</span>
                <span className="mt-1 text-[10px] font-semibold tracky text-slate-400">VISTA AUCTION</span>
              </span>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PickupsHeader;
