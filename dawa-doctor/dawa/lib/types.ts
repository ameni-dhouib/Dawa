export type Patient = {
  name: string; idNumber: string; phone: string; street: string; localityId: string;
};
export type LineInput = { medicineId: string; dosage: string; quantity: number; durationDays: number };
export type LineResult = LineInput & {
  status: "available" | "dispatch";
  pharmacyId: string;
  distanceKm: number;
  source?: "central" | "supplier";
  etaAt?: string;
  etaHours?: number;
  transferId?: string;
  /** Every pharmacy holding enough boxes when the prescription was issued, nearest to the patient first. */
  options: Array<{ pharmacyId: string; distanceKm: number }>;
};
export type Prescription = {
  id: string; code: string; createdAt: string; doctorName: string; patient: Patient; notes: string; lines: LineResult[];
};
export type Transfer = {
  id: string;
  kind: "patient";
  medicineId: string;
  quantity: number;
  toPharmacyId: string;
  source: "central" | "supplier";
  createdAt: string;
  etaAt: string;
  status: "pending" | "delivered";
  prescriptionId?: string;
  prescriptionCode?: string;
};
export type Session = { role: "doctor"; name: string; email: string; regionId?: string };
