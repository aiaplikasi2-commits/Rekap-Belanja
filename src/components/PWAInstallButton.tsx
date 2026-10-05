import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Laptop, Smartphone, X } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white text-xs font-semibold rounded-full shadow-md flex items-center gap-1.5 transition active:scale-95 border border-blue-400/40"
      >
        <Download className="w-3.5 h-3.5" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 text-blue-200 text-xs font-semibold rounded-full border border-blue-700 flex items-center gap-1.5 transition"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 p-6 shadow-2xl border border-slate-800 text-white relative space-y-4">
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="absolute right-3 top-3 p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Laptop className="w-5 h-5 text-blue-400" />
                <span>Install Aplikasi di iPhone / iPad</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                1. Ketuk tombol <strong>Share (Bagikan)</strong> di navigasi Safari.<br />
                2. Gulir ke bawah lalu pilih <strong>Add to Home Screen (Tambah ke Layar Utama)</strong>.
              </p>
              <button
                type="button"
                onClick={() => setShowIOSGuide(false)}
                className="w-full rounded-xl bg-blue-600 py-2.5 text-xs font-bold text-white hover:bg-blue-500"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <button
      type="button"
      onClick={() => alert('Untuk menginstal di Laptop/HP: Buka menu titik tiga browser -> "Install Rekap Belanja" atau "Tambah ke Layar Utama"')}
      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-full border border-slate-700 flex items-center gap-1.5 transition"
    >
      <Download className="w-3.5 h-3.5 text-blue-400" />
      <span>Install PWA</span>
    </button>
  );
};
