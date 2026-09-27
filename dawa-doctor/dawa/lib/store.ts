// In-memory store kept on globalThis so it survives hot reloads in dev.
// Swap this module for database calls to persist data.
import { generateInitialStock } from "./data";
import { allocateLine } from "./allocation";
import type { LineInput, Patient, Prescription, Transfer } from "./types";

type DB = {
  stock: Record<string, Record<string, number>>;
  central: Record<string, number>;
  prescriptions: Prescription[];
  transfers: Transfer[];
  seq: number;
};

const g = globalThis as unknown as { __dawa?: DB };

export function db(): DB {
  if (!g.__dawa) {
    const { stock, central } = generateInitialStock();
    g.__dawa = { stock, central, prescriptions: [], transfers: [], seq: 1040 };
    seed(g.__dawa);
  }
  return g.__dawa;
}

const uid = () => Math.random().toString(36).slice(2, 10);

export function createPrescription(
  input: { doctorName: string; patient: Patient; notes: string; lines: LineInput[] },
  store: DB = db(),
  now = new Date()
): Prescription {
  const id = uid();
  store.seq += 1;
  const code = `RX-${now.getFullYear()}-${String(store.seq).padStart(6, "0")}`;
  const lines = input.lines.map((line) => {
    const res = allocateLine(line, input.patient.localityId, store.stock, store.central, now);
    if (res.status === "dispatch") {
      if (res.source === "central") store.central[line.medicineId] -= line.quantity;
      const t: Transfer = {
        id: uid(), kind: "patient", medicineId: line.medicineId, quantity: line.quantity, toPharmacyId: res.pharmacyId,
        source: res.source!, createdAt: now.toISOString(), etaAt: res.etaAt!, status: "pending",
        prescriptionId: id, prescriptionCode: code,
      };
      store.transfers.unshift(t);
      res.transferId = t.id;
    }
    return res;
  });
  const p: Prescription = { id, code, createdAt: now.toISOString(), doctorName: input.doctorName, patient: input.patient, notes: input.notes, lines };
  store.prescriptions.unshift(p);
  return p;
}

function seed(store: DB) {
  const h = 3600000;
  const base = Date.now();
  const demo: Array<{ at: number; patient: Patient; lines: LineInput[]; notes: string }> = [
    {
      at: base - 26 * h,
      patient: { name: "Sami Trabelsi", idNumber: "08412967", phone: "+216 22 418 903", street: "14 Rue Ibn Khaldoun", localityId: "ksar-hellal" },
      lines: [
        { medicineId: "m05", dosage: "1 tablet twice a day with meals", quantity: 2, durationDays: 60 },
        { medicineId: "m06", dosage: "18 IU at bedtime", quantity: 1, durationDays: 30 },
        { medicineId: "m08", dosage: "1 tablet in the evening", quantity: 2, durationDays: 60 },
      ],
      notes: "Check fasting glucose in 4 weeks.",
    },
    {
      at: base - 5 * h,
      patient: { name: "Ines Gharbi", idNumber: "11873045", phone: "+216 55 902 117", street: "Résidence Les Pins, Bloc B", localityId: "sahloul" },
      lines: [
        { medicineId: "m03", dosage: "1 tablet twice a day", quantity: 1, durationDays: 7 },
        { medicineId: "m01", dosage: "1 tablet up to 3 times a day if fever", quantity: 1, durationDays: 5 },
      ],
      notes: "",
    },
    {
      at: base - 2 * h,
      patient: { name: "Hedi Mansour", idNumber: "05230788", phone: "+216 98 330 452", street: "7 Avenue de la Liberté", localityId: "monastir-centre" },
      lines: [
        { medicineId: "m13", dosage: "1 injection daily", quantity: 2, durationDays: 10 },
        { medicineId: "m18", dosage: "1 capsule twice a day", quantity: 1, durationDays: 5 },
        { medicineId: "m07", dosage: "1 tablet in the morning", quantity: 1, durationDays: 30 },
      ],
      notes: "Post-operative, reduced mobility. Family member will collect.",
    },
  ];
  for (const d of demo) {
    createPrescription({ doctorName: "Dr. Amira Ben Salah", patient: d.patient, notes: d.notes, lines: d.lines }, store, new Date(d.at));
  }
}
