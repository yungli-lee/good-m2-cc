import { z } from "zod";

export const navigationLocations = ["header", "mobile", "footer"] as const;
export type NavigationLocation = (typeof navigationLocations)[number];
export type NavigationTarget = "_self" | "_blank";

type NavigationPage = {
  page_key: string;
  status: "draft" | "published" | "archived";
  archived_at: string | null;
};

export type NavigationItem = {
  id: string;
  item_key: string;
  location: NavigationLocation;
  label: string;
  page_id: string | null;
  href: string | null;
  target: NavigationTarget;
  sort_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
  site_pages?: NavigationPage | null;
};

export type ResolvedNavigationItem = Pick<
  NavigationItem,
  "id" | "item_key" | "location" | "label" | "target" | "sort_order"
> & { href: string };

const internalHref = /^\/(?:[A-Za-z0-9\-._~%!$&'()*+,;=:@/]*)?(?:#[A-Za-z0-9\-._~%!$&'()*+,;=:@/]*)?$/;

export const navigationItemSchema = z.object({
  item_key: z.string().trim().min(1).max(80).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  location: z.enum(navigationLocations),
  label: z.string().trim().min(1).max(80),
  page_id: z.string().trim().uuid().optional().or(z.literal("")),
  href: z.string().trim().max(800).optional().or(z.literal("")),
  target: z.enum(["_self", "_blank"]).default("_self"),
  sort_order: z.coerce.number().int().min(0).default(1000),
  is_visible: z.preprocess((value) => value === "on" || value === "true" || value === true, z.boolean())
}).superRefine((value, context) => {
  const hasPage = Boolean(value.page_id);
  const hasHref = Boolean(value.href);
  if (hasPage === hasHref) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["href"],
      message: "請只選擇一個 CMS 頁面，或只填寫一個固定／外部連結。"
    });
  }
  if (value.href && !internalHref.test(value.href)) {
    try {
      const url = new URL(value.href);
      if (!["https:", "http:"].includes(url.protocol)) throw new Error("unsupported_protocol");
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["href"],
        message: "連結必須是站內 / 路徑，或 http/https URL。"
      });
    }
  }
});

export function resolveNavigationItem(item: NavigationItem): ResolvedNavigationItem | null {
  const page = item.site_pages;
  const href = item.page_id
    ? page?.status === "published" && !page.archived_at ? `/${page.page_key}` : null
    : item.href;
  if (!href) return null;
  return {
    id: item.id,
    item_key: item.item_key,
    location: item.location,
    label: item.label,
    target: item.target,
    sort_order: item.sort_order,
    href
  };
}
