import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, Sale, StockMovement, SupabaseConfig, MovementType } from '../types';
import {
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testConnection,
  syncProductsToSupabase,
  syncSalesToSupabase,
  syncMovementsToSupabase,
  fetchProductsFromSupabase,
  fetchSalesFromSupabase,
  fetchMovementsFromSupabase,
  getSupabaseClient,
} from '../services/supabase';

interface SupermarketContextType {
  products: Product[];
  sales: Sale[];
  movements: StockMovement[];
  supabaseConfig: SupabaseConfig;
  isSyncing: boolean;
  syncStatusMessage: string | null;
  activeTab: 'dashboard' | 'vendas' | 'estoque' | 'historico' | 'supabase';
  setActiveTab: (tab: 'dashboard' | 'vendas' | 'estoque' | 'historico' | 'supabase') => void;
  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<Product>;
  updateProduct: (id: string, product: Partial<Omit<Product, 'id' | 'created_at'>>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  adjustStock: (productId: string, newStock: number, reason: string, type?: MovementType) => Promise<void>;
  // Sales actions
  processSale: (saleData: {
    items: Sale['items'];
    payment_method: Sale['payment_method'];
    discount?: number;
    amount_received?: number;
    customer_name?: string;
    notes?: string;
  }) => Promise<Sale>;
  cancelSale: (saleId: string) => Promise<void>;
  // Supabase actions
  updateSupabaseCredentials: (url: string, anonKey: string) => Promise<{ success: boolean; message: string }>;
  syncWithSupabase: () => Promise<{ success: boolean; message: string }>;
  refreshFromSupabase: () => Promise<{ success: boolean; message: string }>;
}

const SupermarketContext = createContext<SupermarketContextType | undefined>(undefined);

const LOCAL_STORAGE_PRODUCTS = 'supermercado_products_v1';
const LOCAL_STORAGE_SALES = 'supermercado_sales_v1';
const LOCAL_STORAGE_MOVEMENTS = 'supermercado_movements_v1';

export const SupermarketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // CRITICAL REQUIREMENT: Do NOT create model / mock data. Start empty: []
  const [products, setProducts] = useState<Product[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PRODUCTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_SALES);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [movements, setMovements] = useState<StockMovement[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_MOVEMENTS);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(() => {
    const creds = getStoredSupabaseConfig();
    return {
      url: creds.url,
      anonKey: creds.anonKey,
      isConnected: false,
    };
  });

  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncStatusMessage, setSyncStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'vendas' | 'estoque' | 'historico' | 'supabase'>('dashboard');

