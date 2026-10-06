"use client";

import { useEffect } from "react";
import { trackEvent, trackPropertyView } from "@/lib/analytics/client";

export function PropertyViewTracker({ propertyId, properties }: { propertyId: string; properties: Record<string, unknown> }) {
  useEffect(() => { void trackPropertyView(propertyId, properties); }, [propertyId, properties]);
  return null;
}

export function KnowledgeViewTracker({ articleId, slug, category }: { articleId: string; slug: string; category: string | null }) {
  useEffect(() => { void trackEvent("view_knowledge", { dedupeKey: `knowledge:${articleId}`, properties: { article_id: articleId, slug, category } }); }, [articleId, slug, category]);
  return null;
}
