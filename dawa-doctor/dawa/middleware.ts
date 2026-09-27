import { NextResponse, type NextRequest } from "next/server";

function roleOf(req: NextRequest): string | null {
  const v = req.cookies.get("dawa_session")?.value;
  if (!v) return null;
  try {
    return JSON.parse(atob(v)).role ?? null;
  } catch {
    return null;
  }
}

export function middleware(req: NextRequest) {
  const role = roleOf(req);
  const path = req.nextUrl.pathname;
  const to = (p: string) => NextResponse.redirect(new URL(p, req.url));
  if (path === "/" || path === "/login") return role ? to(`/${role}`) : path === "/" ? to("/login") : NextResponse.next();
  if (path.startsWith("/doctor") && role !== "doctor") return to("/login");
  return NextResponse.next();
}

export const config = { matcher: ["/", "/login", "/doctor/:path*"] };
