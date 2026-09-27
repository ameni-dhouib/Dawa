import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Minus, Phone, Clock } from "lucide-react";
import { db } from "@/lib/store";
import { localityById, medById, pharmacyById, regionById } from "@/lib/data";
import { fmtDate, fmtDateTime, fmtKm, fmtWait } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import { Cross } from "@/components/Logo";

export const dynamic = "force-dynamic";

const MAX_PHARMACIES = 10;

export default function TranscriptPage({ params, searchParams }: { params: { id: string }; searchParams: { new?: string } }) {
  const p = db().prescriptions.find((x) => x.id === params.id);
  if (!p) notFound();
  const loc = localityById(p.patient.localityId)!;
  const region = regionById(loc.regionId)!;

  // Every pharmacy that stocks at least one prescribed medicine, nearest to the patient first.
  const map = new Map<string, { pharmacyId: string; distanceKm: number; has: Set<number> }>();
  p.lines.forEach((l, i) =>
    (l.options ?? []).forEach((o) => {
      const e = map.get(o.pharmacyId) ?? { pharmacyId: o.pharmacyId, distanceKm: o.distanceKm, has: new Set<number>() };
      e.has.add(i);
      map.set(o.pharmacyId, e);
    })
  );
  const pharmacies = Array.from(map.values()).sort((a, b) => a.distanceKm - b.distanceKm);
  const onePlace = pharmacies.find((x) => x.has.size === p.lines.length);
  const shown = pharmacies.slice(0, MAX_PHARMACIES);
  // Always list the nearest pharmacy that has everything, even if it is further than the cut-off.
  if (onePlace && !shown.includes(onePlace)) shown.push(onePlace);
  const ready = p.lines.filter((l) => l.status === "available").length;

  return (
    <div className="max-w-4xl">
      <div className="no-print flex flex-wrap items-center justify-between gap-3 mb-6">
        <Link href="/doctor/prescriptions" className="btn-ghost -ml-3"><ArrowLeft size={17} /> All prescriptions</Link>
        <div className="flex gap-2">
          <Link href="/doctor" className="btn-quiet">New prescription</Link>
          <PrintButton />
        </div>
      </div>

      {searchParams.new && (
        <div role="status" className="no-print mb-5 rounded-lg bg-cross-soft text-cross-dark px-4 py-3 text-sm">
          Prescription issued.{" "}
          {ready === p.lines.length ? "Every medicine is in stock in the patient's governorate." : `${ready} of ${p.lines.length} medicines are in stock nearby; the others are on their way from the central pharmacy.`}{" "}
          Print the transcript for the patient.
        </div>
      )}

      <article className="print-sheet panel overflow-hidden">
        <header className="px-6 sm:px-9 pt-8 pb-6 border-b border-line">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-center gap-3">
              <Cross size={34} />
              <div>
                <p className="font-bold text-lg leading-tight">Dawa</p>
                <p className="text-sm text-ink-soft">Prescription transcript</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl sm:text-[28px] font-extrabold tracking-tight num leading-none">{p.code}</p>
              <p className="text-sm text-ink-soft mt-1.5">{fmtDate(p.createdAt)}</p>
            </div>
          </div>

          <dl className="mt-7 grid gap-x-8 gap-y-3 sm:grid-cols-[1fr_1fr_auto] text-sm">
            <div>
              <dt className="text-ink-soft">Patient</dt>
              <dd className="font-semibold text-base">{p.patient.name}</dd>
              <dd className="num">CIN {p.patient.idNumber}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Address</dt>
              <dd>{p.patient.street}</dd>
              <dd>{loc.name}, {region.name}</dd>
              {p.patient.phone && <dd className="num">{p.patient.phone}</dd>}
            </div>
            <div className="sm:text-right">
              <dt className="text-ink-soft">Prescribed by</dt>
              <dd className="font-semibold text-base">{p.doctorName}</dd>
            </div>
          </dl>
        </header>

        {/* Prescription */}
        <section className="px-6 sm:px-9 py-7 border-b border-line">
          <h2 className="text-xl font-bold tracking-tight">Prescription</h2>
          <div className="overflow-x-auto mt-4 -mx-2">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-ink-soft text-left">
                  <th className="font-medium px-2 py-2 border-b border-line">Medicine</th>
                  <th className="font-medium px-2 py-2 border-b border-line">How to take it</th>
                  <th className="font-medium px-2 py-2 border-b border-line text-right">Boxes</th>
                  <th className="font-medium px-2 py-2 border-b border-line text-right">Days</th>
                  <th className="font-medium px-2 py-2 border-b border-line">Availability</th>
                </tr>
              </thead>
              <tbody>
                {p.lines.map((l, i) => {
                  const m = medById(l.medicineId)!;
                  const nearest = l.options?.[0];
                  return (
                    <tr key={i} className="align-top">
                      <td className="px-2 py-3 border-b border-line">
                        <span className="font-semibold">{m.name} {m.strength}</span>
                        <span className="block text-xs text-ink-soft">{m.form}, {m.pack.toLowerCase()}</span>
                      </td>
                      <td className="px-2 py-3 border-b border-line">{l.dosage || "As directed"}</td>
                      <td className="px-2 py-3 border-b border-line text-right num">{l.quantity}</td>
                      <td className="px-2 py-3 border-b border-line text-right num">{l.durationDays}</td>
                      <td className="px-2 py-3 border-b border-line">
                        {l.status === "available" && nearest ? (
                          <span className="text-cross">In stock, nearest {fmtKm(nearest.distanceKm)} away</span>
                        ) : (
                          <span className="text-wait">
                            Arrives {fmtDateTime(l.etaAt!)} at {pharmacyById(l.pharmacyId)!.name}
                            <span className="block text-xs text-ink-soft">
                              In {fmtWait(l.etaHours!)}{l.source === "supplier" ? ", ordered from the supplier" : ""}.
                              {nearest && ` Or collect now, ${fmtKm(nearest.distanceKm)} away.`}
                            </span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {p.notes && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold">Doctor&apos;s notes</h3>
              <p className="text-[15px] mt-1 leading-relaxed">{p.notes}</p>
            </div>
          )}
        </section>

        {/* Pharmacies */}
        <section className="px-6 sm:px-9 py-7">
          <h2 className="text-xl font-bold tracking-tight">Pharmacies with your medicines</h2>
          <p className="text-sm text-ink-soft mt-1">
            Nearest to {p.patient.street ? `${p.patient.street}, ` : ""}{loc.name} first.{" "}
            {onePlace ? `${pharmacyById(onePlace.pharmacyId)!.name} has everything on this prescription.` : "No single pharmacy has every medicine, so you may need to visit more than one."}
          </p>

          {pharmacies.length === 0 ? (
            <p className="mt-5 text-sm">None of these medicines is currently in stock. They will be delivered to the pharmacy shown above.</p>
          ) : (
            <ol className="mt-5 border-t border-line">
              {shown.map((x) => {
                const ph = pharmacyById(x.pharmacyId)!;
                const all = x.has.size === p.lines.length;
                return (
                  <li key={x.pharmacyId} className="py-4 border-b border-line grid grid-cols-[2.25rem_1fr] sm:grid-cols-[2.25rem_1fr_auto] gap-x-3 gap-y-2 break-inside-avoid">
                    <span className="text-lg font-bold num text-ink-faint leading-7">{pharmacies.indexOf(x) + 1}</span>
                    <div className="min-w-0">
                      <p className="font-semibold text-[17px] leading-7">
                        {ph.name}
                        {all && <span className="pill bg-cross-soft text-cross-dark ml-2 align-middle">Has everything</span>}
                      </p>
                      <p className="text-sm text-ink-soft">{ph.address}</p>
                      <p className="text-sm text-ink-soft flex flex-wrap gap-x-4 mt-0.5">
                        <span className="flex items-center gap-1"><Phone size={13} /> {ph.phone}</span>
                        <span className="flex items-center gap-1"><Clock size={13} /> {ph.hours}</span>
                      </p>
                      <ul className="flex flex-wrap gap-1.5 mt-2.5" aria-label="Prescribed medicines at this pharmacy">
                        {p.lines.map((l, i) => {
                          const m = medById(l.medicineId)!;
                          const has = x.has.has(i);
                          return (
                            <li key={i} className={`pill border ${has ? "border-cross/30 bg-cross-soft/60 text-cross-dark" : "border-line text-ink-faint line-through decoration-ink-faint/60"}`}>
                              {has ? <Check size={12} /> : <Minus size={12} />}
                              {m.name}
                              <span className="sr-only">{has ? "in stock" : "not in stock"}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <p className="col-start-2 sm:col-start-3 sm:row-start-1 sm:text-right text-[17px] font-bold num leading-7">{fmtKm(x.distanceKm)}</p>
                  </li>
                );
              })}
            </ol>
          )}
          {pharmacies.length > shown.length && (
            <p className="text-xs text-ink-soft mt-3">{pharmacies.length - shown.length} other pharmacies also stock some of these medicines.</p>
          )}
        </section>

        <footer className="px-6 sm:px-9 py-5 bg-paper text-xs text-ink-soft flex flex-col sm:flex-row sm:justify-between gap-2 border-t border-line">
          <span>Stock as of {fmtDateTime(p.createdAt)}. Call ahead to confirm before travelling far.</span>
          <span className="num">Reference {p.code}</span>
        </footer>
      </article>
    </div>
  );
}
