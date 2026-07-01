import { NextResponse } from "next/server";
import { listPublicKnowledgeItems } from "@/lib/content/queries";

export const runtime = "edge";

function clampLimit(value: string | null) {
  const limit = Number(value || 6);
  if (!Number.isFinite(limit)) return 6;
  return Math.min(Math.max(Math.floor(limit), 1), 24);
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = clampLimit(url.searchParams.get("limit"));

  try {
    const { data, error } = await listPublicKnowledgeItems(limit);
    if (error) return NextResponse.json({ error: "Unable to load knowledge" }, { status: 500 });

    return NextResponse.json({
      data,
      filters: {
        content_type: "knowledge",
        status: "published",
        deleted_at: null,
        noindex: false,
        legal_status: ["current", null]
      },
      limit
    });
  } catch (error) {
    console.error("public_knowledge_unhandled_error", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unable to load knowledge" }, { status: 500 });
  }
}
