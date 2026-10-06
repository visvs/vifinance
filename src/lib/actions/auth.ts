"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

/** Inicia el flujo de OAuth con Google. */
export async function signInWithGoogle(formData: FormData) {
  const next = (formData.get("next") as string | null) ?? "/";
  const supabase = await createClient();
  const origin = (await headers()).get("origin") ?? getBaseUrl();

  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`,
      queryParams: {
        // Pide siempre la pantalla de selección de cuenta: si alguien comparte
        // la computadora, no debe entrar solo con la sesión de Google de otro.
        prompt: "select_account",
      },
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(data.url);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * Acceso rápido en desarrollo.
 *
 * Google OAuth necesita credenciales reales y un dominio registrado, lo que
 * vuelve impráctico levantar el entorno local. Esta puerta existe sólo en
 * desarrollo y usa el usuario de prueba que crea el seed; en producción la
 * función se niega a hacer nada.
 */
export async function signInAsDevUser() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("El acceso de desarrollo no existe en producción");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: "dev@vifinance.local",
    password: "vifinance-dev",
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}
