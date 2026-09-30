/**
 * Motor financiero de ViFinance.
 *
 * TypeScript puro: no importa nada de React, Next ni Supabase. Es el mismo
 * código que usan el devengo de rendimientos del servidor y los simuladores del
 * navegador, así que por construcción no pueden dar números distintos.
 *
 * Los cálculos están contrastados contra fuentes oficiales: el CAT reproduce
 * exactamente el ejemplo publicado por Banco de México en su documento de apoyo
 * de la Circular 21/2009, y el interés compuesto coincide con la calculadora de
 * la SEC (investor.gov) salvo centavos de redondeo, porque aquí se redondea a
 * centavos cada mes como lo hace un banco real.
 */

export * from "./money";
export * from "./rates";
export * from "./tax";
export * from "./compound";
export * from "./accrual";
export * from "./amortization";
export * from "./cat";
export * from "./credit";
