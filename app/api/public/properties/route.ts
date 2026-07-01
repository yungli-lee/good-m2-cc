import { NextResponse } from "next/server";
import {
  getFeaturedPublishedProperties,
  getLatestPublishedProperties,
  searchPublishedProperties
} from "@/lib/properties/queries";

export const runtime = "edge";

function clampLimit(value: string | null, fallback: number) {
  const limit = Number(value || fallback);
  if (!Number.isFinite(limit)) return fallback;
  return Math.min(Math.max(Math.floor(limit), 1), 48);
}

function sanitizeError(error: unknown) {
  if (!error || typeof error !== "object") return {};
  const maybeError = error as { code?: string; message?: string; details?: string; hint?: string };
  return {
    code: maybeError.code,
    message: maybeError.message,
    details: maybeError.details,
    hint: maybeError.hint
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") || "latest";
  const limit = clampLimit(url.searchParams.get("limit"), mode === "search" ? 24 : 12);
  const q = url.searchParams.get("q") || "";

  try {
    const result =
      mode === "featured"
        ? await getFeaturedPublishedProperties(limit)
        : mode === "search"
          ? await searchPublishedProperties(q, limit)
          : await getLatestPublishedProperties(limit);

    if (result.error) {
      console.error("public_properties_query_failed", sanitizeError(result.error));
      return NextResponse.json({ error: "Unable to load properties" }, { status: 500 });
    }

    return NextResponse.json({
      data: result.data || [],
      filters: {
        status: "published",
        published_at: "not_null",
        deleted_at: null,
        mode,
        q
      },
      limit
    });
  } catch (error) {
    console.error("public_properties_unhandled_error", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Unable to load properties" }, { status: 500 });
  }
}
