"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/**
 * Barra de navegación inferior, sólo en móvil.
 *
 * Va fija abajo porque esta app se usa con una mano y de pie: el pulgar llega
 * al borde inferior, no a la parte superior de la pantalla.
 */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="bg-background/85 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-lg md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-between px-1">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;

          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-5", active && "fill-primary/15")}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
