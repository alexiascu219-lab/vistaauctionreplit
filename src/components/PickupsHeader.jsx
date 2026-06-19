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
              <img
                src="/assets/logo-tag.png"
                alt="Vista Auction"
                className="h-12 w-auto transition-transform group-hover:scale-[1.03]"
              />
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