  // Salva no localStorage sempre que o estado mudar
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PRODUCTS, JSON.stringify(products));
    } catch (e) {
      console.error('Falha ao salvar produtos localmente:', e);
    }
  }, [products]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_SALES, JSON.stringify(sales));
    } catch (e) {
      console.error('Falha ao salvar vendas localmente:', e);
    }
  }, [sales]);

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_MOVEMENTS, JSON.stringify(movements));
    } catch (e) {
      console.error('Falha ao salvar movimentações localmente:', e);
    }
  }, [movements]);

  // Testa conexão inicial com Supabase se credenciais existirem
  useEffect(() => {
    if (supabaseConfig.url && supabaseConfig.anonKey) {
      testConnection().then((res) => {
        setSupabaseConfig((prev) => ({
          ...prev,
          isConnected: res.success,
        }));
      });
    }
  }, []);

  // Cadastrar Produto
  const addProduct = async (
    productData: Omit<Product, 'id' | 'created_at' | 'updated_at'>
  ): Promise<Product> => {
    const now = new Date().toISOString();
    // Gera UUID válido para compatibilidade com o tipo UUID do Supabase
    const newId = crypto.randomUUID ? crypto.randomUUID() : 'p_' + Math.random().toString(36).substring(2, 11);

    const newProduct: Product = {
      ...productData,
      id: newId,
      created_at: now,
      updated_at: now,
    };

    const initialMovement: StockMovement = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'm_' + Math.random().toString(36).substring(2, 11),
      product_id: newId,
      product_name: newProduct.name,
      type: 'entrada',
      quantity: newProduct.current_stock,
      previous_stock: 0,
      new_stock: newProduct.current_stock,
      reason: 'Cadastro inicial de produto',
      created_at: now,
    };

    const updatedProducts = [newProduct, ...products];
    const updatedMovements = [initialMovement, ...movements];

    setProducts(updatedProducts);
    if (newProduct.current_stock > 0) {
      setMovements(updatedMovements);
    }

    // Se conectado ao Supabase, envia em segundo plano
    if (supabaseConfig.isConnected) {
      syncProductsToSupabase([newProduct]).catch(console.error);
      if (newProduct.current_stock > 0) {
        syncMovementsToSupabase([initialMovement]).catch(console.error);
      }
    }

    return newProduct;
  };

  // Atualizar Produto
  const updateProduct = async (
    id: string,
    data: Partial<Omit<Product, 'id' | 'created_at'>>
  ): Promise<void> => {
    const now = new Date().toISOString();
    let oldProduct: Product | undefined;

    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          oldProduct = p;
          return {
            ...p,
            ...data,
            updated_at: now,
          };
        }
        return p;
      })
    );

    // Se o estoque foi alterado manualmente via edição, registrar movimentação
    if (oldProduct && data.current_stock !== undefined && data.current_stock !== oldProduct.current_stock) {
      const diff = data.current_stock - oldProduct.current_stock;
      const mov: StockMovement = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'm_' + Math.random().toString(36).substring(2, 11),
        product_id: id,
        product_name: data.name || oldProduct.name,
        type: diff > 0 ? 'entrada' : 'saida',
        quantity: Math.abs(diff),
        previous_stock: oldProduct.current_stock,
        new_stock: data.current_stock,
        reason: 'Atualização manual no cadastro',
        created_at: now,
      };
      setMovements((prev) => [mov, ...prev]);

      if (supabaseConfig.isConnected) {
        syncMovementsToSupabase([mov]).catch(console.error);
      }
    }

    if (supabaseConfig.isConnected) {
      const updated = { ...oldProduct, ...data, updated_at: now } as Product;
      syncProductsToSupabase([updated]).catch(console.error);
    }
  };

  // Excluir Produto
  const deleteProduct = async (id: string): Promise<void> => {
    setProducts((prev) => prev.filter((p) => p.id !== id));

    if (supabaseConfig.isConnected) {
      const client = getSupabaseClient();
      if (client) {
        client.from('produtos').delete().eq('id', id).then();
      }
    }
  };

  // Ajuste rápido de estoque
  const adjustStock = async (
    productId: string,
    newStock: number,
    reason: string,
    type: MovementType = 'ajuste'
  ): Promise<void> => {
    const now = new Date().toISOString();
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    const previousStock = product.current_stock;
    const diff = Math.abs(newStock - previousStock);

    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, current_stock: newStock, updated_at: now } : p))
    );

    const mov: StockMovement = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'm_' + Math.random().toString(36).substring(2, 11),
      product_id: productId,
      product_name: product.name,
      type,
      quantity: diff,
      previous_stock: previousStock,
      new_stock: newStock,
      reason,
      created_at: now,
    };

    setMovements((prev) => [mov, ...prev]);

    if (supabaseConfig.isConnected) {
      syncProductsToSupabase([{ ...product, current_stock: newStock, updated_at: now }]).catch(console.error);
      syncMovementsToSupabase([mov]).catch(console.error);
    }
  };

  // Processar Venda (PDV)
  const processSale = async (saleData: {
    items: Sale['items'];
    payment_method: Sale['payment_method'];
    discount?: number;
    amount_received?: number;
    customer_name?: string;
    notes?: string;
  }): Promise<Sale> => {
    const now = new Date().toISOString();
    const saleId = crypto.randomUUID ? crypto.randomUUID() : 'v_' + Math.random().toString(36).substring(2, 11);

    // Gera código sequencial simples baseado na quantidade de vendas
    const saleCode = `#VND-${String(sales.length + 1).padStart(4, '0')}`;

    const subtotal = saleData.items.reduce((acc, item) => acc + item.total, 0);
    const discount = Math.max(0, Number(saleData.discount) || 0);
    const total = Math.max(0, subtotal - discount);

    let change: number | undefined = undefined;
    if (saleData.payment_method === 'dinheiro' && saleData.amount_received) {
      change = Math.max(0, saleData.amount_received - total);
    }

    const newSale: Sale = {
      id: saleId,
      sale_code: saleCode,
      created_at: now,
      items: saleData.items,
      subtotal,
      discount,
      total,
      payment_method: saleData.payment_method,
      amount_received: saleData.amount_received,
      change,
      customer_name: saleData.customer_name?.trim() || undefined,
      notes: saleData.notes?.trim() || undefined,
      status: 'completed',
    };

    // Baixa automática no estoque para cada item vendido
    const updatedProducts = [...products];
    const newMovements: StockMovement[] = [];

    saleData.items.forEach((item) => {
      const prodIndex = updatedProducts.findIndex((p) => p.id === item.product_id);
      if (prodIndex !== -1) {
        const prod = updatedProducts[prodIndex];
        const prevStock = prod.current_stock;
        const newStock = Math.max(0, prevStock - item.quantity);

        updatedProducts[prodIndex] = {
          ...prod,
          current_stock: newStock,
          updated_at: now,
        };

        newMovements.push({
          id: crypto.randomUUID ? crypto.randomUUID() : 'm_' + Math.random().toString(36).substring(2, 11),
          product_id: prod.id,
          product_name: prod.name,
          type: 'venda',
          quantity: item.quantity,
          previous_stock: prevStock,
          new_stock: newStock,
          reason: `Venda ${saleCode}`,
          created_at: now,
        });
      }
    });

    setProducts(updatedProducts);
    setSales((prev) => [newSale, ...prev]);
    setMovements((prev) => [...newMovements, ...prev]);

    // Sincroniza com Supabase se conectado
    if (supabaseConfig.isConnected) {
      syncSalesToSupabase([newSale]).catch(console.error);
      syncProductsToSupabase(updatedProducts).catch(console.error);
      syncMovementsToSupabase(newMovements).catch(console.error);
    }

    return newSale;
  };

  // Cancelar / Estornar Venda
  const cancelSale = async (saleId: string): Promise<void> => {
    const sale = sales.find((s) => s.id === saleId);
    if (!sale || sale.status === 'cancelled') return;

    const now = new Date().toISOString();

    // Restaura o estoque de todos os itens da venda cancelada
    const updatedProducts = [...products];
    const cancelMovements: StockMovement[] = [];

    sale.items.forEach((item) => {
      const prodIndex = updatedProducts.findIndex((p) => p.id === item.product_id);
      if (prodIndex !== -1) {
        const prod = updatedProducts[prodIndex];
        const prevStock = prod.current_stock;
        const newStock = prevStock + item.quantity;

        updatedProducts[prodIndex] = {
          ...prod,
          current_stock: newStock,
          updated_at: now,
        };

        cancelMovements.push({
          id: crypto.randomUUID ? crypto.randomUUID() : 'm_' + Math.random().toString(36).substring(2, 11),
          product_id: prod.id,
          product_name: prod.name,
          type: 'cancelamento_venda',
          quantity: item.quantity,
          previous_stock: prevStock,
          new_stock: newStock,
          reason: `Estorno de venda ${sale.sale_code}`,
          created_at: now,
        });
      }
    });

    const updatedSale: Sale = { ...sale, status: 'cancelled' };

    setProducts(updatedProducts);
    setSales((prev) => prev.map((s) => (s.id === saleId ? updatedSale : s)));
    setMovements((prev) => [...cancelMovements, ...prev]);

    if (supabaseConfig.isConnected) {
      syncSalesToSupabase([updatedSale]).catch(console.error);
      syncProductsToSupabase(updatedProducts).catch(console.error);
      syncMovementsToSupabase(cancelMovements).catch(console.error);
    }
  };

  // Salvar credenciais do Supabase
  const updateSupabaseCredentials = async (
    url: string,
    anonKey: string
  ): Promise<{ success: boolean; message: string }> => {
    saveStoredSupabaseConfig(url, anonKey);
    setSupabaseConfig((prev) => ({
      ...prev,
      url,
      anonKey,
    }));

    if (!url || !anonKey) {
      setSupabaseConfig((prev) => ({ ...prev, isConnected: false }));
      return { success: true, message: 'Configurações limpas. Operando em modo de armazenamento local.' };
    }

    const test = await testConnection();
    setSupabaseConfig((prev) => ({
      ...prev,
      isConnected: test.success,
    }));

    return test;
  };

  // Enviar dados locais para o Supabase
  const syncWithSupabase = async (): Promise<{ success: boolean; message: string }> => {
    setIsSyncing(true);
    setSyncStatusMessage('Enviando dados locais para o Supabase...');

    try {
      const prodRes = await syncProductsToSupabase(products);
      if (!prodRes.success) throw new Error(prodRes.error);

      const salesRes = await syncSalesToSupabase(sales);
      if (!salesRes.success) throw new Error(salesRes.error);

      const movRes = await syncMovementsToSupabase(movements);
      if (!movRes.success) throw new Error(movRes.error);

      const now = new Date().toLocaleTimeString('pt-BR');
      setSupabaseConfig((prev) => ({
        ...prev,
        isConnected: true,
        lastSyncedAt: now,
      }));

      setSyncStatusMessage('Sincronização concluída com sucesso!');
      return { success: true, message: `Dados sincronizados com o Supabase com sucesso às ${now}!` };
    } catch (err: any) {
      const msg = `Falha na sincronização: ${err.message}`;
      setSyncStatusMessage(msg);
      return { success: false, message: msg };
    } finally {
      setIsSyncing(false);
    }
  };

  // Baixar dados do Supabase
  const refreshFromSupabase = async (): Promise<{ success: boolean; message: string }> => {
    setIsSyncing(true);
    setSyncStatusMessage('Buscando dados atualizados do Supabase...');

    try {
      const remoteProducts = await fetchProductsFromSupabase();
      const remoteSales = await fetchSalesFromSupabase();
      const remoteMovements = await fetchMovementsFromSupabase();

      if (remoteProducts !== null) setProducts(remoteProducts);
      if (remoteSales !== null) setSales(remoteSales);
      if (remoteMovements !== null) setMovements(remoteMovements);

      const now = new Date().toLocaleTimeString('pt-BR');
      setSupabaseConfig((prev) => ({
        ...prev,
        isConnected: true,
        lastSyncedAt: now,
      }));

      setSyncStatusMessage('Dados atualizados com sucesso do Supabase!');
      return { success: true, message: 'Dados baixados com sucesso do Supabase!' };
    } catch (err: any) {
      const msg = `Falha ao carregar do Supabase: ${err.message}`;
      setSyncStatusMessage(msg);
      return { success: false, message: msg };
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SupermarketContext.Provider
      value={{
        products,
        sales,
        movements,
        supabaseConfig,
        isSyncing,
        syncStatusMessage,
        activeTab,
        setActiveTab,
        addProduct,
        updateProduct,
        deleteProduct,
        adjustStock,
        processSale,
        cancelSale,
        updateSupabaseCredentials,
        syncWithSupabase,
        refreshFromSupabase,
      }}
    >
      {children}
    </SupermarketContext.Provider>
  );
};

export const useSupermarket = () => {
  const context = useContext(SupermarketContext);
  if (!context) {
    throw new Error('useSupermarket deve ser usado dentro de um SupermarketProvider');
  }
  return context;
};
