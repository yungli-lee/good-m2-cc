import type { HomeCampaign, KnownSitePageKey, SitePage, SitePageKey } from "@/lib/home-cms/types";

type CampaignForRender = HomeCampaign & { media_public_url?: string | null };
type PageForRender = SitePage & { media_public_url?: string | null };

function escapeHtml(value?: string | null) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value?: string | null) {
  return escapeHtml(value).replace(/'/g, "&#39;");
}

function markdownToHtml(markdown?: string | null) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let list: string[] = [];
  let paragraph: string[] = [];

  function flushParagraph() {
    if (!paragraph.length) return;
    blocks.push(`<p>${paragraph.map(escapeHtml).join("<br>")}</p>`);
    paragraph = [];
  }

  function flushList() {
    if (!list.length) return;
    blocks.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`);
    list = [];
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }
    if (line.startsWith("### ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h3>${escapeHtml(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      flushParagraph();
      flushList();
      blocks.push(`<h2>${escapeHtml(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      list.push(line.slice(2));
      continue;
    }
    paragraph.push(line);
  }

  flushParagraph();
  flushList();
  return blocks.join("");
}

function sectionRegex(id: string) {
  return new RegExp(`<section\\b(?=[^>]*\\bid=["']${id}["'])[^>]*>[\\s\\S]*?<\\/section>`, "i");
}

function imageUrl(item: { media_public_url?: string | null; fallback_image_url?: string | null; fallback_cover_url?: string | null }) {
  return item.media_public_url || item.fallback_image_url || item.fallback_cover_url || "";
}

function renderCampaign(campaign: CampaignForRender, index: number) {
  const src = imageUrl(campaign) || "/assets/hero-ayong-wu-laptop.jpeg";
  const alt = campaign.image_alt || campaign.media_assets?.alt_text || campaign.title;
  const hidden = index === 0 ? "" : " hidden";
  const primaryLabel = campaign.cta_label || "Line 阿勇諮詢";
  const primaryHref = campaign.cta_href || "https://line.me/ti/p/abQv5LYzzE";
  const secondary = campaign.secondary_cta_label && campaign.secondary_cta_href
    ? `<a class="button" href="${escapeAttr(campaign.secondary_cta_href)}">${escapeHtml(campaign.secondary_cta_label)}</a>`
    : "";

  return `
        <div class="home-campaign-slide"${hidden} data-home-campaign-slide>
          <div class="hero-media">
            <img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}">
          </div>
          <div class="hero-copy">
            ${campaign.eyebrow ? `<p class="eyebrow">${escapeHtml(campaign.eyebrow)}</p>` : ""}
            <h1>${escapeHtml(campaign.title)}</h1>
            ${campaign.subtitle ? `<p>${escapeHtml(campaign.subtitle)}</p>` : ""}
            ${campaign.body ? `<p>${escapeHtml(campaign.body)}</p>` : ""}
            <div class="hero-actions">
              <a class="button primary" href="${escapeAttr(primaryHref)}">${escapeHtml(primaryLabel)}</a>
              ${secondary}
            </div>
          </div>
        </div>`;
}

function renderCampaignHero(campaigns: CampaignForRender[]) {
  const slides = campaigns.map(renderCampaign).join("");
  const controls = campaigns.length > 1
    ? `<div class="home-campaign-controls" aria-label="首頁檔期切換">
        ${campaigns.map((campaign, index) => `<button type="button" data-home-campaign-dot="${index}" aria-label="切換到 ${escapeAttr(campaign.title)}"${index === 0 ? ` aria-current="true"` : ""}></button>`).join("")}
      </div>`
    : "";
  return `<section class="hero home-campaign-carousel" data-home-campaign-carousel>${slides}${controls}</section>`;
}

function renderGenericCmsSection(page: PageForRender, id: SitePageKey, eyebrow: string) {
  const cover = imageUrl(page);
  const coverHtml = cover
    ? `<figure class="cms-section-cover"><img src="${escapeAttr(cover)}" alt="${escapeAttr(page.title)}" loading="lazy"></figure>`
    : "";
  return `
      <section class="intro-band cms-managed-section" id="${id}">
        <div class="section-heading">
          <p class="eyebrow">${eyebrow}</p>
          <h2>${escapeHtml(page.title)}</h2>
          ${page.subtitle ? `<p>${escapeHtml(page.subtitle)}</p>` : ""}
        </div>
        ${coverHtml}
        <div class="cms-markdown-body">${markdownToHtml(page.markdown_content)}</div>
      </section>`;
}

const pageEyebrows: Record<KnownSitePageKey, string> = {
  philosophy: "Service Philosophy",
  services: "Services",
  process: "Buying Process",
  reminders: "Life Notes",
  team: "Contact"
};

function isKnownSitePageKey(key: SitePageKey): key is KnownSitePageKey {
  return ["philosophy", "services", "process", "reminders", "team"].includes(key);
}

export function renderHomeCmsHtml(
  staticHtml: string,
  campaigns: CampaignForRender[],
  pages: Map<SitePageKey, PageForRender>
) {
  let html = staticHtml;

  if (campaigns.length) {
    html = html.replace(/<section\b[^>]*class=["']hero["'][^>]*>[\s\S]*?<\/section>/i, renderCampaignHero(campaigns));
  }

  for (const [key, page] of pages) {
    if (!isKnownSitePageKey(key)) continue;
    const regex = sectionRegex(key);
    if (!regex.test(html)) continue;
    html = html.replace(regex, renderGenericCmsSection(page, key, pageEyebrows[key]));
  }

  return html;
}
