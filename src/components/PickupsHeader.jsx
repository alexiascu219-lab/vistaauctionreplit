import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

// Minimal, light header used only on the Pickups pages: logo + brand mark.
// No menu, no theme toggles — a clean, standalone department tool.
const PickupsHeader = () => {
  return (
    <motion.header
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 20, stiffness: 100 }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="absolute inset-0 bg-white/80 backdrop-blur-xl border-b border-slate-200/70 shadow-sm" />
      <div className="max-w-6xl mx-auto px-5 sm:px-6 relative z-10">
        <div className="flex items-center h-20">
          <Link to="/pickups" className="flex items-center gap-3 group">
            <img
              src="/assets/logo-tag.png"
              alt="Vista Auction"
              className="h-12 w-auto transition-transform group-hover:scale-105"
            />
            <div className="flex flex-col">
              <span className="font-black text-2xl text-slate-900 leading-none tracking-tight font-display">
                Pickups
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-orange-600 font-black mt-1 bg-orange-50 px-2 py-0.5 rounded-md self-start">
                Vista Auction
              </span>
            </div>
          </Link>
        </div>
      </div>
    </motion.header>
  );
};

export default PickupsHeader;
