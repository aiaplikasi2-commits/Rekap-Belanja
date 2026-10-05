import React, { useState } from 'react';
import {
  FolderUp,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  X,
  Loader2,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import {
  connectGoogleDrive,
  getCachedDriveAccessToken,
  uploadFileToGoogleDrive,
  DriveUploadResult,
} from '../services/googleDriveService';

export interface FileToUpload {
  name: string;
  blob: Blob;
  mimeType: string;
  typeLabel: 'excel' | 'pdf' | 'image' | 'other';
}

interface GoogleDriveShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  files: FileToUpload[];
  folderName?: string;
}

export const GoogleDriveShareModal: React.FC<GoogleDriveShareModalProps> = ({
  isOpen,
  onClose,
  title,
  files,
  folderName = 'REKAP BELANJA ONLINE',
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedResults, setUploadedResults] = useState<DriveUploadResult[]>([]);
  const [errorMessage, setErrorMessage] = useState('');
  const [currentUploadingIndex, setCurrentUploadingIndex] = useState(-1);

  if (!isOpen) return null;

  const hasToken = !!getCachedDriveAccessToken();

  const handleStartUpload = async () => {
    setErrorMessage('');
    setIsUploading(true);
    setUploadedResults([]);

    try {
      // Connect if not already authenticated
      if (!getCachedDriveAccessToken()) {
        setIsConnecting(true);
        await connectGoogleDrive();
        setIsConnecting(false);
      }

      const results: DriveUploadResult[] = [];
      for (let i = 0; i < files.length; i++) {
        setCurrentUploadingIndex(i);
        const f = files[i];
        const result = await uploadFileToGoogleDrive({
          blob: f.blob,
          fileName: f.name,
          mimeType: f.mimeType,
          folderName,
        });
        results.push(result);
      }

      setUploadedResults(results);
    } catch (err: any) {
      console.error('Upload Error:', err);
      setErrorMessage(err.message || 'Terjadi kesalahan saat mengunggah ke Google Drive.');
    } finally {
      setIsUploading(false);
      setIsConnecting(false);
      setCurrentUploadingIndex(-1);
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'excel':
        return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case 'pdf':
        return <FileText className="w-5 h-5 text-rose-600" />;
      case 'image':
        return <ImageIcon className="w-5 h-5 text-blue-600" />;
      default:
        return <UploadCloud className="w-5 h-5 text-slate-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative border border-slate-200">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-inner">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500">
              Folder Drive: <span className="font-semibold text-emerald-700">{folderName}</span>
            </p>
          </div>
        </div>

        {/* Error alert */}
        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Gagal Unggah ke Google Drive</p>
              <p className="mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* File List Status */}
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {files.map((file, idx) => {
            const isUploaded = uploadedResults.length > idx;
            const isCurrent = currentUploadingIndex === idx;

            return (
              <div
                key={idx}
                className={`p-3 rounded-xl border flex items-center justify-between text-xs transition ${
                  isUploaded
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : isCurrent
                    ? 'bg-blue-50 border-blue-300 ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate pr-2">
                  {renderIcon(file.typeLabel)}
                  <div className="truncate">
                    <p className="font-bold text-slate-900 truncate">{file.name}</p>
                    <p className="text-[11px] text-slate-500 capitalize">{file.typeLabel}</p>
                  </div>
                </div>

                <div className="shrink-0">
                  {isUploaded ? (
                    <span className="flex items-center gap-1 text-emerald-700 font-bold text-[11px] bg-emerald-100 px-2 py-0.5 rounded-full">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Selesai</span>
                    </span>
                  ) : isCurrent ? (
                    <span className="flex items-center gap-1 text-blue-700 font-bold text-[11px] bg-blue-100 px-2 py-0.5 rounded-full">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Mengunggah...</span>
                    </span>
                  ) : (
                    <span className="text-slate-400 font-medium text-[11px]">Siap Unggah</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Upload Success Actions */}
        {uploadedResults.length === files.length && uploadedResults.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center space-y-3">
            <div className="w-10 h-10 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto shadow">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-900">
                Semua File Berhasil Diunggah ke Google Drive!
              </h4>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                File telah tersimpan dengan aman di Google Drive Anda.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {uploadedResults.map((res, i) => (
                <a
                  key={i}
                  href={res.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2 px-3 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span className="truncate">Buka File {files[i]?.name} di Google Drive</span>
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {uploadedResults.length < files.length && (
          <div className="pt-2">
            {!hasToken ? (
              <button
                type="button"
                onClick={handleStartUpload}
                disabled={isConnecting || isUploading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>MENGHUBUNGKAN GOOGLE DRIVE...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>LOGIN GOOGLE DRIVE & UNGGAH FILE</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartUpload}
                disabled={isUploading}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>MENGUNGGAH KE GOOGLE DRIVE...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>UNGGAH SEKARANG KE GOOGLE DRIVE</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
