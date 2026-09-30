import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Regreso de Google.
 *
 * Google manda un código de un solo uso; aquí se cambia por una sesión y se
 * guarda en cookies. Si algo falla se manda a /login con el motivo, en vez de
 * dejar al usuario en una pantalla en blanco.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const error = searchParams.get("error_description") ?? searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}`,
    );
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("No recibimos el código de acceso")}`,
    );
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(exchangeError.message)}`,
    );
  }

  // `next` viene de la URL, así que sólo se aceptan rutas internas: una URL
  // absoluta aquí sería un redirect abierto.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  return NextResponse.redirect(`${origin}${safeNext}`);
}
