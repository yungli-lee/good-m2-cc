import type { CompanySettings } from "@/lib/company-settings";
import type { HomeCampaign, SitePage } from "@/lib/home-cms/types";
import type { ResolvedNavigationItem } from "@/lib/navigation";
import { isHomepageSectionType } from "./registry.ts";

export type HomepageSectionType = "hero" | "content" | "reminders";
export type HomepageSection = { key:string; type:HomepageSectionType; enabled:boolean; order:number; title:string; eyebrow:string|null; summary:string|null; body:string|null; image:string|null; imageAlt:string|null; ctaLabel:string|null; ctaUrl:string|null };
export type HomepageViewModel = { company:CompanySettings; navigation:ResolvedNavigationItem[]; sections:HomepageSection[]; seo:{title:string;description:string;canonical:string} };
const imageUrl=(item:{media_public_url?:string|null;fallback_image_url?:string|null;fallback_cover_url?:string|null})=>item.media_public_url||item.fallback_image_url||item.fallback_cover_url||null;
export function buildHomepageViewModel(input:{company:CompanySettings;navigation:ResolvedNavigationItem[];campaigns:Array<HomeCampaign & {media_public_url?:string|null}>;pages:Array<SitePage & {media_public_url?:string|null}>}):HomepageViewModel {
 const sections:HomepageSection[]=input.campaigns.map((c,i)=>({key:`campaign:${c.id}`,type:"hero",enabled:c.status==="published"&&!c.archived_at,order:c.sort_order??i,title:c.title,eyebrow:c.eyebrow,summary:c.subtitle,body:c.body,image:imageUrl(c)||"/assets/hero-ayong-wu-laptop.jpeg",imageAlt:c.image_alt||c.media_assets?.alt_text||c.title,ctaLabel:c.cta_label||"Line 阿勇諮詢",ctaUrl:c.cta_href||input.company.line_url}));
 for(const [i,p] of input.pages.entries()) { const type=p.page_type==="reminder"?"reminders":"content"; if(!isHomepageSectionType(type)) continue; sections.push({key:`page:${p.page_key}`,type,enabled:p.status==="published"&&!p.archived_at,order:100+(p.sort_order??i),title:p.title,eyebrow:p.eyebrow,summary:p.subtitle,body:p.markdown_content,image:imageUrl(p),imageAlt:p.media_assets?.alt_text||p.title,ctaLabel:null,ctaUrl:null}); }
 return {company:input.company,navigation:input.navigation,sections:sections.filter(s=>s.enabled).sort((a,b)=>a.order-b.order),seo:{title:input.company.brand_name,description:input.company.brand_tagline,canonical:"https://good.m2.cc/"}};
}
