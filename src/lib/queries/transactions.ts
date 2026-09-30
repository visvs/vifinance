import "server-only";

import { fromDatabase, type Centavos } from "@/lib/finance/money";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

type TransactionType = Database["public"]["Enums"]["transaction_type"];

export interface TransactionRow {
  id: string;
  occurredAt: string;
  type: TransactionType;
  amount: Centavos;
  /** Cómo afecta al patrimonio: entra, sale, o sólo cambia de lugar. */
  direction: "in" | "out" | "internal";
  merchant: string | null;
  notes: string | null;
  isAccrual: boolean;
  category: { id: string; name: string; icon: string; color: string } | null;
  fromAccount: { id: string; name: string; color: string | null } | null;
  toAccount: { id: string; name: string; color: string | null } | null;
}

export interface TransactionFilters {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  search?: string;
  /**
   * Los devengos diarios de rendimiento e ISR son decenas de movimientos por
   * semana y taparían el gasto real, que es lo que la gente viene a revisar.
   * Se ocultan salvo que se pidan explícitamente.
   */
  includeAccruals?: boolean;
  limit?: number;
  offset?: number;
}

const TRANSACTION_SELECT = `
  id, occurred_at, type, amount, merchant, notes, is_accrual,
  category:categories (id, name, icon, color),
  from_account:accounts!transactions_from_account_id_fkey (id, name, color),
  to_account:accounts!transactions_to_account_id_fkey (id, name, color)
` as const;

/**
 * Un movimiento entra, sale, o sólo se mueve de bolsillo.
 *
 * La distinción importa: una transferencia a un apartado no es un gasto, y
 * contarla como tal haría que la app dijera que gastaste el doble de lo que
 * realmente gastaste. Es el error más común en las apps de finanzas.
 */
function directionOf(type: TransactionType): TransactionRow["direction"] {
  switch (type) {
    case "income":
    case "yield":
      return "in";
    case "expense":
    case "fee":
    case "tax":
    case "credit_charge":
      return "out";
    case "transfer":
    case "credit_payment":
    case "adjustment":
      return "internal";
  }
}

