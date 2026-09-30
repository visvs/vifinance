import type { NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/proxy";

/**
 * En Next.js 16 el middleware se llama `proxy` y corre en runtime de Node.
 * La función mantiene la sesión de Supabase viva en cada petición.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto archivos estáticos e imágenes, que no necesitan
     * sesión y sólo agregarían latencia.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
