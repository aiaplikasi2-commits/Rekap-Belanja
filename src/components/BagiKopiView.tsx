import React, { useState } from 'react';
import { Coffee, Copy, CheckCircle2, Heart } from 'lucide-react';

export const BagiKopiView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText('08179015181');
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12 max-w-md mx-auto">
      <div className="bg-gradient-to-b from-amber-900 to-amber-950 text-amber-50 rounded-3xl p-6 sm:p-8 text-center space-y-5 shadow-2xl border border-amber-800 relative overflow-hidden">
        <div className="w-16 h-16 bg-amber-500/20 text-amber-300 rounded-2xl flex items-center justify-center mx-auto border border-amber-500/40 shadow-inner">
          <Coffee className="w-8 h-8 fill-amber-400/30 text-amber-300" />
        </div>

        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <span>☕ BAGI KOPI</span>
          </h1>
          <p className="text-xs sm:text-sm text-amber-200/90 mt-2 font-medium">
            Dukung pengembangan dan pemeliharaan aplikasi Rekap Belanja ini.
          </p>
        </div>

        <div className="bg-amber-900/60 p-4 rounded-2xl border border-amber-700/60 space-y-3 text-left">
          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-300/80 font-medium">Nama Penerima:</span>
            <span className="font-bold text-white text-sm">Jamhur</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-amber-300/80 font-medium">Metode Pembayaran:</span>
            <span className="font-bold text-amber-300 text-sm">Dana / GoPay</span>
          </div>

          <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-800">
            <span className="text-amber-300/80 font-medium">Nomor Akun:</span>
            <span className="font-mono text-base font-bold text-emerald-400">08179015181</span>
          </div>

          <div className="text-[11px] text-amber-200/70 font-medium">
            a.n. <strong className="text-white">Jamhur</strong>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 transition active:scale-95"
        >
          {copied ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-slate-950" />
              <span>NOMOR BERHASIL DISALIN</span>
            </>
          ) : (
            <>
              <Coffee className="w-5 h-5 text-slate-950 fill-slate-950/20" />
              <span>☕ BAGI KOPI (08179015181)</span>
            </>
          )}
        </button>

        <p className="text-[11px] text-amber-300/60 font-medium italic flex items-center justify-center gap-1">
          <span>Terima kasih banyak atas dukungan dan apresiasi Anda!</span>
          <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
        </p>
      </div>
    </div>
  );
};
