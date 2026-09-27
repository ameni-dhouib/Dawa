import { CENTRAL, PHARMACIES, localityById } from "./data";
import { distanceKm } from "./geo";
import type { LineInput, LineResult } from "./types";

const ROAD_FACTOR = 1.25; // straight line -> road distance
const TRUCK_KMH = 70;
const PREP_HOURS = 4; // picking and packing at the central pharmacy
const HANDOVER_HOURS = 1; // unloading at the regional pharmacy
const SUPPLIER_HOURS = 72; // central pharmacy is out of stock and must order from the supplier
const CUTOFF_HOUR = 16; // orders after 16:00 are prepared the next morning at 08:00

const TZ_OFFSET_H = 1; // Tunisia is UTC+1 all year

export function estimateArrival(distKm: number, source: "central" | "supplier", now = new Date()) {
  const H = 3600000;
  const local = new Date(now.getTime() + TZ_OFFSET_H * H);
  const hour = local.getUTCHours();
  let start = now;
  if (hour >= CUTOFF_HOUR || hour < 8) {
    const d = new Date(local);
    if (hour >= CUTOFF_HOUR) d.setUTCDate(d.getUTCDate() + 1);
    d.setUTCHours(8, 0, 0, 0);
    start = new Date(d.getTime() - TZ_OFFSET_H * H);
  }
  const hours = PREP_HOURS + (distKm * ROAD_FACTOR) / TRUCK_KMH + HANDOVER_HOURS + (source === "supplier" ? SUPPLIER_HOURS : 0);
  const eta = new Date(start.getTime() + hours * H);
  eta.setMinutes(eta.getMinutes() < 30 ? 30 : 60, 0, 0);
  const etaHours = Math.max(1, Math.ceil((eta.getTime() - now.getTime()) / H));
  return { etaAt: eta.toISOString(), etaHours };
}

/** Decide where each medicine will be collected. Pure function: does not mutate stock. */
export function allocateLine(
  line: LineInput,
  localityId: string,
  stock: Record<string, Record<string, number>>,
  central: Record<string, number>,
  now = new Date()
): LineResult {
  const loc = localityById(localityId);
  if (!loc) throw new Error("Unknown locality");
  const regional = PHARMACIES.filter((p) => p.regionId === loc.regionId)
    .map((p) => ({ p, d: distanceKm(loc, p) }))
    .sort((a, b) => a.d - b.d);

  const options = PHARMACIES.filter((p) => (stock[p.id]?.[line.medicineId] ?? 0) >= line.quantity)
    .map((p) => ({ pharmacyId: p.id, distanceKm: Math.round(distanceKm(loc, p) * 10) / 10 }))
    .sort((a, b) => a.distanceKm - b.distanceKm);

  const withStock = regional.find(({ p }) => (stock[p.id]?.[line.medicineId] ?? 0) >= line.quantity);
  if (withStock) {
    return { ...line, status: "available", pharmacyId: withStock.p.id, distanceKm: withStock.d, options };
  }
  // Not available in the region: ship from the central pharmacy to the pharmacy nearest the patient.
  const pickup = regional[0];
  const source = (central[line.medicineId] ?? 0) >= line.quantity ? "central" : "supplier";
  const { etaAt, etaHours } = estimateArrival(distanceKm(CENTRAL, pickup.p), source, now);
  return { ...line, status: "dispatch", pharmacyId: pickup.p.id, distanceKm: pickup.d, source, etaAt, etaHours, options };
}
