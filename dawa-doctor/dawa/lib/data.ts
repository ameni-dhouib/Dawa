// Reference data for the demo. Replace with a real database (e.g. Prisma + PostgreSQL) in production.

export type Region = { id: string; name: string; lat: number; lng: number; weight: number };
export type Locality = { id: string; name: string; regionId: string; lat: number; lng: number };
export type Pharmacy = {
  id: string; name: string; regionId: string; address: string; phone: string; hours: string; lat: number; lng: number;
};
export type Season = "winter" | "spring" | "flat";
export type Medicine = {
  id: string; name: string; strength: string; form: string; pack: string; category: string;
  season: Season; amp: number; base: number; chronic: boolean;
};

export const REGIONS: Region[] = [
  { id: "tunis", name: "Tunis", lat: 36.8065, lng: 10.1815, weight: 1.6 },
  { id: "sousse", name: "Sousse", lat: 35.8256, lng: 10.6084, weight: 1.0 },
  { id: "monastir", name: "Monastir", lat: 35.7643, lng: 10.8113, weight: 0.8 },
  { id: "mahdia", name: "Mahdia", lat: 35.5047, lng: 11.0622, weight: 0.6 },
  { id: "kairouan", name: "Kairouan", lat: 35.6781, lng: 10.0963, weight: 0.7 },
  { id: "sfax", name: "Sfax", lat: 34.7406, lng: 10.7603, weight: 1.1 },
];

export const CENTRAL = {
  id: "central",
  name: "Central pharmacy",
  address: "Distribution hub, Tunis",
  lat: 36.8065,
  lng: 10.1815,
};

export const LOCALITIES: Locality[] = [
  { id: "tunis-centre", name: "Tunis Centre", regionId: "tunis", lat: 36.7992, lng: 10.1802 },
  { id: "la-marsa", name: "La Marsa", regionId: "tunis", lat: 36.8782, lng: 10.3247 },
  { id: "ariana", name: "Ariana", regionId: "tunis", lat: 36.8625, lng: 10.1956 },
  { id: "le-bardo", name: "Le Bardo", regionId: "tunis", lat: 36.8092, lng: 10.1339 },
  { id: "sousse-medina", name: "Sousse Médina", regionId: "sousse", lat: 35.8278, lng: 10.64 },
  { id: "hammam-sousse", name: "Hammam Sousse", regionId: "sousse", lat: 35.8609, lng: 10.5936 },
  { id: "sahloul", name: "Sahloul", regionId: "sousse", lat: 35.835, lng: 10.59 },
  { id: "msaken", name: "Msaken", regionId: "sousse", lat: 35.7296, lng: 10.5808 },
  { id: "kalaa-kebira", name: "Kalâa Kebira", regionId: "sousse", lat: 35.8667, lng: 10.5333 },
  { id: "monastir-centre", name: "Monastir Centre", regionId: "monastir", lat: 35.778, lng: 10.8262 },
  { id: "skanes", name: "Skanes", regionId: "monastir", lat: 35.761, lng: 10.763 },
  { id: "ksar-hellal", name: "Ksar Hellal", regionId: "monastir", lat: 35.6429, lng: 10.8911 },
  { id: "moknine", name: "Moknine", regionId: "monastir", lat: 35.6333, lng: 10.9 },
  { id: "jemmal", name: "Jemmal", regionId: "monastir", lat: 35.623, lng: 10.7597 },
  { id: "mahdia-centre", name: "Mahdia Centre", regionId: "mahdia", lat: 35.5047, lng: 11.0622 },
  { id: "ksour-essef", name: "Ksour Essef", regionId: "mahdia", lat: 35.418, lng: 10.995 },
  { id: "el-jem", name: "El Jem", regionId: "mahdia", lat: 35.2967, lng: 10.7128 },
  { id: "kairouan-centre", name: "Kairouan Centre", regionId: "kairouan", lat: 35.6781, lng: 10.0963 },
  { id: "haffouz", name: "Haffouz", regionId: "kairouan", lat: 35.632, lng: 9.676 },
  { id: "sfax-centre", name: "Sfax Centre", regionId: "sfax", lat: 34.7406, lng: 10.7603 },
  { id: "sakiet-ezzit", name: "Sakiet Ezzit", regionId: "sfax", lat: 34.8, lng: 10.7667 },
  { id: "thyna", name: "Thyna", regionId: "sfax", lat: 34.67, lng: 10.7 },
];

