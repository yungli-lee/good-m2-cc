import type { GuideRole } from "./character-guide";
import { guideSpeechText } from "./guide-voice.ts";

export const guideAiVoices = { ayong: "zh-TW-YunJheNeural", amei: "zh-TW-HsiaoChenNeural" } as const;
export function guideSsml(text: string, role: GuideRole) {
  const escaped = guideSpeechText(text).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
  return `<speak version="1.0" xml:lang="zh-TW"><voice name="${guideAiVoices[role]}">${escaped}</voice></speak>`;
}
