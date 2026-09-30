import { Plus } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AccountCard } from "@/components/finance/account-card";
import { Money } from "@/components/finance/money-text";
import { AppHeader } from "@/components/shell/app-header";
import { Button } from "@/components/ui/button";
import { getAccounts, getLiquidity } from "@/lib/queries/accounts";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Cuentas" };

const GROUPS = [
  { key: "asset", title: "Mis cuentas", empty: "Aún no registras cuentas." },
  { key: "liability", title: "Mis deudas", empty: "No tienes deudas registradas." },
] as const;

export default async function AccountsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const [accounts, liquidity] = await Promise.all([
    getAccounts(viewer.id),
    getLiquidity(viewer.id),
  ]);

  return (
    <>
      <AppHeader
        title="Cuentas y apartados"
        subtitle={`${accounts.length} cuentas activas`}
        isDemo={viewer.isDemo}
      />

      <div className="mx-auto max-w-5xl space-y-6 p-4 md:p-6">
        <section className="bg-card grid grid-cols-3 gap-2 rounded-2xl border p-4 text-center">
          <div>
            <p className="text-muted-foreground text-xs">Activos</p>
            <Money
              amount={liquidity.totalAssets}
              className="text-positive block font-semibold"
            />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Deudas</p>
            <Money
              amount={liquidity.totalLiabilities}
              className="text-negative block font-semibold"
            />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Neto</p>
            <Money amount={liquidity.netWorth} className="block font-semibold" />
          </div>
        </section>

        {GROUPS.map((group) => {
          const items = accounts.filter(
            (account) => account.nature === group.key,
          );

          return (
            <section key={group.key} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-medium">{group.title}</h2>
                {group.key === "asset" ? (
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <Link href="/cuentas/nueva">
                      <Plus className="size-4" />
                      Nueva
                    </Link>
                  </Button>
                ) : null}
              </div>

              {items.length === 0 ? (
                <p className="text-muted-foreground bg-card rounded-2xl border border-dashed p-6 text-center text-sm">
                  {group.empty}
                </p>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((account) => (
                    <AccountCard key={account.id} account={account} />
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
