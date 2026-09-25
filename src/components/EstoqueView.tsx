import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  ArrowUpDown, 
  Barcode, 
  Layers, 
  Download, 
  PlusCircle, 
  MinusCircle,
  X,
  Check,
  Calendar,
  Sparkles
} from 'lucide-react';
import { useSupermarket } from '../context/SupermarketContext';
import { Product, UnitType } from '../types';
import { formatCurrency, formatQuantity, formatDate } from '../utils/formatters';

const DEFAULT_CATEGORIES = [
  'Mercearia',
  'Hortifrúti',
  'Açougue & Carnes',
  'Laticínios & Queijos',
  'Padaria & Confeitaria',
  'Bebidas & Sucos',
  'Limpeza & Lavanderia',
  'Higiene Pessoal',
  'Congelados',
  'Doces & Biscoitos',
  'Bazar & Utilidades',
  'Outros'
];

export const EstoqueView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, adjustStock } = useSupermarket();

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'zero'>('all');

  // Modais
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'entrada' | 'saida'>('entrada');
  const [adjustReason, setAdjustReason] = useState<string>('Reposição de compra');

  // Formulário de Produto
  const [formData, setFormData] = useState<{
    name: string;
    barcode: string;
    category: string;
    unit: UnitType;
    cost_price: string;
    sale_price: string;
    current_stock: string;
    min_stock: string;
    supplier: string;
    expiration_date: string;
  }>({
    name: '',
    barcode: '',
    category: 'Mercearia',
    unit: 'UN',
    cost_price: '',
    sale_price: '',
    current_stock: '',
    min_stock: '5',
    supplier: '',
    expiration_date: '',
  });

  const [formError, setFormError] = useState<string | null>(null);

  // Categorias disponíveis no cadastro
  const availableCategories = useMemo(() => {
    const set = new Set<string>(DEFAULT_CATEGORIES);
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set);
  }, [products]);

  // Filtragem
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' || p.category === selectedCategory;

      let matchesStock = true;
      if (stockStatusFilter === 'low') {
        matchesStock = p.current_stock <= p.min_stock;
      } else if (stockStatusFilter === 'zero') {
        matchesStock = p.current_stock <= 0;
      }

      return matchesSearch && matchesCategory && matchesStock;
    });
  }, [products, searchTerm, selectedCategory, stockStatusFilter]);

  // Abre modal para cadastrar novo
  const handleOpenNewProduct = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: '',
      category: 'Mercearia',
      unit: 'UN',
      cost_price: '',
      sale_price: '',
      current_stock: '',
      min_stock: '5',
      supplier: '',
      expiration_date: '',
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // Abre modal para editar
  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      barcode: prod.barcode,
      category: prod.category,
      unit: prod.unit,
      cost_price: String(prod.cost_price),
      sale_price: String(prod.sale_price),
      current_stock: String(prod.current_stock),
      min_stock: String(prod.min_stock),
      supplier: prod.supplier || '',
      expiration_date: prod.expiration_date || '',
    });
    setFormError(null);
    setIsProductModalOpen(true);
  };

  // Gerador automático de código EAN-13 fictício ou SKU
  const handleGenerateBarcode = () => {
    const randomDigits = Math.floor(100000000000 + Math.random() * 900000000000);
    setFormData((prev) => ({ ...prev, barcode: `789${randomDigits.toString().slice(0, 10)}` }));
  };

  // Salvar produto (novo ou editado)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('O nome do produto é obrigatório.');
      return;
    }

    const costPrice = parseFloat(formData.cost_price.replace(',', '.')) || 0;
    const salePrice = parseFloat(formData.sale_price.replace(',', '.')) || 0;
    const currentStock = parseFloat(formData.current_stock.replace(',', '.')) || 0;
    const minStock = parseFloat(formData.min_stock.replace(',', '.')) || 0;

    if (salePrice < 0 || costPrice < 0) {
      setFormError('Os preços não podem ser negativos.');
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, {
          name: formData.name.trim(),
          barcode: formData.barcode.trim(),
          category: formData.category.trim(),
          unit: formData.unit,
          cost_price: costPrice,
          sale_price: salePrice,
          current_stock: currentStock,
          min_stock: minStock,
          supplier: formData.supplier.trim() || undefined,
          expiration_date: formData.expiration_date || undefined,
        });
      } else {
        await addProduct({
          name: formData.name.trim(),
          barcode: formData.barcode.trim() || `PROD-${Math.floor(1000 + Math.random() * 9000)}`,
          category: formData.category.trim() || 'Geral',
          unit: formData.unit,
          cost_price: costPrice,
          sale_price: salePrice,
          current_stock: currentStock,
          min_stock: minStock,
          supplier: formData.supplier.trim() || undefined,
          expiration_date: formData.expiration_date || undefined,
        });
      }
      setIsProductModalOpen(false);
    } catch (err: any) {
      setFormError(`Erro ao salvar produto: ${err.message}`);
    }
  };

  // Excluir produto
  const handleDeleteProduct = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja remover o produto "${name}" do estoque?`)) {
      await deleteProduct(id);
    }
  };

  // Abre modal de ajuste de estoque
  const handleOpenAdjustModal = (product: Product) => {
    setAdjustingProduct(product);
    setAdjustAmount('');
    setAdjustType('entrada');
    setAdjustReason('Reposição de estoque / Compra');
    setIsAdjustModalOpen(true);
  };

  // Confirma ajuste de estoque
  const handleConfirmAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    const amount = parseFloat(adjustAmount.replace(',', '.'));
    if (isNaN(amount) || amount <= 0) {
      alert('Informe uma quantidade válida.');
      return;
    }

    const previousStock = adjustingProduct.current_stock;
    const newStock =
      adjustType === 'entrada'
        ? previousStock + amount
        : Math.max(0, previousStock - amount);

    await adjustStock(
      adjustingProduct.id,
      newStock,
      adjustReason || (adjustType === 'entrada' ? 'Entrada manual' : 'Saída manual'),
      adjustType === 'entrada' ? 'entrada' : 'saida'
    );

    setIsAdjustModalOpen(false);
  };

  // Cálculo de Margem em tempo real no formulário
  const currentCost = parseFloat(formData.cost_price.replace(',', '.')) || 0;
  const currentSale = parseFloat(formData.sale_price.replace(',', '.')) || 0;
  const estimatedProfit = currentSale - currentCost;
  const estimatedMargin = currentSale > 0 ? (estimatedProfit / currentSale) * 100 : 0;

  // Exportar para CSV
  const handleExportCSV = () => {
    if (products.length === 0) {
      alert('Nenhum produto cadastrado para exportar.');
      return;
    }

    const headers = ['Nome', 'Código de Barras', 'Categoria', 'Unidade', 'Preço de Custo', 'Preço de Venda', 'Estoque Atual', 'Estoque Mínimo', 'Fornecedor', 'Validade'];
    const rows = products.map((p) => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.barcode}"`,
      `"${p.category}"`,
      `"${p.unit}"`,
      p.cost_price.toFixed(2),
      p.sale_price.toFixed(2),
      p.current_stock,
      p.min_stock,
      `"${p.supplier || ''}"`,
      `"${p.expiration_date || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `estoque_supermercado_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Controle de Estoque</h1>
            <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
              {products.length} {products.length === 1 ? 'produto cadastrado' : 'produtos cadastrados'}
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Cadastre seus produtos, gerencie entradas, saídas, preços de custo e margem de venda.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="Exportar inventário para planilha CSV"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={handleOpenNewProduct}
            className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm shadow-emerald-600/30 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Produto</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Busca textual */}
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, código de barras ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            />
          </div>

          {/* Categoria */}
          <div className="md:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            >
              <option value="all">Todas as Categorias</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status do Estoque */}
          <div className="md:col-span-3">
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
            >
              <option value="all">Todos os Status</option>
              <option value="low">⚠️ Estoque Baixo / Reposição</option>
              <option value="zero">⛔ Estoque Zerado</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela de Produtos ou Estado Vazio */}
      {products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-800 mb-1">Nenhum produto cadastrado no estoque</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
            Como você determinou que não haja dados fictícios/modelo, seu estoque inicia limpo. Cadastre seu primeiro produto para começar a controlar mercadorias e vendas!
          </p>
          <button
            onClick={handleOpenNewProduct}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Meu Primeiro Produto</span>
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
          <p className="text-slate-500 text-sm">Nenhum produto corresponde aos filtros aplicados.</p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setStockStatusFilter('all');
            }}
            className="mt-3 text-xs text-emerald-600 font-semibold hover:underline"
          >
            Limpar Filtros
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="py-3 px-4">Produto</th>
                  <th className="py-3 px-4">Código / Categoria</th>
                  <th className="py-3 px-4 text-right">Preço de Custo</th>
                  <th className="py-3 px-4 text-right">Preço de Venda</th>
                  <th className="py-3 px-4 text-right">Margem</th>
                  <th className="py-3 px-4 text-center">Estoque Atual</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-800">
                {filteredProducts.map((product) => {
                  const isLow = product.current_stock <= product.min_stock;
                  const isZero = product.current_stock <= 0;
                  const itemProfit = product.sale_price - product.cost_price;
                  const itemMargin = product.sale_price > 0 ? (itemProfit / product.sale_price) * 100 : 0;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/60 transition-colors">
                      {/* Nome e Fornecedor */}
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        <div>
                          <span>{product.name}</span>
                          {product.supplier && (
                            <span className="block text-[11px] font-normal text-slate-400">
                              Fornec: {product.supplier}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Código e Categoria */}
                      <td className="py-3.5 px-4 text-xs text-slate-600">
                        <span className="inline-flex items-center text-slate-500 font-mono">
                          <Barcode className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          {product.barcode}
                        </span>
                        <span className="block text-[11px] text-slate-400 mt-0.5">
                          {product.category} ({product.unit})
                        </span>
                      </td>

                      {/* Preço de Custo */}
                      <td className="py-3.5 px-4 text-right text-xs text-slate-600">
                        {formatCurrency(product.cost_price)}
                      </td>

                      {/* Preço de Venda */}
                      <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                        {formatCurrency(product.sale_price)}
                      </td>

                      {/* Margem */}
                      <td className="py-3.5 px-4 text-right text-xs">
                        <span className={`font-semibold ${itemProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                          {itemMargin.toFixed(1)}%
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {formatCurrency(itemProfit)}
                        </span>
                      </td>

                      {/* Estoque Atual */}
                      <td className="py-3.5 px-4 text-center font-bold">
                        <span className={isZero ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-slate-800'}>
                          {formatQuantity(product.current_stock, product.unit)}
                        </span>
                        <span className="block text-[10px] font-normal text-slate-400">
                          Mín: {formatQuantity(product.min_stock, product.unit)}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isZero ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            Esgotado
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Baixo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-100 text-emerald-800">
                            Normal
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          {/* Ajuste rápido */}
                          <button
                            onClick={() => handleOpenAdjustModal(product)}
                            title="Entrada / Saída Rápida de Estoque"
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </button>

                          {/* Editar */}
                          <button
                            onClick={() => handleOpenEditProduct(product)}
                            title="Editar Dados do Produto"
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          {/* Excluir */}
                          <button
                            onClick={() => handleDeleteProduct(product.id, product.name)}
                            title="Excluir Produto"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Modal de Cadastro / Edição de Produto */}
      {isProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="sticky top-0 bg-white px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Package className="w-5 h-5" />
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}
                </h2>
              </div>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                  {formError}
                </div>
              )}

              {/* Nome do Produto */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nome do Produto *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Arroz Tipo 1 5kg, Leite Integral 1L, etc."
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              {/* Código de Barras e Categoria */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Código de Barras (EAN / SKU)
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="text-[11px] text-emerald-600 hover:text-emerald-700 font-semibold flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 mr-0.5" />
                      <span>Gerar Automático</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="7890000000000"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoria *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                  >
                    {availableCategories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Unidade e Preços */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unidade de Medida
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value as UnitType })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                  >
                    <option value="UN">Unidade (UN)</option>
                    <option value="KG">Quilo (KG)</option>
                    <option value="L">Litro (L)</option>
                    <option value="PCT">Pacote (PCT)</option>
                    <option value="CX">Caixa (CX)</option>
                    <option value="G">Grama (G)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preço de Custo (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Preço de Venda (R$) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0.00"
                    value={formData.sale_price}
                    onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Indicador de Margem de Lucro Calculada */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-500">Lucro Bruto Unitário:</span>{' '}
                  <span className={`font-bold ${estimatedProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {formatCurrency(estimatedProfit)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Margem Estimada:</span>{' '}
                  <span className={`font-bold ${estimatedMargin >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    {estimatedMargin.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Estoque Inicial e Mínimo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {editingProduct ? 'Estoque Atual' : 'Estoque Inicial'}
                  </label>
                  <input
                    type="number"
                    step={formData.unit === 'KG' || formData.unit === 'L' ? '0.001' : '1'}
                    min="0"
                    placeholder="0"
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estoque Mínimo (Alerta de Reposição)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    placeholder="5"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({ ...formData, min_stock: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Fornecedor e Validade (Opcionais) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fornecedor (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Distribuidora Central, Ambev, etc."
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data de Validade (Opcional)
                  </label>
                  <input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-all shadow-sm shadow-emerald-600/30 cursor-pointer"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Entrada / Saída Rápida de Estoque */}
      {isAdjustModalOpen && adjustingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Movimentar Estoque</h3>
                  <p className="text-xs text-slate-500">{adjustingProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmAdjust} className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl text-xs flex justify-between items-center">
                <span className="text-slate-500">Estoque Atual:</span>
                <span className="font-bold text-slate-800 text-sm">
                  {formatQuantity(adjustingProduct.current_stock, adjustingProduct.unit)}
                </span>
              </div>

              {/* Tipo de Movimento */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAdjustType('entrada');
                    setAdjustReason('Reposição de compra');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    adjustType === 'entrada'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 text-emerald-600" />
                  <span>Entrada (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdjustType('saida');
                    setAdjustReason('Avaria / Perda / Ajuste');
                  }}
                  className={`py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                    adjustType === 'saida'
                      ? 'bg-rose-50 border-rose-500 text-rose-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <MinusCircle className="w-4 h-4 text-rose-600" />
                  <span>Saída (-)</span>
                </button>
              </div>

              {/* Quantidade */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Quantidade a {adjustType === 'entrada' ? 'Adicionar' : 'Remover'} ({adjustingProduct.unit})
                </label>
                <input
                  type="number"
                  step={adjustingProduct.unit === 'KG' || adjustingProduct.unit === 'L' ? '0.001' : '1'}
                  min="0.001"
                  required
                  placeholder="0"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all font-semibold"
                />
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Motivo da Movimentação
                </label>
                <input
                  type="text"
                  placeholder="Ex: Compra NF 1234, Vencimento, Avaria..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-all shadow-sm cursor-pointer"
                >
                  Confirmar Movimentação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
