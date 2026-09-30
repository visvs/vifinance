import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Cliente de Supabase para componentes de cliente.
 *
 * `createBrowserClient` ya es un singleton internamente, así que llamar a esta
 * función muchas veces no crea muchas conexiones.
 *
 * Se usa sólo para lectura reactiva y suscripciones en tiempo real. Ninguna
 * escritura que mueva dinero pasa por aquí: eso va por Server Actions.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
