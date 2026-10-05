import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getUserSettingsOnline,
  saveUserSettingsOnline,
  AppSettings,
} from '../services/settingsService';
import {
  User,
  Shield,
  CheckCircle2,
  FileSpreadsheet,
  Folder,
  ExternalLink,
  Save,
  Check,
} from 'lucide-react';

export const PengaturanView: React.FC = () => {
  const { profile, user } = useAuth();
  const [driveUrl, setDriveUrl] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (user?.uid) {
      getUserSettingsOnline(user.uid).then((settings) => {
        setDriveUrl(settings.googleDriveFolderUrl || '');
        setCompanyName(settings.companyName || 'CV KUJANG LUHUR SEKAWAN');
      });
    }
  }, [user]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setSaving(true);
    setSavedSuccess(false);

    try {
      saveUserSettingsOnline(user.uid, {
        googleDriveFolderUrl: driveUrl.trim(),
        companyName: companyName.trim(),
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 4000);
    } catch (err) {
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 max-w-2xl">
      {/* Title Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-lg font-bold text-slate-900">Pengaturan & Integrasi Google Drive</h1>
        <p className="text-xs text-slate-500">
          Atur folder penyimpanan Google Drive dan informasi akun pengguna
        </p>
      </div>

      {/* GOOGLE DRIVE FOLDER SETTING CARD */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Folder Penyimpanan Google Drive</h2>
              <p className="text-xs text-slate-500">
                Tautkan link folder Google Drive Anda untuk kemudahan akses dan sinkronisasi
              </p>
            </div>
          </div>
          {driveUrl.trim() && (
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
              ✅ Terhubung
            </span>
          )}
        </div>

        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Link / URL Folder Google Drive:
            </label>
            <input
              type="url"
              value={driveUrl}
              onChange={(e) => setDriveUrl(e.target.value)}
              placeholder="Contoh: https://drive.google.com/drive/folders/1a2b3c4d5e..."
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl font-mono text-xs focus:bg-white focus:outline-none focus:border-indigo-600"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Salin link folder dari Google Drive Anda dan tempel di sini. Saat membagikan rekap, tombol Google Drive dapat langsung mengarah ke folder ini.
            </p>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Nama Perusahaan / Instansi:
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Nama Perusahaan"
              className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            {driveUrl.trim() ? (
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl inline-flex items-center gap-1.5 transition"
              >
                <ExternalLink className="w-4 h-4 text-indigo-600" />
                <span>Buka Folder Drive ↗</span>
              </a>
            ) : <div />}

            <button
              type="submit"
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow flex items-center gap-2 transition active:scale-95"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>BERHASIL DISIMPAN!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>SIMPAN PENGATURAN</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* APP INFO CARD */}
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
              <span>FULL ONLINE (Firestore & Cache Terintegrasi)</span>
            </p>
          </div>
        </div>
      </div>

      {/* USER ACCOUNT CARD */}
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
