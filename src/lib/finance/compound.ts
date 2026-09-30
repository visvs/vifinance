/**
 * Interés compuesto con aportaciones periódicas.
 *
 * Es el motor de la calculadora de inversiones (equivalente en español y en
 * pesos a la de investor.gov de la SEC) y también el que proyecta cuánto
 * rendirá un apartado o un plazo fijo.
 *
 * El cálculo se hace mes a mes con un factor mensual derivado de la **tasa
 * efectiva anual**. Así, una tasa nominal de 14.75% con capitalización diaria y
 * otra con capitalización mensual producen resultados distintos —como en la
 * realidad— y un año completo sin aportaciones da exactamente `(1 + TEA)`.
 */

import { add, type Centavos, multiply, roundHalfEven } from "./money";
import {
  type CompoundingFrequency,
  nominalToEffective,
} from "./rates";

export interface CompoundInput {
  /** Inversión inicial. */
  initial: Centavos;
  /** Aportación mensual. Negativa para simular retiros mensuales. */
  monthlyContribution: Centavos;
  /** Horizonte en años. Admite fracciones (0.5 = seis meses). */
  years: number;
  /** Tasa nominal anual en decimal: 0.1475 para 14.75%. */
  annualRate: number;
  /** Cada cuánto se capitaliza el interés. */
  compounding: CompoundingFrequency;
  /**
   * Las aportaciones entran al final de cada mes (lo habitual: ahorras lo que
   * te sobró). Con `true` entran al inicio y ganan intereses ese mismo mes.
   */
  contributeAtStart?: boolean;
}

export interface YearBreakdown {
  /** Año 1, 2, 3... contado desde el inicio de la simulación. */
  year: number;
  /** Saldo al empezar el año. */
  startBalance: Centavos;
  /** Aportaciones hechas durante el año. */
  contributions: Centavos;
  /** Interés generado durante el año. */
  interest: Centavos;
  /** Saldo al terminar el año. */
  endBalance: Centavos;
  /** Capital acumulado (inicial + aportaciones) al cierre del año. */
  cumulativePrincipal: Centavos;
  /** Interés acumulado al cierre del año. */
  cumulativeInterest: Centavos;
}

export interface CompoundResult {
  /** Saldo final al terminar el horizonte. */
  finalBalance: Centavos;
  /** Suma de la inversión inicial más todas las aportaciones. */
  totalPrincipal: Centavos;
  /** Todo lo que generó el interés. */
  totalInterest: Centavos;
  /** Tasa efectiva anual equivalente a la nominal y la capitalización dadas. */
  effectiveAnnualRate: number;
  /** Desglose año por año, para la tabla y la gráfica. */
  byYear: YearBreakdown[];
}

/** Factor de crecimiento de un mes a partir de la tasa efectiva anual. */
function monthlyFactor(effectiveAnnualRate: number): number {
  return Math.pow(1 + effectiveAnnualRate, 1 / 12);
}

/**
 * Proyecta el crecimiento de una inversión.
 *
 * El saldo se lleva en centavos y se redondea en cada mes: es lo que hace un
 * banco de verdad, y evita que la tabla no cuadre con la suma de sus renglones.
 */
export function projectCompoundGrowth(input: CompoundInput): CompoundResult {
  const {
    initial,
    monthlyContribution,
    years,
    annualRate,
    compounding,
    contributeAtStart = false,
  } = input;

  const effectiveAnnualRate = nominalToEffective(annualRate, compounding);
  const factor = monthlyFactor(effectiveAnnualRate);
  const totalMonths = Math.max(0, Math.round(years * 12));

  let balance = initial;
  let cumulativePrincipal = initial;
  let cumulativeInterest = 0;

  const byYear: YearBreakdown[] = [];
  let yearStartBalance = balance;
  let yearContributions = 0;
  let yearInterest = 0;

  for (let month = 1; month <= totalMonths; month++) {
    if (contributeAtStart) {
      balance = add(balance, monthlyContribution);
      cumulativePrincipal = add(cumulativePrincipal, monthlyContribution);
      yearContributions = add(yearContributions, monthlyContribution);
    }

    const interest = roundHalfEven(balance * (factor - 1));
    balance = add(balance, interest);
    cumulativeInterest = add(cumulativeInterest, interest);
    yearInterest = add(yearInterest, interest);

    if (!contributeAtStart) {
      balance = add(balance, monthlyContribution);
      cumulativePrincipal = add(cumulativePrincipal, monthlyContribution);
      yearContributions = add(yearContributions, monthlyContribution);
    }

    const isYearEnd = month % 12 === 0;
    if (isYearEnd || month === totalMonths) {
      byYear.push({
        year: Math.ceil(month / 12),
        startBalance: yearStartBalance,
        contributions: yearContributions,
        interest: yearInterest,
        endBalance: balance,
        cumulativePrincipal,
        cumulativeInterest,
      });
      yearStartBalance = balance;
      yearContributions = 0;
      yearInterest = 0;
    }
  }

  return {
    finalBalance: balance,
    totalPrincipal: cumulativePrincipal,
    totalInterest: cumulativeInterest,
    effectiveAnnualRate,
    byYear,
  };
}

