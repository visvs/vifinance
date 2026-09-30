/**
 * Aritmética de dinero en centavos enteros.
 *
 * Nunca se opera dinero con `number` decimal: `0.1 + 0.2 !== 0.3` en punto
 * flotante, y en una app de finanzas ese error se acumula visiblemente en los
 * saldos. Todo monto vive como un entero de centavos y sólo se convierte a
 * decimal en el borde (formateo para la UI, o escritura a la base de datos).
 */

/** Un monto en centavos. Siempre entero. */
export type Centavos = number;

/** Máximo seguro: ~$90,071,992,547,409.91. Suficiente y a salvo de imprecisión. */
const MAX_SAFE_CENTAVOS = Number.MAX_SAFE_INTEGER;

export class MoneyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyError";
  }
}

function assertSafe(value: number, context: string): void {
  if (!Number.isFinite(value)) {
    throw new MoneyError(`${context}: el monto no es un número finito`);
  }
  if (Math.abs(value) > MAX_SAFE_CENTAVOS) {
    throw new MoneyError(`${context}: el monto excede el rango seguro`);
  }
}

/**
 * Redondeo bancario (half to even).
 *
 * El redondeo normal (half up) sesga siempre hacia arriba: al acumular miles de
 * devengos diarios el saldo se infla. Half-to-even reparte el sesgo y es el
 * estándar en cálculo de intereses.
 */
export function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  const diff = value - floor;

  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  // Exactamente .5 → al par más cercano.
  return floor % 2 === 0 ? floor : floor + 1;
}

/**
 * Convierte pesos (decimal) a centavos enteros.
 *
 * Acepta strings porque la base de datos devuelve `numeric` como string para no
 * perder precisión, y porque los inputs del formulario también son strings.
 */
export function toCentavos(pesos: number | string): Centavos {
  if (typeof pesos === "string") {
    const cleaned = pesos.replace(/[\s$,]/g, "");
    if (cleaned === "" || cleaned === "-") return 0;
    const parsed = Number(cleaned);
    if (Number.isNaN(parsed)) {
      throw new MoneyError(`No se pudo interpretar "${pesos}" como un monto`);
    }
    return toCentavos(parsed);
  }

  assertSafe(pesos * 100, "toCentavos");
  // El *100 en flotante puede dar 1234.9999999; redondear lo corrige.
  return roundHalfEven(Math.round(pesos * 1e6) / 1e4);
}

/** Convierte centavos enteros a pesos decimales (sólo para mostrar o guardar). */
export function toPesos(centavos: Centavos): number {
  return centavos / 100;
}

/** Suma de montos. */
export function add(...amounts: Centavos[]): Centavos {
  const total = amounts.reduce((acc, value) => acc + value, 0);
  assertSafe(total, "add");
  return total;
}

/** Resta `b` de `a`. */
export function subtract(a: Centavos, b: Centavos): Centavos {
  const result = a - b;
  assertSafe(result, "subtract");
  return result;
}

/**
 * Multiplica un monto por un factor (una tasa, una proporción) y redondea a
 * centavos. Devuelve también el residuo sub-centavo, que el motor de devengo
 * acarrea de un día al siguiente para no perder fracciones.
 */
export function multiplyWithRemainder(
  amount: Centavos,
  factor: number,
): { value: Centavos; remainder: number } {
  const exact = amount * factor;
  assertSafe(exact, "multiply");
  const value = roundHalfEven(exact);
  return { value, remainder: exact - value };
}

/** Multiplica un monto por un factor y redondea a centavos. */
export function multiply(amount: Centavos, factor: number): Centavos {
  return multiplyWithRemainder(amount, factor).value;
}

/** Divide un monto entre un divisor y redondea a centavos. */
export function divide(amount: Centavos, divisor: number): Centavos {
  if (divisor === 0) throw new MoneyError("División entre cero");
  const result = roundHalfEven(amount / divisor);
  assertSafe(result, "divide");
  return result;
}

/**
 * Reparte un monto en `parts` partes iguales sin perder ni inventar centavos.
 *
 * Los centavos sobrantes se distribuyen uno a uno entre las primeras partes:
 * $100.00 entre 3 da [33.34, 33.33, 33.33], no tres veces 33.33 (que perdería
 * un centavo). Se usa para mensualidades de MSI.
 */
export function split(amount: Centavos, parts: number): Centavos[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new MoneyError("El número de partes debe ser un entero positivo");
  }

  const base = Math.trunc(amount / parts);
  const leftover = amount - base * parts;
  const sign = leftover < 0 ? -1 : 1;
  const extra = Math.abs(leftover);

  return Array.from({ length: parts }, (_, index) =>
    index < extra ? base + sign : base,
  );
}

export const ZERO: Centavos = 0;

export function isZero(amount: Centavos): boolean {
  return amount === 0;
}

export function abs(amount: Centavos): Centavos {
  return Math.abs(amount);
}

export function negate(amount: Centavos): Centavos {
  return -amount;
}

export function max(...amounts: Centavos[]): Centavos {
  return Math.max(...amounts);
}

export function min(...amounts: Centavos[]): Centavos {
  return Math.min(...amounts);
}

/** Convierte un `numeric` de Postgres (string) a centavos. */
export function fromDatabase(value: string | number | null): Centavos {
  if (value === null) return 0;
  return toCentavos(value);
}

/** Convierte centavos al string decimal que espera un `numeric` de Postgres. */
export function toDatabase(centavos: Centavos): string {
  return (centavos / 100).toFixed(2);
}
