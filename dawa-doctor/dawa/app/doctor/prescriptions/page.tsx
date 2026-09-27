import Link from "next/link";
import { PageHeader } from "@/components/AppShell";
import { db } from "@/lib/store";
import { getSession } from "@/lib/session";
import { localityById } from "@/lib/data";
import { fmtDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default function PrescriptionsPage() {
  const s = getSession()!;
  const list = db().prescriptions.filter((p) => p.doctorName === s.name);
  const now = new Date().toISOString();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="My prescriptions"
        description="Open any prescription to reprint the patient's transcript."
        actions={<Link href="/doctor" className="btn-primary">New prescription</Link>}
      />
      {list.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="font-semibold">No prescriptions yet</p>
          <p className="text-ink-soft text-sm mt-1">Issued prescriptions appear here with their pickup status.</p>
          <Link href="/doctor" className="btn-primary mt-5">Write the first one</Link>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr>
                <th className="th">Reference</th>
                <th className="th">Patient</th>
                <th className="th">Issued</th>
                <th className="th text-right">Medicines</th>
                <th className="th">Pickup status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const waiting = p.lines.filter((l) => l.status === "dispatch" && (l.etaAt ?? "") > now);
                return (
                  <tr key={p.id} className="hover:bg-paper/60">
                    <td className="td font-semibold num">
                      <Link href={`/doctor/prescriptions/${p.id}`} className="hover:underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cross rounded">{p.code}</Link>
                    </td>
                    <td className="td">
                      {p.patient.name}
                      <span className="block text-xs text-ink-soft">{localityById(p.patient.localityId)?.name}</span>
                    </td>
                    <td className="td text-ink-soft">{fmtDateTime(p.createdAt)}</td>
                    <td className="td text-right num">{p.lines.length}</td>
                    <td className="td">
                      {waiting.length === 0
                        ? <span className="pill bg-cross-soft text-cross-dark">Ready to collect</span>
                        : <span className="pill bg-wait-soft text-wait">{waiting.length} on the way</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
