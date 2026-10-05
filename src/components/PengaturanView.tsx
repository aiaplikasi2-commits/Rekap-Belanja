import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User, Shield, CheckCircle2, FileSpreadsheet } from 'lucide-react';

export const PengaturanView: React.FC = () => {
  const { profile, user } = useAuth();

  return (
    <div className="space-y-6 pb-12 max-w-2xl">
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Pengaturan & Profil Pengguna</h1>
        <p className="text-xs text-slate-500">Informasi identitas aplikasi dan akun pengguna</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-3 border-b pb-4 border-slate-100">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-inner">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">REKAP BELANJA ONLINE</h2>
            <p className="text-xs text-blue-600 font-semibold">Sistem Rekap Belanja Full Online</p>
          </div>
        </div>

        <div className="space-y-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 font-semibold">Nama Aplikasi:</span>
            <p className="font-bold text-slate-900 text-sm">REKAP BELANJA FULL ONLINE</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 font-semibold">Pengembang / Developer:</span>
            <p className="font-bold text-slate-900 text-sm">Jamhur (mull.jhamur@gmail.com)</p>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-500 font-semibold">Status Penyimpanan Data:</span>
            <p className="font-bold text-emerald-700 text-sm flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>FULL ONLINE (Firestore Online Database)</span>
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          <span>Akun Pengguna Terhubung</span>
        </h3>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-500 font-medium mb-1">Nama Pengguna:</label>
            <input
              type="text"
              readOnly
              value={profile?.displayName || 'Pengguna'}
              className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">Email Terdaftar:</label>
            <input
              type="text"
              readOnly
              value={user?.email || profile?.email || ''}
              className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-medium text-slate-800"
            />
          </div>

          <div>
            <label className="block text-slate-500 font-medium mb-1">User ID Unique (UID):</label>
            <input
              type="text"
              readOnly
              value={user?.uid || ''}
              className="w-full p-2.5 bg-slate-100 border border-slate-300 rounded-xl font-mono text-[11px] text-slate-600"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
