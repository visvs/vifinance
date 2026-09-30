/**
 * Amortización de créditos por el sistema francés (pago fijo).
 *
 * Es el sistema de prácticamente todo el crédito al consumo en México: la
 * mensualidad no cambia, pero al principio casi todo se va a intereses y sólo
 * al final empiezas a pagar deuda de verdad. La tabla lo hace visible.
 */

import {
  add,
  type Centavos,
  multiply,
  roundHalfEven,
  subtract,
} from "./money";

export interface AmortizationInput {
  /** Monto financiado (precio menos enganche). */
  principal: Centavos;
  /** Tasa nominal anual en decimal: 0.24 para 24%. */
  annualRate: number;
  /** Número de pagos. */
  periods: number;
  /** Pagos por año: 12 mensual, 24 quincenal, 52 semanal. */
  periodsPerYear?: number;
  /** Comisión por apertura, como decimal del monto financiado. */
  openingFeeRate?: number;
  /** Cuota fija periódica de seguro, si el crédito lo exige. */
  insurancePerPeriod?: Centavos;
  /** IVA sobre los intereses. Para personas físicas normalmente no aplica. */
  ivaOnInterest?: number;
}

export interface AmortizationRow {
  /** Número de pago, empezando en 1. */
  period: number;
  /** Saldo insoluto antes de este pago. */
  openingBalance: Centavos;
  /** Pago total del período (capital + interés + IVA + seguro). */
  payment: Centavos;
  /** Parte que se va a intereses. */
  interest: Centavos;
  /** IVA sobre los intereses, si aplica. */
  iva: Centavos;
  /** Seguro del período, si aplica. */
  insurance: Centavos;
  /** Parte que efectivamente reduce la deuda. */
  principal: Centavos;
  /** Abono extra aplicado directo a capital en este período. */
  extraPayment: Centavos;
  /** Saldo insoluto después del pago. */
  closingBalance: Centavos;
}

export interface AmortizationResult {
  /** Pago fijo del crédito, sin contar abonos extra. */
  periodicPayment: Centavos;
  /** Pago total incluyendo seguro e IVA. */
  totalPeriodicPayment: Centavos;
  /** Comisión por apertura cobrada al inicio. */
  openingFee: Centavos;
  /** Suma de todos los intereses pagados. */
  totalInterest: Centavos;
  /** Suma de todo el IVA pagado. */
  totalIva: Centavos;
  /** Suma de todos los seguros pagados. */
  totalInsurance: Centavos;
  /** Todo lo que sale de tu bolsillo, incluida la comisión de apertura. */
  totalPaid: Centavos;
  /** Cuántos pagos se hicieron realmente (menos si hubo abonos a capital). */
  actualPeriods: number;
  schedule: AmortizationRow[];
}

/** Estrategia al hacer un abono extra a capital. */
export type ExtraPaymentStrategy = "reduce_term" | "reduce_payment";

export interface ExtraPayment {
  /** Número de pago en el que se hace el abono. */
  period: number;
  /** Monto del abono, aplicado íntegro a capital. */
  amount: Centavos;
}

/**
 * Pago periódico del sistema francés.
 *
 * `P * i / (1 - (1+i)^-n)`, con el caso especial de tasa cero (crédito sin
 * intereses, como un MSI), donde el pago es simplemente el capital entre los
 * períodos.
 */
export function periodicPayment(
  principal: Centavos,
  annualRate: number,
  periods: number,
  periodsPerYear = 12,
): Centavos {
  if (periods <= 0) return 0;
  const i = annualRate / periodsPerYear;
  if (i === 0) return roundHalfEven(principal / periods);
  return roundHalfEven((principal * i) / (1 - Math.pow(1 + i, -periods)));
}

/**
 * Construye la tabla de amortización completa.
 *
 * Los abonos extra se aplican íntegros a capital. Con `reduce_term` la
 * mensualidad no cambia y el crédito se acaba antes; con `reduce_payment` el
 * plazo se respeta y se recalcula la mensualidad sobre el saldo restante.
 */
