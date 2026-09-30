import { cookies } from "next/headers";

import { createClient, getCurrentUser } from "@/lib/supabase/server";

/** Cookie que marca que alguien está mirando la demo pública. */
export const DEMO_COOKIE = "vifinance-demo";

export interface Viewer {
  /** Id del usuario cuyos datos se están mostrando. */
  id: string;
  /** `true` cuando es la cuenta de demostración: todo es de solo lectura. */
  isDemo: boolean;
  displayName: string | null;
}

/**
 * Quién está viendo la app.
 *
 * Puede ser el usuario con sesión, o —si alguien entró por la demo— el usuario
 * de demostración. Los datos de la demo se sirven porque el RLS tiene una
 * política de lectura anónima para ese usuario; no hay ninguna política de
 * escritura que lo incluya, así que la demo no puede modificarse ni aunque
 * alguien llame a las funciones directamente.
 */
export async function getViewer(): Promise<Viewer | null> {
  const user = await getCurrentUser();

  if (user) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("display_name, is_demo")
      .eq("id", user.id)
      .maybeSingle();

    return {
      id: user.id,
      isDemo: data?.is_demo ?? false,
      displayName: data?.display_name ?? user.email ?? null,
    };
  }

  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_COOKIE)?.value !== "1") return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name")
    .eq("is_demo", true)
    .maybeSingle();

  if (!data) return null;

  return { id: data.id, isDemo: true, displayName: data.display_name };
}

/** Igual que `getViewer`, pero para páginas que no tienen sentido sin datos. */
export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) {
    throw new Error("Necesitas iniciar sesión");
  }
  return viewer;
}
