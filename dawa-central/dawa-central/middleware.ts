import { NextResponse, type NextRequest } from "next/server";

function signedIn(req: NextRequest) {
  const v = req.cookies.get("dawa_central_session")?.value;
  if (!v) return false;
  try { return JSON.parse(atob(v)).role === "admin"; } catch { return false; }
}

export function middleware(req: NextRequest) {
  const ok = signedIn(req);
  const path = req.nextUrl.pathname;
  const to = (p: string) => NextResponse.redirect(new URL(p, req.url));
  if (path === "/" || path === "/login") return ok ? to("/admin") : path === "/" ? to("/login") : NextResponse.next();
  if (path.startsWith("/admin") && !ok) return to("/login");
  return NextResponse.next();
}

export const config = { matcher: ["/", "/login", "/admin/:path*"] };
