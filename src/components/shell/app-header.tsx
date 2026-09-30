import { Eye } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  /** En modo demo no hay sesión que cerrar: se ofrece entrar de verdad. */
  isDemo?: boolean;
}

export function AppHeader({ title, subtitle, isDemo }: AppHeaderProps) {
  return (
    <header className="bg-background/85 sticky top-0 z-30 border-b backdrop-blur-lg">
      <div className="flex items-center justify-between gap-3 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle ? (
            <p className="text-muted-foreground truncate text-xs">{subtitle}</p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {isDemo ? (
            <>
              <Badge variant="secondary" className="gap-1.5">
                <Eye className="size-3.5" />
                Demo
              </Badge>
              <Button asChild size="sm" variant="default">
                <Link href="/login">Entrar</Link>
              </Button>
            </>
          ) : (
            <form action={signOut}>
              <Button type="submit" size="sm" variant="ghost">
                Salir
              </Button>
            </form>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
