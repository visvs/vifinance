import { AppHeader } from "@/components/shell/app-header";
import { InvestmentSimulator } from "@/components/finance/investment-simulator";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Simulador de inversiones" };

export default async function InvestmentSimulatorPage() {
  // Los parámetros fiscales vienen de la base de datos, no del código: la tasa
  // de retención de ISR cambia cada año en la Ley de Ingresos.
  const supabase = await createClient();
  const { data } = await supabase
    .from("tax_parameters")
    .select("year, isr_rate_on_capital, estimated_inflation")
    .order("year", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (
    <>
      <AppHeader
        title="Simulador de inversiones"
        subtitle="Interés compuesto con aportaciones periódicas"
      />
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <InvestmentSimulator
          isrRate={data?.isr_rate_on_capital ?? 0}
          inflation={data?.estimated_inflation ?? 0}
          taxYear={data?.year ?? new Date().getFullYear()}
        />
      </div>
    </>
  );
}
