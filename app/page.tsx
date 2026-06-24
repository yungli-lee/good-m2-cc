import { readFileSync } from "node:fs";
import path from "node:path";
import Script from "next/script";

function readStaticHomeBody() {
  const html = readFileSync(path.join(process.cwd(), "content/static-home.html"), "utf8");
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match?.[1] || html;
}

export default function HomePage() {
  return (
    <>
      <link rel="stylesheet" href="/legacy-static/styles.css" />
      <div dangerouslySetInnerHTML={{ __html: readStaticHomeBody() }} />
      <Script src="/legacy-static/script.js" strategy="afterInteractive" />
    </>
  );
}
