import { cookies } from "next/headers";

export type Session = { role: "admin"; name: string; email: string };

export const SESSION_COOKIE = "dawa_central_session";

export const DEMO_USERS: Array<Session & { password: string; subtitle: string }> = [
  { role: "admin", name: "Karim Jaziri", email: "admin@dawa.tn", password: "demo", subtitle: "Central pharmacy, supply planning" },
];

export function encodeSession(s: Session) {
  return Buffer.from(JSON.stringify(s)).toString("base64");
}

export function getSession(): Session | null {
  const v = cookies().get(SESSION_COOKIE)?.value;
  if (!v) return null;
  try {
    return JSON.parse(Buffer.from(v, "base64").toString()) as Session;
  } catch {
    return null;
  }
}
