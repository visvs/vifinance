"use client";

import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Option {
  id: string;
  name: string;
}

const TYPES: Option[] = [
  { id: "expense", name: "Gastos" },
  { id: "income", name: "Ingresos" },
  { id: "transfer", name: "Transferencias" },
  { id: "yield", name: "Rendimientos" },
  { id: "credit_charge", name: "Cargos a tarjeta" },
  { id: "credit_payment", name: "Pagos de tarjeta" },
];

const ALL = "__todas__";

/**
 * Filtros del historial.
 *
 * Escriben en la URL en lugar de en un estado local: así el filtro se puede
 * compartir, sobrevive a recargar y el servidor puede hacer la consulta ya
 * filtrada, sin traer mil movimientos al navegador para esconder novecientos.
 */
export function TransactionFiltersBar({
  accounts,
  categories,
}: {
  accounts: Option[];
  categories: Option[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("q") ?? "");

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "" || value === ALL) params.delete(key);
    else params.set(key, value);

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const hasFilters = [
    "cuenta",
    "categoria",
    "tipo",
    "q",
    "desde",
    "hasta",
    "rendimientos",
  ].some(
    (key) => searchParams.get(key),
  );

  return (
    <div className="space-y-2">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setParam("q", search);
        }}
        className="relative"
      >
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar por concepto, comercio o nota"
          className="pl-9"
          aria-label="Buscar movimientos"
        />
      </form>

      <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
        <Select
          value={searchParams.get("tipo") ?? ALL}
          onValueChange={(value) => setParam("tipo", value)}
        >
          <SelectTrigger className="h-9 w-auto min-w-28 shrink-0">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos los tipos</SelectItem>
            {TYPES.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("cuenta") ?? ALL}
          onValueChange={(value) => setParam("cuenta", value)}
        >
          <SelectTrigger className="h-9 w-auto min-w-32 shrink-0">
            <SelectValue placeholder="Cuenta" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las cuentas</SelectItem>
            {accounts.map((account) => (
              <SelectItem key={account.id} value={account.id}>
                {account.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={searchParams.get("categoria") ?? ALL}
          onValueChange={(value) => setParam("categoria", value)}
        >
          <SelectTrigger className="h-9 w-auto min-w-32 shrink-0">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas las categorías</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          variant={searchParams.get("rendimientos") === "1" ? "default" : "outline"}
          size="sm"
          className="h-9 shrink-0"
          disabled={isPending}
          onClick={() =>
            setParam(
              "rendimientos",
              searchParams.get("rendimientos") === "1" ? null : "1",
            )
          }
        >
          Rendimientos
        </Button>

        {hasFilters ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 shrink-0 gap-1.5"
            disabled={isPending}
            onClick={() => startTransition(() => router.replace(pathname))}
          >
            <X className="size-4" />
            Limpiar
          </Button>
        ) : null}
      </div>
    </div>
  );
}
