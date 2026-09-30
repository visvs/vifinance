import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rutas que se pueden ver sin sesión. */
const PUBLIC_PATHS = ["/login", "/auth", "/demo"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Refresca la sesión de Supabase en cada petición y protege las rutas privadas.
 *
 * Tres cosas ocurren aquí y las tres importan:
 *
 * 1. Se refresca el token de acceso caducado.
 * 2. El token nuevo se pasa al Server Component (vía `request.cookies.set`) para
 *    que no intente refrescarlo otra vez.
 * 3. El token nuevo se pasa al navegador (vía `response.cookies.set`).
 *
 * Entre crear el cliente y llamar a `getClaims()` no debe ir ninguna otra
 * lógica: cualquier cosa en medio provoca cierres de sesión aleatorios que son
 * muy difíciles de diagnosticar después.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          // Cabeceras de caché que evitan que un CDN guarde una respuesta con
          // la sesión de alguien y se la sirva a otra persona.
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  // Quien entró por la demo puede recorrer toda la app sin sesión. Lo que ve
  // son los datos del usuario de demostración, y es el RLS —no esta línea— lo
  // que impide que escriba cualquier cosa.
  const isDemoVisitor = request.cookies.get("vifinance-demo")?.value === "1";

  if (!user && !isDemoVisitor && !isPublicPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.delete("next");
    return NextResponse.redirect(url);
  }

  // Se devuelve tal cual: crear una respuesta nueva aquí perdería las cookies
  // recién escritas y desincronizaría la sesión entre el navegador y el
  // servidor.
  return supabaseResponse;
}
