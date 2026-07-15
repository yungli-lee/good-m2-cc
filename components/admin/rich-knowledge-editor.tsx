"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import type { MediaLibraryAsset } from "@/lib/media";

type LinkDraft = {
  href: string;
  nofollow: boolean;
};

type ImageWidth = "25%" | "50%" | "75%" | "100%";
type ImageAlign = "left" | "center" | "right";

type DropView = {
  posAtCoords: (coords: { left: number; top: number }) => { pos: number } | null;
};

type HtmlEditor = {
  getHTML: () => string;
};

type Props = {
  disabled?: boolean;
  focusImageUrl?: string | null;
  insertImageRequest?: { asset: MediaLibraryAsset; id: number } | null;
  onChange: (markdown: string) => void;
  onDirty: () => void;
  value: string;
};

const goodOrigin = "https://good.m2.cc";
const imageWidths: ImageWidth[] = ["25%", "50%", "75%", "100%"];
const imageAlignments: Array<{ value: ImageAlign; label: string }> = [
  { value: "left", label: "靠左" },
  { value: "center", label: "置中" },
  { value: "right", label: "靠右" }
];

const internalRouteSuggestions = [
  { label: "知識中心", href: "/knowledge" },
  { label: "物件列表", href: "/properties" },
  { label: "房貸試算", href: "/calculator/mortgage" },
  { label: "買方成本試算", href: "/calculator/purchase-cost" },
  { label: "試算工具", href: "/calculator" },
  { label: "聯絡 / 諮詢", href: "/contact" },
  { label: "首頁", href: "/" }
];

function escapeHtml(value?: string | null) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeMarkdown(value?: string | null) {
  return String(value || "")
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\n/g, " ")
    .trim();
}

function parseImageTitle(value?: string | null) {
  const raw = String(value || "").trim();
  const widthMatch = raw.match(/\bwidth=(25%|50%|75%|100%)\b/i);
  const alignMatch = raw.match(/\balign=(left|center|right)\b/i);
  return {
    caption: raw.replace(/\s*\bwidth=(25%|50%|75%|100%)\b/gi, "").replace(/\s*\balign=(left|center|right)\b/gi, "").trim(),
    width: (widthMatch?.[1] || "100%") as ImageWidth,
    align: (alignMatch?.[1] || "center") as ImageAlign
  };
}

function imageTitle(caption?: string | null, width: ImageWidth = "100%", align: ImageAlign = "center") {
  return [escapeMarkdown(caption), `width=${width}`, `align=${align}`].filter(Boolean).join(" ");
}

function isExternalUrl(href: string) {
  if (!href) return false;
  if (href.startsWith("/")) return false;
  try {
    const url = new URL(href, goodOrigin);
    return url.origin !== goodOrigin;
  } catch {
    return false;
  }
}

function linkAttrs(href: string, nofollow = false) {
  const external = isExternalUrl(href);
  return {
    href,
    target: external ? "_blank" : null,
    rel: external ? `noopener noreferrer${nofollow ? " nofollow" : ""}` : null
  };
}

function inlineMarkdownToHtml(value: string) {
  const parts: string[] = [];
  let cursor = 0;
  const linkPattern = /\[([^\]]+)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)/g;
  let match: RegExpExecArray | null;

  while ((match = linkPattern.exec(value)) !== null) {
    parts.push(escapeHtml(value.slice(cursor, match.index)));
    const href = match[2] || "";
    const nofollow = /nofollow/i.test(match[3] || "");
    const attrs = linkAttrs(href, nofollow);
    const rel = attrs.rel ? ` rel="${escapeHtml(attrs.rel)}"` : "";
    const target = attrs.target ? ` target="${attrs.target}"` : "";
    parts.push(`<a href="${escapeHtml(attrs.href)}"${target}${rel}>${escapeHtml(match[1])}</a>`);
    cursor = match.index + match[0].length;
  }

  parts.push(escapeHtml(value.slice(cursor)));
  return parts.join("");
}

