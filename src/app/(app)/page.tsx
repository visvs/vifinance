import {
  ArrowDownLeft,
  ArrowUpRight,
  PiggyBank,
  Plus,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountCard } from "@/components/finance/account-card";
import { HeadlineMoney, Money, SignedMoney } from "@/components/finance/money-text";
import { AppHeader } from "@/components/shell/app-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatDayHeading, formatMoney, formatTime } from "@/lib/format";
import { getAccounts, getLiquidity } from "@/lib/queries/accounts";
import { getTransactions } from "@/lib/queries/transactions";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Inicio" };

const QUICK_ACTIONS = [
  { href: "/movimientos/nuevo?tipo=gasto", label: "Gasto", icon: ArrowUpRight },
  { href: "/movimientos/nuevo?tipo=ingreso", label: "Ingreso", icon: ArrowDownLeft },
  { href: "/movimientos/nuevo?tipo=apartar", label: "Apartar", icon: PiggyBank },
  { href: "/simuladores/inversion", label: "Simular", icon: TrendingUp },
];

export default async function DashboardPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const [accounts, liquidity, recent] = await Promise.all([
    getAccounts(viewer.id),
    getLiquidity(viewer.id),
    getTransactions(viewer.id, { limit: 6 }),
  ]);

  const liquidTotal = liquidity.available + liquidity.vaultLiquid;
  const liquidShare =
    liquidity.totalAssets === 0 ? 0 : liquidTotal / liquidity.totalAssets;

  return (
    <>
      <AppHeader
        title={`Hola${viewer.displayName ? `, ${viewer.displayName.split(" ")[0]}` : ""}`}
        subtitle="Tu patrimonio de un vistazo"
        isDemo={viewer.isDemo}
      />

      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        {/* Patrimonio neto: activos menos deudas. */}
        <section className="bg-card rounded-2xl border p-5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Patrimonio neto
          </p>
          <div className="mt-1.5">
            <HeadlineMoney amount={liquidity.netWorth} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="bg-surface-raised rounded-xl p-3">
              <p className="text-muted-foreground text-xs">Lo que tienes</p>
              <Money
                amount={liquidity.totalAssets}
                className="text-positive font-semibold"
              />
            </div>
            <div className="bg-surface-raised rounded-xl p-3">
              <p className="text-muted-foreground text-xs">Lo que debes</p>
              <Money
                amount={liquidity.totalLiabilities}
                className="text-negative font-semibold"
              />
            </div>
          </div>
        </section>

        {/* Pulso de liquidez: no todo tu dinero está disponible hoy. */}
        <section className="bg-card rounded-2xl border p-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-medium">Pulso de liquidez</h2>
            <span className="text-muted-foreground text-xs">
              {Math.round(liquidShare * 100)}% disponible
            </span>
          </div>

          <Progress value={liquidShare * 100} className="mt-3 h-2" />

          <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <dt className="text-muted-foreground">Disponible</dt>
              <dd className="mt-0.5">
                <Money amount={liquidity.available} className="font-semibold" />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Apartado</dt>
              <dd className="mt-0.5">
                <Money amount={liquidity.vaultLiquid} className="font-semibold" />
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">A plazo</dt>
              <dd className="mt-0.5">
                <Money
                  amount={liquidity.vaultLocked}
                  className="text-warning font-semibold"
                />
              </dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="sr-only">Acciones rápidas</h2>
          <div className="grid grid-cols-4 gap-2">
            {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
              <Button
                key={href}
                asChild
                variant="outline"
                className="h-auto flex-col gap-1.5 py-3"
              >
                <Link href={href}>
                  <Icon className="size-5" />
                  <span className="text-xs font-medium">{label}</span>
                </Link>
              </Button>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Mis cuentas</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/cuentas">Ver todas</Link>
            </Button>
          </div>

          {accounts.length === 0 ? (
            <EmptyAccounts />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {accounts.slice(0, 4).map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Últimos movimientos</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/movimientos">Ver historial</Link>
            </Button>
          </div>

          {recent.length === 0 ? (
            <p className="text-muted-foreground bg-card rounded-2xl border p-6 text-center text-sm">
              Todavía no hay movimientos.
            </p>
          ) : (
            <ul className="bg-card divide-y rounded-2xl border">
              {recent.map((transaction) => (
                <li
                  key={transaction.id}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <span
                    aria-hidden
                    className="size-2 shrink-0 rounded-full"
                    style={{
                      backgroundColor: transaction.category?.color ?? "#64748b",
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {transaction.merchant ??
                        transaction.category?.name ??
                        transaction.notes ??
                        "Movimiento"}
                    </p>
                    <p className="text-muted-foreground truncate text-xs">
                      {formatDayHeading(transaction.occurredAt)} ·{" "}
                      {formatTime(transaction.occurredAt)}
                      {transaction.isAccrual ? " · rendimiento" : ""}
                    </p>
                  </div>
                  <SignedMoney
                    amount={transaction.amount}
                    direction={transaction.direction}
                    className="shrink-0 text-sm"
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function EmptyAccounts() {
  return (
    <div className="bg-card rounded-2xl border border-dashed p-8 text-center">
      <PiggyBank className="text-muted-foreground mx-auto size-8" />
      <p className="mt-3 font-medium">Todavía no tienes cuentas</p>
      <p className="text-muted-foreground mx-auto mt-1 max-w-sm text-sm text-balance">
        Agrega tu cuenta de Nu, Mercado Pago o tu banco para empezar a ver tu
        patrimonio en un solo lugar.
      </p>
      <Button asChild className="mt-4 gap-2">
        <Link href="/cuentas/nueva">
          <Plus className="size-4" />
          Agregar mi primera cuenta
        </Link>
      </Button>
      <Badge variant="secondary" className="mt-3 block w-fit mx-auto">
        Toma menos de un minuto
      </Badge>
    </div>
  );
}
