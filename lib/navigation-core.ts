import { z } from "zod";

export const navigationLocations = ["header", "mobile", "footer"] as const;
export type NavigationLocation = (typeof navigationLocations)[number];
export type NavigationTarget = "_self" | "_blank";

type NavigationPage = {
  page_key: string;
  page_type: string;
  status: "draft" | "published" | "archived";
  archived_at: string | null;
  show_as_page: boolean;
  show_on_homepage: boolean;
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

function homeAnchor(page: NavigationPage) {
  if (page.page_type === "contact") return "team";
  if (page.page_type === "reminder") return "reminders";
  return page.page_key;
}

function pageHref(page: NavigationPage) {
  if (page.status !== "published" || page.archived_at) return null;
  if (page.show_on_homepage) return `/#${homeAnchor(page)}`;
  if (page.show_as_page) return page.page_type === "contact" ? "/contact" : `/${page.page_key}`;
  return null;
}

export function resolveNavigationItem(item: NavigationItem, publishedPages?: NavigationPage[]): ResolvedNavigationItem | null {
  const page = item.site_pages;
  let href = item.page_id && page ? pageHref(page) : item.href;
  if (!item.page_id && publishedPages && href?.startsWith("/#")) {
    const anchor = href.slice(2);
    const managed = publishedPages.find((candidate) => homeAnchor(candidate) === anchor);
    href = managed ? pageHref(managed) : null;
  } else if (!item.page_id && publishedPages && href === "/contact") {
    const contact = publishedPages.find((candidate) => candidate.page_type === "contact");
    href = contact ? pageHref(contact) : null;
  }
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