export const PHARMACIES: Pharmacy[] = [
  { id: "ph-tun-1", name: "Pharmacie de la Kasbah", regionId: "tunis", address: "12 Rue de la Kasbah, Tunis", phone: "+216 71 560 112", hours: "8:00–20:00", lat: 36.799, lng: 10.17 },
  { id: "ph-tun-2", name: "Pharmacie El Menzah", regionId: "tunis", address: "Av. Habib Bourguiba, El Menzah 6", phone: "+216 71 238 540", hours: "8:00–22:00", lat: 36.84, lng: 10.18 },
  { id: "ph-tun-3", name: "Pharmacie La Marsa Plage", regionId: "tunis", address: "3 Rue du Saf-Saf, La Marsa", phone: "+216 71 774 019", hours: "8:30–20:30", lat: 36.879, lng: 10.323 },
  { id: "ph-sou-1", name: "Pharmacie Bab Bhar", regionId: "sousse", address: "Place Farhat Hached, Sousse", phone: "+216 73 225 330", hours: "8:00–20:00", lat: 35.8285, lng: 10.638 },
  { id: "ph-sou-2", name: "Pharmacie Sahloul", regionId: "sousse", address: "Route de la Ceinture, Sahloul", phone: "+216 73 369 812", hours: "24 hours", lat: 35.836, lng: 10.592 },
  { id: "ph-sou-3", name: "Pharmacie Hammam Sousse", regionId: "sousse", address: "Av. de la République, Hammam Sousse", phone: "+216 73 362 045", hours: "8:00–21:00", lat: 35.86, lng: 10.595 },
  { id: "ph-sou-4", name: "Pharmacie Msaken Centre", regionId: "sousse", address: "Rue du Marché, Msaken", phone: "+216 73 259 776", hours: "8:00–19:30", lat: 35.73, lng: 10.58 },
  { id: "ph-mon-1", name: "Pharmacie Bourguiba", regionId: "monastir", address: "Av. Habib Bourguiba, Monastir", phone: "+216 73 461 208", hours: "8:00–20:00", lat: 35.777, lng: 10.825 },
  { id: "ph-mon-2", name: "Pharmacie Skanes", regionId: "monastir", address: "Route de l'Aéroport, Skanes", phone: "+216 73 520 933", hours: "8:00–22:00", lat: 35.76, lng: 10.765 },
  { id: "ph-mon-3", name: "Pharmacie Ksar Hellal", regionId: "monastir", address: "Rue de Tunis, Ksar Hellal", phone: "+216 73 475 610", hours: "8:00–19:30", lat: 35.643, lng: 10.89 },
  { id: "ph-mon-4", name: "Pharmacie Moknine", regionId: "monastir", address: "Av. de l'Environnement, Moknine", phone: "+216 73 430 287", hours: "8:00–20:00", lat: 35.634, lng: 10.901 },
  { id: "ph-mah-1", name: "Pharmacie de la Corniche", regionId: "mahdia", address: "Route de la Corniche, Mahdia", phone: "+216 73 681 455", hours: "8:00–20:00", lat: 35.505, lng: 11.06 },
  { id: "ph-mah-2", name: "Pharmacie El Jem", regionId: "mahdia", address: "Av. de l'Amphithéâtre, El Jem", phone: "+216 73 630 118", hours: "8:00–19:00", lat: 35.297, lng: 10.713 },
  { id: "ph-kai-1", name: "Pharmacie de la Médina", regionId: "kairouan", address: "Bab Tunis, Kairouan", phone: "+216 77 231 964", hours: "8:00–20:00", lat: 35.678, lng: 10.1 },
  { id: "ph-kai-2", name: "Pharmacie Haffouz", regionId: "kairouan", address: "Centre ville, Haffouz", phone: "+216 77 280 303", hours: "8:00–18:30", lat: 35.632, lng: 9.677 },
  { id: "ph-sfa-1", name: "Pharmacie Bab Diwan", regionId: "sfax", address: "Bab Diwan, Sfax", phone: "+216 74 221 487", hours: "8:00–21:00", lat: 34.738, lng: 10.76 },
  { id: "ph-sfa-2", name: "Pharmacie Sakiet Ezzit", regionId: "sfax", address: "Route de Tunis km 7, Sakiet Ezzit", phone: "+216 74 862 350", hours: "8:00–20:00", lat: 34.801, lng: 10.766 },
  { id: "ph-sfa-3", name: "Pharmacie Thyna", regionId: "sfax", address: "Route de Gabès, Thyna", phone: "+216 74 680 921", hours: "8:00–20:00", lat: 34.671, lng: 10.701 },
];

