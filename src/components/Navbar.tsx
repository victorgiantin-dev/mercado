import React from 'react';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Receipt, 
  Store,
  AlertTriangle
} from 'lucide-react';
import { useSupermarket } from '../context/SupermarketContext';

export const Navbar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    products, 
    supabaseConfig 
  } = useSupermarket();

  const lowStockCount = products.filter(
    (p) => p.current_stock <= p.min_stock
  ).length;

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Store Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">
                  Supermercado <span className="text-emerald-400 font-extrabold">Gestão Pro</span>
                </span>
                <span className="text-[10px] uppercase font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800/80 px-1.5 py-0.5 rounded">
                  ERP & PDV
                </span>
              </div>
              <p className="text-xs text-slate-400">Controle de Vendas, Estoque e Relatórios</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('vendas')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'vendas'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Frente de Caixa (PDV)</span>
            </button>

            <button
              onClick={() => setActiveTab('estoque')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all relative ${
                activeTab === 'estoque'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Estoque</span>
              {lowStockCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-500 text-slate-950 flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-0.5" />
                  {lowStockCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'historico'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Receipt className="w-4 h-4" />
              <span>Histórico de Vendas</span>
            </button>
          </nav>

          {/* Right Status */}
          <div className="flex items-center space-x-3">
            {supabaseConfig.isConnected && (
              <div 
                title="Banco de dados sincronizado na nuvem"
                className="hidden sm:flex items-center space-x-1.5 text-xs bg-emerald-950/60 border border-emerald-700/40 text-emerald-300 px-2.5 py-1 rounded-full"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[11px] font-medium">Supabase Ativo</span>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2 rounded ${
              activeTab === 'dashboard' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            <span>Dashboard</span>
          </button>
          <button
            onClick={() => setActiveTab('vendas')}
            className={`flex flex-col items-center py-1 px-2 rounded ${
              activeTab === 'vendas' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <ShoppingCart className="w-4 h-4 mb-0.5" />
            <span>PDV</span>
          </button>
          <button
            onClick={() => setActiveTab('estoque')}
            className={`flex flex-col items-center py-1 px-2 rounded relative ${
              activeTab === 'estoque' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Package className="w-4 h-4 mb-0.5" />
            <span>Estoque</span>
            {lowStockCount > 0 && (
              <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex flex-col items-center py-1 px-2 rounded ${
              activeTab === 'historico' ? 'text-emerald-400 font-semibold' : 'text-slate-400'
            }`}
          >
            <Receipt className="w-4 h-4 mb-0.5" />
            <span>Histórico</span>
          </button>
        </div>
      </div>
    </header>
  );
};
