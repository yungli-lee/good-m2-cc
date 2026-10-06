import { NextResponse } from 'next/server';
import { getSupabaseEnv, getRequestContext } from '@/lib/supabase/env';
export const runtime = 'edge';
export async function GET() {
  const branch = process.env.CF_PAGES_BRANCH || getRequestContext()?.env?.CF_PAGES_BRANCH;
  if (!branch || branch === 'main') return new NextResponse(null, {status:404});
  const url = getSupabaseEnv().url;
  return NextResponse.json({branch, databaseHost: url ? new URL(url).hostname : null}, {headers:{'Cache-Control':'no-store'}});
}
