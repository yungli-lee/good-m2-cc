import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
export const runtime = "edge";
export async function GET() {
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("ai_assistant_images").select("role,image_url");
  if (error) return NextResponse.json({ images: {} }, { headers: { "Cache-Control": "no-store" } });
  const images: Record<string,string> = {};
  for (const row of data || []) if ((row.role === "ayong" || row.role === "amei" || row.role === "duo") && typeof row.image_url === "string") images[row.role] = row.image_url;
  const { data: video } = await db.from("ai_assistant_duo_video").select("video_url").eq("id", true).maybeSingle();
  return NextResponse.json({ images, duoVideo: typeof video?.video_url === "string" ? video.video_url : null }, { headers: { "Cache-Control": "no-store" } });
}
