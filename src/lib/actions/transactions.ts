"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import {
  recordExpenseSchema,
  recordIncomeSchema,
  transferSchema,
} from "@/lib/validation/transactions";

export interface ActionResult {
  error?: string;
}

export async function recordExpense(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = recordExpenseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_expense", {
    p_account_id: parsed.data.accountId,
    p_amount: parsed.data.amount,
    p_category_id: parsed.data.categoryId,
    p_merchant: parsed.data.merchant || undefined,
    p_notes: parsed.data.notes || undefined,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/movimientos");
}

export async function recordIncome(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = recordIncomeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("record_income", {
    p_account_id: parsed.data.accountId,
    p_amount: parsed.data.amount,
    p_category_id: parsed.data.categoryId,
    p_merchant: parsed.data.merchant || undefined,
    p_notes: parsed.data.notes || undefined,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/movimientos");
}

export async function transferBetweenAccounts(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = transferSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_between_accounts", {
    p_from_account_id: parsed.data.fromAccountId,
    p_to_account_id: parsed.data.toAccountId,
    p_amount: parsed.data.amount,
    p_notes: parsed.data.notes || undefined,
  });

  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  redirect("/movimientos");
}
