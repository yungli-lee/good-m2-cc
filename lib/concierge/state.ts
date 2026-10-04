import { z } from "zod";
import { needsSchema, type Needs } from "./schema.ts";

export const conciergeIntentSchema = z.enum([
  "search",
  "property_question",
  "compare",
  "reject_property",
  "reconsider_property",
  "viewing",
  "offer",
  "contact",
  "general"
]);

export const conciergeStateSchema = z.object({
  version: z.literal(2).default(2),
  goal: z.enum(["buy", "sell", "rent", "let", "question"]).default("buy"),
  requirements: needsSchema.default({}),
  focusedSlug: z.string().max(200).nullable().default(null),
  consideringSlugs: z.array(z.string().max(200)).max(12).default([]),
  rejectedSlugs: z.array(z.string().max(200)).max(24).default([]),
  viewingStage: z.enum(["none", "soft", "direct", "submitted", "declined"]).default("none"),
  contactStage: z.enum(["none", "ready", "submitted"]).default("none"),
  lastIntent: conciergeIntentSchema.default("general"),
  turnCount: z.number().int().min(0).max(500).default(0)
});

export type ConciergeState = z.infer<typeof conciergeStateSchema>;
export type ConciergeIntent = z.infer<typeof conciergeIntentSchema>;

export function emptyConciergeState(needs?: Needs): ConciergeState {
  const requirements = needsSchema.parse(needs || {});
  return conciergeStateSchema.parse({
    goal: requirements.intent,
    requirements
  });
}

export function mergeUnique(values: string[], next: string[], limit: number) {
  return [...new Set([...values, ...next].filter(Boolean))].slice(-limit);
}
