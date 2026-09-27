import { handle } from "@/lib/central/guard";
import { deliverShipment } from "@/lib/central/service";

export async function PATCH(_req: Request, { params }: { params: { id: string } }) {
  return handle(() => deliverShipment(Number(params.id)));
}
