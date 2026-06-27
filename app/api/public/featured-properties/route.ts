import { NextResponse } from "next/server";
import { listFeaturedProperties } from "@/lib/properties/queries";
import { getRequestContext } from "@/lib/supabase/env";

export const runtime = "edge";

type FeaturedPropertiesError = {
  code?: string;
  hint?: string | null;
  details?: string | null;
};

function isProductionRuntime(request: Request) {
  const runtimeEnv = getRequestContext()?.env;
  const branch = process.env.CF_PAGES_BRANCH || runtimeEnv?.CF_PAGES_BRANCH;
  const hostname = new URL(request.url).hostname;
  return branch === "main" && hostname === "good.m2.cc";
}

function isMissingEnvError(error: unknown) {
  return error instanceof Error && error.message === "auth_not_configured";
}

function featuredPropertiesErrorResponse(error: FeaturedPropertiesError, request: Request) {
  if (isProductionRuntime(request)) {
    return NextResponse.json({ error: "Unable to load featured properties" }, { status: 500 });
  }

  return NextResponse.json(
    {
      error: "featured_properties_query_error",
      code: error.code,
      hint: error.hint,
      details: error.details
    },
    { status: 500 }
  );
}

export async function GET(request: Request) {
  try {
    const { data, error } = await listFeaturedProperties(3);

    if (error) {
      console.error(new Error("featured_properties_query_error"), error);
      return featuredPropertiesErrorResponse(error, request);
    }

    return NextResponse.json({
      data: data || [],
      filters: {
        status: "published",
        is_featured: true,
        deleted_at: null
      },
      sort: ["published_at DESC"],
      limit: 3
    });
  } catch (error) {
    console.error(error);

    if (isMissingEnvError(error)) {
      return NextResponse.json({ error: "missing_env" }, { status: 500 });
    }

    if (isProductionRuntime(request)) {
      return NextResponse.json({ error: "Unable to load featured properties" }, { status: 500 });
    }

    return NextResponse.json({ error: "featured_properties_unhandled_error" }, { status: 500 });
  }
}
