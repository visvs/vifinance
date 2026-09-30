import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 *
 * Se crea uno nuevo en cada petición: la sesión vive en las cookies de esa
 * petición, así que un cliente compartido entre peticiones serviría los datos
 * de un usuario a otro.
 *
 * En Next.js 16 `cookies()` es asíncrono, de ahí el `await`.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Un Server Component no puede escribir cookies. No es un problema:
            // el proxy refresca la sesión en cada petición.
          }
        },
      },
    },
  );
}

/**
 * Devuelve las claims del usuario en sesión, o `null`.
 *
 * Se usa `getClaims()` y no `getSession()` porque `getSession()` sólo lee la
 * cookie —que cualquiera puede falsificar— mientras que `getClaims()` valida la
 * firma del JWT contra las llaves públicas del proyecto. Para decidir qué ve
 * alguien, esa diferencia lo es todo.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) return null;

  return {
    id: data.claims.sub as string,
    email: data.claims.email as string | undefined,
  };
}

/** Igual que `getCurrentUser`, pero falla si no hay sesión. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Necesitas iniciar sesión para hacer esto");
  }
  return user;
}
