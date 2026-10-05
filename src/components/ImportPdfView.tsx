import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  processPdfWithGemini,
  ExtractionProgress,
  ExtractionResult,
} from '../services/geminiService';
import {
  checkDuplicatePdf,
  generateTransactionId,
  saveTransactionOnline,
} from '../services/transactionService';
import { saveCustomerOnline } from '../services/customerService';
import {
  formatRupiah,
  sanitizeFileName,
  getStandardFilePrefix,
  shareExcelTransaction,
  shareAllTransactionFiles,
  prepareTransactionDriveFiles,
} from '../services/exportShareService';
import { GoogleDriveShareModal, FileToUpload } from './GoogleDriveShareModal';
import { Transaction, TransactionItem, NotaPhoto } from '../types';
import {
  Upload,
  FileText,
  CheckSquare,
  Square,
  Trash2,
  Plus,
  Camera,
  Image as ImageIcon,
  AlertTriangle,
  Save,
  CheckCircle2,
  Share2,
  FileSpreadsheet,
  Cloud,
  X,
  Edit3,
} from 'lucide-react';

interface ImportPdfViewProps {
  onSuccess: (tx: Transaction) => void;
  onNavigate: (tab: string) => void;
}

export const ImportPdfView: React.FC<ImportPdfViewProps> = ({ onSuccess, onNavigate }) => {
  const { user } = useAuth();

  // Step states: 'upload' -> 'extracting' -> 'review' -> 'saved'
  const [step, setStep] = useState<'upload' | 'extracting' | 'review' | 'saved'>('upload');

  // File data
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfDataUrl, setPdfDataUrl] = useState<string>('');
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);

  // Review states
  const [satdikName, setSatdikName] = useState<string>('');
  const [docNumber, setDocNumber] = useState<string>('');
  const [items, setItems] = useState<TransactionItem[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [notaPhotos, setNotaPhotos] = useState<NotaPhoto[]>([]);
  const [pdfHash, setPdfHash] = useState<string>('');

  // Modals & UI
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [duplicateWarningOpen, setDuplicateWarningOpen] = useState(false);
  const [duplicateMatch, setDuplicateMatch] = useState<Transaction | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedTransaction, setSavedTransaction] = useState<Transaction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Google Drive Share Modal
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveModalTitle, setDriveModalTitle] = useState('');
  const [driveModalFiles, setDriveModalFiles] = useState<FileToUpload[]>([]);

  const handleOpenDriveModal = () => {
    if (!savedTransaction) return;
    const files = prepareTransactionDriveFiles(savedTransaction);
    setDriveModalTitle(`Unggah ${savedTransaction.satdikName} ke Google Drive`);
    setDriveModalFiles(files);
    setDriveModalOpen(true);
  };

  // Refs for camera / gallery inputs
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // 1. Handle File Selection
  const handlePdfSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage('File yang dipilih harus berformat PDF.');
      return;
    }

    setErrorMessage('');
    setPdfFile(file);

    // Convert file to Data URL for persistence
    const reader = new FileReader();
    reader.onload = () => {
      setPdfDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Start extraction
    setStep('extracting');
    try {
      const result: ExtractionResult = await processPdfWithGemini(file, (p) => {
        setProgress(p);
      });

      setSatdikName(result.satdikName || 'SATDIK UNKNOWN');
      setDocNumber(result.docNumber || '');
      setItems(result.items || []);
      setPdfHash(result.pdfHash || '');

      // Select all items by default
      setSelectedIndices(result.items.map((_, idx) => idx));

      // Check for duplicate online
      if (user?.uid) {
        const dup = await checkDuplicatePdf(user.uid, result.pdfHash, result.docNumber);
        if (dup) {
          setDuplicateMatch(dup);
          setDuplicateWarningOpen(true);
        }
      }

      setStep('review');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'Gagal membaca PDF.');
      setStep('upload');
    }
  };

  // Checkbox handlers
  const toggleSelectAll = () => {
    if (selectedIndices.length === items.length) {
      setSelectedIndices([]);
    } else {
      setSelectedIndices(items.map((_, idx) => idx));
    }
  };

  const toggleSelectRow = (idx: number) => {
    if (selectedIndices.includes(idx)) {
      setSelectedIndices(selectedIndices.filter((i) => i !== idx));
    } else {
      setSelectedIndices([...selectedIndices, idx]);
    }
  };

  // Delete selected rows
  const handleDeleteSelectedRows = () => {
    const remaining = items.filter((_, idx) => !selectedIndices.includes(idx));
    // Re-index
    const reindexed = remaining.map((it, i) => ({ ...it, no: i + 1 }));
    setItems(reindexed);
    setSelectedIndices([]);
    setDeleteConfirmOpen(false);
  };

  // Item edit handlers
  const handleItemChange = (idx: number, field: keyof TransactionItem, value: any) => {
    const updated = [...items];
    const current = { ...updated[idx], [field]: value };

    if (field === 'quantity' || field === 'price') {
      const q = Number(field === 'quantity' ? value : current.quantity) || 0;
      const p = Number(field === 'price' ? value : current.price) || 0;
      current.quantity = q;
      current.price = p;
      current.totalItem = q * p;
    }

    updated[idx] = current;
    setItems(updated);
  };

  // Add manual item
  const handleAddManualItem = () => {
    const newItem: TransactionItem = {
      no: items.length + 1,
      itemName: '',
      quantity: 1,
      price: 0,
      totalItem: 0,
    };
    setItems([...items, newItem]);
    setSelectedIndices([...selectedIndices, items.length]);
  };

  // Total calculation
  const totalAmount = items.reduce((sum, item) => sum + (item.totalItem || 0), 0);

  // Photo Nota Upload Handlers
  const handlePhotoCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const cleanSatdik = sanitizeFileName(satdikName);

    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = () => {
        const nextIndex = notaPhotos.length + index + 1;
        const padNum = String(nextIndex).padStart(2, '0');
        const formattedFileName = `${cleanSatdik} - NOTA ${padNum}.jpg`;

        const newNota: NotaPhoto = {
          id: `NOTA-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          fileName: formattedFileName,
          dataUrl: reader.result as string,
          uploadedAt: new Date().toISOString(),
        };

        setNotaPhotos((prev) => [...prev, newNota]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteNotaPhoto = (id: string) => {
    setNotaPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  // Save Transaction Online to Firestore
  const handleSaveTransaction = async () => {
    if (!satdikName.trim()) {
      setErrorMessage('Nama Satdik tidak boleh kosong.');
      return;
    }
    if (items.length === 0) {
      setErrorMessage('Tidak ada item transaksi untuk disimpan.');
      return;
    }
    if (!user?.uid) {
      setErrorMessage('Sesi pengguna tidak valid. Silakan login kembali.');
      return;
    }

    setSaving(true);
    setErrorMessage('');

    const txId = generateTransactionId();
    const currentDate = new Date().toISOString().slice(0, 10);
    const year = new Date().getFullYear();

    const monthNames = [
      'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
      'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
    ];
    const month = monthNames[new Date().getMonth()];

    const tempTx: Transaction = {
      id: txId,
      userId: user.uid,
      satdikName: satdikName.trim(),
      invoiceDocNumber: docNumber,
      date: currentDate,
      year,
      month,
      items,
      totalAmount,
      hasInvoicePdf: !!pdfDataUrl,
      invoicePdfData: pdfDataUrl,
      hasNota: notaPhotos.length > 0,
      notaFiles: [],
      pdfHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const filePrefix = getStandardFilePrefix(tempTx);

    // Format photo nota filenames with standard prefix [NAMA SATDIK] - [DDMMYYYY] - [001] - NOTA 01.jpg
    const formattedNotas = notaPhotos.map((nota, idx) => {
      const padNum = String(idx + 1).padStart(2, '0');
      return {
        ...nota,
        fileName: `${filePrefix} - NOTA ${padNum}.jpg`,
      };
    });

    const newTx: Transaction = {
      ...tempTx,
      invoiceFileName: `${filePrefix} - INVOICE.pdf`,
      hasNota: formattedNotas.length > 0,
      notaFiles: formattedNotas,
    };

    try {
      await saveTransactionOnline(newTx);

      // Auto-record Satdik into Customer database for this user
      try {
        await saveCustomerOnline({
          id: `CUST-${Date.now()}`,
          userId: user.uid,
          name: satdikName.trim(),
          createdAt: new Date().toISOString(),
        });
      } catch (cErr) {
        console.warn('Auto save customer info:', cErr);
      }

      setSavedTransaction(newTx);
      setStep('saved');
      onSuccess(newTx);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menyimpan transaksi online.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Import PDF Invoice & SIPLah</h1>
          <p className="text-xs text-slate-500">
            Ekstraksi data transaksi belanja sekolah/instansi secara otomatis dari PDF
          </p>
        </div>
        {step !== 'upload' && step !== 'extracting' && (
          <button
            type="button"
            onClick={() => setStep('upload')}
            className="text-xs text-slate-500 hover:text-slate-800 underline"
          >
            Reset / Upload Ulang
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* STEP 1: UPLOAD PDF */}
      {step === 'upload' && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-blue-200 p-6 sm:p-10 text-center space-y-4 hover:border-blue-400 transition bg-blue-50/20">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <Upload className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Pilih File PDF Invoice / SIPLah</h2>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Aplikasi akan membaca seluruh halaman PDF dan mengekstrak Nama Satdik, barang, kuantitas terima, serta harga sebelum PPN.
            </p>
          </div>

          <label className="inline-flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 cursor-pointer transition active:scale-95">
            <FileText className="w-5 h-5" />
            <span>PILIH PDF DARI HP</span>
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handlePdfSelected}
              className="hidden"
            />
          </label>
        </div>
      )}

      {/* STEP 2: MULTI-PAGE EXTRACTION PROGRESS */}
      {step === 'extracting' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto border border-blue-200">
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Membaca Dokumen PDF</h2>
            <p className="text-xs font-semibold text-blue-600 mt-1">
              {progress?.statusText || 'Memproses PDF...'}
            </p>
          </div>

          {progress && progress.totalPages > 0 && (
            <div className="max-w-xs mx-auto space-y-1.5">
              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.round((progress.currentPage / progress.totalPages) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Memproses semua halaman PDF ({progress.currentPage} dari {progress.totalPages})
              </p>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: REVIEW HASIL IMPORT */}
      {step === 'review' && (
        <div className="space-y-6">
          {/* Satdik Name & Document Info Card */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-600" />
                <span>Review Hasil Import PDF</span>
              </h2>
              <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-medium">
                {items.length} Item Dibaca
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NAMA SATDIK (SEKOLAH / INSTANSI)
                </label>
                <input
                  type="text"
                  value={satdikName}
                  onChange={(e) => setSatdikName(e.target.value)}
                  placeholder="Contoh: SD NEGERI CIKETING UDIK 4"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NO PROFORMA / INVOICE (OPTIONAL)
                </label>
                <input
                  type="text"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  placeholder="Contoh: 8187426/INV/PROFORMA"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-800 focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* TABLE OF ITEMS */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition active:scale-95"
                >
                  {selectedIndices.length === items.length && items.length > 0 ? (
                    <CheckSquare className="w-4 h-4 text-blue-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>PILIH SEMUA</span>
                </button>

                {selectedIndices.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>HAPUS YANG DIPILIH ({selectedIndices.length})</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddManualItem}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>TAMBAH ITEM</span>
              </button>
            </div>

            {/* Item Rows - Touch Friendly for Android */}
            <div className="divide-y divide-slate-200 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-slate-100 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3 w-10 text-center">PILIH</th>
                    <th className="p-3 w-10 text-center">NO</th>
                    <th className="p-3">NAMA BARANG</th>
                    <th className="p-3 w-20 text-center">JUMLAH</th>
                    <th className="p-3 w-32 text-right">HARGA SESUDAH PPN</th>
                    <th className="p-3 w-36 text-right">TOTAL SESUDAH PPN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {items.map((item, idx) => {
                    const isSelected = selectedIndices.includes(idx);
                    return (
                      <tr
                        key={idx}
                        className={`${
                          isSelected ? 'bg-blue-50/50' : 'bg-white hover:bg-slate-50'
                        } transition`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectRow(idx)}
                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 text-center font-medium text-slate-500">{item.no}</td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={item.itemName}
                            onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                            placeholder="Nama Barang / Jasa"
                            className={`w-full px-2.5 py-1.5 border rounded-lg text-xs font-medium ${
                              item.needsReview
                                ? 'border-amber-400 bg-amber-50 text-amber-900 font-bold'
                                : 'border-slate-300 bg-white text-slate-900'
                            }`}
                          />
                          {item.needsReview && (
                            <span className="text-[10px] text-amber-700 font-bold mt-0.5 block">
                              ⚠️ PERLU DIPERIKSA
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-center font-bold text-xs"
                          />
                        </td>
                        <td className="p-3 text-right">
                          <input
                            type="number"
                            min="0"
                            value={item.price}
                            onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                            className="w-24 px-2 py-1.5 border border-slate-300 rounded-lg text-right font-bold text-xs"
                          />
                        </td>
                        <td className="p-3 text-right font-bold text-slate-900 text-xs">
                          {formatRupiah(item.totalItem)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Total Footer */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between font-bold">
              <span className="text-sm">TOTAL TRANSAKSI ({items.length} ITEM):</span>
              <span className="text-lg text-emerald-400">{formatRupiah(totalAmount)}</span>
            </div>
          </div>

          {/* NOTA ASLI SECTION */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Foto Nota Asli (Bukti Fisik)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Format JPG/JPEG. Foto nota dan PDF invoice disimpan sebagai file terpisah.
                </p>
              </div>
              <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                {notaPhotos.length} Foto Nota
              </span>
            </div>

            {/* Photo Previews */}
            {notaPhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {notaPhotos.map((photo, pIdx) => (
                  <div
                    key={photo.id}
                    className="relative group bg-slate-100 rounded-xl overflow-hidden border border-slate-200 aspect-square"
                  >
                    <img
                      src={photo.dataUrl}
                      alt={photo.fileName}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-950/60 opacity-100 sm:opacity-0 group-hover:opacity-100 transition p-2 flex flex-col justify-between text-white text-[10px]">
                      <span className="font-semibold truncate">{photo.fileName}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotaPhoto(photo.id)}
                        className="p-1.5 bg-rose-600 text-white rounded-lg self-end hover:bg-rose-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Camera / Upload buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 py-3 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-95"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                <span>📷 AMBIL FOTO KAMERA HP</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-95"
              >
                <ImageIcon className="w-4 h-4 text-slate-600" />
                <span>📎 UPLOAD NOTA DARI GALERI</span>
              </button>

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                capture="environment"
                onChange={handlePhotoCaptured}
                className="hidden"
              />
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/jpeg,image/jpg,image/png"
                multiple
                onChange={handlePhotoCaptured}
                className="hidden"
              />
            </div>
          </div>

          {/* SAVE BUTTON */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveTransaction}
              disabled={saving}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 font-bold text-white text-base rounded-2xl shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50"
            >
              {saving ? (
                <div className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>SIMPAN TRANSAKSI KE DATABASE ONLINE</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: SAVED SUCCESS VIEW */}
      {step === 'saved' && savedTransaction && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 text-center space-y-6 shadow-sm">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
              TERSIMPAN ONLINE
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              {savedTransaction.satdikName}
            </h2>
            <p className="text-xs text-slate-500 mt-1">ID Transaksi: {savedTransaction.id}</p>
            <p className="text-lg font-bold text-emerald-700 mt-1">
              Total: {formatRupiah(savedTransaction.totalAmount)}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto pt-2">
            <button
              type="button"
              onClick={handleOpenDriveModal}
              className="py-3 px-4 bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition active:scale-95 col-span-1 sm:col-span-2"
            >
              <Upload className="w-4 h-4" />
              <span>🚀 BAGIKAN LANGSUNG KE GOOGLE DRIVE</span>
            </button>

            <button
              type="button"
              onClick={() => shareExcelTransaction(savedTransaction)}
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Excel Lokal</span>
            </button>

            <button
              type="button"
              onClick={() => shareAllTransactionFiles(savedTransaction)}
              className="py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Sheet HP</span>
            </button>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('rekap-belanja')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl"
            >
              Lihat di Rekap Belanja
            </button>
            <button
              type="button"
              onClick={() => setStep('upload')}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-xl"
            >
              + Import PDF Lainnya
            </button>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: DELETE SELECTED ROWS */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus</h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus {selectedIndices.length} data item yang dipilih? Total transaksi akan dihitung ulang secara otomatis.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 font-semibold text-slate-700 text-xs rounded-xl"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleDeleteSelectedRows}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 font-semibold text-white text-xs rounded-xl shadow"
              >
                HAPUS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DUPLICATE WARNING MODAL */}
      {duplicateWarningOpen && duplicateMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Peringatan Duplikasi PDF</h3>
            <p className="text-xs text-slate-600">
              ⚠️ PDF ini kemungkinan sudah pernah diimport sebelumnya untuk Satdik:
              <br />
              <strong className="text-slate-900 font-bold">{duplicateMatch.satdikName}</strong>
              <br />
              (Tanggal: {duplicateMatch.date}, Total: {formatRupiah(duplicateMatch.totalAmount)}).
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDuplicateWarningOpen(false);
                  setStep('upload');
                }}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 font-semibold text-slate-700 text-xs rounded-xl"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={() => setDuplicateWarningOpen(false)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-500 font-semibold text-white text-xs rounded-xl shadow"
              >
                TETAP IMPORT
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GOOGLE DRIVE SHARE MODAL */}
      <GoogleDriveShareModal
        isOpen={driveModalOpen}
        onClose={() => setDriveModalOpen(false)}
        title={driveModalTitle}
        files={driveModalFiles}
      />
    </div>
  );
};
