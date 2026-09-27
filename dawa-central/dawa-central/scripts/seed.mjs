// Builds data/dawa.db from the CSV files in /data.
//   node scripts/seed.mjs
// Then train the model:  python ml/forecast.py
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DB_PATH = process.env.DAWA_DB ?? path.join(ROOT, "data", "dawa.db");

// The real sales history runs 2014-2019. We move it forward 7 years so it reads as
// recent history (2021-2026) and keep full months up to LAST_MONTH.
const YEAR_SHIFT = 7;
const LAST_MONTH = "2026-08";

const REGION_WEIGHTS = {
  Tunis: 0.235, Sfax: 0.082, Sousse: 0.06, Ariana: 0.05, Nabeul: 0.068,
  Bizerte: 0.049, "Gabès": 0.032, Kairouan: 0.049, Monastir: 0.047, "Médenine": 0.043,
};
const MEDICINES = [
  { atc: "M01AB", name: "Diclofenac", cls: "Anti-inflammatory, acetic acid derivatives", controlled: 0 },
  { atc: "M01AE", name: "Ibuprofen", cls: "Anti-inflammatory, propionic acid derivatives", controlled: 0 },
  { atc: "N02BA", name: "Aspirin", cls: "Analgesic, salicylic acid derivatives", controlled: 0 },
  { atc: "N02BE", name: "Paracetamol", cls: "Analgesic, anilides", controlled: 0 },
  { atc: "N05B", name: "Diazepam", cls: "Anxiolytic", controlled: 1 },
  { atc: "N05C", name: "Zolpidem", cls: "Hypnotic and sedative", controlled: 1 },
  { atc: "R03", name: "Salbutamol", cls: "Obstructive airway disease", controlled: 0 },
  { atc: "R06", name: "Cetirizine", cls: "Antihistamine for systemic use", controlled: 0 },
];
// Central pharmacy on-hand, in months of national demand (mock). Varied on purpose so the
// dashboard shows healthy, reorder and critical states.
const CENTRAL_COVER = { Paracetamol: 2.4, Diclofenac: 1.7, Ibuprofen: 0.9, Aspirin: 2.1, Diazepam: 2.8, Zolpidem: 3.2, Salbutamol: 0.45, Cetirizine: 1.3 };

