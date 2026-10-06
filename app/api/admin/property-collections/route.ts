import { savePropertyCollection } from "@/lib/property-collections/admin-api";
export const runtime = "edge";
export async function POST(request: Request) { return savePropertyCollection(request); }
