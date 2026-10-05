import React, { useState, useEffect } from 'react';
import { Transaction } from '../types';
import {
  shareToWhatsApp,
  shareToEmail,
  generateTransactionExcel,
  getStandardFilePrefix,
  dataUrlToFile,
  triggerDownload,
} from '../services/exportShareService';
import {
  uploadFileToGoogleDrive,
  DriveUploadResult,
} from '../services/googleDriveService';
import { getLocalSettings } from '../services/settingsService';
import {
  X,
  MessageCircle,
  Mail,
  Cloud,
  FileSpreadsheet,
  Share2,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  Loader2,
  FolderPlus,
  Folder,
} from 'lucide-react';

interface ShareModalProps {
  transaction: Transaction;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({ transaction, onClose }) => {
  // Drive upload states: 'idle' | 'uploading' | 'success' | 'error'
  const [driveStatus, setDriveStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadResults, setUploadResults] = useState<DriveUploadResult[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [configuredFolderUrl, setConfiguredFolderUrl] = useState<string>('');

  useEffect(() => {
    const settings = getLocalSettings();
    if (settings.googleDriveFolderUrl) {
      setConfiguredFolderUrl(settings.googleDriveFolderUrl);
    }
  }, []);

  // Local Download
  const handleExcelDownload = () => {
    const { blob, fileName } = generateTransactionExcel(transaction);
    triggerDownload(blob, fileName);
  };

  // Upload Excel Rekap to Google Drive
  const handleUploadExcelToDrive = async () => {
    setDriveStatus('uploading');
    setUploadProgress(10);
    setErrorMessage('');
    setUploadResults([]);

    try {
      const { blob, fileName } = generateTransactionExcel(transaction);
      const result = await uploadFileToGoogleDrive(
        blob,
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        (pct) => setUploadProgress(pct)
      );

      setUploadResults([result]);
      setDriveStatus('success');
    } catch (err: any) {
      console.error('Drive upload error:', err);
      setErrorMessage(err?.message || 'Gagal mengunggah file ke Google Drive.');
      setDriveStatus('error');
    }
  };

  // Upload All Files (Excel + Invoice PDF + Nota Photos) to Google Drive
  const handleUploadAllToDrive = async () => {
    setDriveStatus('uploading');
    setUploadProgress(5);
    setErrorMessage('');
    setUploadResults([]);

    const results: DriveUploadResult[] = [];
    const prefix = getStandardFilePrefix(transaction);

    try {
      // 1. Excel File
      const { blob, fileName } = generateTransactionExcel(transaction);
      setUploadProgress(20);
      const excelRes = await uploadFileToGoogleDrive(
        blob,
        fileName,
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      results.push(excelRes);

      // 2. Invoice PDF if exists
      if (transaction.invoicePdfData) {
        setUploadProgress(50);
        const pdfFile = dataUrlToFile(transaction.invoicePdfData, `${prefix} - INVOICE.pdf`);
        const pdfRes = await uploadFileToGoogleDrive(
          pdfFile,
          pdfFile.name,
          'application/pdf'
        );
        results.push(pdfRes);
      }

      // 3. Nota Photos if exists
      if (transaction.notaFiles && transaction.notaFiles.length > 0) {
        for (let idx = 0; idx < transaction.notaFiles.length; idx++) {
          const nota = transaction.notaFiles[idx];
          const padNum = String(idx + 1).padStart(2, '0');
          const notaName = `${prefix} - NOTA ${padNum}.jpg`;
          const notaFile = dataUrlToFile(nota.dataUrl, notaName);

          const stepPct = 60 + Math.floor(((idx + 1) / transaction.notaFiles.length) * 35);
          setUploadProgress(stepPct);

          const notaRes = await uploadFileToGoogleDrive(
            notaFile,
            notaFile.name,
            'image/jpeg'
          );
          results.push(notaRes);
        }
      }

      setUploadResults(results);
      setUploadProgress(100);
      setDriveStatus('success');
    } catch (err: any) {
      console.error('Batch Drive upload error:', err);
      setErrorMessage(err?.message || 'Gagal mengunggah berkas ke Google Drive.');
      setDriveStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative border border-slate-100">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-inner">
            <Share2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Bagikan Rekap Belanja</h3>
          <p className="text-xs text-slate-500 font-medium truncate px-4">
            {transaction.satdikName} ({transaction.id})
          </p>
        </div>

        {/* STATE 1: UPLOADING TO GOOGLE DRIVE */}
        {driveStatus === 'uploading' && (
          <div className="py-6 text-center space-y-4">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto animate-spin">
              <Loader2 className="w-7 h-7" />
            </div>
            <div>
              <p className="font-bold text-sm text-slate-900">Mengunggah ke Google Drive...</p>
              <p className="text-xs text-slate-500 mt-1">Harap tunggu, berkas sedang disimpan ke cloud</p>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="text-xs font-semibold text-indigo-600">{uploadProgress}% Selesai</p>
          </div>
        )}

        {/* STATE 2: SUCCESS DRIVE UPLOAD */}
        {driveStatus === 'success' && uploadResults.length > 0 && (
          <div className="py-4 text-center space-y-4 bg-emerald-50/60 p-4 rounded-2xl border border-emerald-200">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div>
              <h4 className="font-bold text-base text-slate-900">
                File Berhasil Disimpan ke Google Drive!
              </h4>
              <p className="text-xs text-slate-600 mt-1">
                {uploadResults.length === 1
                  ? `File "${uploadResults[0].name}" telah terunggah.`
                  : `${uploadResults.length} file berhasil diunggah ke Google Drive.`}
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {uploadResults.map((res) => (
                <a
                  key={res.id}
                  href={res.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition active:scale-98"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="truncate">Buka di Google Drive ({res.name})</span>
                </a>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDriveStatus('idle')}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline pt-1"
            >
              Kembali ke Opsi Bagikan
            </button>
          </div>
        )}

        {/* STATE 3: ERROR UPLOAD */}
        {driveStatus === 'error' && (
          <div className="py-4 text-center space-y-3 bg-amber-50 p-4 rounded-2xl border border-amber-200">
            <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900">Pop-up Google Diblokir / Bermasalah</h4>
              <p className="text-xs text-slate-600 mt-1">{errorMessage}</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-amber-200 text-left space-y-2">
              <p className="text-[11px] font-bold text-slate-800">💡 Cara Alternatif Tanpa Pop-up Login:</p>
              <button
                type="button"
                onClick={() => {
                  handleExcelDownload();
                  window.open(configuredFolderUrl || 'https://drive.google.com/drive/u/0/my-drive', '_blank');
                }}
                className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow transition"
              >
                <Folder className="w-4 h-4 text-indigo-200" />
                <span>Download File & Buka Google Drive ↗</span>
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDriveStatus('idle')}
                className="flex-1 py-2 bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl"
              >
                KEMBALI
              </button>
              <button
                type="button"
                onClick={handleUploadExcelToDrive}
                className="flex-1 py-2 bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow"
              >
                COBA LAGI API
              </button>
            </div>
          </div>
        )}

        {/* STATE 0: IDLE MAIN SHARE OPTIONS */}
        {driveStatus === 'idle' && (
          <div className="space-y-3 pt-2">
            {/* Option 1: WhatsApp */}
            <button
              type="button"
              onClick={() => {
                shareToWhatsApp(transaction);
                onClose();
              }}
              className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-between transition active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-700/50 rounded-lg">
                  <MessageCircle className="w-5 h-5 fill-white text-emerald-600" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Kirim Ke WhatsApp</p>
                  <p className="text-[11px] font-normal text-emerald-100">Format teks rincian belanja siap kirim</p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-md">Buka WA</span>
            </button>

            {/* Option 2: Email */}
            <button
              type="button"
              onClick={() => {
                shareToEmail(transaction);
                onClose();
              }}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 flex items-center justify-between transition active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-700/50 rounded-lg">
                  <Mail className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Kirim Ke Email / Gmail</p>
                  <p className="text-[11px] font-normal text-blue-100">Format email rincian rekapitulasi</p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-md">Buka Email</span>
            </button>

            {/* Option 3: Upload Excel to Google Drive */}
            <button
              type="button"
              onClick={handleUploadExcelToDrive}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-between transition active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-700/50 rounded-lg">
                  <Cloud className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Simpan Excel ke Google Drive</p>
                  <p className="text-[11px] font-normal text-indigo-100">Upload file Excel rekap tanpa download lokal</p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-md">Upload Drive</span>
            </button>

            {/* Option 4: Upload ALL Files to Google Drive */}
            <button
              type="button"
              onClick={handleUploadAllToDrive}
              className="w-full py-3.5 px-4 bg-purple-700 hover:bg-purple-600 active:bg-purple-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md shadow-purple-700/20 flex items-center justify-between transition active:scale-98"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-800/50 rounded-lg">
                  <FolderPlus className="w-5 h-5 text-white" />
                </div>
                <div className="text-left">
                  <p className="font-bold">Simpan Semua Dokumen ke Drive</p>
                  <p className="text-[11px] font-normal text-purple-100">Upload Excel, Invoice PDF, dan Foto Nota</p>
                </div>
              </div>
              <span className="text-xs font-semibold bg-white/20 px-2.5 py-1 rounded-md">Semua File</span>
            </button>

            {/* Option 5: Open Configured Google Drive Folder if set */}
            {configuredFolderUrl && (
              <a
                href={configuredFolderUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
              >
                <Folder className="w-4 h-4 text-indigo-400" />
                <span>Buka Folder Drive Pengaturan ↗</span>
              </a>
            )}

            {/* Option 6: Local Download (Explicit Local Download Button) */}
            <button
              type="button"
              onClick={handleExcelDownload}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Download File Excel ke Perangkat</span>
            </button>
          </div>
        )}

        <div className="pt-2 border-t text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs text-slate-500 font-medium hover:text-slate-800"
          >
            Batal / Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
