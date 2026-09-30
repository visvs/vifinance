import { Plus } from "lucide-react";
import Link from "next/link";

import { BottomNav } from "@/components/shell/bottom-nav";
import { SidebarNav } from "@/components/shell/sidebar-nav";
import { Button } from "@/components/ui/button";

/**
 * Shell de la app.
 *
 * Móvil: contenido a ancho completo, barra inferior fija y botón flotante de
 * captura rápida. Escritorio: barra lateral persistente y el mismo contenido
 * centrado con ancho máximo, para que las tablas no se estiren hasta perderse.
 */
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh">
      <aside className="bg-sidebar sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r py-5 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2.5 px-6">
          <span className="bg-primary text-primary-foreground grid size-8 place-items-center rounded-lg text-sm font-bold">
            Vi
          </span>
          <span className="text-base font-semibold tracking-tight">
            ViFinance
          </span>
        </Link>

        <SidebarNav />

        <div className="mt-auto px-3">
          <Button asChild className="w-full gap-2">
            <Link href="/movimientos/nuevo">
              <Plus className="size-4" />
              Registrar
            </Link>
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 pb-24 md:pb-10">{children}</main>
      </div>

      {/* Captura rápida: flota sobre la barra inferior, al alcance del pulgar. */}
      <Button
        asChild
        size="icon"
        className="fixed right-4 bottom-20 z-40 size-14 rounded-full shadow-lg md:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        <Link href="/movimientos/nuevo" aria-label="Registrar movimiento">
          <Plus className="size-6" />
        </Link>
      </Button>

      <BottomNav />
    </div>
  );
}
