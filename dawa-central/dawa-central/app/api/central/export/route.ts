import { requireAdmin } from "@/lib/central/guard";
import { medicines, regionalPlans, regions } from "@/lib/central/service";

export const dynamic = "force-dynamic";

// Same columns as the notebook's DemandPrediction.csv, from the latest model run and live stock.
export async function GET() {
  const denied = requireAdmin();
  if (denied) return denied;
  const r = Object.fromEntries(regions().map((x) => [x.id, x.name]));
  const m = Object.fromEntries(medicines().map((x) => [x.id, x.name]));
  const esc = (v: string | number) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
  const lines = [["Region", "Medicine", "Current_Stock", "In_Transit", "Predicted_Demand", "Safety_Stock", "Expected_Shortage_Days", "Recommended_Units", "Recommendation"].join(",")];
  for (const p of regionalPlans().sort((a, b) => r[a.regionId].localeCompare(r[b.regionId]) || m[a.medicineId].localeCompare(m[b.medicineId]))) {
    const rec = p.recommended > 0 ? `Send ${p.recommended} units from the central pharmacy.` : "No action needed - stock covers predicted demand.";
    lines.push([r[p.regionId], m[p.medicineId], p.stock, p.inTransit, p.demand, p.safety, p.shortageDays, p.recommended, rec].map(esc).join(","));
  }
  return new Response("\uFEFF" + lines.join("\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="DemandPrediction.csv"` },
  });
}
