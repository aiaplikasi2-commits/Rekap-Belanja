import React, { useState, useRef } from 'react';
import { Transaction, NotaPhoto } from '../types';
import {
  formatRupiah,
  sanitizeFileName,
  getStandardFilePrefix,
  shareExcelTransaction,
  shareAllTransactionsExcel,
  shareAllTransactionFiles,
  shareNotaPhoto,
  shareAllNotas,
  triggerDownload,
  dataUrlToFile,
  prepareTransactionDriveFiles,
  prepareMasterDriveFiles,
} from '../services/exportShareService';
import { addNotaPhotosOnline, deleteTransactionOnline } from '../services/transactionService';
import { GoogleDriveShareModal, FileToUpload } from './GoogleDriveShareModal';
import {
  Search,
  Filter,
  FileSpreadsheet,
  Share2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  Trash2,
  Camera,
  Plus,
  Cloud,
  X,
  FileText,
  Building2,
  Calendar,
} from 'lucide-react';

interface RekapBelanjaViewProps {
  transactions: Transaction[];
  onRefresh: () => void;
  initialFilter?: string;
}

export const RekapBelanjaView: React.FC<RekapBelanjaViewProps> = ({
  transactions,
  onRefresh,
  initialFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedSatdik, setSelectedSatdik] = useState<string>('ALL');
  const [notaFilter, setNotaFilter] = useState<'ALL' | 'HAS_NOTA' | 'MISSING_NOTA'>(
    initialFilter === 'missing-nota' ? 'MISSING_NOTA' : 'ALL'
  );

  // Selected Transaction for Detail Modal
  const [activeTx, setActiveTx] = useState<Transaction | null>(null);
  const [activeNotaViewer, setActiveNotaViewer] = useState<NotaPhoto | null>(null);
  const [addingNota, setAddingNota] = useState(false);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);

  // Google Drive Share Modal state
  const [driveModalOpen, setDriveModalOpen] = useState(false);
  const [driveModalTitle, setDriveModalTitle] = useState('');
  const [driveModalFiles, setDriveModalFiles] = useState<FileToUpload[]>([]);

  const handleShareMasterDrive = () => {
    const files = prepareMasterDriveFiles(filteredTransactions);
    setDriveModalTitle('Bagikan Rekap Keseluruhan ke Google Drive');
    setDriveModalFiles(files);
    setDriveModalOpen(true);
  };

  const handleShareSingleDrive = (tx: Transaction) => {
    const files = prepareTransactionDriveFiles(tx);
    setDriveModalTitle(`Bagikan File ${tx.satdikName} ke Google Drive`);
    setDriveModalFiles(files);
    setDriveModalOpen(true);
  };

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Unique dropdown filter options
  const monthList = [
    'JANUARI', 'FEBRUARI', 'MARET', 'APRIL', 'MEI', 'JUNI',
    'JULI', 'AGUSTUS', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DESEMBER'
  ];
  const yearList = Array.from(new Set(transactions.map((t) => t.year).filter(Boolean)));
  const satdikList = Array.from(
    new Set(transactions.map((t) => t.satdikName?.trim()).filter(Boolean))
  );

  // Filter logic
  const filteredTransactions = transactions.filter((tx) => {
    // Search
    const queryStr = searchTerm.toLowerCase();
    const matchSatdik = tx.satdikName?.toLowerCase().includes(queryStr);
    const matchDate = tx.date?.includes(queryStr);
    const matchItems = tx.items?.some((it) => it.itemName?.toLowerCase().includes(queryStr));
    const matchSearch = matchSatdik || matchDate || matchItems;

    if (!matchSearch) return false;

    // Month
    if (selectedMonth !== 'ALL' && tx.month !== selectedMonth) return false;

    // Year
    if (selectedYear !== 'ALL' && String(tx.year) !== selectedYear) return false;

    // Satdik
    if (selectedSatdik !== 'ALL' && tx.satdikName !== selectedSatdik) return false;

    // Nota
    if (notaFilter === 'HAS_NOTA' && (!tx.hasNota || tx.notaFiles?.length === 0)) return false;
    if (notaFilter === 'MISSING_NOTA' && tx.hasNota && tx.notaFiles?.length > 0) return false;

    return true;
  });

  // Upload missing photo note later
  const handleAddNotaToExisting = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!activeTx) return;
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAddingNota(true);
    const prefix = getStandardFilePrefix(activeTx);
    const newNotas: NotaPhoto[] = [];

    const readPromises = Array.from(files).map((file, idx) => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => {
          const nextIdx = (activeTx.notaFiles?.length || 0) + idx + 1;
          const padNum = String(nextIdx).padStart(2, '0');
          newNotas.push({
            id: `NOTA-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            fileName: `${prefix} - NOTA ${padNum}.jpg`,
            dataUrl: reader.result as string,
            uploadedAt: new Date().toISOString(),
          });
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    await Promise.all(readPromises);

    const updated = await addNotaPhotosOnline(activeTx.id, newNotas);
    if (updated) {
      setActiveTx(updated);
      onRefresh();
    }
    setAddingNota(false);
  };

  const handleDeleteTransaction = async (id: string) => {
    await deleteTransactionOnline(id);
    setDeletingTxId(null);
    if (activeTx?.id === id) setActiveTx(null);
    onRefresh();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Rekap Belanja Online</h1>
          <p className="text-xs text-slate-500">
            Arsip transaksi belanja tersimpan online
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filteredTransactions.length > 0 && (
            <button
              type="button"
              onClick={handleShareMasterDrive}
              className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>📊 BAGIKAN REKAP KESELURUHAN (GOOGLE DRIVE)</span>
            </button>
          )}
          <div className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-2 rounded-xl border border-blue-200">
            Total: {filteredTransactions.length} Transaksi
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari Satdik, nama barang, atau tanggal..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-600"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Month Filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">Semua Bulan</option>
            {monthList.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>

          {/* Year Filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">Semua Tahun</option>
            {yearList.map((y) => (
              <option key={y} value={String(y)}>
                {y}
              </option>
            ))}
          </select>

          {/* Satdik Filter */}
          <select
            value={selectedSatdik}
            onChange={(e) => setSelectedSatdik(e.target.value)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none truncate"
          >
            <option value="ALL">Semua Satdik</option>
            {satdikList.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Nota Status Filter */}
          <select
            value={notaFilter}
            onChange={(e) => setNotaFilter(e.target.value as any)}
            className="p-2 bg-slate-50 border border-slate-300 rounded-lg font-medium text-slate-800 focus:outline-none"
          >
            <option value="ALL">Semua Status Nota</option>
            <option value="HAS_NOTA">Ada Nota Asli</option>
            <option value="MISSING_NOTA">Belum Ada Nota ⚠️</option>
          </select>
        </div>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-700">Belum ada data transaksi yang sesuai.</p>
          <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTransactions.map((tx) => (
            <div
              key={tx.id}
              className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow transition space-y-3"
            >
              <div className="flex items-start justify-between gap-2 border-b pb-2.5 border-slate-100">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{tx.satdikName}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="font-mono bg-slate-100 px-1.5 py-0.2 rounded">{tx.id}</span>
                    <span>📅 {tx.date}</span>
                    <span>📦 {tx.items?.length || 0} Item</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-emerald-700">{formatRupiah(tx.totalAmount)}</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium text-[11px]">
                    Invoice: ✅ Ada
                  </span>
                  {tx.hasNota && tx.notaFiles?.length > 0 ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium text-[11px] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Nota: ✅ Ada ({tx.notaFiles.length})</span>
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-600" />
                      <span>Nota: ⚠️ Belum diupload</span>
                    </span>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => shareExcelTransaction(tx)}
                    className="p-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    <span className="hidden sm:inline">Excel</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareSingleDrive(tx)}
                    className="p-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                    title="Bagikan ke Google Drive"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="hidden sm:inline">Bagikan ke Drive</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTx(tx)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Detail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeletingTxId(tx.id)}
                    className="p-1.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-semibold flex items-center gap-1"
                    title="Hapus Transaksi Ini"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL */}
      {activeTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-5 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setActiveTx(null)}
              className="absolute right-4 top-4 p-1.5 text-slate-400 hover:text-slate-800 rounded-lg bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-bold">
                {activeTx.id}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{activeTx.satdikName}</h2>
              <p className="text-xs text-slate-500">
                Tanggal: {activeTx.date} | Periode: {activeTx.month} {activeTx.year}
              </p>
            </div>

            {/* Status Checklist */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between text-xs gap-2">
              <div>
                <strong>Status Invoice:</strong> ✅ Ada ({activeTx.invoiceFileName || 'PDF Invoice'})
              </div>
              <div>
                <strong>Status Nota Asli:</strong>{' '}
                {activeTx.hasNota && activeTx.notaFiles?.length > 0 ? (
                  <span className="text-emerald-700 font-bold">✅ Ada ({activeTx.notaFiles.length} foto)</span>
                ) : (
                  <span className="text-amber-700 font-bold">⚠️ Belum diupload</span>
                )}
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => shareExcelTransaction(activeTx)}
                className="py-2.5 px-3 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>📊 EXPORT EXCEL</span>
              </button>

              <button
                type="button"
                onClick={() => shareAllTransactionFiles(activeTx)}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                <span>📤 BAGIKAN</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (activeTx.invoicePdfData) {
                    const cleanSatdik = sanitizeFileName(activeTx.satdikName);
                    const f = dataUrlToFile(activeTx.invoicePdfData, `${cleanSatdik} - INVOICE.pdf`);
                    triggerDownload(f, f.name);
                  }
                }}
                disabled={!activeTx.invoicePdfData}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                <span>📄 LIHAT INVOICE</span>
              </button>

              <button
                type="button"
                onClick={() => shareAllTransactionFiles(activeTx)}
                className="py-2.5 px-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Cloud className="w-4 h-4" />
                <span>☁️ SIMPAN KE DRIVE</span>
              </button>

              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="py-2.5 px-3 bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-sm col-span-2 sm:col-span-1"
              >
                <Plus className="w-4 h-4" />
                <span>+ TAMBAH NOTA ASLI</span>
              </button>
            </div>

            {/* Item List Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-100 text-xs font-bold text-slate-700 border-b">
                Daftar Barang / Jasa ({activeTx.items?.length || 0} Item)
              </div>
              <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold text-[10px]">
                    <tr>
                      <th className="p-2 text-center w-8">NO</th>
                      <th className="p-2">NAMA BARANG</th>
                      <th className="p-2 text-center w-16">JUMLAH</th>
                      <th className="p-2 text-right">HARGA</th>
                      <th className="p-2 text-right">TOTAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeTx.items?.map((it, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="p-2 text-center text-slate-400">{it.no}</td>
                        <td className="p-2 font-medium text-slate-900">{it.itemName}</td>
                        <td className="p-2 text-center">{it.quantity}</td>
                        <td className="p-2 text-right">{formatRupiah(it.price)}</td>
                        <td className="p-2 text-right font-bold text-slate-900">
                          {formatRupiah(it.totalItem)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-3 bg-slate-900 text-white font-bold text-xs flex justify-between">
                <span>TOTAL TRANSAKSI:</span>
                <span className="text-emerald-400">{formatRupiah(activeTx.totalAmount)}</span>
              </div>
            </div>

            {/* Photo Notas Gallery */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Bukti Nota Asli ({activeTx.notaFiles?.length || 0})</span>
                </h4>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="text-[11px] text-blue-600 font-semibold hover:underline"
                  >
                    + Kamera
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="text-[11px] text-blue-600 font-semibold hover:underline"
                  >
                    + Galeri
                  </button>
                </div>
              </div>

              {activeTx.notaFiles && activeTx.notaFiles.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {activeTx.notaFiles.map((nota) => (
                    <div
                      key={nota.id}
                      onClick={() => setActiveNotaViewer(nota)}
                      className="group relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 aspect-square cursor-pointer"
                    >
                      <img src={nota.dataUrl} alt={nota.fileName} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[10px] font-semibold text-center p-1">
                        {nota.fileName}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-center text-xs text-amber-800 space-y-2">
                  <p className="font-semibold">⚠️ Belum Ada Foto Nota Asli</p>
                  <p className="text-[11px] text-amber-700">
                    Silakan ambil foto nota dengan kamera atau pilih dari galeri HP Anda.
                  </p>
                </div>
              )}
            </div>

            {/* Hidden Inputs for Adding Nota */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              capture="environment"
              onChange={handleAddNotaToExisting}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png"
              multiple
              onChange={handleAddNotaToExisting}
              className="hidden"
            />

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t flex justify-between items-center">
              <button
                type="button"
                onClick={() => setDeletingTxId(activeTx.id)}
                className="text-xs text-rose-600 hover:text-rose-800 font-semibold flex items-center gap-1"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Transaksi</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTx(null)}
                className="px-4 py-2 bg-slate-800 text-white font-semibold text-xs rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FULL PHOTO NOTA PREVIEW MODAL */}
      {activeNotaViewer && activeTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md">
          <div className="relative max-w-xl w-full bg-slate-900 rounded-2xl p-4 text-white space-y-4 shadow-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveNotaViewer(null)}
              className="absolute right-3 top-3 p-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="font-bold text-sm text-slate-200 truncate pr-8">
              {activeNotaViewer.fileName}
            </h3>

            <div className="max-h-[60vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
              <img
                src={activeNotaViewer.dataUrl}
                alt={activeNotaViewer.fileName}
                className="max-h-[60vh] w-auto object-contain"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => shareNotaPhoto(activeTx, activeNotaViewer)}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Bagikan Foto Nota Ini</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingTxId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Hapus Transaksi?</h3>
            <p className="text-xs text-slate-600">
              Transaksi dan seluruh berkas rekap ini akan dihapus permanen dari database online.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingTxId(null)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 font-semibold text-slate-700 text-xs rounded-xl"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={() => handleDeleteTransaction(deletingTxId)}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 font-semibold text-white text-xs rounded-xl shadow"
              >
                HAPUS
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
