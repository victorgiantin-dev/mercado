import React, { useState } from 'react';
import { 
  Receipt, 
  Search, 
  Calendar, 
  Filter, 
  Printer, 
  Ban, 
  Eye, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Download,
  CreditCard,
  DollarSign
} from 'lucide-react';
import { useSupermarket } from '../context/SupermarketContext';
import { Sale, PaymentMethod } from '../types';
import { formatCurrency, formatQuantity, formatDateTime, getPaymentMethodLabel } from '../utils/formatters';

export const HistoricoVendasView: React.FC = () => {
  const { sales, cancelSale, setActiveTab } = useSupermarket();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'today' | '7days' | 'month'>('all');

  // Modal de Detalhes da Venda
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);

  // Filtragem
  const now = new Date();
  const filteredSales = sales.filter((s) => {
    // Busca por código, cliente ou nome de item
    const matchesSearch =
      s.sale_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.customer_name && s.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      s.items.some((item) => item.product_name.toLowerCase().includes(searchTerm.toLowerCase()));

    // Meio de pagamento
    const matchesMethod = selectedMethod === 'all' || s.payment_method === selectedMethod;

    // Status
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;

    // Período
    const saleDate = new Date(s.created_at);
    let matchesPeriod = true;
    if (periodFilter === 'today') {
      matchesPeriod = saleDate.toDateString() === now.toDateString();
    } else if (periodFilter === '7days') {
      const diffTime = Math.abs(now.getTime() - saleDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      matchesPeriod = diffDays <= 7;
    } else if (periodFilter === 'month') {
      matchesPeriod =
        saleDate.getMonth() === now.getMonth() &&
        saleDate.getFullYear() === now.getFullYear();
    }

    return matchesSearch && matchesMethod && matchesStatus && matchesPeriod;
  });

  // Estatísticas do Filtro Atual
  const completedFilteredSales = filteredSales.filter((s) => s.status === 'completed');
  const totalPeriodRevenue = completedFilteredSales.reduce((acc, s) => acc + s.total, 0);
  const averageTicket =
    completedFilteredSales.length > 0 ? totalPeriodRevenue / completedFilteredSales.length : 0;

  // Ação de Cancelar Venda
  const handleCancelSale = async (sale: Sale) => {
    if (sale.status === 'cancelled') return;

    const confirmMessage = `Tem certeza que deseja estornar a venda ${sale.sale_code}?\n\nOs seguintes produtos terão suas quantidades devolvidas ao estoque:\n${sale.items
      .map((i) => `• ${i.product_name} (${i.quantity} ${i.unit})`)
      .join('\n')}`;

    if (window.confirm(confirmMessage)) {
      await cancelSale(sale.id);
      if (viewingSale?.id === sale.id) {
        setViewingSale(null);
      }
    }
  };

  // Exportar histórico para CSV
  const handleExportCSV = () => {
    if (sales.length === 0) {
      alert('Nenhuma venda para exportar.');
      return;
    }

    const headers = ['Código', 'Data/Hora', 'Cliente', 'Forma de Pagamento', 'Itens (Qtd)', 'Subtotal', 'Desconto', 'Total', 'Status'];
    const rows = filteredSales.map((s) => [
      `"${s.sale_code}"`,
      `"${formatDateTime(s.created_at)}"`,
      `"${s.customer_name || 'Consumidor'}"`,
      `"${getPaymentMethodLabel(s.payment_method)}"`,
      s.items.reduce((acc, i) => acc + i.quantity, 0),
      s.subtotal.toFixed(2),
      s.discount.toFixed(2),
      s.total.toFixed(2),
      s.status === 'completed' ? 'Concluída' : 'Cancelada',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `vendas_supermercado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Histórico de Vendas</h1>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
              {sales.length} vendas registradas
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Consulte todas as operações de venda realizadas no caixa, visualize comprovantes e realize estornos.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Cartões Resumo do Filtro */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Vendas no Período</span>
          <p className="text-2xl font-black text-slate-900 mt-1">{completedFilteredSales.length}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Faturamento no Período</span>
          <p className="text-2xl font-black text-emerald-700 mt-1">{formatCurrency(totalPeriodRevenue)}</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-xs font-semibold text-slate-500">Ticket Médio no Período</span>
          <p className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(averageTicket)}</p>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código (#VND-...), cliente ou produto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            >
              <option value="all">Todas as Formas</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao_debito">Cartão de Débito</option>
              <option value="cartao_credito">Cartão de Crédito</option>
              <option value="vale_alimentacao">Vale Alimentação</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            >
              <option value="all">Todos os Status</option>
              <option value="completed">Concluídas</option>
              <option value="cancelled">Estornadas</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
            >
              <option value="all">Todo o Período</option>
              <option value="today">Hoje</option>
              <option value="7days">Últimos 7 Dias</option>
              <option value="month">Este Mês</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Vendas ou Vazio */}
      {sales.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Receipt className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhuma venda registrada ainda</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            O histórico começará a listar suas transações automaticamente assim que você finalizar sua primeira venda na Frente de Caixa (PDV).
          </p>
          <button
            onClick={() => setActiveTab('vendas')}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm cursor-pointer"
          >
            <span>Ir para o PDV</span>
          </button>
        </div>
      ) : filteredSales.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm">
          Nenhuma venda encontrada com os filtros selecionados.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Data / Hora</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4">Pagamento</th>
                  <th className="py-3 px-4 text-center">Qtd Itens</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {filteredSales.map((sale) => {
                  const isCancelled = sale.status === 'cancelled';
                  const totalItemsCount = sale.items.reduce((acc, i) => acc + i.quantity, 0);

                  return (
                    <tr
                      key={sale.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isCancelled ? 'bg-slate-50/70 text-slate-400' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                        {sale.sale_code}
                      </td>

                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {formatDateTime(sale.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-xs font-medium text-slate-700">
                        {sale.customer_name || 'Consumidor'}
                      </td>

                      <td className="py-3.5 px-4 text-xs">
                        <span className="font-semibold text-slate-700">
                          {getPaymentMethodLabel(sale.payment_method)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-xs font-medium">
                        {totalItemsCount}
                      </td>

                      <td className="py-3.5 px-4 text-right font-extrabold text-slate-900">
                        <span className={isCancelled ? 'line-through text-slate-400' : 'text-emerald-700'}>
                          {formatCurrency(sale.total)}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isCancelled ? (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            Estornada
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                            Concluída
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setViewingSale(sale)}
                            title="Ver Cupom / Detalhes"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {!isCancelled && (
                            <button
                              onClick={() => handleCancelSale(sale)}
                              title="Estornar Venda e Repor Estoque"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Detalhes da Venda */}
      {viewingSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Venda {viewingSale.sale_code}</h3>
                <span className="text-xs text-slate-400">{formatDateTime(viewingSale.created_at)}</span>
              </div>
              <button
                onClick={() => setViewingSale(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {viewingSale.status === 'cancelled' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Esta venda foi cancelada/estornada e os itens foram repostos no estoque.</span>
                </div>
              )}

              {/* Informações da Operação */}
              <div className="bg-slate-50 p-3 rounded-2xl text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-500">Cliente:</span>
                  <span className="font-semibold text-slate-800">{viewingSale.customer_name || 'Consumidor Não Identificado'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Forma de Pagamento:</span>
                  <span className="font-semibold text-slate-800">{getPaymentMethodLabel(viewingSale.payment_method)}</span>
                </div>
                {viewingSale.notes && (
                  <div className="flex justify-between pt-1 border-t border-slate-200">
                    <span className="text-slate-500">Observações:</span>
                    <span className="font-medium text-slate-700">{viewingSale.notes}</span>
                  </div>
                )}
              </div>

              {/* Lista de Itens */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Itens da Compra</h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {viewingSale.items.map((item, idx) => (
                    <div key={idx} className="p-3 text-xs flex justify-between items-center bg-white">
                      <div>
                        <p className="font-bold text-slate-900">{item.product_name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">
                          {formatQuantity(item.quantity, item.unit)} x {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <span className="font-bold text-slate-900">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Resumo Financeiro */}
              <div className="space-y-1.5 text-xs pt-2 border-t border-slate-200">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(viewingSale.subtotal)}</span>
                </div>
                {viewingSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Desconto:</span>
                    <span>- {formatCurrency(viewingSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-extrabold text-base text-slate-950 pt-1 border-t border-slate-200">
                  <span>TOTAL:</span>
                  <span className="text-emerald-700">{formatCurrency(viewingSale.total)}</span>
                </div>
              </div>
            </div>

            {/* Ações do Rodapé */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between space-x-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Cupom</span>
              </button>

              {viewingSale.status === 'completed' && (
                <button
                  type="button"
                  onClick={() => handleCancelSale(viewingSale)}
                  className="py-2 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Ban className="w-4 h-4" />
                  <span>Estornar</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
