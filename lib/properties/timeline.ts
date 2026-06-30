import { z } from "zod";
import type { AdminRole } from "@/lib/auth";
import type { createSupabaseServerClient } from "@/lib/supabase/server";

export const propertyTimelineEventTypes = [
  "created",
  "published",
  "unpublished",
  "featured",
  "unfeatured",
  "price_changed",
  "showing",
  "offer",
  "negotiation",
  "follow_up",
  "closed",
  "note"
] as const;

export type PropertyTimelineEventType = (typeof propertyTimelineEventTypes)[number];

export type PropertyTimelineEvent = {
  id: string;
  property_id: string;
  event_date: string;
  event_type: PropertyTimelineEventType;
  title: string;
  content: string | null;
  created_by: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyTimelineInput = {
  property_id: string;
  event_date: string;
  event_type: PropertyTimelineEventType;
  title: string;
  content?: string | null;
  created_by?: string | null;
  created_by_email?: string | null;
};

export const propertyTimelineLabels: Record<PropertyTimelineEventType, { label: string; icon: string }> = {
  created: { label: "新接委託", icon: "🟢" },
  published: { label: "上架", icon: "🏠" },
  unpublished: { label: "下架", icon: "⚪" },
  featured: { label: "設為精選", icon: "⭐" },
  unfeatured: { label: "取消精選", icon: "☆" },
  price_changed: { label: "價格調整", icon: "📉" },
  showing: { label: "帶看", icon: "🏠" },
  offer: { label: "出價 / 斡旋", icon: "💰" },
  negotiation: { label: "議價", icon: "🤝" },
  follow_up: { label: "追蹤", icon: "📌" },
  closed: { label: "成交 / 結案", icon: "✅" },
  note: { label: "一般備註", icon: "📝" }
};

export const propertyTimelineFormSchema = z.object({
  event_date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, "請選擇日期"),
  event_type: z.enum(propertyTimelineEventTypes),
  title: z.string().trim().min(1, "請輸入標題").max(120, "標題最多 120 字"),
  content: z.string().trim().max(2000, "內容最多 2000 字").optional().or(z.literal(""))
});

export function propertyTimelineValuesFromFormData(formData: FormData) {
  return {
    event_date: String(formData.get("event_date") || ""),
    event_type: String(formData.get("event_type") || ""),
    title: String(formData.get("title") || ""),
    content: String(formData.get("content") || "")
  };
}

export function canReadPropertyTimeline(role: AdminRole) {
  return role === "editor" || role === "admin" || role === "owner";
}

export function canCreatePropertyTimeline(role: AdminRole) {
  return role === "editor" || role === "admin" || role === "owner";
}

export function canManagePropertyTimeline(role: AdminRole) {
  return role === "admin" || role === "owner";
}

export function sortPropertyTimelineEvents<T extends Pick<PropertyTimelineEvent, "event_date" | "created_at">>(events: T[]) {
  return [...events].sort((a, b) => {
    const dateCompare = b.event_date.localeCompare(a.event_date);
    if (dateCompare !== 0) return dateCompare;
    return b.created_at.localeCompare(a.created_at);
  });
}

export function todayTaipeiDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

export function formatTimelineDate(value: string) {
  return value.replaceAll("-", "/");
}

export function priceChangedContent(beforePrice?: number | null, afterPrice?: number | null) {
  const before = beforePrice == null ? "洽詢" : `${beforePrice.toLocaleString("zh-TW")} 萬`;
  const after = afterPrice == null ? "洽詢" : `${afterPrice.toLocaleString("zh-TW")} 萬`;
  return `開價 ${before} → ${after}`;
}

export async function insertPropertyTimelineEvent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: PropertyTimelineInput
) {
  return supabase.from("property_timeline_events").insert({
    property_id: input.property_id,
    event_date: input.event_date,
    event_type: input.event_type,
    title: input.title,
    content: input.content || null,
    created_by: input.created_by || null,
    created_by_email: input.created_by_email || null
  });
}

export async function tryInsertPropertyTimelineEvent(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  input: PropertyTimelineInput
) {
  try {
    await insertPropertyTimelineEvent(supabase, input);
  } catch {
    // Timeline writes should not block primary property workflows.
  }
}
