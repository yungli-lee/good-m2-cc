function escapeHtml(value?: string | null) {
  return String(value || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
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

function safeLinkUrl(value: string) {
  const url = value.trim();
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  if (url.startsWith("#")) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" || parsed.protocol === "mailto:" || parsed.protocol === "tel:" ? parsed.toString() : "";
  } catch {
    return "";
  }
}

export function normalizeMarkdown(markdown?: string | null) {
  return String(markdown || "")
    .replace(/\r\n/g, "\n")
    .replace(/^(#{1,6})([^#\s].*)$/gm, "$1 $2");
}

function inlineMarkdown(value: string) {
  let escaped = escapeHtml(value);
  escaped = escaped.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  escaped = escaped.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  return escaped.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, rawHref: string) => {
    const href = safeLinkUrl(rawHref);
    return href ? `<a href="${escapeHtml(href)}">${label}</a>` : `[${label}](${escapeHtml(rawHref)})`;
  });
}

export function markdownToHtml(markdown?: string | null) {
  const lines = normalizeMarkdown(markdown).split("\n");
  const blocks: string[] = [];
  let list: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let paragraph: string[] = [];
  const flushParagraph = () => { if (paragraph.length) blocks.push(`<p>${paragraph.map(inlineMarkdown).join("<br>")}</p>`); paragraph = []; };
  const flushList = () => {
    if (list.length && listType) blocks.push(`<${listType}>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</${listType}>`);
    list = [];
    listType = null;
  };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    if (line.startsWith("### ")) { flushParagraph(); flushList(); blocks.push(`<h3>${inlineMarkdown(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## ")) { flushParagraph(); flushList(); blocks.push(`<h2>${inlineMarkdown(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushParagraph();
      if (listType && listType !== "ul") flushList();
      listType = "ul";
      list.push(line.slice(2));
      continue;
    }
    const orderedItem = line.match(/^\d+\.\s+(.+)$/);
    if (orderedItem) {
      flushParagraph();
      if (listType && listType !== "ol") flushList();
      listType = "ol";
      list.push(orderedItem[1]);
      continue;
    }
    const image = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if (image) {
      flushParagraph(); flushList();
      const src = safeImageUrl(image[2]);
      if (src) blocks.push(`<figure class="cms-inline-image"><img src="${src.replace(/"/g, "&quot;")}" alt="${escapeHtml(image[1])}" loading="lazy"></figure>`);
      continue;
    }
    paragraph.push(line);
  }
  flushParagraph(); flushList();
  return blocks.join("");
}
