"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient, getCurrentUser } from "@/lib/supabase/server";
import { createAccountSchema } from "@/lib/validation/accounts";

export interface ActionResult {
  error?: string;
}

export async function createAccount(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const parsed = createAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createClient();

  const { data: account, error } = await supabase
    .from("accounts")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      institution_id: parsed.data.institutionId ?? null,
      kind: parsed.data.kind,
      nature: parsed.data.nature,
      balance: parsed.data.initialBalance,
      color: parsed.data.color ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (parsed.data.annualRate && parsed.data.annualRate > 0) {
    await supabase.from("account_yield_config").insert({
      account_id: account.id,
      gross_annual_rate: parsed.data.annualRate / 100,
      compounding: parsed.data.compounding ?? "daily",
      day_count_basis: 365,
      applies_isr: true,
    });
  }

  if (parsed.data.nature === "liability" && parsed.data.creditLimit) {
    await supabase.from("account_credit_config").insert({
      account_id: account.id,
      credit_limit: parsed.data.creditLimit,
      cutoff_day: parsed.data.cutoffDay ?? 15,
      payment_due_day: parsed.data.paymentDueDay ?? 5,
    });
  }

  revalidatePath("/", "layout");
  redirect("/cuentas");
}
