import { handle } from "@/lib/central/guard";
import { receiveLot } from "@/lib/central/service";

export async function POST(req: Request) {
  const b = await req.json();
  return handle(() => receiveLot({ medicineId: Number(b.medicineId), lotNumber: String(b.lotNumber ?? ""), quantity: Number(b.quantity), expiryDate: String(b.expiryDate ?? "") }));
}
