"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { HomePropertyCard, type HomeProperty } from "@/components/home/home-property-search";

export function PropertyCarousel({ kind, properties, autoplay, intervalSeconds }: { kind: "featured" | "latest"; properties: HomeProperty[]; autoplay: boolean; intervalSeconds: number }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function move(direction: 1 | -1) {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>(".property-discovery-card");
    const cardTrack = card?.parentElement;
    const parsedGap = cardTrack
      ? Number.parseFloat(getComputedStyle(cardTrack).columnGap)
      : 0;
    const gap = Number.isFinite(parsedGap) ? parsedGap : 0;
    const step = (card?.offsetWidth || track.clientWidth) + gap;
    const max = track.scrollWidth - track.clientWidth;
    const next = direction > 0 && track.scrollLeft >= max - 8 ? 0 : direction < 0 && track.scrollLeft <= 8 ? max : track.scrollLeft + direction * step;
    track.scrollTo({ left: next, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }

  useEffect(() => {
    if (!autoplay || properties.length < 2) return;
    const timer = window.setInterval(() => move(1), intervalSeconds * 1000);
    return () => window.clearInterval(timer);
  }, [autoplay, intervalSeconds, properties.length]);

  return <div className="property-discovery">
    <div className="property-carousel-actions" aria-label={kind === "featured" ? "精選物件切換" : "最新物件切換"}>
      <button className="button ghost" type="button" onClick={() => move(-1)} aria-label="上一批物件">←</button>
      <button className="button ghost" type="button" onClick={() => move(1)} aria-label="下一批物件">→</button>
      <Link className="button" href="/properties">查看更多物件</Link>
    </div>
    <div className="property-carousel" ref={trackRef}><div className="property-card-track">{properties.map((property) => <HomePropertyCard property={property} key={property.id} />)}</div></div>
  </div>;
}