export const MEDICINES: Medicine[] = [
  { id: "m01", name: "Paracetamol", strength: "1 g", form: "Tablet", pack: "Box of 8", category: "Pain & fever", season: "winter", amp: 0.15, base: 2400, chronic: false },
  { id: "m04", name: "Ibuprofen", strength: "400 mg", form: "Tablet", pack: "Box of 20", category: "Pain & fever", season: "flat", amp: 0.05, base: 1100, chronic: false },
  { id: "m02", name: "Amoxicillin", strength: "1 g", form: "Tablet", pack: "Box of 14", category: "Anti-infectives", season: "winter", amp: 0.35, base: 900, chronic: false },
  { id: "m03", name: "Amoxicillin + clavulanic acid", strength: "1 g / 125 mg", form: "Tablet", pack: "Box of 12", category: "Anti-infectives", season: "winter", amp: 0.35, base: 700, chronic: false },
  { id: "m14", name: "Azithromycin", strength: "500 mg", form: "Tablet", pack: "Box of 3", category: "Anti-infectives", season: "winter", amp: 0.4, base: 450, chronic: false },
  { id: "m18", name: "Oseltamivir", strength: "75 mg", form: "Capsule", pack: "Box of 10", category: "Anti-infectives", season: "winter", amp: 0.85, base: 120, chronic: false },
  { id: "m05", name: "Metformin", strength: "850 mg", form: "Tablet", pack: "Box of 30", category: "Diabetes", season: "flat", amp: 0.03, base: 1300, chronic: true },
  { id: "m06", name: "Insulin glargine", strength: "100 IU/mL", form: "Pre-filled pen", pack: "Box of 5 pens", category: "Diabetes", season: "flat", amp: 0.03, base: 260, chronic: true },
  { id: "m07", name: "Amlodipine", strength: "5 mg", form: "Tablet", pack: "Box of 30", category: "Heart & blood", season: "flat", amp: 0.04, base: 950, chronic: true },
  { id: "m08", name: "Atorvastatin", strength: "20 mg", form: "Tablet", pack: "Box of 30", category: "Heart & blood", season: "flat", amp: 0.04, base: 800, chronic: true },
  { id: "m17", name: "Clopidogrel", strength: "75 mg", form: "Tablet", pack: "Box of 30", category: "Heart & blood", season: "flat", amp: 0.04, base: 430, chronic: true },
  { id: "m13", name: "Enoxaparin", strength: "4000 IU", form: "Injection", pack: "Box of 6 syringes", category: "Heart & blood", season: "flat", amp: 0.06, base: 190, chronic: false },
  { id: "m10", name: "Salbutamol", strength: "100 µg/dose", form: "Inhaler", pack: "1 inhaler", category: "Respiratory & allergy", season: "winter", amp: 0.3, base: 380, chronic: true },
  { id: "m11", name: "Budesonide + formoterol", strength: "200/6 µg", form: "Inhaler", pack: "1 inhaler", category: "Respiratory & allergy", season: "winter", amp: 0.2, base: 210, chronic: true },
  { id: "m15", name: "Cetirizine", strength: "10 mg", form: "Tablet", pack: "Box of 15", category: "Respiratory & allergy", season: "spring", amp: 0.45, base: 600, chronic: false },
  { id: "m09", name: "Omeprazole", strength: "20 mg", form: "Capsule", pack: "Box of 14", category: "Digestive", season: "flat", amp: 0.05, base: 1000, chronic: false },
  { id: "m12", name: "Levothyroxine", strength: "50 µg", form: "Tablet", pack: "Box of 30", category: "Hormones & vitamins", season: "flat", amp: 0.02, base: 520, chronic: true },
  { id: "m16", name: "Cholecalciferol (vitamin D3)", strength: "100 000 IU", form: "Oral ampoule", pack: "1 ampoule", category: "Hormones & vitamins", season: "winter", amp: 0.25, base: 420, chronic: false },
];

export const medById = (id: string) => MEDICINES.find((m) => m.id === id);
export const pharmacyById = (id: string) => PHARMACIES.find((p) => p.id === id);
export const regionById = (id: string) => REGIONS.find((r) => r.id === id);
export const localityById = (id: string) => LOCALITIES.find((l) => l.id === id);
export const medLabel = (m: Medicine) => `${m.name} ${m.strength}`;

// ---------- deterministic synthetic data ----------

export function rng(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(s: string) {
  let h = 2166136261;
  for (const c of s) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Medicines deliberately absent from some regions so the central dispatch flow is visible in the demo.
const SCARCE: Record<string, string[]> = {
  m06: ["monastir", "mahdia", "kairouan"],
  m13: ["monastir", "mahdia"],
  m18: ["monastir", "sousse", "mahdia", "kairouan"],
  m11: ["kairouan", "mahdia"],
};

export function generateInitialStock() {
  const stock: Record<string, Record<string, number>> = {};
  for (const p of PHARMACIES) {
    stock[p.id] = {};
    const region = regionById(p.regionId)!;
    const nInRegion = PHARMACIES.filter((x) => x.regionId === p.regionId).length;
    const rand = rng(hash("stock" + p.id));
    for (const m of MEDICINES) {
      const perPharmacy = (m.base * region.weight) / nInRegion;
      let qty = Math.round(perPharmacy * (0.35 + 1.1 * rand()));
      if (SCARCE[m.id]?.includes(p.regionId)) qty = 0;
      else if (rand() < 0.06) qty = 0;
      stock[p.id][m.id] = qty;
    }
  }
  const central: Record<string, number> = {};
  for (const m of MEDICINES) central[m.id] = m.id === "m18" ? 0 : Math.round(m.base * 5);
  return { stock, central };
}
