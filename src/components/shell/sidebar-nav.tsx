"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isNavItemActive, NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

/** Barra lateral persistente, sólo en escritorio. */
export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegación principal" className="px-3">
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isNavItemActive(item, pathname);
          const Icon = item.icon;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                )}
              >
                <Icon
                  className={cn("size-[18px]", active && "text-primary")}
                  strokeWidth={active ? 2.4 : 1.8}
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
