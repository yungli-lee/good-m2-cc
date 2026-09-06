import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolveMediaDelivery } from "../lib/media/delivery.ts";

const origin = "https://project-ref.supabase.co";
const rawImage = `${origin}/storage/v1/object/public/media/%E7%9F%A5%E8%AD%98/life%20note.png?version=7`;

const knowledgeCard = resolveMediaDelivery({ publicUrl: rawImage }, "card");
assert.equal(knowledgeCard.src, `${origin}/storage/v1/render/image/public/media/%E7%9F%A5%E8%AD%98/life%20note.png?version=7&width=640&quality=75`);
assert.deepEqual(knowledgeCard.widths, [384, 640, 960]);
assert.match(knowledgeCard.srcSet, /width=384&quality=75 384w/);
assert.match(knowledgeCard.srcSet, /width=960&quality=75 960w/);

const knowledgeDetail = resolveMediaDelivery({ publicUrl: rawImage }, "detail");
assert.equal(knowledgeDetail.src, `${origin}/storage/v1/render/image/public/media/%E7%9F%A5%E8%AD%98/life%20note.png?version=7&width=1280&quality=82`);
assert.deepEqual(knowledgeDetail.widths, [640, 960, 1280, 1600]);

const lifeNotesCard = resolveMediaDelivery({ publicUrl: rawImage }, "card");
assert.equal(lifeNotesCard.quality, 75);
assert.equal(lifeNotesCard.storagePath, "知識/life note.png");

const external = "https://images.example.com/life-note.jpg?version=7";
assert.deepEqual(resolveMediaDelivery({ publicUrl: external }, "card"), {
  provider: "external",
  tier: "card",
  src: external,
  srcSet: "",
  widths: [],
  quality: 75,
  originalUrl: external,
  bucket: null,
  storagePath: null
});

const video = `${origin}/storage/v1/object/public/media/life-note.mp4?version=7`;
assert.equal(resolveMediaDelivery({ publicUrl: video }, "detail").src, video);
assert.equal(resolveMediaDelivery({ publicUrl: video }, "detail").srcSet, "");

const componentSources = [
  "components/content/knowledge-card.tsx",
  "app/(public)/knowledge/[slug]/page.tsx",
  "components/home/desktop-reminders.tsx",
  "components/home/mobile-reminder-accordion.tsx"
].map((path) => readFileSync(path, "utf8"));

assert.ok(componentSources.every((source) => source.includes("DeliveredImage")), "all scoped public renderers use shared delivery");
assert.ok(componentSources.every((source) => source.includes("sizes=")), "all scoped public renderers declare responsive sizes");
assert.doesNotMatch(componentSources.join("\n"), /<img[^>]+(?:cover_image_url|media_public_url|block\.url)/, "scoped public renderers no longer emit raw image URLs");

console.log("Knowledge and Life Notes responsive media tests: PASS");
