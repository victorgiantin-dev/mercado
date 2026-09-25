import React, { useState } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Package, 
  ShoppingCart, 
  AlertTriangle, 
  Percent, 
  ArrowUpRight, 
  Printer, 
  PlusCircle, 
  CreditCard,
  Layers,
  Calendar,
  CheckCircle2,
  Award
} from 'lucide-react';
import { useSupermarket } from '../context/SupermarketContext';
import { formatCurrency, formatQuantity, formatDate } from '../utils/formatters';

export const DashboardView: React.FC = () => {
  const { products, sales, setActiveTab } = useSupermarket();
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7days' | 'month'>('all');

  // Filtra vendas ativas (desconsidera canceladas)
  const activeSales = sales.filter((s) => s.status === 'completed');

  // Filtro por período
  const now = new Date();
  const filteredSales = activeSales.filter((s) => {
    if (periodFilter === 'all') return true;
    const saleDate = new Date(s.created_at);
    if (periodFilter === 'today') {
      return saleDate.toDateString() === now.toDateString();
    }
    if (periodFilter === '7days') {
      const diffTime = Math.abs(now.getTime() - saleDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays <= 7;
    }
    if (periodFilter === 'month') {
      return (
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear()
      );
    }
    return true;
  });

  // Métricas de Vendas
  const totalRevenue = filteredSales.reduce((acc, s) => acc + s.total, 0);
  const totalCostOfSoldItems = filteredSales.reduce((acc, s) => {
    const saleCost = s.items.reduce((itemAcc, item) => itemAcc + (item.cost_price * item.quantity), 0);
    return acc + saleCost;
  }, 0);

  const grossProfit = totalRevenue - totalCostOfSoldItems;
  const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
  const totalSalesCount = filteredSales.length;
  const averageTicket = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

  // Métricas de Estoque
  const totalStockUnits = products.reduce((acc, p) => acc + p.current_stock, 0);
  const totalStockCostValue = products.reduce((acc, p) => acc + (p.cost_price * p.current_stock), 0);
  const totalStockSaleValue = products.reduce((acc, p) => acc + (p.sale_price * p.current_stock), 0);
  const potentialStockProfit = totalStockSaleValue - totalStockCostValue;

  // Alertas de estoque
  const lowStockProducts = products.filter((p) => p.current_stock <= p.min_stock);
  const outOfStockProducts = products.filter((p) => p.current_stock <= 0);

  // Vendas por Forma de Pagamento
  const paymentBreakdown: Record<string, { count: number; total: number }> = {};
  filteredSales.forEach((s) => {
    const method = s.payment_method;
    if (!paymentBreakdown[method]) {
      paymentBreakdown[method] = { count: 0, total: 0 };
    }
    paymentBreakdown[method].count += 1;
    paymentBreakdown[method].total += s.total;
  });

  // Ranking de Produtos Mais Vendidos
  const productSalesMap: Record<string, { name: string; quantity: number; revenue: number; unit: string }> = {};
  filteredSales.forEach((s) => {
    s.items.forEach((item) => {
      if (!productSalesMap[item.product_id]) {
        productSalesMap[item.product_id] = {
          name: item.product_name,
          quantity: 0,
          revenue: 0,
          unit: item.unit,
        };
      }
      productSalesMap[item.product_id].quantity += item.quantity;
      productSalesMap[item.product_id].revenue += item.total;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  // Estoque por Categoria
  const categoryStockMap: Record<string, { count: number; value: number }> = {};
  products.forEach((p) => {
    const cat = p.category || 'Geral';
    if (!categoryStockMap[cat]) {
      categoryStockMap[cat] = { count: 0, value: 0 };
    }
    categoryStockMap[cat].count += p.current_stock;
    categoryStockMap[cat].value += p.sale_price * p.current_stock;
  });

  // Gráfico Diário de Vendas (últimos 7 dias com movimentação)
  const salesByDayMap: Record<string, number> = {};
  filteredSales.forEach((s) => {
    const day = formatDate(s.created_at);
    salesByDayMap[day] = (salesByDayMap[day] || 0) + s.total;
  });
  const salesByDayArray = Object.entries(salesByDayMap).slice(-7);
  const maxDayRevenue = Math.max(...salesByDayArray.map(([_, v]) => v), 1);

  // Ação de Impressão do Relatório
  const handlePrintReport = () => {
    window.print();
  };

  const isCompletelyEmpty = products.length === 0 && sales.length === 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Boas-Vindas e Ações Rápidas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Dashboard de Relatórios
            </h1>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full">
              Visão Geral
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Indicadores gerenciais calculados em tempo real a partir dos produtos e vendas cadastrados.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* Seletor de Período */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium text-slate-600">
            <button
              onClick={() => setPeriodFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Tudo
            </button>
            <button
              onClick={() => setPeriodFilter('today')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodFilter === 'today'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setPeriodFilter('7days')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodFilter === '7days'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              7 Dias
            </button>
            <button
              onClick={() => setPeriodFilter('month')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                periodFilter === 'month'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'hover:text-slate-900'
              }`}
            >
              Este Mês
            </button>
          </div>

          <button
            onClick={handlePrintReport}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Imprimir ou Salvar Relatório em PDF"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Se o sistema estiver 100% vazio (sem mock data, como solicitado), exibir tela orientadora amigável */}
      {isCompletelyEmpty && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border-2 border-dashed border-emerald-200 rounded-3xl p-8 text-center max-w-3xl mx-auto shadow-xs">
          <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Sistema Pronto para Cadastrar suas Informações
          </h2>
          <p className="text-slate-600 text-sm max-w-lg mx-auto mb-6">
            Conforme sua instrução, nenhum produto ou venda de exemplo foi criado. O sistema está completamente limpo e pronto para você cadastrar seus dados reais de estoque e registrar suas vendas!
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => setActiveTab('estoque')}
              className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Cadastrar Primeiro Produto no Estoque</span>
            </button>
            <button
              onClick={() => setActiveTab('vendas')}
              className="flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <span>Ir para Frente de Caixa (PDV)</span>
            </button>
          </div>
        </div>
      )}

      {/* Cards de Métricas Principais (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Faturamento Total
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <span>{totalSalesCount} venda{totalSalesCount !== 1 ? 's' : ''} realizada{totalSalesCount !== 1 ? 's' : ''}</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
        </div>

        {/* Lucro Estimado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-teal-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Lucro Bruto Realizado
            </span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(grossProfit)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
              <Percent className="w-3.5 h-3.5 text-teal-600" />
              <span className="font-semibold text-teal-700">{profitMargin.toFixed(1)}%</span>
              <span>margem média</span>
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-cyan-400" />
        </div>

        {/* Valor do Estoque */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Patrimônio em Estoque
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(totalStockSaleValue)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Custo: <span className="font-medium text-slate-700">{formatCurrency(totalStockCostValue)}</span> ({products.length} itens)
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-400" />
        </div>

        {/* Ticket Médio & Alertas */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Ticket Médio
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900">
              {formatCurrency(averageTicket)}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
              {lowStockProducts.length > 0 ? (
                <span className="text-amber-600 font-semibold flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  {lowStockProducts.length} item(ns) com estoque baixo
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Estoque em níveis normais
                </span>
              )}
            </p>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-pink-400" />
        </div>
      </div>

      {/* Alerta de Estoque Baixo em Destaque (se houver) */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900 text-sm">
                Atenção: {lowStockProducts.length} produto(s) atingiram o nível de reposição
              </h3>
              <p className="text-xs text-amber-800 mt-0.5">
                {outOfStockProducts.length > 0
                  ? `${outOfStockProducts.length} produto(s) estão totalmente esgotados.`
                  : 'Alguns itens estão próximos de acabar.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('estoque')}
            className="self-start sm:self-auto text-xs bg-amber-600 hover:bg-amber-700 text-white font-semibold px-3.5 py-2 rounded-xl transition-colors shrink-0 cursor-pointer"
          >
            Ver Produtos em Alerta
          </button>
        </div>
      )}

      {/* Seção 2: Gráficos e Distribuições */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de Faturamento Recente */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Faturamento por Data</h3>
              <p className="text-xs text-slate-500">Evolução dos valores arrecadados nas vendas registradas</p>
            </div>
            <span className="text-xs font-semibold text-slate-400 flex items-center">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              Histórico
            </span>
          </div>

          {salesByDayArray.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              <Calendar className="w-8 h-8 text-slate-300 mb-2" />
              <p>Nenhuma venda registrada ainda no período selecionado.</p>
              <button
                onClick={() => setActiveTab('vendas')}
                className="mt-2 text-xs text-emerald-600 font-semibold hover:underline"
              >
                Abrir PDV para registrar venda
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {salesByDayArray.map(([day, val]) => {
                const percentage = (val / maxDayRevenue) * 100;
                return (
                  <div key={day} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{day}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(val)}</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(percentage, 4)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Vendas por Meio de Pagamento */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-base">Meios de Pagamento</h3>
              <p className="text-xs text-slate-500">Distribuição financeira das vendas</p>
            </div>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>

          {Object.keys(paymentBreakdown).length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              <CreditCard className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs text-center px-4">Cadastre vendas no PDV para visualizar os métodos de pagamento mais utilizados.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(paymentBreakdown).map(([method, data]) => {
                const pct = totalRevenue > 0 ? (data.total / totalRevenue) * 100 : 0;
                let label = method;
                if (method === 'dinheiro') label = 'Dinheiro';
                if (method === 'cartao_credito') label = 'Cartão de Crédito';
                if (method === 'cartao_debito') label = 'Cartão de Débito';
                if (method === 'pix') label = 'PIX';
                if (method === 'vale_alimentacao') label = 'Vale Alimentação';

                return (
                  <div key={method} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-center text-xs mb-1">
                      <span className="font-semibold text-slate-800 capitalize">{label}</span>
                      <span className="font-bold text-slate-900">{formatCurrency(data.total)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 mb-1.5">
                      <span>{data.count} transação(ões)</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Seção 3: Top Produtos Mais Vendidos e Resumo de Categorias */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Produtos Mais Vendidos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Top Produtos Mais Vendidos</h3>
                <p className="text-xs text-slate-500">Ranking por quantidade e faturamento</p>
              </div>
            </div>
          </div>

          {topProducts.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              Nenhuma venda de produto cadastrado ainda.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {topProducts.map((p, index) => (
                <div key={index} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {formatQuantity(p.quantity, p.unit)} vendidos
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(p.revenue)}</p>
                    <span className="text-[11px] text-emerald-600 font-medium">Receita</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Estoque por Categoria */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Estoque por Categoria</h3>
                <p className="text-xs text-slate-500">Composição do inventário cadastrado</p>
              </div>
            </div>
            <button
              onClick={() => setActiveTab('estoque')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold flex items-center"
            >
              <span>Gerenciar</span>
              <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>

          {Object.keys(categoryStockMap).length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              Nenhuma categoria ou produto cadastrado no estoque ainda.
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(categoryStockMap).map(([category, val]) => (
                <div key={category} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{category}</p>
                      <p className="text-xs text-slate-500">{val.count} unidades/kg no estoque</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(val.value)}</p>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Valor de Venda</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
