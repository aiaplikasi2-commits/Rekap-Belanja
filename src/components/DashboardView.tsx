import React from 'react';
import { Transaction } from '../types';
import { formatRupiah } from '../services/exportShareService';
import {
  FileText,
  Building2,
  TrendingUp,
  AlertTriangle,
  Calendar,
  PlusCircle,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';

interface DashboardViewProps {
  transactions: Transaction[];
  onNavigate: (tab: string, filter?: string) => void;
  onSelectTransaction?: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  onNavigate,
  onSelectTransaction,
}) => {
  const totalTransactions = transactions.length;
  const totalSpend = transactions.reduce((sum, tx) => sum + (tx.totalAmount || 0), 0);

  const uniqueSatdik = new Set(transactions.map((tx) => tx.satdikName?.trim().toUpperCase())).size;
  const missingNotaCount = transactions.filter((tx) => !tx.hasNota || tx.notaFiles?.length === 0).length;

  const currentMonthYear = new Date().toISOString().slice(0, 7);
  const thisMonthTransactions = transactions.filter((tx) => tx.date && tx.date.startsWith(currentMonthYear)).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-semibold mb-2 border border-blue-400/30">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>REKAP BELANJA ONLINE</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">Dashboard Rekap Belanja</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Sistem manajemen rekapitulasi transaksi belanja online terintegrasi dengan invoice PDF, foto nota asli, dan Excel.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onNavigate('import-pdf')}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/40 flex items-center gap-2 transition active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>IMPORT PDF BARU</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('rekap-belanja')}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-700 text-slate-200 font-medium text-sm rounded-xl border border-slate-700 flex items-center gap-2 transition active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-400" />
              <span>Lihat Semua Rekap</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Transaksi</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-900">{totalTransactions}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Dokumen tersimpan</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Total Belanja</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <p className="text-xl font-bold text-emerald-700 truncate">{formatRupiah(totalSpend)}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Seluruh nilai belanja</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Jumlah Satdik</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-900">{uniqueSatdik}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Sekolah / Instansi</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('rekap-belanja', 'missing-nota')}
          className="bg-amber-50/80 hover:bg-amber-100/80 text-left p-4 rounded-xl border border-amber-200 shadow-sm flex flex-col justify-between transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-amber-800 text-xs font-medium">
            <span>Belum Ada Nota</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-amber-900">{missingNotaCount}</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Membutuhkan foto nota</p>
          </div>
        </button>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Bulan Ini</span>
            <Calendar className="w-4 h-4 text-purple-600" />
          </div>
          <div className="mt-2">
            <p className="text-2xl font-bold text-slate-900">{thisMonthTransactions}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Transaksi periode ini</p>
          </div>
        </div>
      </div>

      {/* Recent Transactions Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Transaksi Terbaru</h2>
          {totalTransactions > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('rekap-belanja')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              Lihat Semua →
            </button>
          )}
        </div>

        {totalTransactions === 0 ? (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 p-6 space-y-3">
            <div className="w-12 h-12 bg-slate-200/60 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">Belum ada data transaksi.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Silakan melakukan import file PDF invoice/SIPLah untuk memulai rekapitulasi data belanja secara online.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('import-pdf')}
              className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg shadow transition inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-4 h-4" />
              <span>IMPORT PDF SEKARANG</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.slice(0, 5).map((tx) => (
              <div
                key={tx.id}
                onClick={() => onSelectTransaction?.(tx)}
                className="p-3.5 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition cursor-pointer active:bg-slate-200/60"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{tx.satdikName}</span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                      {tx.id}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>📅 {tx.date}</span>
                    <span>📦 {tx.items?.length || 0} item</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200">
                  <div className="text-right">
                    <p className="font-bold text-sm text-emerald-700">{formatRupiah(tx.totalAmount)}</p>
                  </div>

                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-medium">
                      Inv: ✅
                    </span>
                    {tx.hasNota ? (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Nota
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-600" /> Nota ⚠️
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
