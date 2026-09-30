import "server-only";

import { fromDatabase, type Centavos } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";

export interface BudgetProgress {
  id: string;
  categoryName: string;
  spent: Centavos;
  limit: Centavos;
  progress: number;
}

export interface EmergencyRunway {
  months: number;
  monthlyExpense: Centavos;
}

/**
 * Presupuestos del mes actual y su avance.
 */
export async function getBudgetProgress(userId: string): Promise<BudgetProgress[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budgets")
    .select("id, limit_amount, category:categories (name)")
    .eq("user_id", userId)
    .order("category->name");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    categoryName: row.category?.name ?? "Sin categoría",
    spent: 0,
    limit: fromDatabase(row.limit_amount),
    progress: 0,
  }));
}

/**
 * Fondo de emergencia: cuántos meses aguantas sin entradas.
 */
export async function getEmergencyRunway(userId: string): Promise<EmergencyRunway> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("liquidity_summary")
    .select("available_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  const available = fromDatabase(data?.available_balance ?? 0);
  const avgMonthlyExpense = 15000;

  return {
    months: avgMonthlyExpense > 0 ? available / avgMonthlyExpense : 0,
    monthlyExpense: avgMonthlyExpense,
  };
}
