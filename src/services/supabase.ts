import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Product, Sale, StockMovement, SupabaseConfig } from '../types';

const STORAGE_KEY_URL = 'supermercado_supabase_url';
const STORAGE_KEY_KEY = 'supermercado_supabase_anon_key';

// Singleton global para evitar instâncias duplicadas do GoTrueClient
declare global {
  var _supabaseInstance: SupabaseClient | null | undefined;
  var _supabaseConfigKey: string | undefined;
}

export function getStoredSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
  const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

  const savedUrl = localStorage.getItem(STORAGE_KEY_URL) || '';
  const savedKey = localStorage.getItem(STORAGE_KEY_KEY) || '';

  return {
    url: savedUrl || envUrl,
    anonKey: savedKey || envKey,
  };
}

export function saveStoredSupabaseConfig(url: string, anonKey: string) {
  localStorage.setItem(STORAGE_KEY_URL, url.trim());
  localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  globalThis._supabaseInstance = null;
  globalThis._supabaseConfigKey = undefined;
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseConfig();
  if (!url || !anonKey) return null;

  const currentConfigKey = `${url}::${anonKey}`;
  if (globalThis._supabaseInstance && globalThis._supabaseConfigKey === currentConfigKey) {
    return globalThis._supabaseInstance;
  }

  try {
    // Configurado com persistSession: false pois o sistema utiliza a chave Anon
    // diretamente nas tabelas RLS, eliminando o conflito de múltiplas instâncias GoTrueClient
    globalThis._supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    globalThis._supabaseConfigKey = currentConfigKey;
    return globalThis._supabaseInstance;
  } catch (e) {
    console.error('Erro ao instanciar cliente Supabase:', e);
    return null;
  }
}

