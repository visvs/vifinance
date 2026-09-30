import type { Centavos } from "@/lib/finance/money";
import { formatMoney, formatSignedMoney, splitMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

interface MoneyProps {
  amount: Centavos;
  className?: string;
}

/** Un monto. Siempre con cifras tabulares para que las columnas no bailen. */
export function Money({ amount, className }: MoneyProps) {
  return (
    <span className={cn("tabular", className)}>{formatMoney(amount)}</span>
  );
}

/**
 * Monto con signo y color: verde si entra, rojo si sale, neutro si sólo cambió
 * de bolsillo. El color nunca va solo — siempre lo acompaña el signo, porque
 * una de cada doce personas no distingue rojo de verde.
 */
export function SignedMoney({
  amount,
  direction,
  className,
}: MoneyProps & { direction: "in" | "out" | "internal" }) {
  const signed =
    direction === "out" ? -Math.abs(amount) : direction === "in" ? Math.abs(amount) : amount;

  return (
    <span
      className={cn(
        "tabular font-medium",
        direction === "in" && "text-positive",
        direction === "out" && "text-foreground",
        direction === "internal" && "text-muted-foreground",
        className,
      )}
    >
      {direction === "internal" ? formatMoney(amount) : formatSignedMoney(signed)}
    </span>
  );
}

/**
 * El monto grande del encabezado: los pesos en grande y los centavos discretos,
 * para que el número se lea de un vistazo sin perder la precisión.
 */
export function HeadlineMoney({
  amount,
  className,
}: MoneyProps) {
  const { integer, decimals } = splitMoney(amount);

  return (
    <span className={cn("tabular inline-flex items-baseline", className)}>
      <span className="text-[2rem] leading-none font-semibold tracking-tight sm:text-4xl">
        {integer}
      </span>
      <span className="text-muted-foreground ml-0.5 text-base font-medium">
        {decimals}
      </span>
      <span className="text-muted-foreground ml-1.5 text-xs font-medium">MXN</span>
    </span>
  );
}
