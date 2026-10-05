import { ArrowLeft, TrendingUp } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { Money, SignedMoney } from "@/components/finance/money-text";
import { VaultGoal } from "@/components/finance/account-card";
import { AppHeader } from "@/components/shell/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { estimatedDailyYield } from "@/lib/finance/accrual";
import { formatDayHeading, formatMoney, formatPercent, formatTime } from "@/lib/format";
import { getAccount } from "@/lib/queries/accounts";
import { getTransactions } from "@/lib/queries/transactions";
import { getViewer } from "@/lib/viewer";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata(props: Props) {
  const params = await props.params;
  const viewer = await getViewer();
  if (!viewer) return { title: "Cuenta" };

  const account = await getAccount(viewer.id, params.id);
  return { title: account?.name ?? "Cuenta" };
}

export default async function AccountDetailPage(props: Props) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const params = await props.params;
  const account = await getAccount(viewer.id, params.id);
  if (!account) notFound();

  const transactions = await getTransactions(viewer.id, {
    accountId: account.id,
    limit: 30,
    includeAccruals: true,
  });

  const isLiability = account.nature === "liability";
  const accent = account.institution?.brandColor ?? account.color ?? "#64748b";

  const usedShare =
    isLiability && account.creditLimit
      ? Math.min(1, account.balance / account.creditLimit)
      : null;

  return (
    <>
      <AppHeader
        title={account.name}
        subtitle={account.institution?.name ?? ""}
        isDemo={viewer.isDemo}
      />

      <div className="mx-auto max-w-3xl space-y-5 p-4 md:p-6">
        <Button asChild variant="ghost" size="sm" className="gap-1.5">
          <Link href="/cuentas">
            <ArrowLeft className="size-4" />
            Cuentas
          </Link>
        </Button>

        {/* Header de la cuenta */}
        <section className="bg-card rounded-2xl border p-5">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="grid size-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
              style={{ backgroundColor: accent }}
            >
              {(account.institution?.shortName ?? account.name)
                .slice(0, 2)
                .toUpperCase()}
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold">{account.name}</h2>
              <p className="text-muted-foreground text-sm">
                {account.institution?.name ?? account.kind}
              </p>
            </div>

            <div className="text-right">
              <Money
                amount={account.totalBalance}
                className={`block text-2xl font-semibold ${isLiability ? "text-negative" : ""}`}
              />
              {account.vaultBalance > 0 ? (
                <p className="text-muted-foreground text-xs">
                  {formatMoney(account.balance)} + {formatMoney(account.vaultBalance)} apartado
                </p>
              ) : null}
            </div>
          </div>

          {/* Crédito: barra de uso */}
          {usedShare !== null && account.creditLimit ? (
            <div className="mt-4 space-y-1.5">
              <Progress value={usedShare * 100} className="h-2" />
              <div className="text-muted-foreground flex justify-between text-xs">
                <span>
                  Disponible {formatMoney(account.creditLimit - account.balance)}
                </span>
                <span>Límite {formatMoney(account.creditLimit)}</span>
              </div>
            </div>
          ) : null}

          {/* Tasa y rendimiento diario */}
          {account.annualRate && account.annualRate > 0 ? (
            <div className="text-positive mt-4 flex items-center gap-2 text-sm">
              <TrendingUp className="size-4" />
              <span className="font-medium">
                {formatPercent(account.annualRate)} anual
              </span>
              <span className="text-muted-foreground">
                · ~{formatMoney(estimatedDailyYield(account.balance, account.annualRate))}/día
              </span>
            </div>
          ) : null}
        </section>

        {/* Apartados */}
        {account.vaults.length > 0 ? (
          <section className="bg-card space-y-3 rounded-2xl border p-4">
            <h3 className="font-medium">Apartados</h3>
            <ul className="divide-y">
              {account.vaults.map((vault) => (
                <li key={vault.id} className="space-y-2 py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{vault.name}</p>
                      {vault.annualRate ? (
                        <p className="text-positive text-xs">
                          {formatPercent(vault.annualRate)} anual
                        </p>
                      ) : null}
                    </div>
                    <Money amount={vault.balance} className="text-sm font-semibold" />
                  </div>

                  {vault.targetAmount ? (
                    <VaultGoal
                      current={vault.balance}
                      target={vault.targetAmount}
                      targetDate={vault.targetDate}
                    />
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {/* Movimientos recientes */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Movimientos</h3>
            <Button asChild variant="ghost" size="sm">
              <Link href={`/movimientos?cuenta=${account.id}`}>
                Ver todos
              </Link>
            </Button>
          </div>

          {transactions.length === 0 ? (
            <p className="text-muted-foreground bg-card rounded-2xl border border-dashed p-6 text-center text-sm">
              No hay movimientos en esta cuenta.
            </p>
          ) : (
            <ul className="bg-card divide-y rounded-2xl border">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-[10px] font-semibold"
                    style={{
                      backgroundColor: `${tx.category?.color ?? "#64748b"}22`,
                      color: tx.category?.color ?? "#94a3b8",
                    }}
                  >
                    {(tx.category?.name ?? "··").slice(0, 2)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {tx.merchant ?? tx.notes ?? tx.category?.name ?? "Movimiento"}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {formatDayHeading(tx.occurredAt)} · {formatTime(tx.occurredAt)}
                      {tx.isAccrual ? " · rendimiento" : ""}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <SignedMoney
                      amount={tx.amount}
                      direction={tx.direction}
                      className="text-sm"
                    />
                    {tx.isAccrual ? (
                      <Badge
                        variant="secondary"
                        className="mt-0.5 h-4 px-1.5 text-[10px]"
                      >
                        devengo
                      </Badge>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
