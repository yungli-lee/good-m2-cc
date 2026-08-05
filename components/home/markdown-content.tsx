import { markdownToHtml } from "@/lib/home-cms/markdown";

export function MarkdownContent({ value }: { value?: string | null }) {
  return (
    <div
      className="cms-markdown-body"
      dangerouslySetInnerHTML={{ __html: markdownToHtml(value) }}
    />
  );
}
