import { z } from "zod";
import {
  personActivityChannels,
  personActivityTypes,
  personRoleNames,
  personSources,
  personStatuses
} from "@/lib/people/constants";
import type { PersonRoleName, PersonSource, PersonStatus } from "@/lib/people/types";

export const peopleSortOptions = [
  "newest",
  "oldest",
  "last_contacted_at",
  "display_name"
] as const;

export type PeopleSort = (typeof peopleSortOptions)[number];

export const followUpModes = ["keep", "set", "clear"] as const;

const taipeiDateTimePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

export const personActivityFormSchema = z.object({
  activity_type: z.enum(personActivityTypes),
  channel: z.enum(personActivityChannels).optional().or(z.literal("")),
  summary: z.string().trim().min(1, "請輸入聯絡摘要").max(240, "摘要過長"),
  details: z.string().trim().max(4000, "詳細內容過長").optional().or(z.literal("")),
  occurred_at: z.string().regex(taipeiDateTimePattern, "聯絡時間格式不正確"),
  follow_up_mode: z.enum(followUpModes).default("keep"),
  next_follow_up_at: z.string().optional().or(z.literal(""))
}).superRefine((value, context) => {
  if (value.next_follow_up_at && !taipeiDateTimePattern.test(value.next_follow_up_at)) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["next_follow_up_at"], message: "跟進時間格式不正確" });
  }
  if (value.follow_up_mode === "set" && !value.next_follow_up_at) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["next_follow_up_at"], message: "請設定下一次跟進時間" });
  }
});

export const personActivityEditSchema = z.object({
  activity_type: z.enum(personActivityTypes),
  channel: z.enum(personActivityChannels).optional().or(z.literal("")),
  summary: z.string().trim().min(1, "請輸入聯絡摘要").max(240, "摘要過長"),
  details: z.string().trim().max(4000, "詳細內容過長").optional().or(z.literal("")),
  occurred_at: z.string().regex(taipeiDateTimePattern, "聯絡時間格式不正確")
});

export function taipeiDateTimeToIso(value: string) {
  return new Date(`${value}:00+08:00`).toISOString();
}

export const personFormSchema = z.object({
  display_name: z.string().trim().min(1, "請輸入顯示名稱").max(120, "顯示名稱過長"),
  legal_name: z.string().trim().max(120, "正式姓名過長").optional().or(z.literal("")),
  phone: z.string().trim().max(40, "電話過長").optional().or(z.literal("")),
  line_id: z.string().trim().max(120, "Line ID 過長").optional().or(z.literal("")),
  email: z.string().trim().email("Email 格式不正確").optional().or(z.literal("")),
  source: z.enum(personSources),
  status: z.enum(personStatuses),
  assigned_to: z.string().uuid("負責人格式不正確").optional().or(z.literal("")),
  notes: z.string().trim().max(4000, "備註過長").optional().or(z.literal("")),
  roles: z.array(z.enum(personRoleNames)).default([])
});

export type PersonFormInput = z.infer<typeof personFormSchema>;

export type PersonFormValues = {
  display_name: string;
  legal_name: string;
  phone: string;
  line_id: string;
  email: string;
  source: PersonSource;
  status: PersonStatus;
  assigned_to: string;
  notes: string;
  roles: PersonRoleName[];
};

export type PersonFormState = {
  values: PersonFormValues;
  fieldErrors: Partial<Record<keyof PersonFormValues, string>>;
  formError?: string;
};

export function defaultPersonFormValues(): PersonFormValues {
  return {
    display_name: "",
    legal_name: "",
    phone: "",
    line_id: "",
    email: "",
    source: "manual",
    status: "active",
    assigned_to: "",
    notes: "",
    roles: []
  };
}

export function personValuesFromFormData(formData: FormData): PersonFormValues {
  const roles = formData
    .getAll("roles")
    .map((value) => String(value))
    .filter((value): value is PersonRoleName => personRoleNames.includes(value as PersonRoleName));

  return {
    display_name: String(formData.get("display_name") || ""),
    legal_name: String(formData.get("legal_name") || ""),
    phone: String(formData.get("phone") || ""),
    line_id: String(formData.get("line_id") || ""),
    email: String(formData.get("email") || ""),
    source: (String(formData.get("source") || "manual") || "manual") as PersonSource,
    status: (String(formData.get("status") || "active") || "active") as PersonStatus,
    assigned_to: String(formData.get("assigned_to") || ""),
    notes: String(formData.get("notes") || ""),
    roles
  };
}

export function personFieldErrors(error: z.ZodError<PersonFormInput>) {
  return error.issues.reduce<PersonFormState["fieldErrors"]>((errors, issue) => {
    const field = issue.path[0];
    if (typeof field === "string" && field in defaultPersonFormValues()) {
      errors[field as keyof PersonFormValues] = issue.message;
    }
    return errors;
  }, {});
}

export function normalizePersonFormValues(values: PersonFormValues): PersonFormInput {
  return personFormSchema.parse({
    ...values,
    legal_name: values.legal_name || "",
    phone: values.phone || "",
    line_id: values.line_id || "",
    email: values.email || "",
    assigned_to: values.assigned_to || "",
    notes: values.notes || "",
    roles: values.roles
  });
}
