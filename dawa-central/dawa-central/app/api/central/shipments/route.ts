import { handle } from "@/lib/central/guard";
import { createShipments } from "@/lib/central/service";

export async function POST(req: Request) {
  const body = await req.json();
  const items = Array.isArray(body.items) ? body.items : [body];
  return handle(() => ({
    ids: createShipments(
      items.map((i: Record<string, unknown>) => ({ regionId: Number(i.regionId), medicineId: Number(i.medicineId), quantity: Number(i.quantity) })),
      body.origin === "forecast" ? "forecast" : "manual"
    ),
  }));
}