export function buildAmortizationSchedule(
  input: AmortizationInput,
  extraPayments: ExtraPayment[] = [],
  strategy: ExtraPaymentStrategy = "reduce_term",
): AmortizationResult {
  const {
    principal,
    annualRate,
    periods,
    periodsPerYear = 12,
    openingFeeRate = 0,
    insurancePerPeriod = 0,
    ivaOnInterest = 0,
  } = input;

  const i = annualRate / periodsPerYear;
  const openingFee = multiply(principal, openingFeeRate);

  let payment = periodicPayment(principal, annualRate, periods, periodsPerYear);
  let balance = principal;

  const extrasByPeriod = new Map<number, Centavos>();
  for (const extra of extraPayments) {
    extrasByPeriod.set(
      extra.period,
      add(extrasByPeriod.get(extra.period) ?? 0, extra.amount),
    );
  }

  const schedule: AmortizationRow[] = [];
  let totalInterest = 0;
  let totalIva = 0;
  let totalInsurance = 0;
  let totalPaid = openingFee;

  for (let period = 1; period <= periods && balance > 0; period++) {
    const openingBalance = balance;
    const interest = multiply(balance, i);
    const iva = multiply(interest, ivaOnInterest);

    // En el último pago se liquida el saldo exacto: arrastrar el redondeo
    // dejaría un residuo de centavos vivo para siempre.
    let principalPortion = subtract(payment, interest);
    if (principalPortion > balance) {
      principalPortion = balance;
      payment = add(principalPortion, interest);
    }

    balance = subtract(balance, principalPortion);

    let extra = extrasByPeriod.get(period) ?? 0;
    if (extra > balance) extra = balance;
    balance = subtract(balance, extra);

    const rowPayment = add(payment, iva, insurancePerPeriod, extra);

    schedule.push({
      period,
      openingBalance,
      payment: rowPayment,
      interest,
      iva,
      insurance: insurancePerPeriod,
      principal: principalPortion,
      extraPayment: extra,
      closingBalance: balance,
    });

    totalInterest = add(totalInterest, interest);
    totalIva = add(totalIva, iva);
    totalInsurance = add(totalInsurance, insurancePerPeriod);
    totalPaid = add(totalPaid, rowPayment);

    if (extra > 0 && strategy === "reduce_payment" && balance > 0) {
      payment = periodicPayment(
        balance,
        annualRate,
        periods - period,
        periodsPerYear,
      );
    }
  }

  const basePayment = periodicPayment(
    principal,
    annualRate,
    periods,
    periodsPerYear,
  );

  return {
    periodicPayment: basePayment,
    totalPeriodicPayment: add(
      basePayment,
      multiply(multiply(principal, i), ivaOnInterest),
      insurancePerPeriod,
    ),
    openingFee,
    totalInterest,
    totalIva,
    totalInsurance,
    totalPaid,
    actualPeriods: schedule.length,
    schedule,
  };
}

/**
 * Cuánto ahorra un abono a capital, comparado con no hacerlo.
 * Devuelve el ahorro en intereses y cuántos pagos se evitan.
 */
export function compareExtraPayment(
  input: AmortizationInput,
  extraPayments: ExtraPayment[],
  strategy: ExtraPaymentStrategy = "reduce_term",
): {
  without: AmortizationResult;
  with: AmortizationResult;
  interestSaved: Centavos;
  periodsSaved: number;
} {
  const without = buildAmortizationSchedule(input);
  const withExtra = buildAmortizationSchedule(input, extraPayments, strategy);

  return {
    without,
    with: withExtra,
    interestSaved: subtract(without.totalInterest, withExtra.totalInterest),
    periodsSaved: without.actualPeriods - withExtra.actualPeriods,
  };
}
