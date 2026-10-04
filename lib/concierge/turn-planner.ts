import { z } from "zod";
import { modelJson } from "./model.ts";
import { needsSchema, type Needs } from "./schema.ts";
import { type ConciergeState, type ConciergeIntent } from "./state.ts";

const plannerSchema = z.object({
  intent: z.enum(["search", "property_question", "compare", "reject_property", "reconsider_property", "viewing", "offer", "contact", "general"]),
  rejectCurrent: z.boolean(),
  viewingDeclined: z.boolean(),
  searchQuery: z.string().trim().max(80).default(""),
  requirements: needsSchema
});

export type ConciergeTurnPlan = z.infer<typeof plannerSchema>;

export async function planConciergeTurn(input: {
  message: string;
  history: Array<{ role: "user" | "assistant"; text: string }>;
  previousRequirements: Needs;
  previousState: ConciergeState;
}) {
  const raw = await modelJson(
    "你是房仲對話狀態分析器，不要回答客人，只輸出 JSON。"
    + " intent 只能是 search/property_question/compare/reject_property/reconsider_property/viewing/offer/contact/general。"
    + " 如果客人改變心意，想重新了解之前淘汰／放棄的物件，例如『剛剛那間我又想看看』『之前那件商辦再給我』『我想再了解被我放棄的那間』，intent=reconsider_property，rejectCurrent=false；若有案名、路名、商辦等辨識詞，放進 searchQuery。"
    + " rejectCurrent 表示客人是否淘汰目前物件。像『不要了』『換別間』『下一間』『這間不喜歡』『太舊不要』『剛才淘汰的不要再給我』，若目前有物件，必須視為 rejectCurrent=true 且 intent=reject_property。"
    + " viewingDeclined 表示客人明確說先不要帶看、不急著看、暫時不用。"
    + " searchQuery 是本輪要搜尋的簡短物件關鍵字；例如客人說商辦、辦公室、民族路、某社區或特定案名時，填最精簡關鍵字；沒有特定關鍵字就填空字串。"
    + " requirements 只能保存長期找房條件：intent、districts、type、minPrice、maxPrice、mustHave。"
    + " 淘汰／排除／換一間等流程指令不是 mustHave，不得寫入 requirements。"
    + " 如果只是淘汰或換物件、沒有新增搜尋條件，requirements 必須完整沿用 previousRequirements。"
    + " 只有客人明確新增、取消或修改搜尋條件時才修改 requirements。",
    input
  );
  return plannerSchema.parse(raw);
}

export function actionFromConciergeIntent(intent: ConciergeIntent) {
  if (intent === "viewing") return "viewing";
  if (intent === "offer") return "offer";
  if (intent === "contact") return "contact";
  if (intent === "property_question" || intent === "compare") return "property";
  return "search";
}
