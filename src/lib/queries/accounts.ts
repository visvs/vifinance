import "server-only";

import { fromDatabase, type Centavos } from "@/lib/finance/money";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type AccountKind = Database["public"]["Enums"]["account_kind"];
type AccountNature = Database["public"]["Enums"]["account_nature"];
type Compounding = Database["public"]["Enums"]["compounding_frequency"];
type LockType = Database["public"]["Enums"]["lock_type"];

export interface Institution {
  id: string;
  slug: string;
  name: string;
  shortName: string | null;
  kind: Database["public"]["Enums"]["institution_kind"];
  brandColor: string;
  protectionScheme: string | null;
}

export interface VaultSummary {
  id: string;
  name: string;
  balance: Centavos;
  kind: AccountKind;
  annualRate: number | null;
  compounding: Compounding | null;
  maturesOn: string | null;
  withdrawalLock: LockType | null;
  targetAmount: Centavos | null;
  targetDate: string | null;
}

export interface AccountSummary {
  id: string;
  name: string;
  kind: AccountKind;
  nature: AccountNature;
  /** Saldo de la cuenta sin contar sus apartados. */
  balance: Centavos;
  /** Suma de los apartados. */
  vaultBalance: Centavos;
  /** Lo que el usuario considera "lo que tengo en esta cuenta". */
  totalBalance: Centavos;
  annualRate: number | null;
  compounding: Compounding | null;
  institution: Institution | null;
  vaults: VaultSummary[];
  creditLimit: Centavos | null;
  cutoffDay: number | null;
  paymentDueDay: number | null;
  color: string | null;
  isArchived: boolean;
}

export interface LiquiditySummary {
  /** Dinero al que puedes echar mano ahora mismo. */
  available: Centavos;
  /** Apartado pero sin candado: disponible si lo necesitas. */
  vaultLiquid: Centavos;
  /** Atrapado en un plazo hasta su vencimiento. */
  vaultLocked: Centavos;
  totalAssets: Centavos;
  totalLiabilities: Centavos;
  netWorth: Centavos;
}

const ACCOUNT_SELECT = `
  id, name, kind, nature, balance, color, is_archived, display_order,
  parent_account_id, target_amount, target_date,
  institution:institutions (id, slug, name, short_name, kind, brand_color, protection_scheme),
  yield:account_yield_config (gross_annual_rate, compounding, matures_on, withdrawal_lock, destination),
  credit:account_credit_config (credit_limit, cutoff_day, payment_due_day, annual_rate, minimum_payment_rate)
` as const;

/**
 * Trae todas las cuentas del usuario con sus apartados anidados.
 *
 * Se hace en una sola consulta y se arma el árbol en memoria: son pocas filas
 * (nadie tiene 500 cuentas) y así se evita el problema de N+1 consultas, una
 * por cuenta, que es lo que mata el rendimiento de este tipo de pantallas.
 */
export async function getAccounts(
  userId: string,
  { includeArchived = false } = {},
): Promise<AccountSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("accounts")
    .select(ACCOUNT_SELECT)
    .eq("user_id", userId)
    .order("display_order")
    .order("name");

  if (!includeArchived) query = query.eq("is_archived", false);

  const { data, error } = await query;
  if (error) throw error;

  const rows = data ?? [];
  const vaultsByParent = new Map<string, VaultSummary[]>();

  for (const row of rows) {
    if (!row.parent_account_id) continue;
    const list = vaultsByParent.get(row.parent_account_id) ?? [];
    list.push({
      id: row.id,
      name: row.name,
      balance: fromDatabase(row.balance),
      kind: row.kind,
      annualRate: row.yield?.gross_annual_rate ?? null,
      compounding: row.yield?.compounding ?? null,
      maturesOn: row.yield?.matures_on ?? null,
      withdrawalLock: row.yield?.withdrawal_lock ?? null,
      targetAmount: row.target_amount ? fromDatabase(row.target_amount) : null,
      targetDate: row.target_date,
    });
    vaultsByParent.set(row.parent_account_id, list);
  }

  return rows
    .filter((row) => !row.parent_account_id)
    .map((row) => {
      const vaults = vaultsByParent.get(row.id) ?? [];
      const balance = fromDatabase(row.balance);
      const vaultBalance = vaults.reduce((sum, vault) => sum + vault.balance, 0);

      return {
        id: row.id,
        name: row.name,
        kind: row.kind,
        nature: row.nature,
        balance,
        vaultBalance,
        totalBalance: balance + vaultBalance,
        annualRate: row.yield?.gross_annual_rate ?? null,
        compounding: row.yield?.compounding ?? null,
        institution: row.institution
          ? {
              id: row.institution.id,
              slug: row.institution.slug,
              name: row.institution.name,
              shortName: row.institution.short_name,
              kind: row.institution.kind,
              brandColor: row.institution.brand_color,
              protectionScheme: row.institution.protection_scheme,
            }
          : null,
        vaults,
        creditLimit: row.credit?.credit_limit
          ? fromDatabase(row.credit.credit_limit)
          : null,
        cutoffDay: row.credit?.cutoff_day ?? null,
        paymentDueDay: row.credit?.payment_due_day ?? null,
        color: row.color,
        isArchived: row.is_archived,
      } satisfies AccountSummary;
    });
}

/** El "pulso de liquidez": qué parte de tu dinero está realmente disponible. */
export async function getLiquidity(userId: string): Promise<LiquiditySummary> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("liquidity_summary")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;

  return {
    available: fromDatabase(data?.available_balance ?? 0),
    vaultLiquid: fromDatabase(data?.vault_liquid_balance ?? 0),
    vaultLocked: fromDatabase(data?.vault_locked_balance ?? 0),
    totalAssets: fromDatabase(data?.total_assets ?? 0),
    totalLiabilities: fromDatabase(data?.total_liabilities ?? 0),
    netWorth: fromDatabase(data?.net_worth ?? 0),
  };
}

/** Catálogo de instituciones, para el alta de cuentas. */
export async function getInstitutions(): Promise<Institution[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("institutions")
    .select("id, slug, name, short_name, kind, brand_color, protection_scheme")
    .eq("is_active", true)
    .order("display_order");

  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    name: row.name,
    shortName: row.short_name,
    kind: row.kind,
    brandColor: row.brand_color,
    protectionScheme: row.protection_scheme,
  }));
}

/** Una cuenta con todo su detalle, para la pantalla de la cuenta. */
export async function getAccount(
  userId: string,
  accountId: string,
): Promise<AccountSummary | null> {
  const accounts = await getAccounts(userId, { includeArchived: true });
  return accounts.find((account) => account.id === accountId) ?? null;
}
