import { redirect } from "next/navigation";

import { AppHeader } from "@/components/shell/app-header";
import { getAccounts } from "@/lib/queries/accounts";
import { getCategories } from "@/lib/queries/transactions";
import { getViewer } from "@/lib/viewer";

import { TransactionForm } from "./transaction-form";

export const metadata = { title: "Nuevo movimiento" };

const TIPO_TITLES: Record<string, string> = {
  gasto: "Registrar gasto",
  ingreso: "Registrar ingreso",
  transferencia: "Transferir",
  apartar: "Apartar dinero",
};

export default async function NewTransactionPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  if (viewer.isDemo) redirect("/login");

  const searchParams = await props.searchParams;
  const tipo = (typeof searchParams.tipo === "string" ? searchParams.tipo : "gasto") as string;

  const [accounts, categories] = await Promise.all([
    getAccounts(viewer.id),
    getCategories(viewer.id),
  ]);

  return (
    <>
      <AppHeader
        title={TIPO_TITLES[tipo] ?? "Nuevo movimiento"}
        subtitle="Registra un movimiento"
        isDemo={false}
      />

      <div className="mx-auto max-w-lg p-4 md:p-6">
        <TransactionForm
          tipo={tipo}
          accounts={accounts.map((a) => ({
            id: a.id,
            name: a.name,
            nature: a.nature,
            balance: a.totalBalance,
            institution: a.institution?.name ?? null,
          }))}
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            color: c.color,
          }))}
        />
      </div>
    </>
  );
}
