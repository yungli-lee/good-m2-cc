import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { buildPropertyExportXlsx, propertyExportFilename } from "@/lib/properties/export-xlsx";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { routeIdParamsSchema } from "@/lib/validation/common";
import type { Property } from "@/lib/properties/types";

export const runtime = "edge";

type Props = {
  params: Promise<{ id: string }>;
};

function contentDisposition(filename: string) {
  return `attachment; filename=\"property.xlsx\"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export async function GET(_request: Request, { params }: Props) {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;

  const parsedParams = routeIdParamsSchema.safeParse(await params);
  if (!parsedParams.success) return apiError("Invalid request data", 422);

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", parsedParams.data.id)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) return apiError("Unable to load property", 500);
  if (!data) return apiError("Not found", 404);

  const property = data as Property;

  try {
    const workbook = await buildPropertyExportXlsx(property);
    return new NextResponse(workbook, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": contentDisposition(propertyExportFilename(property)),
        "Cache-Control": "no-store"
      }
    });
  } catch (cause) {
    console.error("Property Excel export failed", cause);

    const host = _request.headers.get("host") || "";
    if (host.endsWith(".pages.dev")) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      return new NextResponse(
        [
          "Property Excel export failed",
          `name: ${error.name}`,
          `message: ${error.message}`,
          error.stack ? `stack: ${error.stack}` : ""
        ].filter(Boolean).join("\n"),
        { status: 500, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } }
      );
    }

    return apiError("Unable to export property", 500);
  }
}
