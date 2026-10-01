export type GuideVoice = { name: string; lang: string; voiceURI: string; localService: boolean };
// SpeechSynthesisVoice has no gender field. Only known voice names can be safely
// routed automatically; unknown Chinese voices remain available for manual choice.
const male = /yun.?jhe|yun.?xi|yun.?jian|yun.?yang|yun.?feng|yun.?hao|yun.?ze|zhi.?wei|li.?mu|bin.?bin|\beddy\b|\breed\b|\brocko\b|\bgrandpa\b|kangkang|康康|云希|雲希|云健|雲健|雲哲|云哲/i;
const female = /hsiao.?chen|hsiao.?yu|hanhan|mei.?jia|ting.?ting|xiaoxiao|xiaoyi|huihui|ya.?ting|曉臻|曉雨|涵涵|美佳|婷婷|曉曉|晓晓|慧慧/i;

export function selectGuideVoice<T extends GuideVoice>(voices: T[], role: "ayong" | "amei"): T | undefined {
  const chinese = voices.filter(voice => /^zh(?:[-_]|$)/i.test(voice.lang));
  const known = chinese.filter(voice => (role === "ayong" ? male : female).test(voice.name));
  const candidates = role === "ayong" ? known : known.length ? known : chinese.filter(voice => !male.test(voice.name));
  return candidates.sort((a, b) => score(b) - score(a))[0];
}
function score(voice: GuideVoice) {
  return (/^zh[-_]TW$/i.test(voice.lang) ? 20 : 0) + (/natural|online|neural|自然/i.test(voice.name) ? 10 : 0) + (!voice.localService ? 2 : 0);
}
export function guideSpeechText(text: string) {
  return text.replace(/[「」★✅⭐]/g, "").replace(/(\d),(?=\d)/g, "$1").replace(/；/g, "。").replace(/格局\s*(\d+)\s*[/／]\s*(\d+)\s*[/／]\s*(\d+)/g, "格局 $1 房，$2 廳，$3 衛").replace(/(\d+)房\s*(\d+)廳\s*(\d+)衛/g, "$1 房，$2 廳，$3 衛").replace(/…/g, "。");
}
