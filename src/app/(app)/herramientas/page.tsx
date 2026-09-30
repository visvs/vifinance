import { CreditCard, TrendingUp } from "lucide-react";
import Link from "next/link";

import { AppHeader } from "@/components/shell/app-header";

export const metadata = { title: "Herramientas" };

const TOOLS = [
  {
    href: "/simuladores/inversion",
    icon: TrendingUp,
    title: "Simulador de inversiones",
    description:
      "Interés compuesto con aportaciones periódicas, escenarios de tasa y el modo inverso: cuánto ahorrar al mes para llegar a tu meta. Con la retención de ISR y la GAT real.",
  },
  {
    href: "/simuladores/credito",
    icon: CreditCard,
    title: "Simulador de créditos",
    description:
      "Tabla de amortización, CAT con metodología de Banxico, cuánto cuesta pagar el mínimo de la tarjeta y si de verdad conviene comprar a Meses Sin Intereses.",
  },
];

export default function ToolsPage() {
  return (
    <>
      <AppHeader
        title="Herramientas"
        subtitle="Calculadoras para decidir antes de firmar"
      />

      <div className="mx-auto max-w-3xl space-y-3 p-4 md:p-6">
        {TOOLS.map(({ href, icon: Icon, title, description }) => (
          <Link
            key={href}
            href={href}
            className="bg-card hover:border-primary/40 block rounded-2xl border p-5 transition-colors"
          >
            <div className="flex gap-4">
              <span className="bg-primary/10 text-primary grid size-11 shrink-0 place-items-center rounded-xl">
                <Icon className="size-5" />
              </span>
              <div className="space-y-1">
                <h2 className="font-medium">{title}</h2>
                <p className="text-muted-foreground text-sm text-pretty">
                  {description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
