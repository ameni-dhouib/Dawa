import "server-only";
import { db } from "./db";

// ---------------- types ----------------
export type Region = { id: number; name: string; weight: number };
export type Medicine = { id: number; name: string; atc_code: string; atc_class: string; controlled: number };
export type ModelRun = {
  id: number; started_at: string; finished_at: string | null; status: "running" | "succeeded" | "failed"; model: string;
  horizon: number; holdout: number; series_count: number | null; mean_wape: number | null; baseline_mean_wape: number | null;
  duration_s: number | null; error: string | null;
};
export type Status = "critical" | "low" | "ok";
export type SeriesPlan = {
  regionId: number; medicineId: number;
  stock: number; inTransit: number;
  demand: number;          // forecast for next month
  demandHorizon: number;   // forecast summed over the model horizon
  lower: number; upper: number;
  sigma: number; safety: number; target: number;
  coverDays: number; shortageDays: number; recommended: number; status: Status;
  seasonal: string; wape: number; baselineWape: number;
};
export type CentralPlan = {
  medicine: Medicine; onHand: number; usable: number; expiringSoon: number; nextExpiry: string | null;
  nationalDemand: number; coverMonths: number; regionalNeed: number; supplierOrder: number;
  status: "critical" | "reorder" | "healthy";
};

// ---------------- planning parameters ----------------
export const PLANNING = {
  leadTimeDays: 7,        // central pharmacy -> regional pharmacy
  serviceZ: 1.65,         // 95% cycle service level
  criticalDays: 15,       // regional cover below this is critical
  supplierTargetMonths: 3,// central pharmacy keeps this many months of national demand
  reorderMonths: 1.5,     // central reorder point, in months of national demand
  expiryWarnDays: 90,
};

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

// ---------------- reference data ----------------
export const regions = () => db().prepare("SELECT * FROM regions ORDER BY name").all() as Region[];
export const medicines = () => db().prepare("SELECT * FROM medicines ORDER BY name").all() as Medicine[];

export function latestRun(): ModelRun | undefined {
  return db().prepare("SELECT * FROM model_runs WHERE status = 'succeeded' ORDER BY id DESC LIMIT 1").get() as ModelRun | undefined;
}
export function lastAttempt(): ModelRun | undefined {
  return db().prepare("SELECT * FROM model_runs ORDER BY id DESC LIMIT 1").get() as ModelRun | undefined;
}
export function lastHistoryMonth(): string {
  return (db().prepare("SELECT MAX(month) m FROM sales_monthly").get() as { m: string }).m;
}

// ---------------- regional plans (forecast + live stock) ----------------
export function regionalPlans(): SeriesPlan[] {
  const run = latestRun();
  if (!run) return [];
  const rows = db().prepare(`
    WITH next AS (
      SELECT region_id, medicine_id, MIN(month) AS month FROM forecasts WHERE run_id = @run GROUP BY region_id, medicine_id
    ),
    horizon AS (
      SELECT region_id, medicine_id, SUM(predicted) AS total FROM forecasts WHERE run_id = @run GROUP BY region_id, medicine_id
    ),
    transit AS (
      SELECT region_id, medicine_id, SUM(quantity) AS qty FROM shipments WHERE status = 'in_transit' GROUP BY region_id, medicine_id
    )
    SELECT s.region_id AS regionId, s.medicine_id AS medicineId, s.quantity AS stock,
           COALESCE(t.qty, 0) AS inTransit,
           f.predicted AS demand, f.lower, f.upper, h.total AS demandHorizon,
           b.sigma, b.seasonal, b.wape, b.baseline_wape AS baselineWape
    FROM regional_stock s
    JOIN next n ON n.region_id = s.region_id AND n.medicine_id = s.medicine_id
    JOIN forecasts f ON f.run_id = @run AND f.region_id = s.region_id AND f.medicine_id = s.medicine_id AND f.month = n.month
    JOIN horizon h ON h.region_id = s.region_id AND h.medicine_id = s.medicine_id
    JOIN backtests b ON b.run_id = @run AND b.region_id = s.region_id AND b.medicine_id = s.medicine_id
    LEFT JOIN transit t ON t.region_id = s.region_id AND t.medicine_id = s.medicine_id
  `).all({ run: run.id }) as Array<Omit<SeriesPlan, "safety" | "target" | "coverDays" | "shortageDays" | "recommended" | "status">>;

  return rows.map((r) => {
    const daily = r.demand / 30;
    const safety = Math.ceil(PLANNING.serviceZ * r.sigma * Math.sqrt(PLANNING.leadTimeDays / 30));
    const target = Math.ceil(r.demand + safety);
    const position = r.stock + r.inTransit;
    const coverDays = daily > 0 ? position / daily : 999;
    const shortageDays = Math.max(0, Math.round(30 - coverDays));
    const recommended = Math.max(0, target - position);
    const status: Status = coverDays < PLANNING.criticalDays ? "critical" : coverDays < 30 ? "low" : "ok";
    return { ...r, demand: Math.round(r.demand), demandHorizon: Math.round(r.demandHorizon), safety, target, coverDays, shortageDays, recommended, status };
  });
}

