import Script from "next/script";
import { listActiveHomeCampaigns, listPublishedSitePages } from "@/lib/home-cms/queries";
import { renderHomeCmsHtml } from "@/lib/home-cms/render";
import { staticHomeBody } from "@/lib/home-cms/static-home";

export const dynamic = "force-dynamic";
export const runtime = "edge";

export default async function HomePage() {
  const [campaigns, pages] = await Promise.all([
    listActiveHomeCampaigns(),
    listPublishedSitePages()
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