function markdownToHtml(markdown: string) {
  const blocks = String(markdown || "")
    .split(/\r?\n[\t ]*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks.map((block) => {
    if (/^---+$/.test(block)) return "<hr>";
    const heading = block.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      return `<h${level}>${inlineMarkdownToHtml(heading[2])}</h${level}>`;
    }

    const image = block.match(/^!\[([^\]]*)\]\((\S+?)(?:\s+["']([^"']*)["'])?\)$/);
    if (image) {
      const meta = parseImageTitle(image[3]);
      const title = imageTitle(meta.caption, meta.width, meta.align);
      return `<img src="${escapeHtml(image[2])}" alt="${escapeHtml(image[1])}" title="${escapeHtml(title)}" data-width="${meta.width}" data-align="${meta.align}">`;
    }

    if (/^https?:\/\/\S+$/i.test(block) && /\.(avif|gif|jpe?g|png|webp)([?#].*)?$/i.test(block)) {
      return `<img src="${escapeHtml(block)}" alt="">`;
    }

    if (block.startsWith(">")) return `<blockquote><p>${inlineMarkdownToHtml(block.replace(/^>\s?/gm, ""))}</p></blockquote>`;

    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((line) => /^[-*]\s+/.test(line))) {
      return `<ul>${lines.map((line) => `<li>${inlineMarkdownToHtml(line.replace(/^[-*]\s+/, ""))}</li>`).join("")}</ul>`;
    }
    if (lines.length > 1 && lines.every((line) => /^\d+\.\s+/.test(line))) {
      return `<ol>${lines.map((line) => `<li>${inlineMarkdownToHtml(line.replace(/^\d+\.\s+/, ""))}</li>`).join("")}</ol>`;
    }

    return `<p>${inlineMarkdownToHtml(block).replace(/\n/g, "<br>")}</p>`;
  }).join("");
}

function textFromNode(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (!(node instanceof HTMLElement)) return "";

  if (node.tagName === "A") {
    const href = node.getAttribute("href") || "";
    const text = Array.from(node.childNodes).map(textFromNode).join("") || href;
    const nofollow = /\bnofollow\b/i.test(node.getAttribute("rel") || "");
    return nofollow ? `[${escapeMarkdown(text)}](${href} "nofollow")` : `[${escapeMarkdown(text)}](${href})`;
  }

  if (node.tagName === "BR") return "\n";
  return Array.from(node.childNodes).map(textFromNode).join("");
}

function htmlToMarkdown(html: string) {
  if (typeof window === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks: string[] = [];

  doc.body.childNodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) {
      const text = textFromNode(node).trim();
      if (text) blocks.push(text);
      return;
    }

    const tag = node.tagName;
    if (/^H[1-3]$/.test(tag)) {
      blocks.push(`${"#".repeat(Number(tag[1]))} ${textFromNode(node).trim()}`);
      return;
    }
    if (tag === "IMG") {
      const src = node.getAttribute("src") || "";
      const alt = node.getAttribute("alt") || "";
      const title = node.getAttribute("title") || "";
      const width = (node.getAttribute("data-width") || parseImageTitle(title).width) as ImageWidth;
      const align = (node.getAttribute("data-align") || parseImageTitle(title).align) as ImageAlign;
      const caption = parseImageTitle(title).caption;
      if (src) blocks.push(`![${escapeMarkdown(alt)}](${src} "${imageTitle(caption, width, align)}")`);
      return;
    }
    if (tag === "UL" || tag === "OL") {
      const items = Array.from(node.children).filter((child) => child.tagName === "LI");
      blocks.push(items.map((item, index) => `${tag === "OL" ? `${index + 1}.` : "-"} ${textFromNode(item).trim()}`).join("\n"));
      return;
    }
    if (tag === "BLOCKQUOTE") {
      blocks.push(textFromNode(node).split("\n").map((line) => `> ${line}`).join("\n"));
      return;
    }
    if (tag === "HR") {
      blocks.push("---");
      return;
    }

    const text = textFromNode(node).trim();
    if (text) blocks.push(text);
  });

  return blocks.filter(Boolean).join("\n\n");
}

function assetMarkdownAttrs(asset: MediaLibraryAsset) {
  return {
    src: asset.public_url,
    alt: asset.alt_text || "",
    title: imageTitle(asset.caption),
    width: "100%",
    align: "center"
  };
}

