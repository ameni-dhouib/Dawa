import { PageHeader } from "@/components/AppShell";
import { DeliverButton, ShipmentForm } from "@/components/central/Actions";
import { Panel } from "@/components/central/ui";
import { centralPlans, medicines, regions, shipments } from "@/lib/central/service";
import { fmtDateTime, fmtInt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function ShipmentsPage() {
  const all = shipments();
  const open = all.filter((s) => s.status === "in_transit");
  const done = all.filter((s) => s.status === "delivered");
  const available = Object.fromEntries(centralPlans().map((c) => [c.medicine.id, c.usable]));

  const Table = ({ rows, pending }: { rows: typeof all; pending: boolean }) => (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full min-w-[760px]">
        <thead>
          <tr>
            <th className="th">Medicine</th>
            <th className="th">Governorate</th>
            <th className="th text-right">Units</th>
            <th className="th">Reason</th>
            <th className="th">{pending ? "Sent" : "Delivered"}</th>
            {pending && <th className="th"><span className="sr-only">Action</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-paper/60">
              <td className="td font-medium">{s.medicine}</td>
              <td className="td">{s.region}</td>
              <td className="td text-right num">{fmtInt(s.quantity)}</td>
              <td className="td">{s.origin === "forecast" ? <span className="pill bg-cross-soft text-cross-dark">Forecast</span> : <span className="pill bg-paper border border-line text-ink-soft">Manual</span>}</td>
              <td className="td num text-ink-soft">{fmtDateTime(pending ? s.created_at : s.delivered_at!)}</td>
              {pending && <td className="td text-right"><DeliverButton id={s.id} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="max-w-[1200px]">
      <PageHeader title="Shipments" description="Stock sent from the central pharmacy to governorates. Marking a shipment delivered adds it to that governorate's stock." />
      <Panel title="Send stock manually" description="For needs the forecast cannot see, such as an outbreak or a new clinic.">
        <ShipmentForm regions={regions()} medicines={medicines()} available={available} />
      </Panel>
      <Panel className="mt-4" title={`On the way (${open.length})`}>
        {open.length ? <Table rows={open} pending /> : <p className="text-sm text-ink-soft">No shipments in transit.</p>}
      </Panel>
      {done.length > 0 && <Panel className="mt-4" title={`Delivered (${done.length})`}><Table rows={done} pending={false} /></Panel>}
    </div>
  );
}
