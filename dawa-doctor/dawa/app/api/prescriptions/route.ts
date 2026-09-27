import { NextResponse } from "next/server";
import { db, createPrescription } from "@/lib/store";
import { getSession } from "@/lib/session";
import { localityById, medById } from "@/lib/data";
import type { LineInput, Patient } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!getSession()) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  return NextResponse.json(db().prescriptions);
}

export async function POST(req: Request) {
  const session = getSession();
  if (session?.role !== "doctor") return NextResponse.json({ error: "Only doctors can issue prescriptions." }, { status: 403 });
  const body = await req.json();
  const patient = body.patient as Patient;
  const lines = (body.lines as LineInput[]) ?? [];

  if (!patient?.name?.trim()) return NextResponse.json({ error: "Add the patient's full name." }, { status: 400 });
  if (!/^\d{8}$/.test(String(patient.idNumber ?? "").trim())) return NextResponse.json({ error: "The CIN must be 8 digits." }, { status: 400 });
  if (!localityById(patient.localityId)) return NextResponse.json({ error: "Choose the patient's town so we can find the nearest pharmacy." }, { status: 400 });
  const clean = lines
    .filter((l) => medById(l.medicineId))
    .map((l) => ({ ...l, quantity: Math.max(1, Math.min(20, Math.round(Number(l.quantity) || 1))), durationDays: Math.max(1, Math.round(Number(l.durationDays) || 1)) }));
  if (!clean.length) return NextResponse.json({ error: "Add at least one medicine." }, { status: 400 });

  const p = createPrescription({ doctorName: session.name, patient, notes: String(body.notes ?? ""), lines: clean });
  return NextResponse.json({ id: p.id, code: p.code }, { status: 201 });
}
