import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/central/guard";
import { runForecastModel } from "@/lib/central/runner";

export const dynamic = "force-dynamic";
export const maxDuration = 180;

export async function POST() {
  const denied = requireAdmin();
  if (denied) return denied;
  const res = await runForecastModel();
  return res.ok ? NextResponse.json(res.summary) : NextResponse.json({ error: res.error }, { status: 500 });
}
