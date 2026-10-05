import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Customer } from '../types';
import { saveCustomerOnline, deleteCustomerOnline } from '../services/customerService';
import { useAuth } from '../context/AuthContext';
import {
  Users,
  Plus,
  Trash2,
  Search,
  Download,
  Upload,
  CheckSquare,
  Square,
  AlertTriangle,
} from 'lucide-react';

interface DataPelangganViewProps {
  customers: Customer[];
  onRefresh: () => void;
}

export const DataPelangganView: React.FC<DataPelangganViewProps> = ({ customers, onRefresh }) => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');

  // Multi-selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);

  // Single Add modal
  const [modalOpen, setModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const importFileRef = useRef<HTMLInputElement>(null);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerName.trim() || !user?.uid) return;

    setSaving(true);
    const newCust: Customer = {
      id: `CUST-${Date.now()}`,
      userId: user.uid,
      name: newCustomerName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      createdAt: new Date().toISOString(),
    };

    await saveCustomerOnline(newCust);
    setNewCustomerName('');
    setPhone('');
    setAddress('');
    setModalOpen(false);
    setSaving(false);
    onRefresh();
  };

  // Download Excel Template
  const handleDownloadTemplate = () => {
    const templateRows = [
      { NO: 1, 'NAMA PELANGGAN': 'SD NEGERI 01 SUKAMAJU', TELEPON: '081234567890', ALAMAT: 'Jl. Merdeka No. 1' },
      { NO: 2, 'NAMA PELANGGAN': 'SMPIT AL IKHLAS', TELEPON: '081987654321', ALAMAT: 'Jl. Pendidikan No. 5' },
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateRows);
    worksheet['!cols'] = [
      { wch: 6 },  // NO
      { wch: 35 }, // NAMA PELANGGAN
      { wch: 18 }, // TELEPON
      { wch: 35 }, // ALAMAT
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Pelanggan');

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'TEMPLATE_DATA_PELANGGAN.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Import Excel
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;

    setSaving(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

      for (let i = 0; i < jsonRows.length; i++) {
        const row = jsonRows[i];
        const nameVal = row['NAMA PELANGGAN'] || row['NAMA SATDIK'] || row['NAMA'] || row['Nama Pelanggan'];
        if (nameVal && String(nameVal).trim() !== '') {
          const cust: Customer = {
            id: `CUST-${Date.now()}-${i}`,
            userId: user.uid,
            name: String(nameVal).trim(),
            phone: String(row['TELEPON'] || row['KONTAK'] || '').trim(),
            address: String(row['ALAMAT'] || '').trim(),
            createdAt: new Date().toISOString(),
          };
          await saveCustomerOnline(cust);
        }
      }

      onRefresh();
    } catch (err) {
      console.error('Error importing customer excel:', err);
      alert('Gagal mengimpor file Excel data pelanggan.');
    } finally {
      setSaving(false);
      if (e.target) e.target.value = '';
    }
  };

  // Multi Selection Handlers
  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.id));
    }
  };

  const toggleSelectCustomer = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    setSaving(true);
    for (const id of selectedIds) {
      await deleteCustomerOnline(id);
    }
    setSelectedIds([]);
    setBulkDeleteConfirmOpen(false);
    setSaving(false);
    onRefresh();
  };

  const filtered = customers.filter((c) =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header & Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Data Pelanggan / Satdik</h1>
          <p className="text-xs text-slate-500">
            Daftar sekolah dan pelanggan terdaftar
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 transition active:scale-95"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Download Template</span>
          </button>

          <button
            type="button"
            onClick={() => importFileRef.current?.click()}
            className="px-3 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
          >
            <Upload className="w-4 h-4" />
            <span>Import Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Pelanggan</span>
          </button>

          <input
            ref={importFileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImportExcel}
            className="hidden"
          />
        </div>
      </div>

      {/* Search & Bulk Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Cari nama pelanggan / sekolah..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:border-blue-600"
          />
        </div>

        {filtered.length > 0 && (
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={toggleSelectAll}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-300 flex items-center gap-1.5 transition"
            >
              {selectedIds.length === filtered.length && filtered.length > 0 ? (
                <CheckSquare className="w-4 h-4 text-blue-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span>PILIH SEMUA</span>
            </button>

            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl shadow flex items-center gap-1.5 transition active:scale-95"
              >
                <Trash2 className="w-4 h-4" />
                <span>HAPUS YANG DIPILIH ({selectedIds.length})</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-sm">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Belum ada data pelanggan.</p>
          <p className="text-xs text-slate-500">
            Gunakan tombol Tambah Pelanggan atau Import Excel untuk memasukkan daftar sekolah/pelanggan Anda.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="p-3 w-10 text-center">PILIH</th>
                <th className="p-3 w-12 text-center">NO</th>
                <th className="p-3">NAMA PELANGGAN / SATDIK</th>
                <th className="p-3">TELEPON / WA</th>
                <th className="p-3">ALAMAT</th>
                <th className="p-3 w-12 text-center">AKSI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filtered.map((c, idx) => {
                const isSelected = selectedIds.includes(c.id);
                return (
                  <tr key={c.id} className={isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}>
                    <td className="p-3 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectCustomer(c.id)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center font-medium text-slate-400">{idx + 1}</td>
                    <td className="p-3 font-bold text-slate-900">{c.name}</td>
                    <td className="p-3 text-slate-600">{c.phone || '-'}</td>
                    <td className="p-3 text-slate-600">{c.address || '-'}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedIds([c.id]);
                          setBulkDeleteConfirmOpen(true);
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                        title="Hapus Pelanggan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* SINGLE ADD MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Tambah Pelanggan Baru</h3>
            <form onSubmit={handleAddCustomer} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NAMA PELANGGAN / SATDIK *
                </label>
                <input
                  type="text"
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  placeholder="Contoh: SD NEGERI SUKAMAJU 1"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  NO TELEPON / WA
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0812xxxxxxx"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">ALAMAT</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Alamat sekolah / instansi"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium h-20"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 font-semibold text-slate-700 text-xs rounded-xl"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 font-semibold text-white text-xs rounded-xl shadow disabled:opacity-50"
                >
                  SIMPAN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK DELETE CONFIRMATION MODAL */}
      {bulkDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 text-center shadow-2xl">
            <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Konfirmasi Hapus Pelanggan</h3>
            <p className="text-xs text-slate-600">
              Apakah Anda yakin ingin menghapus {selectedIds.length} data pelanggan yang dipilih secara permanen?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteConfirmOpen(false)}
                className="flex-1 py-2.5 bg-slate-200 hover:bg-slate-300 font-semibold text-slate-700 text-xs rounded-xl"
              >
                BATAL
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={saving}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 font-semibold text-white text-xs rounded-xl shadow disabled:opacity-50"
              >
                HAPUS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
