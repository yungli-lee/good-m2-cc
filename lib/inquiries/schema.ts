import { z } from "zod";

export const inquirySchema = z.object({
  form_type: z.string().trim().min(1).max(50).default("service-form"),
  name: z.string().trim().min(2).max(20).refine((value) => !/^\d+$/.test(value) && /[\p{L}\p{N}]/u.test(value), "請輸入正確姓名"),
  phone: z.string().trim().regex(/^09\d{8}$/),
  email: z.string().trim().email().optional().or(z.literal("")),
  message: z.string().trim().min(10).max(1000),
  property_id: z.string().uuid().optional().or(z.literal("")),
  source_page: z.string().trim().max(300).optional().or(z.literal("")),
  website: z.string().trim().optional().default(""),
  turnstile_token: z.string().trim().optional().or(z.literal(""))
});

export const inquiryStatusSchema = z.enum(["new", "contacted", "in_progress", "closed", "spam"]);

export const inquiryNoteSchema = z.object({
  internal_note: z.string().trim().max(4000).default("")
});

export function publicInquiryMessage(error: string) {
  const messages: Record<string, string> = {
    invalid_phone: "請輸入正確手機號碼",
    invalid_email: "請輸入正確 Email",
    invalid_name: "請輸入正確姓名",
    invalid_message: "請簡單描述您的需求，至少 10 個字"
  };
  return messages[error] || "送出失敗，請稍後再試";
}
