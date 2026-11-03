import { createServerClient } from "@supabase/ssr";
import type { CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAdminEmail } from "@/lib/admin";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PUBLIC_ADMIN_PATHS = ["/admin/login", "/admin/sign-out", "/auth/callback"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
        },
      },
    },
  );

  // Refreshes the session cookie if needed — required for Server Components,
  // which can't write cookies themselves.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isGatedAdminPath = pathname.startsWith("/admin") && !PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p));

  if (isGatedAdminPath && (!user || !isAdminEmail(user.email))) {
    // The admin layout's own redirect()/denied-page checks race against the
    // page's own async rendering under Next's Cache Components/PPR
    // streaming — an unauthenticated request could get a 200 with the real
    // admin page data embedded in the RSC payload before that redirect took
    // effect (confirmed via curl against a production build: only a
    // JS-executing browser actually ended up redirected). The proxy runs
    // before any rendering starts, so the gate belongs here too.
    return NextResponse.redirect(new URL("/admin/login", request.url), 307);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
