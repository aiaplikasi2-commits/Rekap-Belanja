import React, { useState } from 'react';
import { Mail, User, Coffee, CheckCircle2, Copy, FileSpreadsheet } from 'lucide-react';

export const TentangView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopyNumber = () => {
    navigator.clipboard.writeText('08179015181');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12 max-w-xl mx-auto">
      {/* App Info Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl mx-auto shadow-lg shadow-blue-600/30">
          <FileSpreadsheet className="w-8 h-8" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">REKAP BELANJA ONLINE</h1>
          <p className="text-xs text-slate-500 mt-2">
            Aplikasi Rekapitulasi Belanja Full Online Terintegrasi Invoice PDF, Nota Fisik, Excel, dan Android Share Sheet. PWA siap digunakan di laptop maupun HP.
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 text-left space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <span className="text-slate-500 font-medium">Pengembang (Developer):</span>
            <span className="font-bold text-slate-900">Jamhur</span>
          </div>

          <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
            <span className="text-slate-500 font-medium">Email Kontak:</span>
            <span className="font-bold text-blue-600">mull.jhamur@gmail.com</span>
          </div>
        </div>
      </div>

      {/* Bagi Kopi Section */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50/80 rounded-2xl border border-amber-200 p-6 space-y-4 shadow-sm text-center">
        <div className="w-12 h-12 bg-amber-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md">
          <Coffee className="w-6 h-6 fill-white/20" />
        </div>

        <div>
          <h2 className="text-base font-bold text-amber-950 uppercase tracking-wide">
            ☕ BAGI KOPI
          </h2>
          <p className="text-xs text-amber-800 mt-1">
            Dukung pengembangan dan pemeliharaan aplikasi Rekap Belanja ini.
          </p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-amber-200 text-left space-y-2 shadow-inner">
          <div className="text-xs text-slate-600 font-semibold">
            Dana / GoPay: <span className="font-mono text-sm text-slate-900 font-bold">08179015181</span>
          </div>
          <div className="text-xs text-slate-600 font-semibold">
            a.n. <span className="font-bold text-slate-900">Jamhur</span>
          </div>

          <button
            type="button"
            onClick={handleCopyNumber}
            className="mt-2 w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold text-xs rounded-lg shadow flex items-center justify-center gap-2 transition active:scale-95"
          >
            {copied ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Nomor Berhasil Disalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Salin Nomor Dana/GoPay (08179015181)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
