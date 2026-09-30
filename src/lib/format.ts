/**
 * Formateo para México. Todo lo que el usuario lee pasa por aquí.
 *
 * La zona horaria es explícita y no la del navegador: si alguien abre la app
 * desde otro país, "hoy" debe seguir siendo hoy en México, porque el devengo de
 * rendimientos y el cierre de los presupuestos ocurren en hora de la Ciudad de
 * México.
 */

import { type Centavos, toPesos } from "@/lib/finance/money";

export const LOCALE = "es-MX";
export const TIME_ZONE = "America/Mexico_City";
export const CURRENCY = "MXN";

const currencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const compactCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  notation: "compact",
  maximumFractionDigits: 1,
});

const wholeCurrencyFormatter = new Intl.NumberFormat(LOCALE, {
  style: "currency",
  currency: CURRENCY,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** $1,234.56 */
export function formatMoney(centavos: Centavos): string {
  return currencyFormatter.format(toPesos(centavos));
}

/** $1,235 — para titulares donde los centavos estorban. */
export function formatMoneyWhole(centavos: Centavos): string {
  return wholeCurrencyFormatter.format(toPesos(centavos));
}

/** $1.2M — para ejes de gráficas. */
export function formatMoneyCompact(centavos: Centavos): string {
  return compactCurrencyFormatter.format(toPesos(centavos));
}

/**
 * Separa la parte entera de los centavos, para el titular del patrimonio donde
 * los centavos van más chicos: "$482,950" + ".00".
 */
export function splitMoney(centavos: Centavos): {
  integer: string;
  decimals: string;
} {
  const formatted = formatMoney(centavos);
  const lastDot = formatted.lastIndexOf(".");
  if (lastDot === -1) return { integer: formatted, decimals: "" };
  return {
    integer: formatted.slice(0, lastDot),
    decimals: formatted.slice(lastDot),
  };
}

/** +$573.40 / -$1,450.00 — con signo explícito, para los movimientos. */
export function formatSignedMoney(centavos: Centavos): string {
  const sign = centavos > 0 ? "+" : centavos < 0 ? "-" : "";
  return `${sign}${formatMoney(Math.abs(centavos))}`;
}

/** 14.75% */
export function formatPercent(rate: number, decimals = 2): string {
  return new Intl.NumberFormat(LOCALE, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(rate);
}

/** 1,234 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat(LOCALE, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** 24 oct 2026 */
export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** 24 de octubre de 2026 */
export function formatDateLong(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** 19:35 hrs */
export function formatTime(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIME_ZONE,
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** octubre 2026 */
export function formatMonth(date: Date | string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(typeof date === "string" ? new Date(date) : date);
}

/** "Hoy", "Ayer" o la fecha, como encabezado de grupo en el historial. */
export function formatDayHeading(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const today = nowInMexico();

  const sameDay = (a: Date, b: Date) =>
    toMexicoDateString(a) === toMexicoDateString(b);

  if (sameDay(value, today)) return "Hoy";

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (sameDay(value, yesterday)) return "Ayer";

  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TIME_ZONE,
  }).format(value);
}

/** La fecha y hora actuales interpretadas en hora de la Ciudad de México. */
export function nowInMexico(): Date {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: TIME_ZONE }),
  );
}

/** "2026-09-25" en hora de México, que es como se guardan las fechas `date`. */
export function toMexicoDateString(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIME_ZONE,
  }).format(value);
}

/** "en 5 días", "hace 2 meses" */
export function formatRelative(date: Date | string): string {
  const value = typeof date === "string" ? new Date(date) : date;
  const diffDays = Math.round(
    (value.getTime() - nowInMexico().getTime()) / 86_400_000,
  );

  const formatter = new Intl.RelativeTimeFormat(LOCALE, { numeric: "auto" });

  if (Math.abs(diffDays) < 30) return formatter.format(diffDays, "day");
  if (Math.abs(diffDays) < 365) {
    return formatter.format(Math.round(diffDays / 30), "month");
  }
  return formatter.format(Math.round(diffDays / 365), "year");
}

/** Días que faltan para una fecha (negativo si ya pasó). */
export function daysUntil(date: Date | string): number {
  const value = typeof date === "string" ? new Date(date) : date;
  const today = nowInMexico();
  const a = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const b = Date.UTC(value.getFullYear(), value.getMonth(), value.getDate());
  return Math.round((b - a) / 86_400_000);
}
