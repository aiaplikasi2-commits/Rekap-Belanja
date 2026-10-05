import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileSpreadsheet,
  FileText,
  Users,
  Settings,
  Info,
  Coffee,
  LogOut,
  X,
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: string;
  onNavigate: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activeTab, onNavigate }) => {
  const { profile, logout } = useAuth();

  if (!isOpen) return null;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'import-pdf', label: 'Import PDF', icon: FileText },
    { id: 'rekap-belanja', label: 'Rekap Belanja', icon: FileSpreadsheet },
    { id: 'data-pelanggan', label: 'Data Pelanggan', icon: Users },
    { id: 'pengaturan', label: 'Pengaturan', icon: Settings },
    { id: 'tentang', label: 'Tentang', icon: Info },
    { id: 'bagi-kopi', label: 'Bagi Kopi', icon: Coffee, highlight: true },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="relative w-80 max-w-[85vw] bg-slate-900 text-slate-100 flex flex-col h-full shadow-2xl border-r border-slate-800 z-10">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-md">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white leading-tight">REKAP BELANJA ONLINE</h2>
              <p className="text-xs text-blue-400 font-semibold">Sistem Rekap Belanja</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 active:bg-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Badge & PWA Prompt */}
        <div className="p-4 bg-slate-800/60 border-b border-slate-800 space-y-2">
          <div>
            <p className="text-xs text-slate-400">Pengguna Terhubung:</p>
            <p className="text-sm font-semibold text-white truncate">{profile?.displayName || 'Pengguna'}</p>
            <p className="text-xs text-slate-400 truncate">{profile?.email}</p>
          </div>
          <div className="pt-1">
            <PWAInstallButton />
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm transition-all text-left ${
                  isActive
                    ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-600/30'
                    : item.highlight
                    ? 'bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white active:bg-slate-700'
                }`}
              >
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : item.highlight
                      ? 'text-amber-400'
                      : 'text-slate-400'
                  }`}
                />
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/50">
          <button
            type="button"
            onClick={() => {
              onClose();
              logout();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-3 rounded-xl font-medium text-sm text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 border border-rose-500/20 transition text-left active:bg-rose-500/20"
          >
            <LogOut className="w-5 h-5 shrink-0 text-rose-400" />
            <span>Keluar (Logout)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
