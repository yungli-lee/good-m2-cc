export type GuideVoice = { name: string; lang: string; voiceURI: string; localService: boolean };
// SpeechSynthesisVoice has no gender field. Only known voice names can be safely
// routed to each role; unknown voices are excluded to avoid mixing genders.
const male = /yun.?jhe|yun.?xi|yun.?jian|yun.?yang|yun.?feng|yun.?hao|yun.?ze|zhi.?wei|li.?mu|bin.?bin|\beddy\b|\breed\b|\brocko\b|\bgrandpa\b|kangkang|康康|云希|雲希|云健|雲健|雲哲|云哲/i;
const female = /hsiao.?chen|hsiao.?yu|hanhan|mei.?jia|ting.?ting|xiaoxiao|xiaoyi|huihui|ya.?ting|曉臻|曉雨|涵涵|美佳|婷婷|曉曉|晓晓|慧慧|\bflo\b|\bgrandma\b|\bsandy\b|\bshelley\b|google.*(?:國語|国语|普通話|普通话|mandarin)/i;

export function guideVoicesForRole<T extends GuideVoice>(voices: T[], role: "ayong" | "amei"): T[] {
  return voices.filter(voice => /^zh(?:[-_]|$)/i.test(voice.lang) && (role === "ayong" ? male : female).test(voice.name)).sort((a, b) => score(b) - score(a));
}
export function selectGuideVoice<T extends GuideVoice>(voices: T[], role: "ayong" | "amei"): T | undefined {
  const candidates = guideVoicesForRole(voices, role);
  const preferred = candidates.find(voice => /^zh[-_]TW$/i.test(voice.lang) && (role === "amei" ? /google/i : /\bgrandpa\b/i).test(voice.name));
  return preferred || candidates[0];
}
function score(voice: GuideVoice) {
  return (/^zh[-_]TW$/i.test(voice.lang) ? 20 : 0) + (/natural|online|neural|自然/i.test(voice.name) ? 10 : 0) + (!voice.localService ? 2 : 0);
}
export function guideSpeechText(text: string) {
  return text.replace(/[「」★✅⭐]/g, "").replace(/(\d),(?=\d)/g, "$1").replace(/；/g, "。").replace(/格局\s*(\d+)\s*[/／]\s*(\d+)\s*[/／]\s*(\d+)/g, "格局 $1 房，$2 廳，$3 衛").replace(/(\d+)房\s*(\d+)廳\s*(\d+)衛/g, "$1 房，$2 廳，$3 衛").replace(/…/g, "。");
}