// ---------------- central pharmacy ----------------
export function centralLots() {
  return db().prepare(`
    SELECT l.*, m.name AS medicine, m.atc_code
    FROM central_lots l JOIN medicines m ON m.id = l.medicine_id
    WHERE l.quantity > 0 ORDER BY l.expiry_date
  `).all() as Array<{ id: number; medicine_id: number; lot_number: string; quantity: number; expiry_date: string; received_at: string; medicine: string; atc_code: string }>;
}

export function centralPlans(plans: SeriesPlan[] = regionalPlans()): CentralPlan[] {
  const lots = centralLots();
  const t = today(), soon = addDays(PLANNING.expiryWarnDays);
  return medicines().map((m) => {
    const mine = lots.filter((l) => l.medicine_id === m.id);
    const usableLots = mine.filter((l) => l.expiry_date > t);
    const onHand = mine.reduce((s, l) => s + l.quantity, 0);
    const usable = usableLots.reduce((s, l) => s + l.quantity, 0);
    const expiringSoon = usableLots.filter((l) => l.expiry_date <= soon).reduce((s, l) => s + l.quantity, 0);
    const series = plans.filter((p) => p.medicineId === m.id);
    const nationalDemand = series.reduce((s, p) => s + p.demand, 0);
    const regionalNeed = series.reduce((s, p) => s + p.recommended, 0);
    const coverMonths = nationalDemand > 0 ? usable / nationalDemand : 99;
    const supplierOrder = Math.max(0, Math.ceil((PLANNING.supplierTargetMonths * nationalDemand - usable) / 10) * 10);
    const status = usable < regionalNeed || coverMonths < 0.5 ? "critical" : coverMonths < PLANNING.reorderMonths ? "reorder" : "healthy";
    return { medicine: m, onHand, usable, expiringSoon, nextExpiry: usableLots[0]?.expiry_date ?? null, nationalDemand, coverMonths, regionalNeed, supplierOrder, status };
  });
}

// ---------------- sales history ----------------
export function nationalMonthly() {
  return db().prepare(`
    SELECT medicine_id AS medicineId, month, SUM(units) AS units FROM sales_monthly GROUP BY medicine_id, month ORDER BY month
  `).all() as Array<{ medicineId: number; month: string; units: number }>;
}
export function regionalMonthlyTotals(months: number) {
  return db().prepare(`
    SELECT region_id AS regionId, medicine_id AS medicineId, SUM(units) AS units FROM sales_monthly
    WHERE month > (SELECT strftime('%Y-%m', date(MAX(month) || '-01', '-' || @m || ' months')) FROM sales_monthly)
    GROUP BY region_id, medicine_id
  `).all({ m: months }) as Array<{ regionId: number; medicineId: number; units: number }>;
}
export function seriesHistory(regionId: number, medicineId: number) {
  return db().prepare("SELECT month, units FROM sales_monthly WHERE region_id = ? AND medicine_id = ? ORDER BY month")
    .all(regionId, medicineId) as Array<{ month: string; units: number }>;
}
export function seriesForecast(runId: number, regionId: number, medicineId: number) {
  return db().prepare("SELECT month, predicted, lower, upper FROM forecasts WHERE run_id = ? AND region_id = ? AND medicine_id = ? ORDER BY month")
    .all(runId, regionId, medicineId) as Array<{ month: string; predicted: number; lower: number; upper: number }>;
}
export function seriesBacktest(runId: number, regionId: number, medicineId: number) {
  return db().prepare("SELECT month, actual, predicted FROM backtest_points WHERE run_id = ? AND region_id = ? AND medicine_id = ? ORDER BY month")
    .all(runId, regionId, medicineId) as Array<{ month: string; actual: number; predicted: number }>;
}
/** National forecast. Series errors are treated as independent, so the 95% half-widths
 *  combine as the square root of the sum of squares rather than a plain sum. */
export function nationalForecast(runId: number) {
  const rows = db().prepare(`
    SELECT month, SUM(predicted) AS predicted, SUM((upper - predicted) * (upper - predicted)) AS spread2
    FROM forecasts WHERE run_id = ? GROUP BY month ORDER BY month
  `).all(runId) as Array<{ month: string; predicted: number; spread2: number }>;
  return rows.map((r) => {
    const half = Math.sqrt(r.spread2);
    return { month: r.month, predicted: r.predicted, lower: Math.max(0, r.predicted - half), upper: r.predicted + half };
  });
}