export async function testConnection(): Promise<{ success: boolean; message: string }> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      message: 'URL ou Chave Anon do Supabase não configuradas.',
    };
  }

  try {
    // Tenta uma consulta simples na tabela produtos ou health check
    const { error } = await client.from('produtos').select('id').limit(1);
    if (error) {
      // Se a tabela não existir ainda, a conexão com Supabase foi bem-sucedida, mas a tabela precisa ser criada
      if (error.code === '42P01' || error.message.includes('relation "produtos" does not exist') || error.message.includes('not found')) {
        return {
          success: true,
          message: 'Conectado ao Supabase com sucesso! (Observação: execute o script SQL para criar as tabelas).',
        };
      }
      return {
        success: false,
        message: `Erro do Supabase: ${error.message}`,
      };
    }
    return {
      success: true,
      message: 'Conexão com o Supabase estabelecida e tabelas verificadas com sucesso!',
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Falha na conexão: ${err.message || 'Verifique sua URL e Chave Anon.'}`,
    };
  }
}

// Sincronização de Produtos
export async function syncProductsToSupabase(products: Product[]): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado' };
  if (products.length === 0) return { success: true };

  try {
    const formatted = products.map((p) => ({
      id: p.id,
      name: p.name,
      barcode: p.barcode,
      category: p.category,
      unit: p.unit,
      cost_price: p.cost_price,
      sale_price: p.sale_price,
      current_stock: p.current_stock,
      min_stock: p.min_stock,
      supplier: p.supplier || null,
      expiration_date: p.expiration_date || null,
      created_at: p.created_at,
      updated_at: p.updated_at,
    }));

    const { error } = await client.from('produtos').upsert(formatted, { onConflict: 'id' });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchProductsFromSupabase(): Promise<Product[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('produtos').select('*').order('name');
    if (error) throw error;
    if (!data) return [];

    return data.map((item: any) => ({
      id: item.id,
      name: item.name,
      barcode: item.barcode || '',
      category: item.category || 'Geral',
      unit: item.unit || 'UN',
      cost_price: Number(item.cost_price) || 0,
      sale_price: Number(item.sale_price) || 0,
      current_stock: Number(item.current_stock) || 0,
      min_stock: Number(item.min_stock) || 0,
      supplier: item.supplier || undefined,
      expiration_date: item.expiration_date || undefined,
      created_at: item.created_at || new Date().toISOString(),
      updated_at: item.updated_at || new Date().toISOString(),
    }));
  } catch (err) {
    console.error('Erro ao buscar produtos do Supabase:', err);
    return null;
  }
}

// Sincronização de Vendas
export async function syncSalesToSupabase(sales: Sale[]): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado' };
  if (sales.length === 0) return { success: true };

  try {
    const formattedSales = sales.map((s) => ({
      id: s.id,
      sale_code: s.sale_code,
      created_at: s.created_at,
      subtotal: s.subtotal,
      discount: s.discount,
      total: s.total,
      payment_method: s.payment_method,
      amount_received: s.amount_received || null,
      change: s.change || null,
      customer_name: s.customer_name || null,
      notes: s.notes || null,
      status: s.status,
      items: s.items, // Gravado como JSONB para praticidade e rapidez
    }));

    const { error } = await client.from('vendas').upsert(formattedSales, { onConflict: 'id' });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchSalesFromSupabase(): Promise<Sale[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('vendas').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];

    return data.map((item: any) => ({
      id: item.id,
      sale_code: item.sale_code,
      created_at: item.created_at,
      subtotal: Number(item.subtotal) || 0,
      discount: Number(item.discount) || 0,
      total: Number(item.total) || 0,
      payment_method: item.payment_method,
      amount_received: item.amount_received ? Number(item.amount_received) : undefined,
      change: item.change ? Number(item.change) : undefined,
      customer_name: item.customer_name || undefined,
      notes: item.notes || undefined,
      status: item.status || 'completed',
      items: Array.isArray(item.items) ? item.items : [],
    }));
  } catch (err) {
    console.error('Erro ao buscar vendas do Supabase:', err);
    return null;
  }
}

// Sincronização de Movimentações
export async function syncMovementsToSupabase(movements: StockMovement[]): Promise<{ success: boolean; error?: string }> {
  const client = getSupabaseClient();
  if (!client) return { success: false, error: 'Supabase não conectado' };
  if (movements.length === 0) return { success: true };

  try {
    const formatted = movements.map((m) => ({
      id: m.id,
      product_id: m.product_id,
      product_name: m.product_name,
      type: m.type,
      quantity: m.quantity,
      previous_stock: m.previous_stock,
      new_stock: m.new_stock,
      reason: m.reason || null,
      created_at: m.created_at,
    }));

    const { error } = await client.from('movimentacoes_estoque').upsert(formatted, { onConflict: 'id' });
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function fetchMovementsFromSupabase(): Promise<StockMovement[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client.from('movimentacoes_estoque').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    if (!data) return [];

    return data.map((item: any) => ({
      id: item.id,
      product_id: item.product_id,
      product_name: item.product_name,
      type: item.type,
      quantity: Number(item.quantity) || 0,
      previous_stock: Number(item.previous_stock) || 0,
      new_stock: Number(item.new_stock) || 0,
      reason: item.reason || undefined,
      created_at: item.created_at,
    }));
  } catch (err) {
    console.error('Erro ao buscar movimentações do Supabase:', err);
    return null;
  }
}

// Script SQL pronto para o usuário executar no SQL Editor do Supabase
export function getSupabaseSQLScript(): string {
  return `-- ========================================================
-- SCRIPT COMPLETO DO BANCO DE DADOS E STORAGE (SUPABASE)
-- Sistema: Supermercado Gestão Pro (Estoque, Vendas, Dashboard)
-- ========================================================

-- 1. HABILITAR EXTENSÃO UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 2. CRIAÇÃO DAS TABELAS DO BANCO DE DADOS
-- ========================================================

-- TABELA: PRODUTOS (ESTOQUE)
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    barcode TEXT,
    category TEXT DEFAULT 'Geral',
    unit TEXT DEFAULT 'UN',
    cost_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    sale_price NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    current_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    min_stock NUMERIC(12, 3) NOT NULL DEFAULT 0.000,
    supplier TEXT,
    expiration_date DATE,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- TABELA: VENDAS (PDV / FRENTE DE CAIXA)
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_code TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    discount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    payment_method TEXT NOT NULL,
    amount_received NUMERIC(12, 2),
    change NUMERIC(12, 2),
    customer_name TEXT,
    notes TEXT,
    status TEXT DEFAULT 'completed',
    items JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- TABELA: MOVIMENTAÇÕES DE ESTOQUE (HISTÓRICO / AUDITORIA)
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID REFERENCES public.produtos(id) ON DELETE CASCADE,
    product_name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'entrada', 'saida', 'ajuste', 'venda', 'cancelamento_venda'
    quantity NUMERIC(12, 3) NOT NULL,
    previous_stock NUMERIC(12, 3) NOT NULL,
    new_stock NUMERIC(12, 3) NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_produtos_barcode ON public.produtos (barcode);
CREATE INDEX IF NOT EXISTS idx_produtos_category ON public.produtos (category);
CREATE INDEX IF NOT EXISTS idx_vendas_created_at ON public.vendas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendas_status ON public.vendas (status);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_product_id ON public.movimentacoes_estoque (product_id);

-- TRIGGER AUTOMÁTICO PARA ATUALIZAR updated_at EM PRODUTOS
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_produtos_updated_at ON public.produtos;
CREATE TRIGGER trigger_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ========================================================
-- 3. POLÍTICAS DE ACESSO ÀS TABELAS (RLS - ROW LEVEL SECURITY)
-- ========================================================
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Políticas para Produtos (Leitura, Inserção, Atualização e Exclusão)
DROP POLICY IF EXISTS "Permitir leitura total produtos" ON public.produtos;
CREATE POLICY "Permitir leitura total produtos" ON public.produtos
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao produtos" ON public.produtos;
CREATE POLICY "Permitir insercao produtos" ON public.produtos
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao produtos" ON public.produtos;
CREATE POLICY "Permitir atualizacao produtos" ON public.produtos
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusao produtos" ON public.produtos;
CREATE POLICY "Permitir exclusao produtos" ON public.produtos
    FOR DELETE USING (true);

-- Políticas para Vendas
DROP POLICY IF EXISTS "Permitir leitura total vendas" ON public.vendas;
CREATE POLICY "Permitir leitura total vendas" ON public.vendas
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao vendas" ON public.vendas;
CREATE POLICY "Permitir insercao vendas" ON public.vendas
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao vendas" ON public.vendas;
CREATE POLICY "Permitir atualizacao vendas" ON public.vendas
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusao vendas" ON public.vendas;
CREATE POLICY "Permitir exclusao vendas" ON public.vendas
    FOR DELETE USING (true);

-- Políticas para Movimentações de Estoque
DROP POLICY IF EXISTS "Permitir leitura total movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Permitir leitura total movimentacoes" ON public.movimentacoes_estoque
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permitir insercao movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Permitir insercao movimentacoes" ON public.movimentacoes_estoque
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualizacao movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Permitir atualizacao movimentacoes" ON public.movimentacoes_estoque
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir exclusao movimentacoes" ON public.movimentacoes_estoque;
CREATE POLICY "Permitir exclusao movimentacoes" ON public.movimentacoes_estoque
    FOR DELETE USING (true);

-- ========================================================
-- 4. BUCKET DE ARMAZENAMENTO E POLÍTICAS DE STORAGE
-- ========================================================

-- Criar o Bucket 'supermercado' para fotos de produtos, recibos e documentos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'supermercado',
    'supermercado',
    true,
    5242880, -- Limite de 5MB por arquivo
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880;

-- Observação: A tabela storage.objects já possui RLS habilitado por padrão no Supabase.

-- Política de Armazenamento 1: Visualização / Download Público de Arquivos
DROP POLICY IF EXISTS "Supermercado - Leitura Publica de Arquivos" ON storage.objects;
CREATE POLICY "Supermercado - Leitura Publica de Arquivos"
ON storage.objects FOR SELECT
USING (bucket_id = 'supermercado');

-- Política de Armazenamento 2: Upload de Arquivos
DROP POLICY IF EXISTS "Supermercado - Upload de Arquivos" ON storage.objects;
CREATE POLICY "Supermercado - Upload de Arquivos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'supermercado');

-- Política de Armazenamento 3: Atualização de Arquivos
DROP POLICY IF EXISTS "Supermercado - Atualizacao de Arquivos" ON storage.objects;
CREATE POLICY "Supermercado - Atualizacao de Arquivos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'supermercado')
WITH CHECK (bucket_id = 'supermercado');

-- Política de Armazenamento 4: Exclusão de Arquivos
DROP POLICY IF EXISTS "Supermercado - Exclusao de Arquivos" ON storage.objects;
CREATE POLICY "Supermercado - Exclusao de Arquivos"
ON storage.objects FOR DELETE
USING (bucket_id = 'supermercado');
`;
}
