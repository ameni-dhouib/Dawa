import { PageHeader } from "@/components/AppShell";
import { GroupedBars } from "@/components/central/Charts";
import { ReceiveLotForm } from "@/components/central/Actions";
import { Panel, StatusPill } from "@/components/central/ui";
import { PLANNING, centralLots, centralPlans, medicines } from "@/lib/central/service";
import { fmtDate, fmtInt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function CentralStockPage() {
  const plans = centralPlans();
  const lots = centralLots();
  const meds = medicines();
  const todayMs = Date.now();

  const chart = plans.map((c) => ({
    label: c.medicine.name,
    cover: Number(Math.min(c.coverMonths, 6).toFixed(2)),
  }));

  return (
    <div className="max-w-[1400px]">
      <PageHeader
        title="Central stock"
        description={`What the central warehouse holds, how long it lasts against the national forecast, and when to order from suppliers. Target: ${PLANNING.supplierTargetMonths} months of demand; reorder below ${PLANNING.reorderMonths}.`}
      />

      <div className="space-y-4">
          <Panel title="Stock by medicine" description="Usable units exclude expired lots. Regional need is what the governorates need now, from the forecast.">
            <div className="overflow-x-auto -mx-5">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr>
                    <th className="th">Medicine</th>
                    <th className="th text-right">Usable units</th>
                    <th className="th text-right">National demand, next month</th>
                    <th className="th text-right">Months of cover</th>
                    <th className="th text-right">Regional need now</th>
                    <th className="th">Status</th>
                    <th className="th text-right">Order from supplier</th>
                    <th className="th">Next expiry</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((c) => (
                    <tr key={c.medicine.id} className="hover:bg-paper/60">
                      <td className="td">
                        <span className="font-medium">{c.medicine.name}</span>
                        {c.medicine.controlled ? <span className="pill bg-paper border border-line text-ink-soft ml-2">Controlled</span> : null}
                        <span className="block text-xs text-ink-soft max-w-[18rem]">{c.medicine.atc_code}, {c.medicine.atc_class.toLowerCase()}</span>
                      </td>
                      <td className="td text-right num font-semibold">{fmtInt(c.usable)}</td>
                      <td className="td text-right num">{fmtInt(c.nationalDemand)}</td>
                      <td className={`td text-right num ${c.coverMonths < 1 ? "text-alert font-semibold" : c.coverMonths < PLANNING.reorderMonths ? "text-wait font-semibold" : ""}`}>{c.coverMonths.toFixed(1)}</td>
                      <td className="td text-right num">{fmtInt(c.regionalNeed)}</td>
                      <td className="td"><StatusPill status={c.status} /></td>
                      <td className="td text-right num">{c.supplierOrder ? fmtInt(c.supplierOrder) : "–"}</td>
                      <td className="td num">
                        {c.nextExpiry ? fmtDate(c.nextExpiry) : "–"}
                        {c.expiringSoon > 0 && <span className="block text-xs text-wait">{fmtInt(c.expiringSoon)} units within 90 days</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px] items-start">
            <Panel title="Months of cover" description={`Usable central stock divided by next month's national forecast. The line marks the reorder point (${PLANNING.reorderMonths} months).`}>
              <GroupedBars data={chart} layout="vertical" height={330} bars={[{ key: "cover", name: "Months of cover", color: "#14243B" }]} refLine={{ value: PLANNING.reorderMonths, label: "Reorder point" }} unit="months" />
            </Panel>
            <Panel title="Record a supplier delivery" description="Adds a lot to central stock. Receiving the same lot number again adds to it.">
              <ReceiveLotForm medicines={meds.map((m) => ({ id: m.id, name: m.name }))} />
            </Panel>
          </div>

          <Panel title="Lots" description="Shipments take units from the lot that expires first.">
            <div className="overflow-x-auto -mx-5">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th className="th">Lot</th>
                    <th className="th">Medicine</th>
                    <th className="th text-right">Units</th>
                    <th className="th">Received</th>
                    <th className="th">Expires</th>
                    <th className="th text-right">Days left</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((l) => {
                    const left = Math.ceil((new Date(l.expiry_date).getTime() - todayMs) / 86400000);
                    const tone = left <= 0 ? "text-alert font-semibold" : left <= PLANNING.expiryWarnDays ? "text-wait font-semibold" : "text-ink-soft";
                    return (
                      <tr key={l.id} className="hover:bg-paper/60">
                        <td className="td num font-medium">{l.lot_number}</td>
                        <td className="td">{l.medicine}</td>
                        <td className="td text-right num">{fmtInt(l.quantity)}</td>
                        <td className="td num text-ink-soft">{fmtDate(l.received_at)}</td>
                        <td className="td num">{fmtDate(l.expiry_date)}</td>
                        <td className={`td text-right num ${tone}`}>{left <= 0 ? "Expired" : left}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Panel>
      </div>
    </div>
  );
}
