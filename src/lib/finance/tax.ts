/**
 * Impuestos mexicanos sobre productos financieros.
 *
 * La particularidad que casi ninguna calculadora considera: en México la
 * retención de ISR sobre intereses **no se calcula sobre el interés ganado**,
 * sino sobre el **capital** que lo generó, aplicando una tasa anual que el
 * Congreso fija cada año en la Ley de Ingresos de la Federación.
 *
 * La consecuencia es contraintuitiva y vale la pena mostrarla en la app: si tu
 * cuenta rinde menos que la tasa de retención, puedes terminar con una
 * retención mayor que el interés ganado. Por eso la app siempre muestra el
 * rendimiento bruto y el neto por separado.
 *
 * Las tasas viven en la tabla `tax_parameters` (una fila por año) y se pasan
 * como argumento: este módulo no las conoce ni las supone.
 */

import { type Centavos, multiplyWithRemainder, subtract } from "./money";

/** Parámetros fiscales de un año, tal como se guardan en `tax_parameters`. */
export interface TaxParameters {
  /** Año fiscal al que aplican. */
  year: number;
  /** Tasa anual de retención de ISR sobre el capital. Decimal: 0.005 = 0.50%. */
  isrRateOnCapital: number;
  /** IVA aplicable a comisiones. Decimal: 0.16 = 16%. */
  ivaRate: number;
  /** Inflación anual estimada, usada para calcular la GAT Real. */
  estimatedInflation: number;
  /** Valor diario de la UMA, en centavos. */
  umaDaily: Centavos;
}

export interface WithholdingResult {
  /** Interés ganado antes de impuestos. */
  grossInterest: Centavos;
  /** ISR retenido. */
  withheld: Centavos;
  /** Interés que realmente queda en el bolsillo. */
  netInterest: Centavos;
  /** Residuo sub-centavo de la retención, para acarrear al siguiente día. */
  remainder: number;
}

/**
 * Calcula la retención de ISR de un período.
 *
 * @param capital Saldo que generó el interés.
 * @param grossInterest Interés bruto del período.
 * @param isrRateOnCapital Tasa anual de retención (decimal).
 * @param days Días que cubre el período.
 * @param basis Base de días del año (la retención usa 365 días naturales).
 */
export function calculateWithholding(
  capital: Centavos,
  grossInterest: Centavos,
  isrRateOnCapital: number,
  days = 1,
  basis = 365,
): WithholdingResult {
  const { value: withheld, remainder } = multiplyWithRemainder(
    capital,
    (isrRateOnCapital * days) / basis,
  );

  return {
    grossInterest,
    withheld,
    netInterest: subtract(grossInterest, withheld),
    remainder,
  };
}

/**
 * Tasa neta aproximada después de ISR, para comparar productos.
 *
 * Como la retención se calcula sobre el capital, la tasa neta es simplemente la
 * tasa bruta menos la tasa de retención — de ahí que un producto al 0.40% anual
 * pueda dar rendimiento neto negativo con una retención del 0.50%.
 */
export function netRateAfterIsr(
  grossAnnualRate: number,
  isrRateOnCapital: number,
): number {
  return grossAnnualRate - isrRateOnCapital;
}

/** Agrega IVA a una comisión. */
export function withIva(amount: Centavos, ivaRate: number): Centavos {
  const { value } = multiplyWithRemainder(amount, 1 + ivaRate);
  return value;
}

/** Separa el IVA contenido en un monto que ya lo incluye. */
export function extractIva(
  amountWithIva: Centavos,
  ivaRate: number,
): { base: Centavos; iva: Centavos } {
  const { value: base } = multiplyWithRemainder(amountWithIva, 1 / (1 + ivaRate));
  return { base, iva: subtract(amountWithIva, base) };
}