// ---------- deterministic randomness (stable across machines and runs) ----------
function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function normal(r) { const u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

function readCsv(file) {
  const [head, ...rows] = fs.readFileSync(path.join(ROOT, "data", file), "utf8").replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  const cols = head.split(",");
  return rows.map((line) => Object.fromEntries(line.split(",").map((v, i) => [cols[i], v])));
}
const iso = (d) => d.toISOString().slice(0, 10);
const addMonths = (d, n) => { const x = new Date(d); x.setUTCMonth(x.getUTCMonth() + n); return x; };

// ---------- build ----------
for (const f of [DB_PATH, `${DB_PATH}-wal`, `${DB_PATH}-shm`]) fs.rmSync(f, { force: true });
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.exec(fs.readFileSync(path.join(ROOT, "db", "schema.sql"), "utf8"));

const now = new Date();
const nowIso = now.toISOString();

db.transaction(() => {
  const total = Object.values(REGION_WEIGHTS).reduce((a, b) => a + b, 0);
  const insRegion = db.prepare("INSERT INTO regions (name, weight) VALUES (?, ?)");
  for (const [name, w] of Object.entries(REGION_WEIGHTS)) insRegion.run(name, w / total);
  const insMed = db.prepare("INSERT INTO medicines (name, atc_code, atc_class, controlled) VALUES (?, ?, ?, ?)");
  for (const m of MEDICINES) insMed.run(m.name, m.atc, m.cls, m.controlled);
})();

const regions = db.prepare("SELECT * FROM regions").all();
const meds = db.prepare("SELECT * FROM medicines").all();
const medByAtc = Object.fromEntries(meds.map((m) => [m.atc_code, m]));
const medByName = Object.fromEntries(meds.map((m) => [m.name, m]));
const regionByName = Object.fromEntries(regions.map((r) => [r.name, r]));

// Weekly national sales
const weekly = readCsv("salesweekly.csv").map((row) => {
  const [mo, da, yr] = row.datum.split("/").map(Number);
  const d = new Date(Date.UTC(yr + YEAR_SHIFT, mo - 1, Math.min(da, mo === 2 ? 28 : 31)));
  return { week: iso(d), row };
}).filter((w) => w.week.slice(0, 7) <= LAST_MONTH);

const monthly = {}; // atc -> month -> units
db.transaction(() => {
  const ins = db.prepare("INSERT INTO sales_weekly (week, medicine_id, units) VALUES (?, ?, ?)");
  for (const { week, row } of weekly) {
    for (const atc of Object.keys(medByAtc)) {
      const u = Number(row[atc]);
      ins.run(week, medByAtc[atc].id, u);
      const m = week.slice(0, 7);
      (monthly[atc] ??= {})[m] = (monthly[atc][m] ?? 0) + u;
    }
  }
})();
const months = Object.keys(monthly.N02BE).sort().slice(1); // first month is partial, as in the notebook

// Regional monthly history: national shape x population weight x regional mix x noise (notebook step 3)
db.transaction(() => {
  const ins = db.prepare("INSERT INTO sales_monthly (region_id, medicine_id, month, units) VALUES (?, ?, ?, ?)");
  for (const r of regions) {
    const regionFactor = 0.85 + 0.3 * rng(hash(r.name))();
    for (const m of meds) {
      const rr = rng(hash(`${r.name}|${m.name}`));
      for (const month of months) {
        const v = monthly[m.atc_code][month] * r.weight * regionFactor * (1 + 0.03 * normal(rr));
        ins.run(r.id, m.id, month, Math.max(0, Math.round(v)));
      }
    }
  }
})();

// Current regional stock from RegionalStock.csv (Status column is recomputed by the app)
db.transaction(() => {
  const ins = db.prepare("INSERT INTO regional_stock (region_id, medicine_id, quantity, updated_at) VALUES (?, ?, ?, ?)");
  for (const row of readCsv("RegionalStock.csv")) {
    const r = regionByName[row.Region.normalize("NFC")], m = medByName[row.Medicine];
    if (!r || !m) throw new Error(`Unknown region or medicine in RegionalStock.csv: ${row.Region} / ${row.Medicine}`);
    ins.run(r.id, m.id, Number(row.Stock), nowIso);
  }
})();

// Central pharmacy lots (mock)
db.transaction(() => {
  const ins = db.prepare("INSERT INTO central_lots (medicine_id, lot_number, quantity, expiry_date, received_at) VALUES (?, ?, ?, ?, ?)");
  const recent = months.slice(-3);
  for (const m of meds) {
    const r = rng(hash(`central|${m.name}`));
    const nationalMonthly = recent.reduce((s, mo) => s + db.prepare("SELECT SUM(units) s FROM sales_monthly WHERE medicine_id = ? AND month = ?").get(m.id, mo).s, 0) / 3;
    let remaining = Math.round(nationalMonthly * CENTRAL_COVER[m.name]);
    const lots = 2 + Math.floor(r() * 2);
    for (let i = 0; i < lots && remaining > 0; i++) {
      const qty = i === lots - 1 ? remaining : Math.round(remaining * (0.3 + 0.3 * r()));
      remaining -= qty;
      // one lot of two medicines expires within 60 days, to exercise the expiry alerts
      const expMonths = i === 0 && (m.name === "Ibuprofen" || m.name === "Cetirizine") ? 1.5 : 4 + Math.floor(r() * 20);
      const expiry = iso(new Date(now.getTime() + expMonths * 30 * 86400000));
      const received = iso(addMonths(now, -(1 + Math.floor(r() * 8))));
      ins.run(m.id, `${m.atc_code}-${String(24 + i)}${String(Math.floor(r() * 900) + 100)}`, qty, expiry, received);
    }
  }
})();

// A few shipments so the shipments page has history (central lots above are net of these)
db.transaction(() => {
  const ins = db.prepare("INSERT INTO shipments (region_id, medicine_id, quantity, status, origin, created_at, delivered_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const h = 3600000;
  const s = (reg, med, q, status, origin, agoH, delivAgoH) =>
    ins.run(regionByName[reg].id, medByName[med].id, q, status, origin, new Date(now - agoH * h).toISOString(), delivAgoH == null ? null : new Date(now - delivAgoH * h).toISOString());
  s("Tunis", "Paracetamol", 120, "delivered", "forecast", 190, 150);
  s("Sfax", "Diazepam", 20, "delivered", "manual", 120, 96);
  s("Monastir", "Salbutamol", 15, "in_transit", "forecast", 20);
  s("Kairouan", "Paracetamol", 30, "in_transit", "manual", 6);
})();

const count = (t) => db.prepare(`SELECT COUNT(*) c FROM ${t}`).get().c;
console.log(`Database ready at ${path.relative(ROOT, DB_PATH)}`);
console.log(`  ${count("regions")} regions, ${count("medicines")} medicines`);
console.log(`  ${count("sales_weekly")} weekly national rows, ${count("sales_monthly")} monthly regional rows (${months[0]} to ${months.at(-1)})`);
console.log(`  ${count("regional_stock")} regional stock rows, ${count("central_lots")} central lots, ${count("shipments")} shipments`);
console.log("Next: train the model with  python ml/forecast.py");
db.close();
