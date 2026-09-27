import { PageHeader } from "@/components/AppShell";
import { PrescriptionBuilder } from "@/components/PrescriptionBuilder";
import { LOCALITIES, REGIONS, regionById } from "@/lib/data";
import { catalogFor } from "@/lib/catalog";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default function NewPrescriptionPage() {
  const s = getSession()!;
  const regionId = s.regionId && regionById(s.regionId) ? s.regionId : "monastir";
  return (
    <div className="max-w-[1280px]">
      <PageHeader
        title="New prescription"
        description="Enter the patient's details, then pick medicines. Each one shows whether it is in stock in your governorate, or when a delivery would arrive."
      />
      <PrescriptionBuilder
        catalog={catalogFor(regionId)}
        regionName={regionById(regionId)!.name}
        localities={LOCALITIES}
        regions={REGIONS}
      />
    </div>
  );
}
