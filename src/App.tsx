import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthPage } from './components/AuthPage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ImportPdfView } from './components/ImportPdfView';
import { RekapBelanjaView } from './components/RekapBelanjaView';
import { DataPelangganView } from './components/DataPelangganView';
import { PengaturanView } from './components/PengaturanView';
import { TentangView } from './components/TentangView';
import { BagiKopiView } from './components/BagiKopiView';
import { Transaction, Customer } from './types';
import { getUserTransactionsOnline } from './services/transactionService';
import { getUserCustomersOnline } from './services/customerService';

const MainAppContent: React.FC = () => {
  const { user, loading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [rekapFilter, setRekapFilter] = useState<string | undefined>(undefined);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Load online transactions & customers from Firestore
  const refreshOnlineData = useCallback(async () => {
    if (!user?.uid) return;
    setDataLoading(true);
    try {
      const [txs, custs] = await Promise.all([
        getUserTransactionsOnline(user.uid),
        getUserCustomersOnline(user.uid),
      ]);
      setTransactions(txs);
      setCustomers(custs);
    } catch (err) {
      console.error('Error fetching online data:', err);
    } finally {
      setDataLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshOnlineData();
    }
  }, [user, refreshOnlineData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-300">Memuat Rekap Belanja Online...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const handleNavigate = (tab: string, filter?: string) => {
    setActiveTab(tab);
    setRekapFilter(filter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleImportSuccess = (newTx: Transaction) => {
    refreshOnlineData();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <Navbar
        onOpenSidebar={() => setSidebarOpen(true)}
        onNavigate={(tab) => handleNavigate(tab)}
      />

      {/* Drawer Menu */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab={activeTab}
        onNavigate={(tab) => handleNavigate(tab)}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {dataLoading && transactions.length === 0 && (
          <div className="py-2 text-center text-xs text-blue-600 font-semibold animate-pulse mb-3">
            Menyingkronkan data online...
          </div>
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            transactions={transactions}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'import-pdf' && (
          <ImportPdfView
            onSuccess={handleImportSuccess}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'rekap-belanja' && (
          <RekapBelanjaView
            transactions={transactions}
            onRefresh={refreshOnlineData}
            initialFilter={rekapFilter}
          />
        )}

        {activeTab === 'data-pelanggan' && (
          <DataPelangganView
            customers={customers}
            onRefresh={refreshOnlineData}
          />
        )}

        {activeTab === 'pengaturan' && <PengaturanView />}

        {activeTab === 'tentang' && <TentangView />}

        {activeTab === 'bagi-kopi' && <BagiKopiView />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}
