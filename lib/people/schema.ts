import { z } from "zod";
import { personRoleNames, personSources, personStatuses } from "@/lib/people/constants";
import type { PersonRoleName, PersonSource, PersonStatus } from "@/lib/people/types";

export const peopleSortOptions = [
  "newest",
  "oldest",
  "last_contacted_at",
  "display_name"
] as const;

export type PeopleSort = (typeof peopleSortOptions)[number];

export const personFormSchema = z.object({
  display_name: z.string().trim().min(1, "請輸入顯示名稱").max(120, "顯示名稱過長"),
  legal_name: z.string().trim().max(120, "正式姓名過長").optional().or(z.literal("")),
  phone: z.string().trim().max(40, "電話過長").optional().or(z.literal("")),
  line_id: z.string().trim().max(120, "Line ID 過長").optional().or(z.literal("")),
  email: z.string().trim().email("Email 格式不正確").optional().or(z.literal("")),
  address: z.string().trim().max(240, "地址過長").optional().or(z.literal("")),
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
  address: string;
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
    address: "",
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
    address: String(formData.get("address") || ""),
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
