import { redirect } from "next/navigation";

import { Money, SignedMoney } from "@/components/finance/money-text";
import { TransactionFiltersBar } from "@/components/finance/transaction-filters";
import { AppHeader } from "@/components/shell/app-header";
import { Badge } from "@/components/ui/badge";
import { formatDayHeading, formatTime } from "@/lib/format";
import { getAccounts } from "@/lib/queries/accounts";
import {
  getCategories,
  getTransactions,
  groupByDay,
  type TransactionFilters,
} from "@/lib/queries/transactions";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Movimientos" };

const TYPE_LABEL: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
  transfer: "Transferencia",
  yield: "Rendimiento",
  fee: "Comisión",
  tax: "ISR",
  adjustment: "Ajuste",
  credit_charge: "Cargo a tarjeta",
  credit_payment: "Pago de tarjeta",
};

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

export default async function TransactionsPage(
  props: PageProps<"/movimientos">,
) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const searchParams = await props.searchParams;

  // Los filtros viven en la URL: así un historial filtrado se puede compartir,
  // guardar en favoritos y sobrevive a recargar la página.
  const filters: TransactionFilters = {
    from: asString(searchParams.desde),
    to: asString(searchParams.hasta),
    accountId: asString(searchParams.cuenta),
    categoryId: asString(searchParams.categoria),
    type: asString(searchParams.tipo) as TransactionFilters["type"],
    search: asString(searchParams.q),
    includeAccruals: asString(searchParams.rendimientos) === "1",
    limit: 120,
  };

  const [transactions, accounts, categories] = await Promise.all([
    getTransactions(viewer.id, filters),
    getAccounts(viewer.id),
    getCategories(viewer.id),
  ]);

  const days = groupByDay(transactions);

  const totals = transactions.reduce(
    (acc, item) => {
      if (item.direction === "in") acc.income += item.amount;
      if (item.direction === "out") acc.expense += item.amount;
      return acc;
    },
    { income: 0, expense: 0 },
  );

  return (
    <>
      <AppHeader
        title="Movimientos"
        subtitle={`${transactions.length} movimientos`}
        isDemo={viewer.isDemo}
      />

      <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <section className="bg-card grid grid-cols-3 gap-2 rounded-2xl border p-4 text-center">
          <div>
            <p className="text-muted-foreground text-xs">Ingresos</p>
            <Money
              amount={totals.income}
              className="text-positive block font-semibold"
            />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Egresos</p>
            <Money amount={totals.expense} className="block font-semibold" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Neto</p>
            <Money
              amount={totals.income - totals.expense}
              className="block font-semibold"
            />
          </div>
        </section>

        <TransactionFiltersBar
          accounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        />

        {days.length === 0 ? (
          <p className="text-muted-foreground bg-card rounded-2xl border border-dashed p-8 text-center text-sm">
            No hay movimientos con estos filtros.
          </p>
        ) : (
          <div className="space-y-4">
            {days.map((day) => (
              <section key={day.date}>
                <header className="flex items-baseline justify-between px-1 pb-2">
                  <h2 className="text-sm font-medium capitalize">
                    {formatDayHeading(day.date)}
                  </h2>
                  <SignedMoney
                    amount={Math.abs(day.net)}
                    direction={day.net >= 0 ? "in" : "out"}
                    className="text-xs"
                  />
                </header>

                <ul className="bg-card divide-y rounded-2xl border">
                  {day.items.map((transaction) => (
                    <li
                      key={transaction.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <span
                        aria-hidden
                        className="grid size-9 shrink-0 place-items-center rounded-xl text-xs font-semibold"
                        style={{
                          backgroundColor: `${transaction.category?.color ?? "#64748b"}22`,
                          color: transaction.category?.color ?? "#94a3b8",
                        }}
                      >
                        {(transaction.category?.name ?? "··").slice(0, 2)}
                      </span>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {transaction.merchant ??
                            transaction.notes ??
                            TYPE_LABEL[transaction.type]}
                        </p>
                        <p className="text-muted-foreground flex items-center gap-1.5 truncate text-xs">
                          <span>{formatTime(transaction.occurredAt)}</span>
                          <span>·</span>
                          <span className="truncate">
                            {transaction.direction === "out"
                              ? (transaction.fromAccount?.name ?? "")
                              : transaction.direction === "in"
                                ? (transaction.toAccount?.name ?? "")
                                : `${transaction.fromAccount?.name ?? "?"} → ${transaction.toAccount?.name ?? "?"}`}
                          </span>
                        </p>
                      </div>

                      <div className="shrink-0 text-right">
                        <SignedMoney
                          amount={transaction.amount}
                          direction={transaction.direction}
                          className="block text-sm"
                        />
                        {transaction.isAccrual ? (
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
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
