import { NextResponse } from "next/server";
import { DEMO_USERS, SESSION_COOKIE, encodeSession } from "@/lib/session";

export async function POST(req: Request) {
  const { email, password } = await req.json();
  const user = DEMO_USERS.find((u) => u.email === String(email).trim().toLowerCase() && u.password === password);
  if (!user) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
  const res = NextResponse.json({ role: user.role });
  res.cookies.set(SESSION_COOKIE, encodeSession({ role: user.role, name: user.name, email: user.email, regionId: user.regionId }), {
    httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
  });
  return res;
}
