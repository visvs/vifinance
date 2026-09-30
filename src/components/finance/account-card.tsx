import { Lock, TrendingUp } from "lucide-react";
import Link from "next/link";

import { Money } from "@/components/finance/money-text";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { estimatedDailyYield } from "@/lib/finance/accrual";
import { formatPercent } from "@/lib/format";
import { daysUntil, formatDate, formatMoney } from "@/lib/format";
import type { AccountSummary } from "@/lib/queries/accounts";
import { cn } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = {
  checking: "Cuenta",
  savings: "Ahorro",
  vault: "Apartado",
  term_deposit: "Plazo fijo",
  cash: "Efectivo",
  investment: "Inversión",
  credit_card: "Tarjeta de crédito",
  loan: "Préstamo",
};

export function AccountCard({ account }: { account: AccountSummary }) {
  const isLiability = account.nature === "liability";
  const accent = account.institution?.brandColor ?? account.color ?? "#64748b";

  const usedShare =
    isLiability && account.creditLimit
      ? Math.min(1, account.balance / account.creditLimit)
      : null;

  return (
    <Link
      href={`/cuentas/${account.id}`}
      className="bg-card hover:border-primary/40 block rounded-2xl border p-4 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="grid size-10 shrink-0 place-items-center rounded-xl text-xs font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            {(account.institution?.shortName ?? account.name)
              .slice(0, 2)
              .toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{account.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              {account.institution?.name ?? KIND_LABEL[account.kind]}
            </p>
          </div>
        </div>

        <div className="text-right">
          <Money
            amount={account.totalBalance}
            className={cn(
              "block text-lg font-semibold",
              isLiability && "text-negative",
            )}
          />
          {account.vaultBalance > 0 ? (
            <p className="text-muted-foreground text-[11px]">
              {formatMoney(account.balance)} + {formatMoney(account.vaultBalance)}{" "}
              apartado
            </p>
          ) : null}
        </div>
      </div>

      {/* Tarjeta de crédito: lo que importa es cuánto te queda y cuándo pagas. */}
      {usedShare !== null && account.creditLimit ? (
        <div className="mt-3 space-y-1.5">
          <Progress value={usedShare * 100} className="h-1.5" />
          <div className="text-muted-foreground flex justify-between text-[11px]">
            <span>
              Disponible {formatMoney(account.creditLimit - account.balance)}
            </span>
            {account.paymentDueDay ? (
              <span>Paga el día {account.paymentDueDay}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Rendimiento a la vista de la cuenta principal. */}
      {account.annualRate && account.annualRate > 0 ? (
        <div className="text-positive mt-3 flex items-center gap-1.5 text-xs">
          <TrendingUp className="size-3.5" />
          <span className="font-medium">
            {formatPercent(account.annualRate)} anual
          </span>
          <span className="text-muted-foreground">
            · {formatMoney(estimatedDailyYield(account.balance, account.annualRate))}{" "}
            al día
          </span>
        </div>
      ) : null}

      {account.vaults.length > 0 ? (
        <ul className="mt-3 space-y-2 border-t pt-3">
          {account.vaults.map((vault) => {
            const days = vault.maturesOn ? daysUntil(vault.maturesOn) : null;

            return (
              <li key={vault.id} className="flex items-center gap-2 text-sm">
                {vault.withdrawalLock && vault.withdrawalLock !== "none" ? (
                  <Lock className="text-warning size-3.5 shrink-0" />
                ) : (
                  <span className="bg-primary/60 size-1.5 shrink-0 rounded-full" />
                )}
                <span className="min-w-0 flex-1 truncate">{vault.name}</span>
                {vault.annualRate ? (
                  <Badge variant="secondary" className="shrink-0 text-[10px]">
                    {formatPercent(vault.annualRate)}
                  </Badge>
                ) : null}
                <Money amount={vault.balance} className="shrink-0 text-sm" />
                {days !== null && days >= 0 ? (
                  <span className="text-muted-foreground shrink-0 text-[10px]">
                    {days}d
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </Link>
  );
}

/** Barra de avance de una meta de ahorro. */
export function VaultGoal({
  current,
  target,
  targetDate,
}: {
  current: number;
  target: number;
  targetDate: string | null;
}) {
  const share = target === 0 ? 0 : Math.min(1, current / target);

  return (
    <div className="space-y-1.5">
      <Progress value={share * 100} className="h-2" />
      <div className="text-muted-foreground flex justify-between text-xs">
        <span>
          {formatMoney(current)} de {formatMoney(target)}
        </span>
        <span>
          {Math.round(share * 100)}%
          {targetDate ? ` · meta ${formatDate(targetDate)}` : ""}
        </span>
      </div>
    </div>
  );
}
