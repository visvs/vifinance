import { CreditSimulator } from "@/components/finance/credit-simulator";
import { AppHeader } from "@/components/shell/app-header";

export const metadata = { title: "Simulador de créditos" };

export default function CreditSimulatorPage() {
  return (
    <>
      <AppHeader
        title="Simulador de créditos"
        subtitle="Amortización, CAT y el costo real de pagar el mínimo"
      />
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <CreditSimulator />
      </div>
    </>
  );
}
