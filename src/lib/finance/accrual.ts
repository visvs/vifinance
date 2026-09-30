/**
 * Devengo de rendimientos día por día.
 *
 * Este módulo **proyecta** el rendimiento (para el simulador, la proyección de
 * flujo y la vista previa al abrir un apartado). Quien realmente **registra** el
 * rendimiento en la base de datos es la función SQL `accrue_yields`, que corre
 * en pg_cron: el registro tiene que ser transaccional e idempotente, y eso vive
 * en Postgres. Ambos usan la misma aritmética, descrita aquí.
 *
 * Dos detalles que separan un cálculo correcto de uno que se ve bien:
 *
 * 1. **El residuo sub-centavo se acarrea.** Un saldo de $1,000 al 14.75% anual
 *    con base 365 genera $0.4041 al día. Si cada día se redondea y se tira el
 *    residuo, el error anual es de varios pesos. El residuo se guarda y se suma
 *    al día siguiente.
 * 2. **La capitalización importa.** Con capitalización diaria el interés de hoy
 *    se calcula sobre el saldo que ya incluye el de ayer. Con capitalización
 *    mensual el interés se acumula aparte y sólo se suma al capital al cerrar
 *    el mes: hasta entonces no genera interés sobre sí mismo.
 */

import { add, type Centavos, roundHalfEven } from "./money";
import type { CompoundingFrequency, DayCountBasis } from "./rates";

export interface AccrualConfig {
  /** Tasa bruta nominal anual en decimal. */
  annualRate: number;
  /** Cada cuánto el interés se suma al capital. */
  compounding: CompoundingFrequency;
  /** Base de días del año: 360 o 365. */
  basis: DayCountBasis;
  /** Tasa anual de retención de ISR sobre el capital. 0 si no aplica. */
  isrRateOnCapital?: number;
}

export interface DailyAccrual {
  /** Día devengado (fecha local de México). */
  date: Date;
  /** Saldo sobre el que se calculó el interés. */
  balance: Centavos;
  /** Interés bruto del día, redondeado a centavos. */
  grossInterest: Centavos;
  /** ISR retenido del día. */
  withheld: Centavos;
  /** Interés neto del día. */
  netInterest: Centavos;
  /** `true` si este día cierra un período de capitalización. */
  capitalized: boolean;
}

export interface AccrualProjection {
  days: DailyAccrual[];
  /** Interés bruto total del período. */
  totalGross: Centavos;
  /** ISR retenido total. */
  totalWithheld: Centavos;
  /** Interés neto total. */
  totalNet: Centavos;
  /** Saldo final incluyendo el interés capitalizado. */
  finalBalance: Centavos;
}

/** ¿Este día cierra el período de capitalización? */
function closesPeriod(date: Date, compounding: CompoundingFrequency): boolean {
  switch (compounding) {
    case "daily":
      return true;
    case "monthly": {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      return next.getDate() === 1;
    }
    case "bimonthly":
    case "quarterly":
    case "semiannual":
    case "annual": {
      const next = new Date(date);
      next.setDate(next.getDate() + 1);
      if (next.getDate() !== 1) return false;
      const monthsPerPeriod =
        compounding === "bimonthly"
          ? 2
          : compounding === "quarterly"
            ? 3
            : compounding === "semiannual"
              ? 6
              : 12;
      return next.getMonth() % monthsPerPeriod === 0;
    }
    case "at_maturity":
      return false;
  }
}

/**
 * Proyecta el devengo entre dos fechas, ambas inclusive.
 *
 * `carriedRemainder` es el residuo sub-centavo que quedó pendiente de la última
 * corrida; en la base de datos vive en la cuenta y se pasa de un día al otro.
 */
export function projectAccrual(
  openingBalance: Centavos,
  from: Date,
  to: Date,
  config: AccrualConfig,
  carriedRemainder = 0,
): AccrualProjection {
  const { annualRate, compounding, basis, isrRateOnCapital = 0 } = config;

  const dailyRate = annualRate / basis;
  const dailyIsrRate = isrRateOnCapital / 365;

  let balance = openingBalance;
  let pendingInterest = 0; // interés devengado aún no capitalizado
  let remainder = carriedRemainder;
  let isrRemainder = 0;

  const days: DailyAccrual[] = [];
  let totalGross = 0;
  let totalWithheld = 0;

  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cursor <= end) {
    // El interés se calcula sobre `balance`, que sólo crece cuando se cierra un
    // período de capitalización. Con capitalización diaria eso ocurre cada día
    // (interés compuesto); con cualquier otra, el interés se acumula en
    // `pendingInterest` y hasta entonces no genera interés sobre sí mismo.
    const base = balance;

    const exactInterest = base * dailyRate + remainder;
    const grossInterest = roundHalfEven(exactInterest);
    remainder = exactInterest - grossInterest;

    const exactIsr = base * dailyIsrRate + isrRemainder;
    const withheld = roundHalfEven(exactIsr);
    isrRemainder = exactIsr - withheld;

    const netInterest = grossInterest - withheld;
    const capitalized = closesPeriod(cursor, compounding);

    if (capitalized) {
      balance = add(balance, pendingInterest, netInterest);
      pendingInterest = 0;
    } else {
      pendingInterest = add(pendingInterest, netInterest);
    }

    days.push({
      date: new Date(cursor),
      balance: base,
      grossInterest,
      withheld,
      netInterest,
      capitalized,
    });

    totalGross = add(totalGross, grossInterest);
    totalWithheld = add(totalWithheld, withheld);

    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    days,
    totalGross,
    totalWithheld,
    totalNet: totalGross - totalWithheld,
    finalBalance: add(balance, pendingInterest),
  };
}

/**
 * Rendimiento estimado de un día, para el indicador de "ganas X al día" que
 * aparece en la tarjeta de cada cuenta.
 */
export function estimatedDailyYield(
  balance: Centavos,
  annualRate: number,
  basis: DayCountBasis = 365,
): Centavos {
  return roundHalfEven(balance * (annualRate / basis));
}

/**
 * Días naturales entre dos fechas, ambas inclusive.
 * Se calcula sobre fechas normalizadas a medianoche para que el horario de
 * verano no reste ni sume un día.
 */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / 86_400_000) + 1;
}
