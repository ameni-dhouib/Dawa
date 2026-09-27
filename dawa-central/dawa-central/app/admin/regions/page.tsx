import Link from "next/link";
import { PageHeader } from "@/components/AppShell";
import { GroupedBars } from "@/components/central/Charts";
import { SendButton } from "@/components/central/Actions";
import { NoModel, Panel, StatusPill, days } from "@/components/central/ui";
import { latestRun, medicines, regionalPlans, regions } from "@/lib/central/service";
import { fmtInt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function RegionalStockPage({ searchParams }: { searchParams: { region?: string } }) {
  const regs = regions(), meds = medicines();
  const plans = regionalPlans();
  const run = latestRun();
  const alerts = (rid: number) => plans.filter((p) => p.regionId === rid && p.status !== "ok").length;
  const worst = [...regs].sort((a, b) => alerts(b.id) - alerts(a.id))[0];
  const region = regs.find((r) => String(r.id) === searchParams.region) ?? worst;
  const rows = plans.filter((p) => p.regionId === region.id);
  const mName = Object.fromEntries(meds.map((m) => [m.id, m.name]));
  const need = rows.filter((p) => p.recommended > 0);

  const chart = rows.map((p) => ({ label: mName[p.medicineId], stock: p.stock, transit: p.inTransit, demand: p.demand }));

  return (
    <div className="max-w-[1400px]">
      <PageHeader title="Regional stock" description="Stock held by each governorate's pharmacies, compared with the model's forecast for next month." />

      <nav className="flex flex-wrap gap-2 mb-5" aria-label="Governorate">
        {regs.map((r) => {
          const n = alerts(r.id);
          const active = r.id === region.id;
          return (
            <Link key={r.id} href={`/admin/regions?region=${r.id}`} aria-current={active ? "page" : undefined}
              className={`inline-flex items-center gap-2 rounded-full pl-4 pr-3 py-1.5 text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cross ${
                active ? "bg-ink text-white border-ink" : "bg-white border-line hover:border-ink-faint"}`}>
              {r.name}
              <span className={`num text-xs rounded-full px-1.5 min-w-[1.25rem] text-center ${n ? (active ? "bg-white/20" : "bg-wait-soft text-wait") : (active ? "bg-white/10" : "bg-paper text-ink-faint")}`} aria-label={`${n} alerts`}>{n}</span>
            </Link>
          );
        })}
      </nav>

      {!run ? <NoModel /> : (
        <div className="space-y-4">
          <Panel title={`${region.name}: stock against next month's demand`} description="Units per medicine. Shipments already on the way count toward cover.">
            <GroupedBars data={chart} height={320} bars={[
              { key: "stock", name: "In stock", color: "#14243B" },
              { key: "transit", name: "On the way", color: "#8A97A8" },
              { key: "demand", name: "Forecast demand", color: "#0B7A55" },
            ]} />
          </Panel>

          <Panel
            title={`${region.name}: what to send`}
            description="Recommended units bring stock up to next month's forecast plus safety stock for a 7-day delivery."
            action={<SendButton variant="primary" label={`Send all ${need.length} to ${region.name}`} items={need.map((p) => ({ regionId: p.regionId, medicineId: p.medicineId, quantity: p.recommended }))} />}
          >
            <div className="overflow-x-auto -mx-5">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr>
                    <th className="th">Medicine</th>
                    <th className="th text-right">In stock</th>
                    <th className="th text-right">On the way</th>
                    <th className="th text-right">Forecast, next month</th>
                    <th className="th text-right">Safety stock</th>
                    <th className="th text-right">Lasts</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Send</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.medicineId} className="hover:bg-paper/60">
                      <td className="td font-medium">
                        <Link href={`/admin/forecast?region=${p.regionId}&med=${p.medicineId}`} className="hover:underline underline-offset-4">{mName[p.medicineId]}</Link>
                      </td>
                      <td className="td text-right num">{fmtInt(p.stock)}</td>
                      <td className="td text-right num text-ink-soft">{p.inTransit ? fmtInt(p.inTransit) : "–"}</td>
                      <td className="td text-right num">{fmtInt(p.demand)}</td>
                      <td className="td text-right num text-ink-soft">{fmtInt(p.safety)}</td>
                      <td className="td text-right num">{days(p.coverDays)}</td>
                      <td className="td"><StatusPill status={p.status} /></td>
                      <td className="td text-right">
                        {p.recommended > 0
                          ? <SendButton label={`Send ${p.recommended}`} items={[{ regionId: p.regionId, medicineId: p.medicineId, quantity: p.recommended }]} />
                          : <span className="text-sm text-ink-faint">Not needed</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
