import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  CheckCircle, 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Printer, 
  RotateCcw, 
  Layers,
  ArrowRight,
  Package,
  X
} from 'lucide-react';
import { useSupermarket } from '../context/SupermarketContext';
import { Product, Sale, SaleItem, PaymentMethod } from '../types';
import { formatCurrency, formatQuantity, formatDateTime, getPaymentMethodLabel } from '../utils/formatters';

export const VendasPDVView: React.FC = () => {
  const { products, processSale, setActiveTab } = useSupermarket();

  // Carrinho
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [discount, setDiscount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('dinheiro');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Busca e Leitor
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantityInput, setQuantityInput] = useState<string>('1');

  // Modal de Cupom de Venda
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Foco automático na busca ao carregar
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Produtos filtrados na busca rápida
  const searchResults = React.useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase().trim();
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.barcode.toLowerCase().includes(query) ||
          p.category.toLowerCase().includes(query)
      )
      .slice(0, 6);
  }, [products, searchQuery]);

  // Adicionar produto ao carrinho
  const handleAddToCart = (product: Product, qty: number = 1) => {
    if (qty <= 0) return;

    // Verificar se o estoque é suficiente
    const existingInCart = cart.find((item) => item.product_id === product.id);
    const currentCartQty = existingInCart ? existingInCart.quantity : 0;
    const requestedTotalQty = currentCartQty + qty;

    if (requestedTotalQty > product.current_stock) {
      alert(
        `Atenção: Estoque insuficiente para "${product.name}".\nDisponível: ${formatQuantity(
          product.current_stock,
          product.unit
        )}\nNo carrinho: ${formatQuantity(currentCartQty, product.unit)}`
      );
      return;
    }

    if (existingInCart) {
      setCart((prev) =>
        prev.map((item) =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: requestedTotalQty,
                total: requestedTotalQty * item.unit_price,
              }
            : item
        )
      );
    } else {
      const newItem: SaleItem = {
        product_id: product.id,
        product_name: product.name,
        barcode: product.barcode,
        unit: product.unit,
        quantity: qty,
        unit_price: product.sale_price,
        cost_price: product.cost_price,
        total: qty * product.sale_price,
      };
      setCart((prev) => [...prev, newItem]);
    }

    // Limpa os campos de busca e devolve o foco
    setSearchQuery('');
    setSelectedProduct(null);
    setQuantityInput('1');
    searchInputRef.current?.focus();
  };

  // Se digitar um código de barras e der Enter ou se houver correspondência exata
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const exactBarcode = products.find(
        (p) => p.barcode.trim().toLowerCase() === searchQuery.trim().toLowerCase()
      );
      if (exactBarcode) {
        handleAddToCart(exactBarcode, parseFloat(quantityInput) || 1);
        return;
      }

      if (searchResults.length > 0) {
        handleAddToCart(searchResults[0], parseFloat(quantityInput) || 1);
      }
    }
  };

  // Atualizar quantidade de um item no carrinho
  const handleUpdateCartQuantity = (productId: string, delta: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product_id === productId) {
            const step = item.unit === 'KG' || item.unit === 'L' ? 0.25 : 1;
            const newQty = Math.max(0, item.quantity + delta * step);

            if (newQty > product.current_stock) {
              alert(
                `Estoque máximo disponível atingido (${formatQuantity(
                  product.current_stock,
                  product.unit
                )}).`
              );
              return item;
            }

            return {
              ...item,
              quantity: newQty,
              total: newQty * item.unit_price,
            };
          }
          return item;
        })
        .filter((item) => item.quantity > 0)
    );
  };

  // Remover item do carrinho
  const handleRemoveFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.product_id !== productId));
  };

  // Limpar carrinho
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Deseja realmente cancelar este cupom e limpar o carrinho?')) {
      setCart([]);
      setDiscount('0');
      setAmountReceived('');
    }
  };

  // Cálculos da Venda
  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const parsedDiscount = Math.max(0, parseFloat(discount.replace(',', '.')) || 0);
  const total = Math.max(0, subtotal - parsedDiscount);
  const parsedAmountReceived = parseFloat(amountReceived.replace(',', '.')) || 0;
  const change = paymentMethod === 'dinheiro' && parsedAmountReceived > total ? parsedAmountReceived - total : 0;

  // Finalizar a Venda
  const handleFinishSale = async () => {
    if (cart.length === 0) {
      alert('O carrinho está vazio. Adicione produtos antes de finalizar.');
      return;
    }

    if (paymentMethod === 'dinheiro' && parsedAmountReceived > 0 && parsedAmountReceived < total) {
      alert('O valor recebido em dinheiro é inferior ao total da compra.');
      return;
    }

    try {
      const sale = await processSale({
        items: cart,
        payment_method: paymentMethod,
        discount: parsedDiscount,
        amount_received: paymentMethod === 'dinheiro' && parsedAmountReceived > 0 ? parsedAmountReceived : undefined,
        customer_name: customerName,
        notes: notes,
      });

      setCompletedSale(sale);
      setIsReceiptModalOpen(true);

      // Reseta carrinho
      setCart([]);
      setDiscount('0');
      setAmountReceived('');
      setCustomerName('');
      setNotes('');
    } catch (err: any) {
      alert(`Falha ao registrar venda: ${err.message}`);
    }
  };

  // Imprimir comprovante
  const handlePrintReceipt = () => {
    window.print();
  };

  // Produtos mais frequentes (atalhos rápidos na tela de venda)
  const quickProducts = products.filter((p) => p.current_stock > 0).slice(0, 8);

  return (
    <div className="space-y-6 pb-12">
      {/* Se não houver nenhum produto cadastrado no supermercado */}
      {products.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-2xl mx-auto shadow-xs">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">
            Nenhum Produto no Estoque para Venda
          </h2>
          <p className="text-slate-500 text-sm mb-6">
            Como você solicitou que todas as informações sejam cadastradas por você (sem dados de exemplo), primeiro adicione seus produtos no módulo de Estoque.
          </p>
          <button
            onClick={() => setActiveTab('estoque')}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Produtos no Estoque</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Coluna Esquerda: Busca, Leitor de Código de Barras e Atalhos Rápidos */}
          <div className="lg:col-span-7 space-y-4">
            {/* Caixa de Entrada do Leitor / Busca */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">Leitor & Busca de Produtos</h2>
                    <p className="text-xs text-slate-400">Pressione Enter para adicionar rapidamente</p>
                  </div>
                </div>
                <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
                  Caixa Aberto
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                {/* Input de Quantidade (para balança/hortifrúti ou atacado) */}
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Qtd / Peso
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  />
                </div>

                {/* Input de Busca de Produto */}
                <div className="sm:col-span-9 relative">
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Código de Barras ou Nome do Item
                  </label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Escaneie o código ou digite o nome..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={handleSearchKeyDown}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Resultados da Busca em Tempo Real */}
              {searchResults.length > 0 && (
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white overflow-hidden shadow-lg shadow-slate-200/50">
                  {searchResults.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleAddToCart(product, parseFloat(quantityInput) || 1)}
                      className="p-3 hover:bg-emerald-50/60 cursor-pointer flex items-center justify-between transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold">
                          {product.unit}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{product.name}</p>
                          <span className="text-xs text-slate-400 font-mono">{product.barcode} • {product.category}</span>
                        </div>
                      </div>

                      <div className="text-right flex items-center space-x-3">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{formatCurrency(product.sale_price)}</p>
                          <span className={`text-[11px] ${product.current_stock <= product.min_stock ? 'text-amber-600 font-semibold' : 'text-slate-500'}`}>
                            Estoque: {formatQuantity(product.current_stock, product.unit)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white p-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Grade de Produtos Rápidos no Supermercado */}
            {quickProducts.length > 0 && (
              <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Itens Rápidos do Estoque</h3>
                  </div>
                  <span className="text-[11px] text-slate-400">Clique para adicionar ao carrinho</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {quickProducts.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddToCart(p, 1)}
                      className="p-3 rounded-2xl border border-slate-200/80 hover:border-emerald-500 hover:bg-emerald-50/30 text-left transition-all group flex flex-col justify-between h-24 cursor-pointer"
                    >
                      <div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-emerald-700">
                          {p.name}
                        </p>
                        <span className="text-[10px] text-slate-400">{p.category}</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs font-extrabold text-slate-900">
                          {formatCurrency(p.sale_price)}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {formatQuantity(p.current_stock, p.unit)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Coluna Direita: Carrinho da Compra e Fechamento */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              {/* Header do Carrinho */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-base">Cupom de Compra</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 font-mono">
                    {cart.length} item{cart.length !== 1 ? 's' : ''}
                  </span>
                  {cart.length > 0 && (
                    <button
                      onClick={handleClearCart}
                      title="Limpar Cupom"
                      className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Lista de Itens no Carrinho */}
              <div className="p-4 divide-y divide-slate-100 max-h-72 overflow-y-auto min-h-[160px]">
                {cart.length === 0 ? (
                  <div className="h-40 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
                    <ShoppingCart className="w-10 h-10 text-slate-300 stroke-1" />
                    <p className="text-xs">O carrinho está vazio no momento.</p>
                    <p className="text-[11px] text-slate-400 max-w-xs">
                      Escaneie o código de barras ou pesquise o produto para iniciar o atendimento.
                    </p>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.product_id} className="py-2.5 flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <p className="text-xs font-bold text-slate-900 line-clamp-1">{item.product_name}</p>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {formatQuantity(item.quantity, item.unit)} x {formatCurrency(item.unit_price)}
                        </div>
                      </div>

                      {/* Controle de Quantidade */}
                      <div className="flex items-center space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.product_id, -1)}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs cursor-pointer"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold text-slate-800 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleUpdateCartQuantity(item.product_id, 1)}
                          className="w-6 h-6 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center text-xs cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="text-right min-w-[75px] pl-3 flex items-center justify-end space-x-2">
                        <span className="text-xs font-bold text-slate-900">
                          {formatCurrency(item.total)}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(item.product_id)}
                          className="text-slate-300 hover:text-rose-500 p-0.5 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Painel Financeiro e Forma de Pagamento */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
                {/* Subtotal e Desconto */}
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-800">{formatCurrency(subtotal)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600">
                    <span>Desconto (R$):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                      className="w-24 px-2 py-1 bg-white border border-slate-200 rounded-lg text-right font-semibold text-slate-800 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-base">
                    <span className="font-bold text-slate-900">Total a Pagar:</span>
                    <span className="font-extrabold text-xl text-emerald-700">
                      {formatCurrency(total)}
                    </span>
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('dinheiro')}
                      className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        paymentMethod === 'dinheiro'
                          ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <DollarSign className="w-4 h-4 mb-0.5" />
                      <span>Dinheiro</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('pix')}
                      className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        paymentMethod === 'pix'
                          ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <QrCode className="w-4 h-4 mb-0.5" />
                      <span>PIX</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cartao_debito')}
                      className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        paymentMethod === 'cartao_debito'
                          ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mb-0.5" />
                      <span>Débito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cartao_credito')}
                      className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        paymentMethod === 'cartao_credito'
                          ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 mb-0.5" />
                      <span>Crédito</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('vale_alimentacao')}
                      className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        paymentMethod === 'vale_alimentacao'
                          ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <ShoppingCart className="w-4 h-4 mb-0.5" />
                      <span>V. Alimentação</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('outro')}
                      className={`py-2 px-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        paymentMethod === 'outro'
                          ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4 mb-0.5" />
                      <span>Outro</span>
                    </button>
                  </div>
                </div>

                {/* Dinheiro: Cálculo Automático de Troco */}
                {paymentMethod === 'dinheiro' && (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">Valor Recebido (R$):</span>
                      <input
                        type="number"
                        step="0.01"
                        placeholder={total.toFixed(2)}
                        value={amountReceived}
                        onChange={(e) => setAmountReceived(e.target.value)}
                        className="w-28 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-right font-bold text-slate-900 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    {change > 0 && (
                      <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-100 text-emerald-700 font-bold">
                        <span>Troco do Cliente:</span>
                        <span className="text-sm">{formatCurrency(change)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Cliente Opcional */}
                <div>
                  <input
                    type="text"
                    placeholder="Nome do cliente (opcional)..."
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {/* Botão de Finalização da Venda */}
                <button
                  type="button"
                  onClick={handleFinishSale}
                  disabled={cart.length === 0}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-700 hover:to-teal-600 disabled:opacity-50 text-white font-extrabold rounded-2xl shadow-md shadow-emerald-600/30 flex items-center justify-center space-x-2 text-sm transition-all cursor-pointer"
                >
                  <CheckCircle className="w-5 h-5" />
                  <span>Finalizar Venda ({formatCurrency(total)})</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cupom de Venda Emitido */}
      {isReceiptModalOpen && completedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header Cupom */}
            <div className="bg-emerald-600 p-4 text-white text-center">
              <CheckCircle className="w-10 h-10 mx-auto mb-1 text-emerald-100" />
              <h3 className="font-black text-lg">Venda Realizada com Sucesso!</h3>
              <p className="text-xs text-emerald-100">Código: {completedSale.sale_code}</p>
            </div>

            {/* Conteúdo Estilo Cupom Não Fiscal */}
            <div className="p-6 font-mono text-xs space-y-3 bg-white text-slate-800 border-b border-dashed border-slate-300">
              <div className="text-center border-b border-dashed border-slate-200 pb-2">
                <p className="font-bold text-sm">SUPERMERCADO GESTÃO PRO</p>
                <p className="text-[10px] text-slate-500">CUPOM NÃO FISCAL</p>
                <p className="text-[10px] text-slate-400">{formatDateTime(completedSale.created_at)}</p>
                {completedSale.customer_name && (
                  <p className="text-[10px] text-slate-600">Cliente: {completedSale.customer_name}</p>
                )}
              </div>

              <div className="divide-y divide-slate-100 py-1 space-y-1">
                {completedSale.items.map((item, idx) => (
                  <div key={idx} className="pt-1 flex justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{item.product_name}</p>
                      <p className="text-[10px] text-slate-500">
                        {item.quantity} x {formatCurrency(item.unit_price)}
                      </p>
                    </div>
                    <span className="font-bold">{formatCurrency(item.total)}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t border-dashed border-slate-300 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(completedSale.subtotal)}</span>
                </div>
                {completedSale.discount > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Desconto:</span>
                    <span>- {formatCurrency(completedSale.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm text-slate-950 pt-1 border-t border-slate-200">
                  <span>TOTAL PAGO:</span>
                  <span>{formatCurrency(completedSale.total)}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-600 pt-1">
                  <span>Forma:</span>
                  <span className="font-semibold">{getPaymentMethodLabel(completedSale.payment_method)}</span>
                </div>
                {completedSale.amount_received && (
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Recebido:</span>
                    <span>{formatCurrency(completedSale.amount_received)}</span>
                  </div>
                )}
                {completedSale.change !== undefined && completedSale.change > 0 && (
                  <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                    <span>Troco:</span>
                    <span>{formatCurrency(completedSale.change)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Ações do Modal */}
            <div className="p-4 bg-slate-50 flex items-center justify-between space-x-2">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsReceiptModalOpen(false);
                  searchInputRef.current?.focus();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                Nova Venda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
