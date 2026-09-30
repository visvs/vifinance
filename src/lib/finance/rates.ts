/**
 * Conversión de tasas de interés.
 *
 * En México conviven varias formas de expresar "lo que gana" una cuenta y no
 * son intercambiables:
 *
 * - **Tasa nominal anual**: la que anuncia el banco. No dice nada por sí sola
 *   hasta que sabes cada cuánto capitaliza.
 * - **Tasa efectiva anual**: lo que realmente ganas en un año con esa
 *   capitalización. Es la que permite comparar productos.
 * - **GAT Nominal**: la Ganancia Anual Total que la CONDUSEF obliga a publicar.
 *   Es una tasa efectiva anual que ya incluye comisiones.
 * - **GAT Real**: la GAT Nominal descontando la inflación esperada. Es el único
 *   número que dice si tu dinero gana o pierde poder de compra.
 */

/** Frecuencia con que el interés se suma al capital. */
export type CompoundingFrequency =
  | "daily"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "semiannual"
  | "annual"
  | "at_maturity";

/** Base de días del año usada para prorratear la tasa. */
export type DayCountBasis = 360 | 365;

export const COMPOUNDING_LABELS: Record<CompoundingFrequency, string> = {
  daily: "Diaria",
  monthly: "Mensual",
  bimonthly: "Bimestral",
  quarterly: "Trimestral",
  semiannual: "Semestral",
  annual: "Anual",
  at_maturity: "Al vencimiento",
};

/**
 * Períodos de capitalización por año.
 *
 * `at_maturity` no capitaliza dentro del plazo, así que equivale a una sola
 * liquidación al final: se trata como interés simple sobre el plazo.
 */
export function periodsPerYear(frequency: CompoundingFrequency): number {
  switch (frequency) {
    case "daily":
      return 365;
    case "monthly":
      return 12;
    case "bimonthly":
      return 6;
    case "quarterly":
      return 4;
    case "semiannual":
      return 2;
    case "annual":
    case "at_maturity":
      return 1;
  }
}

/**
 * Tasa nominal anual → tasa efectiva anual.
 *
 * `nominalAnnual` es decimal: 0.1475 para 14.75%.
 */
export function nominalToEffective(
  nominalAnnual: number,
  frequency: CompoundingFrequency,
): number {
  if (frequency === "at_maturity") return nominalAnnual;
  const m = periodsPerYear(frequency);
  return Math.pow(1 + nominalAnnual / m, m) - 1;
}

/** Tasa efectiva anual → tasa nominal anual con la capitalización dada. */
export function effectiveToNominal(
  effectiveAnnual: number,
  frequency: CompoundingFrequency,
): number {
  if (frequency === "at_maturity") return effectiveAnnual;
  const m = periodsPerYear(frequency);
  return (Math.pow(1 + effectiveAnnual, 1 / m) - 1) * m;
}

/**
 * Factor de crecimiento de un día, a partir de una tasa nominal anual.
 *
 * Con capitalización diaria el interés del día se calcula sobre el saldo que ya
 * incluye el interés de ayer; con capitalización mensual o mayor, el devengo
 * diario es lineal (tasa / base) y sólo se capitaliza al cerrar el período.
 */
export function dailyRate(
  nominalAnnual: number,
  basis: DayCountBasis = 365,
): number {
  return nominalAnnual / basis;
}

/**
 * Tasa efectiva de un plazo en días, a partir de una tasa nominal anual.
 * Es el cálculo de un pagaré o un depósito a plazo fijo mexicano.
 */
export function rateForTerm(
  nominalAnnual: number,
  days: number,
  basis: DayCountBasis = 360,
): number {
  return (nominalAnnual * days) / basis;
}

/**
 * GAT Real a partir de la GAT Nominal y la inflación anual esperada.
 *
 * No es una resta: es el descuento de la inflación sobre el crecimiento.
 * Con GAT Nominal 15% e inflación 4%, la GAT Real es 10.58%, no 11%.
 */
export function gatReal(gatNominal: number, annualInflation: number): number {
  return (1 + gatNominal) / (1 + annualInflation) - 1;
}

/** Inverso de `gatReal`: qué GAT Nominal se necesita para una GAT Real dada. */
export function gatNominalFromReal(
  gatRealRate: number,
  annualInflation: number,
): number {
  return (1 + gatRealRate) * (1 + annualInflation) - 1;
}

/**
 * Convierte una tasa efectiva anual a la tasa efectiva de un período.
 * Por ejemplo, para pasar de una tasa anual a la tasa mensual de una
 * amortización de crédito.
 */
export function effectiveAnnualToPeriodRate(
  effectiveAnnual: number,
  periodsInYear: number,
): number {
  return Math.pow(1 + effectiveAnnual, 1 / periodsInYear) - 1;
}

/** Formatea una tasa decimal como porcentaje (0.1475 → "14.75%"). */
export function formatRate(rate: number, decimals = 2): string {
  return `${(rate * 100).toFixed(decimals)}%`;
}
