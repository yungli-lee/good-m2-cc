import { NextResponse } from "next/server";
import { requireApiRole, apiError } from "@/lib/auth-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("inquiries")
    .select("id,created_at,form_type,name,phone,email,message,source_page,status,spam_reason,property_id")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return apiError("Unable to load inquiries", 500);
  return NextResponse.json({ data });
}
