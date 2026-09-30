import { NextResponse } from "next/server";

import { DEMO_COOKIE } from "@/lib/viewer";

/**
 * Entrada a la demo pública.
 *
 * Deja una cookie y manda al inicio. A partir de ahí la app sirve los datos del
 * usuario marcado `is_demo`, que el RLS expone en solo lectura al rol anónimo.
 * La cookie no da permisos: si alguien la falsifica, sigue viendo exactamente
 * lo mismo, porque quien decide es la base de datos.
 */
export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const response = NextResponse.redirect(`${origin}/`);

  response.cookies.set(DEMO_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24,
  });

  return response;
}
