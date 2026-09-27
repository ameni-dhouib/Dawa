import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { PlanningError } from "./service";

export function requireAdmin() {
  return getSession()?.role === "admin" ? null : NextResponse.json({ error: "Only the central pharmacy can do this." }, { status: 403 });
}

export function handle(fn: () => unknown) {
  const denied = requireAdmin();
  if (denied) return denied;
  try {
    return NextResponse.json(fn() ?? { ok: true });
  } catch (e) {
    if (e instanceof PlanningError) return NextResponse.json({ error: e.message }, { status: 400 });
    console.error(e);
    return NextResponse.json({ error: "Something went wrong while saving. Check the server log." }, { status: 500 });
  }
}
