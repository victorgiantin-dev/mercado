import { PaymentMethod } from '../types';

export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function formatQuantity(value: number | undefined | null, unit: string = 'UN'): string {
  if (value === undefined || value === null || isNaN(value)) {
    return `0 ${unit}`;
  }
  const isFractional = unit === 'KG' || unit === 'L' || unit === 'G';
  const formattedNumber = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: isFractional ? (value % 1 === 0 ? 0 : 3) : 0,
    maximumFractionDigits: isFractional ? 3 : 0,
  }).format(value);

  return `${formattedNumber} ${unit}`;
}

export function formatDate(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatDateTime(dateStr: string | undefined): string {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function getPaymentMethodLabel(method: PaymentMethod): string {
  switch (method) {
    case 'dinheiro':
      return 'Dinheiro';
    case 'cartao_credito':
      return 'Cartão de Crédito';
    case 'cartao_debito':
      return 'Cartão de Débito';
    case 'pix':
      return 'PIX';
    case 'vale_alimentacao':
      return 'Vale Alimentação';
    case 'vale_refeicao':
      return 'Vale Refeição';
    case 'outro':
    default:
      return 'Outro';
  }
}
