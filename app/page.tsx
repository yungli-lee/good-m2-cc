import { readFileSync } from "node:fs";
import path from "node:path";
import Script from "next/script";
import { formatPing, formatPrice } from "@/lib/format";
import { listFeaturedProperties } from "@/lib/properties/queries";
import { getCoverMedia, type Property } from "@/lib/properties/types";

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] || character);
}

function renderFeaturedPropertyCards(properties: Property[]) {
  return properties.map((property) => {
    const cover = getCoverMedia(property);
    const image = cover?.url
      ? `<img src="${escapeHtml(cover.url)}" alt="${escapeHtml(cover.alt_text || property.title)}" loading="lazy">`
      : "";
    const highlights = Array.isArray(property.highlights) ? property.highlights.slice(0, 2).join("、") : "";

    return `
      <article>
        ${image}
        <h3>${escapeHtml(property.title)}</h3>
        <p><strong>${escapeHtml(formatPrice(property.price))}</strong></p>
        <p>${escapeHtml(property.address_public || "地址洽詢")}</p>
        <p>土地 ${escapeHtml(formatPing(property.land_area_ping))} / 建物 ${escapeHtml(formatPing(property.building_area_ping))}</p>
        <p>${escapeHtml(property.layout || "格局洽詢")}</p>
        ${highlights ? `<p>${escapeHtml(highlights)}</p>` : ""}
        <a class="button" href="/properties/${encodeURIComponent(property.slug)}">查看詳情</a>
      </article>
    `;
  }).join("");
}

function injectFeaturedProperties(body: string, properties: Property[]) {
  if (!properties.length) return body;

  return body
    .replace(
      /<div class="problem-grid" id="featured-property-list" data-featured-property-list><\/div>/,
      `<div class="problem-grid" id="featured-property-list" data-featured-property-list>${renderFeaturedPropertyCards(properties)}</div>`,
    )
    .replace(
      /<p class="note" data-featured-property-empty>/,
      `<p class="note" data-featured-property-empty hidden>`,
    );
}

async function getFeaturedProperties() {
  try {
    const { data, error } = await listFeaturedProperties(3);
    if (error) return [];
    return (data || []) as Property[];
  } catch {
    return [];
  }
}

async function readStaticHomeBody() {
  const html = readFileSync(path.join(process.cwd(), "content/static-home.html"), "utf8");
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const properties = await getFeaturedProperties();
  const body = injectFeaturedProperties(match?.[1] || html, properties);

  return body.replace(
    /<script\b[^>]*\bsrc=["']\/legacy-static\/script\.js["'][^>]*>\s*<\/script>/gi,
    "",
  );
}

export default async function HomePage() {
  return (
    <>
      <link rel="stylesheet" href="/legacy-static/styles.css" />
      <div dangerouslySetInnerHTML={{ __html: await readStaticHomeBody() }} />
      <Script src="/legacy-static/script.js" strategy="afterInteractive" />
    </>
  );
}
