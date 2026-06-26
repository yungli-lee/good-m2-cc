import { readFileSync } from "node:fs";
import path from "node:path";
import Script from "next/script";

function readStaticHomeBody() {
  const html = readFileSync(path.join(process.cwd(), "content/static-home.html"), "utf8");
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = match?.[1] || html;

  return body.replace(
    /<script\b[^>]*\bsrc=["']\/legacy-static\/script\.js["'][^>]*>\s*<\/script>/gi,
    "",
  );
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
