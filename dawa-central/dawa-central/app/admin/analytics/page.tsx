import { PageHeader } from "@/components/AppShell";
import { GroupedBars, Sparkline, StackedBars } from "@/components/central/Charts";
import { MED_COLORS } from "@/lib/central/colors";
import { Panel } from "@/components/central/ui";
import { centralPlans, medicines, nationalMonthly, regionalMonthlyTotals, regionalPlans, regions } from "@/lib/central/service";
import { fmtInt, fmtMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pct = (v: number) => `${v > 0 ? "+" : ""}${v.toFixed(1)}%`;

export default function AnalyticsPage() {
  const meds = medicines(), regs = regions();
  const rows = nationalMonthly();
  const months = Array.from(new Set(rows.map((r) => r.month))).sort();
  const last12 = months.slice(-12), prev12 = months.slice(-24, -12);

  const series = meds.map((m, i) => {
    const s = rows.filter((r) => r.medicineId === m.id);
    const sum = (ms: string[]) => s.filter((r) => ms.includes(r.month)).reduce((a, r) => a + r.units, 0);
    const cur = sum(last12), prev = sum(prev12);
    // seasonality index: average for each calendar month / overall monthly average
    const avg = s.reduce((a, r) => a + r.units, 0) / s.length;
    const season = MONTHS.map((_, k) => {
      const v = s.filter((r) => Number(r.month.slice(5)) === k + 1);
      return v.length ? (v.reduce((a, r) => a + r.units, 0) / v.length / avg) * 100 : 100;
    });
    const peak = season.indexOf(Math.max(...season));
    return { m, color: MED_COLORS[i], data: s.slice(-36), cur, prev, yoy: prev ? ((cur - prev) / prev) * 100 : 0, season, peak };
  });

  const regTotals = regionalMonthlyTotals(12);
  const plans = regionalPlans();
  const central = centralPlans(plans);
  const health = regs.map((r) => {
    const mine = plans.filter((p) => p.regionId === r.id);
    return { label: r.name, critical: mine.filter((p) => p.status === "critical").length, low: mine.filter((p) => p.status === "low").length, ok: mine.filter((p) => p.status === "ok").length };
  }).sort((a, b) => b.critical + b.low - (a.critical + a.low));
  const split = central.map((c) => ({
    label: c.medicine.name,
    central: c.usable,
    regional: plans.filter((p) => p.medicineId === c.medicine.id).reduce((s, p) => s + p.stock, 0),
  }));
  const regionUnits = regs.map((r) => ({ label: r.name, units: regTotals.filter((t) => t.regionId === r.id).reduce((a, t) => a + t.units, 0) }))
    .sort((a, b) => b.units - a.units);
  const allUnits = regionUnits.reduce((a, r) => a + r.units, 0);
  // how many of the following governorates, added together, still sell less than the first
  let outweighs = 0;
  for (let i = 1, acc = 0; i < regionUnits.length; i++) { acc += regionUnits[i].units; if (acc >= regionUnits[0].units) break; outweighs = i; }

  const growth = [...series].sort((a, b) => b.yoy - a.yoy);
  const mostSeasonal = [...series].sort((a, b) => Math.max(...b.season) - Math.min(...b.season) - (Math.max(...a.season) - Math.min(...a.season)))[0];
  const topMed = [...series].sort((a, b) => b.cur - a.cur)[0];

  return (
    <div className="max-w-[1400px]">
      <PageHeader
        title="Sales analysis"
        description={`Units dispensed from ${fmtMonth(months[0])} to ${fmtMonth(months.at(-1)!)}, the history the forecasting model learns from. Comparisons use the last 12 months against the 12 before.`}
      />

      <section className="panel p-5 mb-4" aria-labelledby="findings">
        <h2 id="findings" className="font-semibold">What the data shows</h2>
        <ul className="mt-2 space-y-1.5 text-[15px] leading-relaxed list-disc pl-5 marker:text-cross">
          <li>{topMed.m.name} is the volume driver: {fmtInt(topMed.cur)} units in the last 12 months, {Math.round((topMed.cur / series.reduce((a, s) => a + s.cur, 0)) * 100)}% of all units.</li>
          <li>{growth[0].m.name} grew fastest ({pct(growth[0].yoy)}); {growth.at(-1)!.m.name} changed the most in the other direction ({pct(growth.at(-1)!.yoy)}).</li>
          <li>{mostSeasonal.m.name} is the most seasonal: {MONTHS[mostSeasonal.peak]} runs {Math.round(mostSeasonal.season[mostSeasonal.peak] - 100)}% above its average month, so central stock should be built up before then.</li>
          <li>
            {regionUnits[0].label} accounts for {Math.round((regionUnits[0].units / allUnits) * 100)}% of regional demand
            {outweighs >= 2 ? `, more than the next ${outweighs} governorates combined.` : "."}
          </li>
        </ul>
      </section>

      <Panel title="Monthly units by medicine" description="Last 36 months, national. Each chart has its own scale; the figures compare the last 12 months with the 12 before.">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {series.map((s) => (
            <div key={s.m.id} className="rounded-lg border border-line p-3.5">
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-semibold">{s.m.name}</p>
                <p className={`text-sm num font-medium ${s.yoy >= 0 ? "text-cross" : "text-alert"}`}>{pct(s.yoy)}</p>
              </div>
              <p className="text-xs text-ink-soft num">{fmtInt(s.cur)} units in 12 months</p>
              <Sparkline data={s.data} color={s.color} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="mt-4" title="Seasonality" description="Average units in each calendar month compared with the medicine's average month (100). Darker green is busier, grey is quieter.">
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[760px] border-separate border-spacing-1 text-sm">
            <thead>
              <tr>
                <th className="w-28"><span className="sr-only">Medicine</span></th>
                {MONTHS.map((m) => <th key={m} className="font-medium text-ink-soft py-1">{m}</th>)}
              </tr>
            </thead>
            <tbody>
              {series.map((s) => (
                <tr key={s.m.id}>
                  <th scope="row" className="text-left font-medium px-2">{s.m.name}</th>
                  {s.season.map((v, k) => {
                    const d = Math.max(-1, Math.min(1, (v - 100) / 40));
                    const bg = d >= 0 ? `rgba(11,122,85,${0.08 + d * 0.72})` : `rgba(138,151,168,${0.08 + -d * 0.5})`;
                    return (
                      <td key={k} className={`rounded-md text-center py-2 num ${d > 0.55 ? "text-white font-semibold" : "text-ink"}`} style={{ background: bg }} title={`${s.m.name}, ${MONTHS[k]}: index ${Math.round(v)}`}>
                        {Math.round(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <div className="grid gap-4 mt-4 xl:grid-cols-2">
        <Panel title="Change over 12 months" description="Units in the last 12 months compared with the 12 before, in percent.">
          <GroupedBars data={growth.map((s) => ({ label: s.m.name, yoy: Number(s.yoy.toFixed(1)) }))} layout="vertical" unit="%" height={320}
            bars={[{ key: "yoy", name: "Change", color: "#0B7A55" }]} />
        </Panel>
        <Panel title="Demand by governorate" description="Units dispensed in the last 12 months, all medicines.">
          <GroupedBars data={regionUnits} layout="vertical" height={320} bars={[{ key: "units", name: "Units", color: "#14243B" }]} />
        </Panel>
      </div>

      <div className="grid gap-4 mt-4 xl:grid-cols-2">
        <Panel title="Stock health by governorate" description="Number of medicines in each governorate by how long their stock lasts against next month's forecast.">
          {plans.length ? (
            <StackedBars data={health} unit="medicines" series={[
              { key: "critical", name: "Under 15 days", color: "#B42318" },
              { key: "low", name: "15 to 30 days", color: "#D9A441" },
              { key: "ok", name: "30 days or more", color: "#0B7A55" },
            ]} />
          ) : <p className="text-sm text-ink-soft">Train the model to compare stock with forecast demand.</p>}
        </Panel>
        <Panel title="Where the stock sits" description="Units held by the central pharmacy and by all governorates together, per medicine.">
          <StackedBars data={split} series={[
            { key: "central", name: "Central pharmacy", color: "#14243B" },
            { key: "regional", name: "Governorates", color: "#8FB9A8" },
          ]} />
        </Panel>
      </div>
    </div>
  );
}
