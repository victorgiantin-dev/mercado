export type UnitType = 'UN' | 'KG' | 'L' | 'PCT' | 'CX' | 'G';

export type PaymentMethod = 
  | 'dinheiro' 
  | 'cartao_credito' 
  | 'cartao_debito' 
  | 'pix' 
  | 'vale_alimentacao' 
  | 'vale_refeicao' 
  | 'outro';

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  unit: UnitType;
  cost_price: number;
  sale_price: number;
  current_stock: number;
  min_stock: number;
  supplier?: string;
  expiration_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  product_id: string;
  product_name: string;
  barcode: string;
  unit: UnitType;
  quantity: number;
  unit_price: number;
  cost_price: number;
  total: number;
}

export interface Sale {
  id: string;
  sale_code: string;
  created_at: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  payment_method: PaymentMethod;
  amount_received?: number;
  change?: number;
  customer_name?: string;
  notes?: string;
  status: 'completed' | 'cancelled';
}

export type MovementType = 'entrada' | 'saida' | 'ajuste' | 'venda' | 'cancelamento_venda';

export interface StockMovement {
  id: string;
  product_id: string;
  product_name: string;
  type: MovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  created_at: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSyncedAt?: string;
}
