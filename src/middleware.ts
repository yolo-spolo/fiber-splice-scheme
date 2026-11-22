import { NextResponse, type NextRequest } from "next/server";
import { authSecretConfigured, isValidSession, SESSION_COOKIE } from "@/lib/auth";

// /api/auth/* — вход, мастер и выход: доступны до появления сессии.
const PUBLIC_PREFIXES = ["/login", "/setup", "/s/", "/api/auth/"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Do not silently issue sessions with a development-only secret. That makes
  // the login appear successful but every following request rejects the cookie.
  if (!authSecretConfigured()) {
    return new NextResponse(
      "AUTH_SECRET is not configured. Set the same secret for the app and middleware, then restart the server.",
      { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const ok = await isValidSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