export async function getTransactions(
  userId: string,
  filters: TransactionFilters = {},
): Promise<TransactionRow[]> {
  const supabase = await createClient();
  const { limit = 50, offset = 0 } = filters;

  let query = supabase
    .from("transactions")
    .select(TRANSACTION_SELECT)
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!filters.includeAccruals) query = query.eq("is_accrual", false);
  if (filters.from) query = query.gte("occurred_at", filters.from);
  if (filters.to) query = query.lte("occurred_at", filters.to);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.type) query = query.eq("type", filters.type);
  if (filters.accountId) {
    query = query.or(
      `from_account_id.eq.${filters.accountId},to_account_id.eq.${filters.accountId}`,
    );
  }
  if (filters.search) {
    // `%` y `,` romperían el filtro de PostgREST, así que se escapan.
    const safe = filters.search.replace(/[%,()]/g, " ").trim();
    if (safe) query = query.or(`merchant.ilike.%${safe}%,notes.ilike.%${safe}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    occurredAt: row.occurred_at,
    type: row.type,
    amount: fromDatabase(row.amount),
    direction: directionOf(row.type),
    merchant: row.merchant,
    notes: row.notes,
    isAccrual: row.is_accrual,
    category: row.category
      ? {
          id: row.category.id,
          name: row.category.name,
          icon: row.category.icon,
          color: row.category.color,
        }
      : null,
    fromAccount: row.from_account
      ? {
          id: row.from_account.id,
          name: row.from_account.name,
          color: row.from_account.color,
        }
      : null,
    toAccount: row.to_account
      ? {
          id: row.to_account.id,
          name: row.to_account.name,
          color: row.to_account.color,
        }
      : null,
  }));
}

/** Agrupa movimientos por día, que es como los lee una persona. */
export function groupByDay(
  transactions: TransactionRow[],
): Array<{ date: string; items: TransactionRow[]; net: Centavos }> {
  const groups = new Map<string, TransactionRow[]>();

  for (const transaction of transactions) {
    const day = transaction.occurredAt.slice(0, 10);
    const list = groups.get(day) ?? [];
    list.push(transaction);
    groups.set(day, list);
  }

  return [...groups.entries()].map(([date, items]) => ({
    date,
    items,
    net: items.reduce((sum, item) => {
      if (item.direction === "in") return sum + item.amount;
      if (item.direction === "out") return sum - item.amount;
      return sum;
    }, 0),
  }));
}

export interface CategoryBreakdown {
  categoryId: string | null;
  name: string;
  color: string;
  icon: string;
  total: Centavos;
  share: number;
  count: number;
}

/** Gasto del período agrupado por categoría, para la dona del dashboard. */
export async function getSpendingByCategory(
  userId: string,
  from: string,
  to: string,
): Promise<CategoryBreakdown[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select("amount, category:categories (id, name, color, icon)")
    .eq("user_id", userId)
    .in("type", ["expense", "credit_charge"])
    .gte("occurred_at", from)
    .lte("occurred_at", to);

  if (error) throw error;

  const totals = new Map<string, CategoryBreakdown>();

  for (const row of data ?? []) {
    const key = row.category?.id ?? "sin-categoria";
    const existing = totals.get(key);
    const amount = fromDatabase(row.amount);

    if (existing) {
      existing.total += amount;
      existing.count += 1;
    } else {
      totals.set(key, {
        categoryId: row.category?.id ?? null,
        name: row.category?.name ?? "Sin categoría",
        color: row.category?.color ?? "#6B7280",
        icon: row.category?.icon ?? "circle",
        total: amount,
        share: 0,
        count: 1,
      });
    }
  }

  const list = [...totals.values()].sort((a, b) => b.total - a.total);
  const grandTotal = list.reduce((sum, item) => sum + item.total, 0);

  for (const item of list) {
    item.share = grandTotal === 0 ? 0 : item.total / grandTotal;
  }

  return list;
}

export interface MonthlyFlow {
  month: string;
  income: Centavos;
  expense: Centavos;
  net: Centavos;
}

/** Ingresos contra egresos, mes a mes. */
export async function getMonthlyFlow(
  userId: string,
  months = 6,
): Promise<MonthlyFlow[]> {
  const supabase = await createClient();

  const since = new Date();
  since.setMonth(since.getMonth() - (months - 1));
  since.setDate(1);
  since.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("transactions")
    .select("occurred_at, type, amount")
    .eq("user_id", userId)
    .gte("occurred_at", since.toISOString())
    .in("type", ["income", "yield", "expense", "credit_charge", "fee", "tax"]);

  if (error) throw error;

  const buckets = new Map<string, MonthlyFlow>();

  for (let index = 0; index < months; index++) {
    const date = new Date(since);
    date.setMonth(date.getMonth() + index);
    const key = date.toISOString().slice(0, 7);
    buckets.set(key, { month: key, income: 0, expense: 0, net: 0 });
  }

  for (const row of data ?? []) {
    const key = row.occurred_at.slice(0, 7);
    const bucket = buckets.get(key);
    if (!bucket) continue;

    const amount = fromDatabase(row.amount);
    if (directionOf(row.type) === "in") bucket.income += amount;
    else if (directionOf(row.type) === "out") bucket.expense += amount;
  }

  for (const bucket of buckets.values()) {
    bucket.net = bucket.income - bucket.expense;
  }

  return [...buckets.values()];
}

/** Categorías disponibles: las del sistema más las del usuario. */
export async function getCategories(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("categories")
    .select("id, name, kind, icon, color, user_id")
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .eq("is_archived", false)
    .order("display_order");

  if (error) throw error;
  return data ?? [];
}
