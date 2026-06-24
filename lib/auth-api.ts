import { NextResponse } from "next/server";
import { getCurrentProfile, type AdminRole } from "@/lib/auth";

export async function requireApiRole(allowed: AdminRole[]) {
  const current = await getCurrentProfile();
  if (!current) {
    return { current: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!allowed.includes(current.profile.role as AdminRole)) {
    return { current: null, response: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { current, response: null };
}

export function apiError(message = "Request failed", status = 400) {
  return NextResponse.json({ error: message }, { status });
}
