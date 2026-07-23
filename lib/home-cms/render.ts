import type { HomeCampaign, KnownSitePageKey, SitePage, SitePageKey } from "@/lib/home-cms/types";
import type { CompanySettings } from "@/lib/company-settings";

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

function safeImageUrl(value: string) {
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function markdownToHtml(markdown?: string | null) {
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
    const image = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (image) {
      flushParagraph();
      flushList();
      const src = safeImageUrl(image[2]);
      if (src) {
        blocks.push(
          `<figure class="cms-inline-image"><img src="${escapeAttr(src)}" alt="${escapeAttr(image[1])}" loading="lazy"></figure>`
        );
      }
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

function renderGenericCmsSection(page: PageForRender, id: SitePageKey, defaultEyebrow: string) {
  const cover = imageUrl(page);
  const coverHtml = cover
    ? `<figure class="cms-section-cover"><img src="${escapeAttr(cover)}" alt="${escapeAttr(page.title)}" loading="lazy"></figure>`
    : "";
  return `
      <section class="intro-band cms-managed-section" id="${id}">
        <div class="section-heading">
          <p class="eyebrow">${escapeHtml(page.eyebrow || defaultEyebrow)}</p>
          <h2>${escapeHtml(page.title)}</h2>
          ${page.subtitle ? `<p>${escapeHtml(page.subtitle)}</p>` : ""}
        </div>
        ${coverHtml}
        <div class="cms-markdown-body">${markdownToHtml(page.markdown_content)}</div>
      </section>`;
}

function renderReminderCard(page: PageForRender) {
  const cover = imageUrl(page);
  const coverHtml = cover
    ? `<figure class="cms-reminder-cover"><img src="${escapeAttr(cover)}" alt="${escapeAttr(page.title)}" loading="lazy"></figure>`
    : "";

  return `
          <article class="article-card" data-reminder-slug="${escapeAttr(page.page_key)}">
            <button type="button" class="article-toggle">
              <span>
                <strong>${escapeHtml(page.title)}</strong>
                ${page.subtitle ? `<small>${escapeHtml(page.subtitle)}</small>` : ""}
              </span>
              <b>展開</b>
            </button>
            <div class="article-body">
              ${coverHtml}
              <div class="cms-markdown-body">${markdownToHtml(page.markdown_content)}</div>
              <p><a href="/${escapeAttr(page.page_key)}">閱讀完整內容</a></p>
            </div>
          </article>`;
}

function renderRemindersSection(pages: PageForRender[]) {
  return `
      <section class="life cms-reminders-section" id="reminders">
        <div class="section-heading">
          <p class="eyebrow">Life Notes</p>
          <h2>阿勇生活小提醒</h2>
          <p>生活中，很多問題不是不懂，而是沒有人提醒。這裡整理一些日常生活智慧，逐漸增加中。</p>
        </div>
        <div class="article-grid">
          ${pages.map(renderReminderCard).join("")}
        </div>
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
  pages: PageForRender[],
  company?: CompanySettings | null
) {
  let html = staticHtml;

  if (company) {
    const replacements = [
      ["/assets/logo-yongmei.jpeg", company.logo_url],
      ["https://line.me/ti/p/abQv5LYzzE", company.line_url],
      ["tel:0938137177", company.company_phone ? `tel:${company.company_phone.replace(/[^\d+]/g, "")}` : ""],
      ["mailto:best@m2.cc", company.company_email ? `mailto:${company.company_email}` : ""],
      ["https://m.facebook.com/p0938137177/", company.facebook_url],
      ["https://youtube.com/channel/UCkHgKlrQTko0FPyAtYC9KBA?si=Dyyb72tdYhEM1IIx", company.youtube_url],
      ["https://www.tiktok.com/@buyhouse4", company.tiktok_url]
    ] as const;
    for (const [fallback, configured] of replacements) {
      if (configured) html = html.split(fallback).join(configured);
    }
    if (company.company_email) html = html.split("best@m2.cc").join(company.company_email);
    if (company.company_phone) html = html.split("0938-137-177").join(company.company_phone);
    if (company.logo_url) {
      html = html.replace('alt="勇美標誌"', `alt="${escapeAttr(company.company_name)}標誌"`);
    }
    const legal = [
      company.company_name,
      company.franchise_name,
      company.brokerage_license_no,
      company.realtor_certificate_no,
      company.company_address
    ].filter(Boolean).map((value) => `<small>${escapeHtml(value)}</small>`).join("");
    if (legal) {
      html = html.replace(
        /(<div class="site-footer">[\s\S]*?)(<\/div>\s*<\/footer>)/i,
        `$1<div class="cms-company-legal">${legal}</div>$2`
      );
    }
  }

  if (campaigns.length) {
    html = html.replace(/<section\b[^>]*class=["']hero["'][^>]*>[\s\S]*?<\/section>/i, renderCampaignHero(campaigns));
  }

  const reminders = pages.filter((page) => page.page_type === "reminder");
  if (reminders.length) {
    const remindersRegex = sectionRegex("reminders");
    if (remindersRegex.test(html)) {
      html = html.replace(remindersRegex, renderRemindersSection(reminders));
    }
  }

  for (const page of pages) {
    if (page.page_type === "reminder") continue;
    const key: SitePageKey = page.page_type === "contact"
      ? "team"
      : page.page_type === "philosophy" || page.page_type === "services"
        ? page.page_type
        : page.page_key;
    if (!isKnownSitePageKey(key)) {
      console.warn("home_cms_unsupported_section", {
        pageKey: page.page_key,
        pageType: page.page_type
      });
      continue;
    }
    const regex = sectionRegex(key);
    if (regex.test(html)) {
      html = html.replace(regex, renderGenericCmsSection(page, key, pageEyebrows[key]));
    }
  }

  return html;
}
