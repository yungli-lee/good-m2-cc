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

export function markdownToHtml(markdown?: string | null) {
  const lines = String(markdown || "").replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let list: string[] = [];
  let paragraph: string[] = [];
  const flushParagraph = () => { if (paragraph.length) blocks.push(`<p>${paragraph.map(escapeHtml).join("<br>")}</p>`); paragraph = []; };
  const flushList = () => { if (list.length) blocks.push(`<ul>${list.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`); list = []; };
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) { flushParagraph(); flushList(); continue; }
    if (line.startsWith("### ")) { flushParagraph(); flushList(); blocks.push(`<h3>${escapeHtml(line.slice(4))}</h3>`); continue; }
    if (line.startsWith("## ")) { flushParagraph(); flushList(); blocks.push(`<h2>${escapeHtml(line.slice(3))}</h2>`); continue; }
    if (line.startsWith("- ") || line.startsWith("* ")) { flushParagraph(); list.push(line.slice(2)); continue; }
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
