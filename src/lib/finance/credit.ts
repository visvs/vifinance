/**
 * Productos de crédito mexicanos que no son un préstamo con tabla fija.
 *
 * Aquí viven las dos cuentas que más dinero le cuestan a la gente en México y
 * que ninguna app extranjera modela:
 *
 * - **El pago mínimo de la tarjeta de crédito.** Pagar el mínimo cada mes puede
 *   convertir una deuda de $20,000 en más de una década de pagos.
 * - **Los Meses Sin Intereses.** No son gratis: si ese dinero podía estar
 *   rindiendo 14% anual en una SOFIPO, o si el comercio da descuento por pago
 *   de contado, el MSI tiene un costo real que conviene poner en pesos.
 */

import {
  add,
  type Centavos,
  max,
  multiply,
  roundHalfEven,
  split,
  subtract,
} from "./money";
import { nominalToEffective } from "./rates";

export interface MinimumPaymentInput {
  /** Saldo actual de la tarjeta. */
  balance: Centavos;
  /** Tasa nominal anual de la tarjeta, en decimal: 0.60 para 60%. */
  annualRate: number;
  /**
   * Porcentaje del saldo que se exige como pago mínimo. La regulación mexicana
   * lo liga al saldo y a la parte de capital, y los bancos suelen usar entre
   * 1.5% y 5%.
   */
  minimumRate: number;
  /** Piso absoluto del pago mínimo, si el banco lo tiene. */
  minimumFloor?: Centavos;
  /** IVA sobre los intereses. Para personas físicas normalmente no aplica. */
  ivaOnInterest?: number;
  /** Corta la simulación para no colgarse en deudas que nunca se liquidan. */
  maxMonths?: number;
}

export interface MinimumPaymentResult {
  /** Cuántos meses tardarías pagando sólo el mínimo. */
  months: number;
  /** Total pagado en ese tiempo. */
  totalPaid: Centavos;
  /** Cuánto de eso fueron intereses. */
  totalInterest: Centavos;
  /** Primer pago mínimo, el número que ves en el estado de cuenta. */
  firstPayment: Centavos;
  /** `true` si la deuda nunca se liquida porque el mínimo no cubre el interés. */
  neverPaysOff: boolean;
  /** Evolución del saldo, para graficarla. */
  balanceByMonth: Centavos[];
}

/**
 * Simula pagar solamente el mínimo cada mes.
 *
 * El resultado suele ser brutal y ese es justamente el punto: el pago mínimo
 * está diseñado para que la deuda dure.
 */
export function simulateMinimumPayment(
  input: MinimumPaymentInput,
): MinimumPaymentResult {
  const {
    balance: initialBalance,
    annualRate,
    minimumRate,
    minimumFloor = 0,
    ivaOnInterest = 0,
    maxMonths = 600,
  } = input;

  const monthlyRate = annualRate / 12;

  let balance = initialBalance;
  let totalPaid = 0;
  let totalInterest = 0;
  let firstPayment = 0;
  const balanceByMonth: Centavos[] = [balance];

  for (let month = 1; month <= maxMonths && balance > 0; month++) {
    const interest = multiply(balance, monthlyRate);
    const iva = multiply(interest, ivaOnInterest);
    const balanceWithInterest = add(balance, interest, iva);

    let payment = max(multiply(balanceWithInterest, minimumRate), minimumFloor);
    if (payment > balanceWithInterest) payment = balanceWithInterest;

    if (month === 1) firstPayment = payment;

    // Si el mínimo no alcanza ni para los intereses, la deuda crece para siempre.
    if (payment <= add(interest, iva) && balanceWithInterest > balance) {
      return {
        months: maxMonths,
        totalPaid,
        totalInterest,
        firstPayment,
        neverPaysOff: true,
        balanceByMonth,
      };
    }

    balance = subtract(balanceWithInterest, payment);
    totalPaid = add(totalPaid, payment);
    totalInterest = add(totalInterest, interest, iva);
    balanceByMonth.push(balance);
  }

  return {
    months: balanceByMonth.length - 1,
    totalPaid,
    totalInterest,
    firstPayment,
    neverPaysOff: balance > 0,
    balanceByMonth,
  };
}

export interface FixedPaymentComparison {
  /** Pagando el mínimo. */
  minimum: MinimumPaymentResult;
  /** Pagando una cantidad fija mayor. */
  fixed: MinimumPaymentResult;
  /** Cuánto se ahorra en intereses con el pago fijo. */
  interestSaved: Centavos;
  /** Cuántos meses antes se liquida. */
  monthsSaved: number;
}

/**
 * Compara pagar el mínimo contra pagar una cantidad fija mayor.
 * Es el argumento más convincente para dejar de pagar el mínimo.
 */
