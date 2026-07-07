import Script from "next/script";
import { headers } from "next/headers";
import { listActiveHomeCampaigns, listPublishedSitePages } from "@/lib/home-cms/queries";
import { renderHomeCmsHtml } from "@/lib/home-cms/render";

export const dynamic = "force-dynamic";
export const runtime = "edge";

async function readStaticHomeBody() {
  const headerStore = await headers();
  const host = headerStore.get("host");
  if (!host) return "";
  try {
    const response = await fetch(`https://${host}/legacy-static/home-body.html`, {
      cache: "force-cache"
    });
    return response.ok ? response.text() : "";
  } catch (error) {
    console.error("home_static_body_fetch_failed", {
      message: error instanceof Error ? error.message : "unknown"
    });
    return "";
  }
}

export default async function HomePage() {
  const [campaigns, pages, staticHomeBody] = await Promise.all([
    listActiveHomeCampaigns(),
    listPublishedSitePages(),
    readStaticHomeBody()
  ]);
  const body = renderHomeCmsHtml(staticHomeBody, campaigns, pages);

  return (
    <>
      <link rel="stylesheet" href="/legacy-static/styles.css" />
      <div dangerouslySetInnerHTML={{ __html: body }} />
      <Script src="/legacy-static/script.js" strategy="afterInteractive" />
      <Script id="home-campaign-carousel" strategy="afterInteractive">{`
        (() => {
          const root = document.querySelector("[data-home-campaign-carousel]");
          if (!root) return;
          const slides = Array.from(root.querySelectorAll("[data-home-campaign-slide]"));
          const dots = Array.from(root.querySelectorAll("[data-home-campaign-dot]"));
          if (slides.length < 2) return;
          let index = 0;
          const show = (next) => {
            index = next % slides.length;
            slides.forEach((slide, slideIndex) => { slide.hidden = slideIndex !== index; });
            dots.forEach((dot, dotIndex) => {
              if (dotIndex === index) dot.setAttribute("aria-current", "true");
              else dot.removeAttribute("aria-current");
            });
          };
          dots.forEach((dot, dotIndex) => dot.addEventListener("click", () => show(dotIndex)));
          window.setInterval(() => show(index + 1), 6500);
        })();
      `}</Script>
    </>
  );
}
