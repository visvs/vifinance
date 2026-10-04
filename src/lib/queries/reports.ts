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

export async function getBudgetProgress(userId: string): Promise<BudgetProgress[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("budgets")
    .select("id, category_id, limit_amount, category:categories (name)")
    .eq("user_id", userId);

  if (error) throw error;
  if (!data || data.length === 0) return [];

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthEnd = now.toISOString();

  const { data: expenses } = await supabase
    .from("transactions")
    .select("amount, category_id")
    .eq("user_id", userId)
    .in("type", ["expense", "credit_charge"])
    .gte("occurred_at", monthStart)
    .lte("occurred_at", monthEnd);

  const spentByCategory = new Map<string, number>();
  for (const tx of expenses ?? []) {
    if (tx.category_id) {
      spentByCategory.set(
        tx.category_id,
        (spentByCategory.get(tx.category_id) ?? 0) + Number(tx.amount),
      );
    }
  }

  return data
    .map((row) => {
      const limit = fromDatabase(row.limit_amount);
      const spent = fromDatabase(spentByCategory.get(row.category_id) ?? 0);
      return {
        id: row.id,
        categoryName: row.category?.name ?? "Sin categoría",
        spent,
        limit,
        progress: limit > 0 ? spent / limit : 0,
      };
    })
    .sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

export async function getEmergencyRunway(userId: string): Promise<EmergencyRunway> {
  const supabase = await createClient();

  const { data: liquidityData, error: liqError } = await supabase
    .from("liquidity_summary")
    .select("available_balance")
    .eq("user_id", userId)
    .maybeSingle();

  if (liqError) throw liqError;

  const available = fromDatabase(liquidityData?.available_balance ?? 0);

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const { data: expenses } = await supabase
    .from("transactions")
    .select("amount")
    .eq("user_id", userId)
    .in("type", ["expense", "credit_charge", "fee", "tax"])
    .gte("occurred_at", threeMonthsAgo.toISOString());

  const totalExpenses = (expenses ?? []).reduce(
    (sum, tx) => sum + fromDatabase(tx.amount),
    0,
  );
  const monthlyExpense = Math.round(totalExpenses / 3) || 1;

  return {
    months: monthlyExpense > 0 ? available / monthlyExpense : 0,
    monthlyExpense,
  };
}