export function compareAgainstFixedPayment(
  input: MinimumPaymentInput,
  fixedPayment: Centavos,
): FixedPaymentComparison {
  const minimum = simulateMinimumPayment(input);

  const monthlyRate = input.annualRate / 12;
  const ivaOnInterest = input.ivaOnInterest ?? 0;
  const maxMonths = input.maxMonths ?? 600;

  let balance = input.balance;
  let totalPaid = 0;
  let totalInterest = 0;
  const balanceByMonth: Centavos[] = [balance];

  for (let month = 1; month <= maxMonths && balance > 0; month++) {
    const interest = multiply(balance, monthlyRate);
    const iva = multiply(interest, ivaOnInterest);
    const balanceWithInterest = add(balance, interest, iva);

    const payment = Math.min(fixedPayment, balanceWithInterest);
    if (payment <= add(interest, iva)) break;

    balance = subtract(balanceWithInterest, payment);
    totalPaid = add(totalPaid, payment);
    totalInterest = add(totalInterest, interest, iva);
    balanceByMonth.push(balance);
  }

  const fixed: MinimumPaymentResult = {
    months: balanceByMonth.length - 1,
    totalPaid,
    totalInterest,
    firstPayment: fixedPayment,
    neverPaysOff: balance > 0,
    balanceByMonth,
  };

  return {
    minimum,
    fixed,
    interestSaved: subtract(minimum.totalInterest, fixed.totalInterest),
    monthsSaved: minimum.months - fixed.months,
  };
}

export interface MsiInput {
  /** Precio de lista de la compra. */
  price: Centavos;
  /** Número de mensualidades: 3, 6, 9, 12, 18, 24. */
  months: number;
  /**
   * Descuento que ofrece el comercio por pagar de contado, en decimal.
   * Muchos comercios cobran más caro a MSI: ahí está el costo escondido.
   */
  cashDiscountRate?: number;
  /**
   * Tasa anual que ganaría tu dinero si en vez de pagar de contado lo dejas
   * invertido. Es el costo de oportunidad que hace que el MSI sí convenga.
   */
  opportunityAnnualRate?: number;
  /** Capitalización de esa inversión alternativa. */
  opportunityCompounding?: Parameters<typeof nominalToEffective>[1];
}

export interface MsiResult {
  /** Mensualidad del plan. */
  monthlyPayment: Centavos;
  /** Mensualidades exactas, repartiendo los centavos sobrantes. */
  installments: Centavos[];
  /** Lo que pagarías de contado, ya con descuento. */
  cashPrice: Centavos;
  /** Total desembolsado a MSI. */
  msiTotal: Centavos;
  /** Rendimiento que ganarías conservando el dinero mientras pagas a plazos. */
  opportunityGain: Centavos;
  /**
   * Costo real del MSI: positivo significa que el MSI te costó de más,
   * negativo significa que el MSI te convino.
   */
  realCost: Centavos;
  /** Veredicto listo para mostrar. */
  verdict: "msi" | "cash" | "neutral";
}

/**
 * Compara comprar a Meses Sin Intereses contra pagar de contado.
 *
 * La comparación correcta no es "¿pago lo mismo?" sino "¿dónde termina mi
 * dinero?": a MSI conservas el capital y lo vas soltando mes a mes, así que
 * sigue generando rendimiento. Eso se pone contra el descuento que perdiste por
 * no pagar de contado.
 */
export function compareMsiVsCash(input: MsiInput): MsiResult {
  const {
    price,
    months,
    cashDiscountRate = 0,
    opportunityAnnualRate = 0,
    opportunityCompounding = "monthly",
  } = input;

  const installments = split(price, months);
  const monthlyPayment = installments[0] ?? 0;
  const cashPrice = subtract(price, multiply(price, cashDiscountRate));

  // Rendimiento del saldo que aún no has pagado, mes a mes.
  const effectiveAnnual = nominalToEffective(
    opportunityAnnualRate,
    opportunityCompounding,
  );
  const monthlyFactor = Math.pow(1 + effectiveAnnual, 1 / 12) - 1;

  let remaining = cashPrice;
  let opportunityGain = 0;

  for (let month = 0; month < months; month++) {
    opportunityGain = add(opportunityGain, roundHalfEven(remaining * monthlyFactor));
    remaining = subtract(remaining, installments[month] ?? 0);
    if (remaining < 0) remaining = 0;
  }

  const realCost = subtract(subtract(price, cashPrice), opportunityGain);

  return {
    monthlyPayment,
    installments,
    cashPrice,
    msiTotal: price,
    opportunityGain,
    realCost,
    verdict: realCost > 0 ? "cash" : realCost < 0 ? "msi" : "neutral",
  };
}
