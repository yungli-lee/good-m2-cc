import { NextResponse } from "next/server";
import { listFeaturedProperties } from "@/lib/properties/queries";

export const runtime = "edge";

export async function GET() {
  const { data, error } = await listFeaturedProperties(6);

  if (error) {
    return NextResponse.json({ error: "Unable to load featured properties" }, { status: 500 });
  }

  return NextResponse.json({
    data: data || [],
    filters: {
      status: "published",
      is_featured: true,
      deleted_at: null
    },
    sort: ["sort_order ASC", "created_at DESC"],
    limit: 6
  });
}
