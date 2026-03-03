import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formatea un número como moneda (por defecto, Soles Peruanos - PEN).
 * @param amount El monto a formatear.
 * @param currency El código de moneda (ej: 'PEN', 'USD').
 * @param locale El locale para el formato (ej: 'es-PE').
 * @returns El string formateado.
 */
export function formatCurrency(amount: number, currency: string = 'PEN', locale: string = 'es-PE'): string {
  // Asegura que el monto sea un número
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return 'S/ 0.00';
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(numericAmount);
}
