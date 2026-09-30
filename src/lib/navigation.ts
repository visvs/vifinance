import {
  ArrowLeftRight,
  ChartPie,
  Calculator,
  House,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Rutas que también deben marcar esta pestaña como activa. */
  matches?: string[];
}

/**
 * Las cinco secciones de la app. En móvil son la barra inferior y en escritorio
 * la barra lateral: misma información, misma fuente.
 */
export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/movimientos", label: "Movimientos", icon: ArrowLeftRight },
  { href: "/reportes", label: "Reportes", icon: ChartPie },
  {
    href: "/herramientas",
    label: "Herramientas",
    icon: Calculator,
    matches: ["/simuladores"],
  },
];

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/") return pathname === "/";
  if (pathname.startsWith(item.href)) return true;
  return (item.matches ?? []).some((match) => pathname.startsWith(match));
}
