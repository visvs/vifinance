/**
 * CAT — Costo Anual Total.
 *
 * El CAT es el número que la ley obliga a publicar en México junto a cualquier
 * crédito, y es lo único que permite comparar dos ofertas de verdad: incluye la
 * tasa, las comisiones, los seguros obligatorios y el momento exacto en que
 * ocurre cada flujo. Un crédito "sin intereses" con una comisión de apertura
 * alta puede tener un CAT enorme.
 *
 * Metodología oficial (Banco de México, Circular 21/2009). El CAT es el valor
 * de `i`, expresado en porcentaje, que satisface:
 *
 *     Σ_{j=1}^{M} Aj / (1+i)^tj  =  Σ_{k=1}^{N} Bk / (1+i)^sk
 *
 * donde:
 *   Aj = monto de la j-ésima disposición del crédito
 *   Bk = monto del k-ésimo pago
 *   tj, sk = intervalo de tiempo **expresado en años y fracciones de año**
 *            entre la fecha en que surte efecto el contrato y ese flujo
 *
 * Como los exponentes van en años, `i` resulta directamente una tasa efectiva
 * anual. Se publica redondeado a un decimal.
 *
 * Ejemplo oficial de Banxico, usado como caso de validación de este módulo:
 * un crédito de $15,000 que se liquida en 24 pagos mensuales de $962.33, con
 * una comisión de $100 pagadera al firmar, tiene CAT = 57.4%.
 */

import { type Centavos, toPesos } from "./money";

/** Un flujo de efectivo fechado en años desde el inicio del contrato. */
export interface CashFlow {
  /** Monto en centavos. Siempre positivo: el lado lo define dónde se coloca. */
  amount: Centavos;
  /** Momento del flujo, en años y fracciones de año desde el inicio. */
  timeInYears: number;
}

export interface CatInput {
  /** Disposiciones: lo que el cliente recibe. */
  disbursements: CashFlow[];
  /** Pagos: todo lo que el cliente entrega (mensualidades, comisiones, seguros). */
  payments: CashFlow[];
}

export class CatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatError";
  }
}

/** Valor presente neto de la ecuación del CAT para una tasa dada. */
function netPresentValue(input: CatInput, rate: number): number {
  const discount = (flow: CashFlow) =>
    toPesos(flow.amount) / Math.pow(1 + rate, flow.timeInYears);

  const disbursed = input.disbursements.reduce(
    (sum, flow) => sum + discount(flow),
    0,
  );
  const paid = input.payments.reduce((sum, flow) => sum + discount(flow), 0);

  return disbursed - paid;
}

/**
 * Resuelve el CAT por bisección.
 *
 * Se usa bisección y no Newton-Raphson a propósito: con flujos irregulares
 * Newton puede divergir o saltar a una raíz sin sentido económico, mientras que
 * la bisección converge siempre dentro del intervalo acotado. El rango llega
 * hasta 100,000% porque los créditos de nómina y algunas tarjetas en México
 * alcanzan CAT de tres dígitos sin problema.
 */
export function calculateCat(input: CatInput): number {
  if (input.disbursements.length === 0 || input.payments.length === 0) {
    throw new CatError("Se requiere al menos una disposición y un pago");
  }

  let low = -0.9999;
  let high = 1000;

  let npvLow = netPresentValue(input, low);
  let npvHigh = netPresentValue(input, high);

  if (npvLow * npvHigh > 0) {
    throw new CatError(
      "No existe una tasa que equilibre los flujos: revisa montos y fechas",
    );
  }

  for (let iteration = 0; iteration < 200; iteration++) {
    const mid = (low + high) / 2;
    const npvMid = netPresentValue(input, mid);

    if (Math.abs(npvMid) < 1e-10 || high - low < 1e-12) {
      return mid;
    }

    if (npvLow * npvMid < 0) {
      high = mid;
      npvHigh = npvMid;
    } else {
      low = mid;
      npvLow = npvMid;
    }
  }

  return (low + high) / 2;
}

/** Formatea el CAT como lo exige la regulación: porcentaje con un decimal. */
export function formatCat(cat: number): string {
  return `${(cat * 100).toFixed(1)}%`;
}

export interface SimpleCreditCatInput {
  /** Monto que recibe el cliente. */
  principal: Centavos;
  /** Pago periódico fijo. */
  payment: Centavos;
  /** Número de pagos. */
  periods: number;
  /** Pagos por año: 12 mensual, 24 quincenal, 52 semanal. */
  periodsPerYear?: number;
  /** Comisión de apertura, cobrada al firmar. */
  openingFee?: Centavos;
  /** Cuota periódica de seguro obligatorio, incluida en cada pago. */
  insurancePerPeriod?: Centavos;
}

/**
 * CAT de un crédito de pagos uniformes, que es el caso del 95% de los créditos
 * al consumo. Construye los flujos y llama a `calculateCat`.
 *
 * La comisión de apertura se trata como un pago en el momento cero, tal como lo
 * hace el ejemplo oficial de Banxico.
 */
export function calculateSimpleCreditCat(
  input: SimpleCreditCatInput,
): number {
  const {
    principal,
    payment,
    periods,
    periodsPerYear = 12,
    openingFee = 0,
    insurancePerPeriod = 0,
  } = input;

  const payments: CashFlow[] = [];

  if (openingFee > 0) {
    payments.push({ amount: openingFee, timeInYears: 0 });
  }

  for (let k = 1; k <= periods; k++) {
    payments.push({
      amount: payment + insurancePerPeriod,
      timeInYears: k / periodsPerYear,
    });
  }

  return calculateCat({
    disbursements: [{ amount: principal, timeInYears: 0 }],
    payments,
  });
}
