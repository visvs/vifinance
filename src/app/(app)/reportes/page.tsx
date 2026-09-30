import { redirect } from "next/navigation";

import { CategoryDonut, IncomeExpenseChart } from "@/components/finance/charts";
import { Money } from "@/components/finance/money-text";
import { AppHeader } from "@/components/shell/app-header";
import { Progress } from "@/components/ui/progress";
import { toPesos } from "@/lib/finance/money";
import { formatMoney, formatPercent, nowInMexico } from "@/lib/format";
import { getLiquidity } from "@/lib/queries/accounts";
import { getBudgetProgress, getEmergencyRunway } from "@/lib/queries/reports";
import {
  getMonthlyFlow,
  getSpendingByCategory,
} from "@/lib/queries/transactions";
import { getViewer } from "@/lib/viewer";

export const metadata = { title: "Reportes" };

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

export default async function ReportsPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");

  const now = nowInMexico();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = now.toISOString();

  const [liquidity, flow, categories, budgets, runway] = await Promise.all([
    getLiquidity(viewer.id),
    getMonthlyFlow(viewer.id, 6),
    getSpendingByCategory(viewer.id, monthStart, monthEnd),
    getBudgetProgress(viewer.id),
    getEmergencyRunway(viewer.id),
  ]);

  const currentMonth = flow.at(-1);
  const savingsRate =
    currentMonth && currentMonth.income > 0
      ? currentMonth.net / currentMonth.income
      : 0;

  const flowData = flow.map((item) => {
    const [, month] = item.month.split("-");
    return {
      month: MONTH_LABELS[Number(month) - 1] ?? item.month,
      income: toPesos(item.income),
      expense: toPesos(item.expense),
    };
  });

  const donutData = categories.slice(0, 7).map((category) => ({
    name: category.name,
    value: toPesos(category.total),
    color: category.color,
  }));

  return (
    <>
      <AppHeader
        title="Reportes"
        subtitle="En qué se te va el dinero y cuánto aguantas"
        isDemo={viewer.isDemo}
      />

      <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6">
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="bg-card rounded-2xl border p-4">
            <p className="text-muted-foreground text-xs">Tasa de ahorro del mes</p>
            <p
              className={`tabular mt-1 text-2xl font-semibold ${savingsRate >= 0 ? "text-positive" : "text-negative"}`}
            >
              {formatPercent(savingsRate, 1)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Del ingreso que no se fue en gastos
            </p>
          </div>

          <div className="bg-card rounded-2xl border p-4">
            <p className="text-muted-foreground text-xs">Fondo de emergencia</p>
            <p className="tabular mt-1 text-2xl font-semibold">
              {runway.months.toFixed(1)} meses
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Lo que aguantas con {formatMoney(runway.monthlyExpense)} al mes
            </p>
          </div>

          <div className="bg-card rounded-2xl border p-4">
            <p className="text-muted-foreground text-xs">Patrimonio neto</p>
            <p className="tabular mt-1 text-2xl font-semibold">
              {formatMoney(liquidity.netWorth)}
            </p>
            <p className="text-muted-foreground mt-0.5 text-[11px]">
              Activos menos deudas
            </p>
          </div>
        </section>

        <section className="bg-card rounded-2xl border p-4">
          <h2 className="mb-1 font-medium">Ingresos contra egresos</h2>
          <p className="text-muted-foreground mb-2 text-xs">Últimos 6 meses</p>
          <IncomeExpenseChart data={flowData} />
        </section>

        <section className="bg-card rounded-2xl border p-4">
          <h2 className="mb-1 font-medium">En qué gastaste este mes</h2>
          {categories.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center text-sm">
              Todavía no hay gastos este mes.
            </p>
          ) : (
            <div className="grid items-center gap-4 sm:grid-cols-2">
              <CategoryDonut data={donutData} />

              <ul className="space-y-2">
                {categories.slice(0, 7).map((category) => (
                  <li
                    key={category.categoryId ?? category.name}
                    className="flex items-center gap-2.5 text-sm"
                  >
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="min-w-0 flex-1 truncate">{category.name}</span>
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {Math.round(category.share * 100)}%
                    </span>
                    <Money
                      amount={category.total}
                      className="shrink-0 text-sm font-medium"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {budgets.length > 0 ? (
          <section className="bg-card space-y-4 rounded-2xl border p-4">
            <h2 className="font-medium">Presupuestos del mes</h2>
            {budgets.map((budget) => {
              const over = budget.spent > budget.limit;

              return (
                <div key={budget.id} className="space-y-1.5">
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="font-medium">{budget.categoryName}</span>
                    <span
                      className={`tabular text-xs ${over ? "text-negative" : "text-muted-foreground"}`}
                    >
                      {formatMoney(budget.spent)} de {formatMoney(budget.limit)}
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, budget.progress * 100)}
                    className={`h-2 ${over ? "[&>div]:bg-negative" : ""}`}
                  />
                  <p className="text-muted-foreground text-[11px]">
                    {over
                      ? `Te pasaste por ${formatMoney(budget.spent - budget.limit)}`
                      : `Te quedan ${formatMoney(budget.limit - budget.spent)}`}
                  </p>
                </div>
              );
            })}
          </section>
        ) : null}
      </div>
    </>
  );
}