export interface ScenarioResult extends CompoundResult {
  /** Etiqueta del escenario: tasa baja, base o alta. */
  scenario: "low" | "base" | "high";
  /** Tasa nominal anual usada en este escenario. */
  annualRate: number;
}

/**
 * Corre la simulación con tres tasas: la esperada y la misma ± el rango de
 * varianza. Es la funcionalidad de "rango de varianza de las tasas de interés"
 * de la calculadora de la SEC, y sirve para no vender una sola cifra como
 * certeza.
 */
export function projectWithVariance(
  input: CompoundInput,
  variance: number,
): ScenarioResult[] {
  const scenarios: Array<{ scenario: ScenarioResult["scenario"]; rate: number }> =
    [
      { scenario: "low", rate: Math.max(0, input.annualRate - variance) },
      { scenario: "base", rate: input.annualRate },
      { scenario: "high", rate: input.annualRate + variance },
    ];

  return scenarios.map(({ scenario, rate }) => ({
    scenario,
    annualRate: rate,
    ...projectCompoundGrowth({ ...input, annualRate: rate }),
  }));
}

export interface SavingsGoalInput {
  /** Monto que se quiere alcanzar. */
  target: Centavos;
  /** Con cuánto se empieza. */
  initial: Centavos;
  /** En cuántos años. */
  years: number;
  /** Tasa nominal anual esperada. */
  annualRate: number;
  compounding: CompoundingFrequency;
}

export interface SavingsGoalResult {
  /** Cuánto hay que aportar cada mes para llegar a la meta. */
  requiredMonthlyContribution: Centavos;
  /** Cuánto de la meta saldrá de tu bolsillo. */
  totalPrincipal: Centavos;
  /** Cuánto pondrán los intereses. */
  totalInterest: Centavos;
  /** `true` si el capital inicial ya alcanza la meta sin aportar nada. */
  alreadyReached: boolean;
  /** Proyección resultante con la aportación calculada. */
  projection: CompoundResult;
}

/**
 * Modo inverso: cuánto hay que ahorrar al mes para llegar a un monto objetivo.
 * Es la "calculadora de objetivo de ahorro" de investor.gov.
 */
export function solveSavingsGoal(input: SavingsGoalInput): SavingsGoalResult {
  const { target, initial, years, annualRate, compounding } = input;

  const effectiveAnnualRate = nominalToEffective(annualRate, compounding);
  const i = monthlyFactor(effectiveAnnualRate) - 1;
  const n = Math.max(1, Math.round(years * 12));

  const growthOfInitial = initial * Math.pow(1 + i, n);
  const gap = target - growthOfInitial;

  if (gap <= 0) {
    const projection = projectCompoundGrowth({
      initial,
      monthlyContribution: 0,
      years,
      annualRate,
      compounding,
    });
    return {
      requiredMonthlyContribution: 0,
      totalPrincipal: projection.totalPrincipal,
      totalInterest: projection.totalInterest,
      alreadyReached: true,
      projection,
    };
  }

  // Valor futuro de una anualidad ordinaria: C * ((1+i)^n - 1) / i
  const annuityFactor =
    i === 0 ? n : (Math.pow(1 + i, n) - 1) / i;
  const required = roundHalfEven(gap / annuityFactor);

  const projection = projectCompoundGrowth({
    initial,
    monthlyContribution: required,
    years,
    annualRate,
    compounding,
  });

  return {
    requiredMonthlyContribution: required,
    totalPrincipal: projection.totalPrincipal,
    totalInterest: projection.totalInterest,
    alreadyReached: false,
    projection,
  };
}

/**
 * Rendimiento de un depósito a plazo fijo que liquida al vencimiento (un pagaré
 * bancario o una inversión a plazo de SOFIPO): interés simple sobre el plazo.
 */
export function projectTermDeposit(
  principal: Centavos,
  annualRate: number,
  days: number,
  basis: 360 | 365 = 360,
): { interest: Centavos; total: Centavos } {
  const interest = multiply(principal, (annualRate * days) / basis);
  return { interest, total: add(principal, interest) };
}