const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (element) => element.getAttribute("data-width") || parseImageTitle(element.getAttribute("title")).width,
        renderHTML: (attributes) => ({ "data-width": attributes.width || "100%" })
      },
      align: {
        default: "center",
        parseHTML: (element) => element.getAttribute("data-align") || parseImageTitle(element.getAttribute("title")).align,
        renderHTML: (attributes) => ({ "data-align": attributes.align || "center" })
      }
    };
  },
  renderHTML({ HTMLAttributes }) {
    const width = HTMLAttributes.width || HTMLAttributes["data-width"] || "100%";
    const align = HTMLAttributes.align || HTMLAttributes["data-align"] || "center";
    return ["img", {
      ...HTMLAttributes,
      "data-width": width,
      "data-align": align,
      style: `width:${width};max-width:100%;${align === "left" ? "margin-left:0;margin-right:auto;" : align === "right" ? "margin-left:auto;margin-right:0;" : "margin-left:auto;margin-right:auto;"}`
    }];
  }
});

export function RichKnowledgeEditor({ disabled = false, focusImageUrl, insertImageRequest, onChange, onDirty, value }: Props) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const insertedImageRequestIdRef = useRef<number | null>(null);
  const [linkDraft, setLinkDraft] = useState<LinkDraft>({ href: "", nofollow: false });
  const [linkPanelOpen, setLinkPanelOpen] = useState(false);
  const [dropNotice, setDropNotice] = useState<string | null>(null);
  const [imageMenu, setImageMenu] = useState<{ selected: boolean; width: ImageWidth; align: ImageAlign }>({ selected: false, width: "100%", align: "center" });
  const html = useMemo(() => markdownToHtml(value), [value]);
  const filteredRoutes = internalRouteSuggestions.filter((item) => {
    const q = linkDraft.href.trim().toLowerCase();
    if (!q) return true;
    return item.href.toLowerCase().includes(q) || item.label.toLowerCase().includes(q);
  });

  const editor = useEditor({
    editable: !disabled,
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      RichImage.configure({ inline: false, allowBase64: false }),
      Link.configure({
        autolink: true,
        openOnClick: false,
        linkOnPaste: true,
        HTMLAttributes: { rel: null, target: null }
      }),
      Placeholder.configure({ placeholder: "輸入知識文章內容，或從媒體中心插入圖片…" })
    ],
    content: html,
    editorProps: {
      handleDrop(view: DropView, event: DragEvent) {
        const url = event.dataTransfer?.getData("text/uri-list") || event.dataTransfer?.getData("text/plain") || "";
        if (url && /^https?:\/\//i.test(url) && /\.(avif|gif|jpe?g|png|webp)([?#].*)?$/i.test(url)) {
          const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
          if (coordinates) editor?.chain().focus().insertContentAt(coordinates.pos, { type: "image", attrs: { src: url, alt: "", width: "100%", align: "center" } }).run();
          else editor?.chain().focus().insertContent({ type: "image", attrs: { src: url, alt: "", width: "100%", align: "center" } }).run();
          event.preventDefault();
          return true;
        }
        if (event.dataTransfer?.files.length) {
          setDropNotice("請先將圖片上傳到媒體中心，再從媒體中心插入，避免本機檔案無法在前台顯示。");
          event.preventDefault();
          return true;
        }
        return false;
      }
    },
    onUpdate({ editor: activeEditor }: { editor: HtmlEditor }) {
      onChange(htmlToMarkdown(activeEditor.getHTML()));
      onDirty();
    },
    onSelectionUpdate({ editor: activeEditor }: { editor: { isActive: (name: string) => boolean; getAttributes: (name: string) => Record<string, unknown> } }) {
      const selected = activeEditor.isActive("image");
      const attrs = activeEditor.getAttributes("image");
      setImageMenu({
        selected,
        width: (attrs.width as ImageWidth) || "100%",
        align: (attrs.align as ImageAlign) || "center"
      });
    }
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === html) return;
    editor.commands.setContent(html, false);
  }, [editor, html]);

  useEffect(() => {
    if (!editor || !insertImageRequest) return;
    if (insertedImageRequestIdRef.current === insertImageRequest.id) return;
    insertedImageRequestIdRef.current = insertImageRequest.id;
    editor.chain().focus().insertContent({ type: "image", attrs: assetMarkdownAttrs(insertImageRequest.asset) }).run();
  }, [editor, insertImageRequest]);

  useEffect(() => {
    if (!focusImageUrl) return;
    const images = Array.from(surfaceRef.current?.querySelectorAll("img") || []);
    const target = images.find((image) => image.getAttribute("src") === focusImageUrl);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("is-located");
    const timer = window.setTimeout(() => target.classList.remove("is-located"), 1800);
    return () => window.clearTimeout(timer);
  }, [focusImageUrl]);

  function applyLink(href: string = linkDraft.href) {
    const cleanHref = href.trim();
    if (!editor || !cleanHref) return;
    editor.chain().focus().extendMarkRange("link").setLink(linkAttrs(cleanHref, linkDraft.nofollow)).run();
    setLinkDraft({ href: "", nofollow: false });
    setLinkPanelOpen(false);
  }

  function openLinkPanel() {
    if (!editor) return;
    const attrs = editor.getAttributes("link");
    setLinkDraft({
      href: String(attrs.href || ""),
      nofollow: /\bnofollow\b/i.test(String(attrs.rel || ""))
    });
    setLinkPanelOpen(true);
  }

  function updateSelectedImage(attrs: Partial<{ width: ImageWidth; align: ImageAlign }>) {
    if (!editor) return;
    editor.chain().focus().updateAttributes("image", attrs).run();
    onChange(htmlToMarkdown(editor.getHTML()));
    onDirty();
  }

  function removeSelectedImage() {
    if (!editor) return;
    editor.chain().focus().deleteSelection().run();
    onChange(htmlToMarkdown(editor.getHTML()));
    onDirty();
    setImageMenu({ selected: false, width: "100%", align: "center" });
  }

  return (
    <div className="rich-knowledge-editor">
      <div className="rich-editor-toolbar" aria-label="文章格式工具列">
        <button type="button" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
        <button type="button" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
        <button type="button" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleBold().run()}>粗體</button>
        <button type="button" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleItalic().run()}>斜體</button>
        <button type="button" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleUnderline().run()}>底線</button>
        <button type="button" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleBulletList().run()}>項目</button>
        <button type="button" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>編號</button>
        <button type="button" disabled={!editor || disabled} onClick={() => editor?.chain().focus().toggleBlockquote().run()}>引用</button>
        <button type="button" disabled={!editor || disabled} onClick={openLinkPanel}>連結</button>
        <button type="button" disabled={!editor || disabled} onClick={() => editor?.chain().focus().unsetLink().run()}>移除連結</button>
      </div>

      {linkPanelOpen ? (
        <div className="rich-link-panel">
          <label className="field">
            <span>連結網址或站內路徑</span>
            <input className="input" value={linkDraft.href} onChange={(event) => setLinkDraft((current) => ({ ...current, href: event.target.value }))} placeholder="/knowledge 或 https://example.com" />
          </label>
          <label className="checkbox-row">
            <input type="checkbox" checked={linkDraft.nofollow} onChange={(event) => setLinkDraft((current) => ({ ...current, nofollow: event.target.checked }))} />
            <span>外部參考加上 nofollow</span>
          </label>
          <div className="rich-link-suggestions">
            {filteredRoutes.slice(0, 6).map((item) => (
              <button key={item.href} type="button" onClick={() => applyLink(item.href)}>{item.label}<small>{item.href}</small></button>
            ))}
          </div>
          <div className="actions">
            <button className="button" type="button" onClick={() => applyLink()}>套用連結</button>
            <button className="button ghost" type="button" onClick={() => setLinkPanelOpen(false)}>取消</button>
          </div>
        </div>
      ) : null}

      {imageMenu.selected ? (
        <div className="rich-image-controls" aria-label="圖片控制">
          <strong>圖片設定</strong>
          <div>
            <span>寬度</span>
            {imageWidths.map((width) => (
              <button className={imageMenu.width === width ? "is-active" : ""} key={width} type="button" disabled={disabled} onClick={() => updateSelectedImage({ width })}>{width}</button>
            ))}
          </div>
          <div>
            <span>對齊</span>
            {imageAlignments.map((item) => (
              <button className={imageMenu.align === item.value ? "is-active" : ""} key={item.value} type="button" disabled={disabled} onClick={() => updateSelectedImage({ align: item.value })}>{item.label}</button>
            ))}
          </div>
          <button className="button ghost" type="button" disabled={disabled} onClick={removeSelectedImage}>移除圖片</button>
        </div>
      ) : null}

      {dropNotice ? <div className="notice">{dropNotice}</div> : null}
      <div ref={surfaceRef}>
        <EditorContent className="rich-editor-surface knowledge-body" editor={editor} />
      </div>
      <small className="muted">內容會以 Markdown 儲存；站內連結同分頁開啟，外部連結會自動以新分頁開啟並加上安全 rel。</small>
    </div>
  );
}
