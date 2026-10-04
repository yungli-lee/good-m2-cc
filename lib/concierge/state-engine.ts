import type { Needs } from "./schema.ts";
import { conciergeStateSchema, mergeUnique, type ConciergeIntent, type ConciergeState } from "./state.ts";

export function intentFromAction(action: string, rejectedCurrent = false): ConciergeIntent {
  if (rejectedCurrent) return "reject_property";
  if (action === "viewing") return "viewing";
  if (action === "offer") return "offer";
  if (action === "contact") return "contact";
  if (action === "property") return "property_question";
  if (action === "search") return "search";
  return "general";
}

export function advanceConciergeState(input: {
  previous: ConciergeState;
  intent: ConciergeIntent;
  needs: Needs;
  focusedSlug?: string | null;
  candidateSlugs?: string[];
  rejectedSlug?: string | null;
  revivedSlug?: string | null;
  viewingDeclined?: boolean;
}) {
  const previous = input.previous;
  const rejectedSlugs = mergeUnique(previous.rejectedSlugs, input.rejectedSlug ? [input.rejectedSlug] : [], 24)
    .filter(slug => !input.revivedSlug || slug !== input.revivedSlug);
  const consideringSlugs = mergeUnique(
    previous.consideringSlugs.filter(slug => !rejectedSlugs.includes(slug)),
    (input.candidateSlugs || []).filter(slug => !rejectedSlugs.includes(slug)),
    12
  );
  const focusedSlug = input.revivedSlug
    ? input.revivedSlug
    : input.rejectedSlug && previous.focusedSlug === input.rejectedSlug
      ? null
      : (input.focusedSlug ?? previous.focusedSlug);

  let viewingStage = previous.viewingStage;
  if (input.viewingDeclined) viewingStage = "declined";
  else if (input.intent === "viewing") viewingStage = "direct";
  else if (input.intent === "search" || input.intent === "reject_property" || input.intent === "reconsider_property") viewingStage = "none";

  const contactStage = input.intent === "contact" ? "ready" : previous.contactStage;

  return conciergeStateSchema.parse({
    ...previous,
    goal: input.needs.intent,
    requirements: input.needs,
    focusedSlug,
    consideringSlugs,
    rejectedSlugs,
    viewingStage,
    contactStage,
    lastIntent: input.intent,
    turnCount: previous.turnCount + 1
  });
}