// ---------------- shipments ----------------
export type ShipmentRow = {
  id: number; region_id: number; medicine_id: number; quantity: number; status: "in_transit" | "delivered";
  origin: "manual" | "forecast"; created_at: string; delivered_at: string | null; region: string; medicine: string;
};
export function shipments(): ShipmentRow[] {
  return db().prepare(`
    SELECT s.*, r.name AS region, m.name AS medicine FROM shipments s
    JOIN regions r ON r.id = s.region_id JOIN medicines m ON m.id = s.medicine_id
    ORDER BY s.status = 'delivered', s.created_at DESC
  `).all() as ShipmentRow[];
}

export class PlanningError extends Error {}

/** Sends stock from the central pharmacy, taking it from the lots that expire first. */
export function createShipments(items: Array<{ regionId: number; medicineId: number; quantity: number }>, origin: "manual" | "forecast") {
  const conn = db();
  const t = today();
  const run = conn.transaction(() => {
    const ids: number[] = [];
    for (const it of items) {
      const qty = Math.round(it.quantity);
      if (!(qty > 0)) throw new PlanningError("Quantity must be at least 1.");
      const lots = conn.prepare("SELECT id, quantity FROM central_lots WHERE medicine_id = ? AND quantity > 0 AND expiry_date > ? ORDER BY expiry_date")
        .all(it.medicineId, t) as Array<{ id: number; quantity: number }>;
      const available = lots.reduce((s, l) => s + l.quantity, 0);
      if (available < qty) {
        const name = (conn.prepare("SELECT name FROM medicines WHERE id = ?").get(it.medicineId) as { name: string } | undefined)?.name ?? "this medicine";
        throw new PlanningError(`The central pharmacy has ${available} usable units of ${name}; ${qty} requested.`);
      }
      let left = qty;
      for (const l of lots) {
        if (!left) break;
        const take = Math.min(left, l.quantity);
        conn.prepare("UPDATE central_lots SET quantity = quantity - ? WHERE id = ?").run(take, l.id);
        left -= take;
      }
      const res = conn.prepare("INSERT INTO shipments (region_id, medicine_id, quantity, status, origin, created_at) VALUES (?, ?, ?, 'in_transit', ?, ?)")
        .run(it.regionId, it.medicineId, qty, origin, new Date().toISOString());
      ids.push(Number(res.lastInsertRowid));
    }
    return ids;
  });
  return run();
}

export function deliverShipment(id: number) {
  const conn = db();
  return conn.transaction(() => {
    const s = conn.prepare("SELECT * FROM shipments WHERE id = ?").get(id) as ShipmentRow | undefined;
    if (!s) throw new PlanningError("Shipment not found.");
    if (s.status === "delivered") return s;
    conn.prepare("UPDATE shipments SET status = 'delivered', delivered_at = ? WHERE id = ?").run(new Date().toISOString(), id);
    conn.prepare("UPDATE regional_stock SET quantity = quantity + ?, updated_at = ? WHERE region_id = ? AND medicine_id = ?")
      .run(s.quantity, new Date().toISOString(), s.region_id, s.medicine_id);
    return { ...s, status: "delivered" as const };
  })();
}

export function receiveLot(input: { medicineId: number; lotNumber: string; quantity: number; expiryDate: string }) {
  const lot = input.lotNumber.trim().toUpperCase();
  if (!lot) throw new PlanningError("Enter the lot number printed on the delivery.");
  if (!(input.quantity > 0)) throw new PlanningError("Quantity must be at least 1.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.expiryDate) || input.expiryDate <= today()) throw new PlanningError("The expiry date must be in the future.");
  db().prepare(`
    INSERT INTO central_lots (medicine_id, lot_number, quantity, expiry_date, received_at) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (medicine_id, lot_number) DO UPDATE SET quantity = quantity + excluded.quantity
  `).run(input.medicineId, lot, Math.round(input.quantity), input.expiryDate, today());
}

export function backtestSummary(runId: number) {
  return db().prepare(`
    SELECT b.medicine_id AS medicineId, m.name, AVG(b.wape) AS wape, AVG(b.baseline_wape) AS baseline,
           SUM(b.wape < b.baseline_wape) AS beats, COUNT(*) AS n
    FROM backtests b JOIN medicines m ON m.id = b.medicine_id WHERE b.run_id = ? GROUP BY b.medicine_id ORDER BY m.name
  `).all(runId) as Array<{ medicineId: number; name: string; wape: number; baseline: number; beats: number; n: number }>;
}
export function formCounts(runId: number) {
  return db().prepare("SELECT seasonal, COUNT(*) AS n FROM backtests WHERE run_id = ? GROUP BY seasonal ORDER BY n DESC")
    .all(runId) as Array<{ seasonal: string; n: number }>;
}
