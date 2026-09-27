import { CENTRAL, MEDICINES, PHARMACIES, regionById, type Medicine } from "./data";
import { distanceKm } from "./geo";
import { estimateArrival } from "./allocation";
import { db } from "./store";

export type CatalogItem = Medicine & {
  /** pharmacies in the doctor's region with at least one box */
  pharmacies: number;
  /** most boxes held by a single pharmacy in the region */
  maxQty: number;
  /** when a delivery from the central pharmacy would reach the region if ordered now */
  eta: { hours: number; at: string; source: "central" | "supplier" };
};

export function catalogFor(regionId: string): CatalogItem[] {
  const { stock, central } = db();
  const region = regionById(regionId)!;
  const regional = PHARMACIES.filter((p) => p.regionId === regionId);
  const hub = regional.sort((a, b) => distanceKm(region, a) - distanceKm(region, b))[0];
  const dist = distanceKm(CENTRAL, hub);
  return MEDICINES.map((m) => {
    const qtys = regional.map((p) => stock[p.id][m.id] ?? 0);
    const source = (central[m.id] ?? 0) > 0 ? "central" : "supplier";
    const { etaAt, etaHours } = estimateArrival(dist, source);
    return { ...m, pharmacies: qtys.filter((q) => q > 0).length, maxQty: Math.max(0, ...qtys), eta: { hours: etaHours, at: etaAt, source } };
  });
}
