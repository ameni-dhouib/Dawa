import { cookies } from "next/headers";
import type { Session } from "./types";

export const SESSION_COOKIE = "dawa_session";

export const DEMO_USERS: Array<Session & { password: string; subtitle: string }> = [
  { role: "doctor", name: "Dr. Amira Ben Salah", email: "doctor@dawa.tn", regionId: "monastir", password: "demo", subtitle: "General practitioner, Monastir" },
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
