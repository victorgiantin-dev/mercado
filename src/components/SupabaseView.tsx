import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  ExternalLink, 
  Key, 
  Globe, 
  ShieldCheck, 
  Terminal,
  Download,
  Upload,
  Info
} from 'lucide-react';
import { useSupermarket } from '../context/SupermarketContext';
import { getSupabaseSQLScript } from '../services/supabase';

export const SupabaseView: React.FC = () => {
  const { 
    supabaseConfig, 
    updateSupabaseCredentials, 
    syncWithSupabase, 
    refreshFromSupabase, 
    isSyncing,
    products,
    sales,
    movements
  } = useSupermarket();

  const [url, setUrl] = useState(supabaseConfig.url || '');
  const [anonKey, setAnonKey] = useState(supabaseConfig.anonKey || '');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTesting(true);
    setStatusMessage(null);

    try {
      const res = await updateSupabaseCredentials(url.trim(), anonKey.trim());
      if (res.success) {
        setStatusMessage({ type: 'success', text: res.message });
      } else {
        setStatusMessage({ type: 'error', text: res.message });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: `Erro: ${err.message}` });
    } finally {
      setIsTesting(false);
    }
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(getSupabaseSQLScript());
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
  };

  const handleSyncPush = async () => {
    const res = await syncWithSupabase();
    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  const handleSyncPull = async () => {
    if (products.length > 0 || sales.length > 0) {
      if (!window.confirm('Deseja sincronizar e atualizar os dados a partir do Supabase? Os dados locais serão atualizados com os dados da nuvem.')) {
        return;
      }
    }
    const res = await refreshFromSupabase();
    setStatusMessage({
      type: res.success ? 'success' : 'error',
      text: res.message,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Conexão com o Supabase</h1>
            <span
              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1 ${
                supabaseConfig.isConnected
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  supabaseConfig.isConnected ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              />
              <span>{supabaseConfig.isConnected ? 'Supabase Conectado' : 'Armazenamento Local Ativo'}</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Persistência em nuvem PostgreSQL via Supabase para armazenar seu estoque, vendas e movimentações com segurança.
          </p>
        </div>

        {supabaseConfig.isConnected && (
          <div className="flex items-center space-x-2">
            <button
              onClick={handleSyncPush}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Sincronizando...' : 'Enviar Dados Locais'}</span>
            </button>
            <button
              onClick={handleSyncPull}
              disabled={isSyncing}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar da Nuvem</span>
            </button>
          </div>
        )}
      </div>

      {/* Status da Conexão */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border text-sm flex items-start space-x-3 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : statusMessage.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-900'
              : 'bg-blue-50 border-blue-200 text-blue-900'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div>
            <p className="font-semibold">{statusMessage.text}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Formulário de Configuração das Chaves */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Credenciais da API Supabase</h3>
                <p className="text-xs text-slate-500">Informe a URL do seu projeto e a chave anônima pública (anon key)</p>
              </div>
            </div>

            <form onSubmit={handleSaveAndTest} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  <span>Project URL do Supabase</span>
                </label>
                <input
                  type="url"
                  placeholder="https://exemplo-seu-projeto.supabase.co"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Encontrado no painel do Supabase em Project Settings → API → Project URL.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                  <span>Project API Key (Anon / Public)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  value={anonKey}
                  onChange={(e) => setAnonKey(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Encontrado no painel do Supabase em Project Settings → API → Project API Keys (anon/public).
                </span>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setUrl('');
                    setAnonKey('');
                    updateSupabaseCredentials('', '');
                  }}
                  className="text-xs text-slate-500 hover:text-slate-800 underline cursor-pointer"
                >
                  Limpar credenciais
                </button>

                <button
                  type="submit"
                  disabled={isTesting}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
                  <span>{isTesting ? 'Testando Conexão...' : 'Salvar e Conectar'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Resumo de Dados Locais Prontos para Nuvem */}
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200/80 space-y-3">
            <h4 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <span>Resumo de Dados Cadastrados no Sistema</span>
            </h4>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Produtos</span>
                <span className="text-lg font-black text-slate-900">{products.length}</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Vendas</span>
                <span className="text-lg font-black text-slate-900">{sales.length}</span>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-slate-200">
                <span className="text-[11px] text-slate-500 block">Movimentações</span>
                <span className="text-lg font-black text-slate-900">{movements.length}</span>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Seus dados estão 100% seguros no armazenamento local do navegador e prontos para sincronização imediata com o Supabase quando configurado.
            </p>
          </div>
        </div>

        {/* Script SQL para Criar as Tabelas no Supabase */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Script SQL do Banco de Dados</h3>
                  <p className="text-xs text-slate-500">Execute no SQL Editor do seu projeto Supabase</p>
                </div>
              </div>

              <button
                onClick={handleCopySQL}
                className="flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs"
              >
                {copiedSql ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="bg-slate-900 text-slate-200 rounded-2xl p-4 font-mono text-[11px] leading-relaxed max-h-80 overflow-y-auto border border-slate-800">
              <pre>{getSupabaseSQLScript()}</pre>
            </div>

            <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4 text-xs text-slate-700 space-y-1.5">
              <p className="font-bold text-emerald-950 flex items-center space-x-1.5">
                <Info className="w-4 h-4 text-emerald-600" />
                <span>Como configurar seu Supabase em 3 passos:</span>
              </p>
              <ol className="list-decimal list-inside space-y-1 text-slate-600">
                <li>
                  Acesse{' '}
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noreferrer"
                    className="font-bold text-emerald-700 hover:underline inline-flex items-center"
                  >
                    supabase.com <ExternalLink className="w-3 h-3 ml-0.5" />
                  </a>{' '}
                  e crie seu projeto gratuito.
                </li>
                <li>No menu lateral esquerdo, clique em <strong>SQL Editor</strong>, cole o script acima e clique em <strong>RUN</strong>.</li>
                <li>Vá em <strong>Project Settings → API</strong>, copie a URL e a Anon Key e cole nos campos ao lado!</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
