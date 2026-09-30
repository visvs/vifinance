import { Eye, ShieldCheck, TrendingUp } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { GoogleButton } from "@/components/auth/google-button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { signInAsDevUser } from "@/lib/actions/auth";

export const metadata: Metadata = {
  title: "Entrar",
};

const HIGHLIGHTS = [
  {
    icon: TrendingUp,
    title: "Tus apartados rinden solos",
    description:
      "Cada cajita con su tasa y su plazo. El rendimiento se calcula y se registra todos los días, aunque no abras la app.",
  },
  {
    icon: ShieldCheck,
    title: "Hecho para México",
    description:
      "Retención de ISR sobre intereses, GAT real, CAT con metodología de Banxico y compras a Meses Sin Intereses.",
  },
];

export default async function LoginPage(props: PageProps<"/login">) {
  const searchParams = await props.searchParams;
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  const next = typeof searchParams.next === "string" ? searchParams.next : "/";

  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      {/* Panel de presentación: sólo en pantallas grandes. */}
      <section className="bg-sidebar hidden flex-col justify-between border-r p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg font-bold">
            Vi
          </span>
          <span className="text-lg font-semibold tracking-tight">ViFinance</span>
        </div>

        <div className="space-y-8">
          <h2 className="max-w-md text-3xl leading-tight font-semibold tracking-tight text-balance">
            Todas tus cuentas, apartados y deudas en un solo lugar.
          </h2>

          <ul className="space-y-6">
            {HIGHLIGHTS.map(({ icon: Icon, title, description }) => (
              <li key={title} className="flex gap-4">
                <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                  <Icon className="size-5" />
                </span>
                <div className="space-y-1">
                  <p className="font-medium">{title}</p>
                  <p className="text-muted-foreground max-w-sm text-sm">
                    {description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-muted-foreground text-xs">
          Nu · Mercado Pago · DiDi · Ualá · Klar · BBVA · Banorte · SOFIPOs ·
          Cetesdirecto
        </p>
      </section>

      <section className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 text-center lg:text-left">
            <div className="flex items-center justify-center gap-2.5 lg:hidden">
              <span className="bg-primary text-primary-foreground grid size-9 place-items-center rounded-lg font-bold">
                Vi
              </span>
              <span className="text-lg font-semibold tracking-tight">
                ViFinance
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Entra a tus finanzas
            </h1>
            <p className="text-muted-foreground text-sm">
              Con tu cuenta de Google. Sin contraseñas que recordar.
            </p>
          </div>

          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <GoogleButton next={next} />

          <div className="flex items-center gap-3">
            <span className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs">o</span>
            <span className="bg-border h-px flex-1" />
          </div>

          <Button asChild variant="outline" className="w-full gap-2">
            <Link href="/demo">
              <Eye className="size-4" />
              Ver la demo sin cuenta
            </Link>
          </Button>

          {process.env.NODE_ENV !== "production" ? (
            <form action={signInAsDevUser}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground w-full"
              >
                Entrar como usuario de desarrollo
              </Button>
            </form>
          ) : null}

          <p className="text-muted-foreground text-center text-xs text-balance">
            ViFinance no se conecta a tus bancos ni pide tus credenciales: tú
            registras tus movimientos.
          </p>
        </div>
      </section>
    </main>
  );
}
