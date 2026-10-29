'use client';

import Link from 'next/link';
import { Search, Download, PlusCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export function Header() {
  const isEmergencyStopActive = process.env.NEXT_PUBLIC_EMERGENCY_STOP === 'true';

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl px-8 flex items-center justify-between shrink-0">
      {/* Search / Context */}
      <div className="flex items-center space-x-4 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search companies, domains, tech signals..."
            className="w-full bg-slate-950/60 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>
      </div>

      {/* Action Controls & Guardrails */}
      <div className="flex items-center space-x-4">
        {/* Guardrail Status Pill */}
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full text-xs border border-slate-800 bg-slate-950/60">
          {isEmergencyStopActive ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
              <span className="text-rose-400 font-medium">Emergency Stop Active</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">Guardrails Enforced: <span className="text-emerald-400 font-medium">CAN-SPAM / PECR</span></span>
            </>
          )}
        </div>

        {/* CSV Export */}
        <a
          href="/api/businesses/export?pipeline=all"
          download
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition-colors"
        >
          <Download className="w-3.5 h-3.5 text-slate-400" />
          <span>Export CSV</span>
        </a>

        {/* New Discovery Run CTA */}
        <Link
          href="/discovery"
          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md shadow-indigo-600/20 transition-all hover:scale-105"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Discovery Run</span>
        </Link>
      </div>
    </header>
  );
}
