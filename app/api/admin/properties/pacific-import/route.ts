import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiRole } from "@/lib/auth-api";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { propertySchema, toPropertyPayload } from "@/lib/properties/schema";
import { boundedFetch, loadPacificListing, PacificImportError, sourceMarker } from "@/lib/properties/pacific-import";
import { validateMediaFile } from "@/lib/media/upload";
import { recordAuditLog } from "@/lib/audit/audit-log";

export const runtime = "edge";
const inputSchema = z.object({ url: z.string().max(1000), mode: z.enum(["preview", "create", "image"]), propertyId: z.string().uuid().optional(), index: z.number().int().min(0).max(19).optional() });
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return reply({ error: "來源驗證失敗，請從後台操作。" }, 403);
  const auth = await requireApiRole(["editor", "admin", "owner"]);
  if (auth.response) return auth.response;
  const body = await request.text();
  if (body.length > 2048) return reply({ error: "匯入資料過長。" }, 413);
  let json: unknown;
  try { json = JSON.parse(body); } catch { return reply({ error: "匯入資料不正確。" }, 422); }
  const parsed = inputSchema.safeParse(json);
  if (!parsed.success) return reply({ error: "匯入資料不正確。" }, 422);
  const input = parsed.data;
  const supabase = await createSupabaseServerClient();
  try {
    const listing = await loadPacificListing(input.url, fetch, input.mode === "image");
    const { source, property, images, warnings } = listing;
    if (input.mode === "preview") return reply({ property, sourceUrl: source.sourceUrl, imageCount: images.length, warnings });
    const user = auth.current!.user;
    if (input.mode === "create") {
      const { data: existing, error: lookupError } = await supabase.from("properties").select("id,title,status").or(`slug.eq.${source.slug},address_private.ilike.*${sourceMarker(source.saleId)}*`).limit(1).maybeSingle();
      if (lookupError) return reply({ error: "無法檢查重複物件，請稍後重試。" }, 500);
      if (existing) return reply({ error: "這個來源物件已匯入，請直接開啟原物件修改。", editUrl: `/admin/properties/${existing.id}/edit` }, 409);
      const checked = propertySchema.safeParse(property);
      if (!checked.success) return reply({ error: "來源欄位無法通過驗證，請使用文字解析或手動新增。" }, 422);
      const { data, error } = await supabase.from("properties").insert({ ...toPropertyPayload(checked.data), status: "draft", published_at: null, created_by: user.id, updated_by: user.id }).select("id,title").single();
      if (error) return reply({ error: error.code === "23505" ? "物件已存在，請回物件列表查看。" : "草稿儲存失敗，請稍後重試。" }, error.code === "23505" ? 409 : 500);
      await recordAuditLog({ action: "property_create", resourceType: "property", resourceId: data.id, userId: user.id, userEmail: user.email, afterData: { title: data.title, status: "draft" }, metadata: { source: "pacific", saleId: source.saleId, sourceUrl: source.sourceUrl } });
      return reply({ id: data.id, editUrl: `/admin/properties/${data.id}/edit`, imageCount: images.length, warnings }, 201);
    }
    if (!input.propertyId || input.index === undefined || !images[input.index]) return reply({ error: "圖片資料不完整。" }, 422);
    const { data: target, error: targetError } = await supabase.from("properties").select("id,status,address_private").eq("id", input.propertyId).is("deleted_at", null).maybeSingle();
    if (targetError || !target || target.status !== "draft" || !target.address_private?.split("\n").includes(sourceMarker(source.saleId))) return reply({ error: "只能為同一來源的未上架草稿匯入圖片。" }, 403);
    const altText = `太平洋 ${source.saleId} 圖片 ${input.index + 1}`;
    const { data: existingImage, error: imageLookupError } = await supabase.from("property_media").select("id").eq("property_id", target.id).eq("alt_text", altText).is("deleted_at", null).limit(1).maybeSingle();
    if (imageLookupError) return reply({ error: "無法檢查圖片，請稍後重試。" }, 500);
    if (existingImage) return reply({ ok: true, alreadyImported: true });
    const image = await boundedFetch(images[input.index], 6 * 1024 * 1024, { Referer: "https://www.pacific.com.tw/", "User-Agent": "Mozilla/5.0" });
    const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[image.contentType];
    if (!extension) return reply({ error: "來源檔案不是支援的圖片格式。" }, 422);
    const file = new File([image.bytes as BlobPart], `pacific-${source.saleId}-${input.index}.${extension}`, { type: image.contentType });
    if (!(await validateMediaFile(file, "property")).ok) return reply({ error: "圖片驗證失敗，請自行上傳原檔。" }, 422);
    const storagePath = `${user.id}/${target.id}/pacific-${source.saleId}-${input.index}.${extension}`;
    const { error: uploadError } = await supabase.storage.from("property-media").upload(storagePath, file, { contentType: file.type, upsert: false });
    if (uploadError) return reply({ error: "圖片儲存失敗，請自行上傳原檔。" }, 500);
    const { data: cover, error: coverError } = await supabase.from("property_media").select("id").eq("property_id", target.id).eq("is_cover", true).is("deleted_at", null).limit(1).maybeSingle();
    if (coverError) { await supabase.storage.from("property-media").remove([storagePath]); return reply({ error: "無法確認封面狀態。" }, 500); }
    const { data: publicUrl } = supabase.storage.from("property-media").getPublicUrl(storagePath);
    const { error: mediaError } = await supabase.from("property_media").insert({ property_id: target.id, media_type: "image", url: publicUrl.publicUrl, storage_path: storagePath, mime_type: file.type, file_size: file.size, alt_text: altText, sort_order: input.index + 1, is_cover: !cover, created_by: user.id, updated_by: user.id });
    if (mediaError) { await supabase.storage.from("property-media").remove([storagePath]); return reply({ error: "圖片資料儲存失敗，請自行上傳原檔。" }, 500); }
    await recordAuditLog({ action: "property_image_upload", resourceType: "property", resourceId: target.id, userId: user.id, userEmail: user.email, metadata: { source: "pacific", saleId: source.saleId, imageIndex: input.index } });
    return reply({ ok: true });
  } catch (error) {
    return reply({ error: error instanceof PacificImportError ? error.message : "來源網站暫時無法匯入，請稍後再試。" }, 502);
  }
}
