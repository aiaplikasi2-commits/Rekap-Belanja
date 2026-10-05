import React from 'react';
import { Menu, Coffee, FileSpreadsheet } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  onOpenSidebar: () => void;
  onNavigate: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSidebar, onNavigate }) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900 text-white shadow-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="p-2 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-slate-800 active:bg-slate-700"
            aria-label="Buka Menu"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => onNavigate('dashboard')}>
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-inner">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight">REKAP BELANJA ONLINE</h1>
              <p className="text-[10px] text-blue-400 font-medium tracking-wide">Sistem Rekap Belanja Terintegrasi</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <PWAInstallButton />
          <button
            type="button"
            onClick={() => onNavigate('bagi-kopi')}
            className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-full text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
          >
            <Coffee className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
            <span className="hidden sm:inline">Bagi Kopi</span>
          </button>
        </div>
      </div>
    </header>
  );
};
