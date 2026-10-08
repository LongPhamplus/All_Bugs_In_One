import React from 'react';
import { Package, ShieldCheck, Database } from 'lucide-react';

export default function Navbar({ totalProducts, totalValue }) {
  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              StockFlow <span className="text-xs px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">v2.4.0</span>
            </h1>
            <p className="text-xs text-slate-400">Enterprise Inventory & Warehouse System</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs sm:text-sm">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>DB Status: <strong className="text-emerald-400">Connected</strong></span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Engine: <strong className="text-sky-400">SP-Optimized</strong></span>
          </div>
        </div>
      </div>
    </header>
  );
}
