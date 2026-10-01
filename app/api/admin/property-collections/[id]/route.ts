import { savePropertyCollection } from "@/lib/property-collections/admin-api";
export const runtime = "edge";
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return savePropertyCollection(request, (await params).id);
}
