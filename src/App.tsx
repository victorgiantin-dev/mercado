import React from 'react';
import { SupermarketProvider, useSupermarket } from './context/SupermarketContext';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { EstoqueView } from './components/EstoqueView';
import { VendasPDVView } from './components/VendasPDVView';
import { HistoricoVendasView } from './components/HistoricoVendasView';
import { SupabaseView } from './components/SupabaseView';

const AppContent: React.FC = () => {
  const { activeTab } = useSupermarket();

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-800 antialiased selection:bg-emerald-500 selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'vendas' && <VendasPDVView />}
        {activeTab === 'estoque' && <EstoqueView />}
        {activeTab === 'historico' && <HistoricoVendasView />}
        {activeTab === 'supabase' && <SupabaseView />}
      </main>

      <footer className="bg-white border-t border-slate-200/80 py-4 text-center text-xs text-slate-500 print:hidden">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} Supermercado Gestão Pro • Sistema de Vendas, Estoque e Relatórios</p>
          <div className="flex items-center space-x-3 text-slate-400">
            <span>Módulos: Estoque | Vendas | Dashboard</span>
            <span>•</span>
            <span>Conectado com Supabase & LocalStorage</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <SupermarketProvider>
      <AppContent />
    </SupermarketProvider>
  );
}
