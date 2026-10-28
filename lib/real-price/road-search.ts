// Shared by the UI and API. Only address characters are accepted, never raw regex.
export const hasExplicitLane = (value: string) => /[巷弄]/.test(value);
const numeral = "[0-9０-９一二三四五六七八九十百零〇]+";
const number = numeral + "([之-]" + numeral + ")?";
const spacing = "[[:space:]　]*";
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function literal(s: string) {
  return Array.from(s).map(c => /[0-9]/.test(c)
    ? `[${c}${String.fromCharCode(c.charCodeAt(0) + 0xfee0)}]` : escape(c)).join(spacing);
}
function tokenNumber(s: string, unit: string) {
  // Common numeric section spellings (二段 / 2段 / ２段).
  const n = Number(s), chinese = "零一二三四五六七八九";
  if (unit === "段" && n >= 1 && n <= 9) return `(${literal(s)}|${chinese[n]})`;
  if (unit === "段" && s.length === 1 && chinese.indexOf(s) > 0)
    return `(${literal(String(chinese.indexOf(s)))}|${s})`;
  return literal(s);
}
export function roadSearchPattern(input: string, includeLanes = true): string {
  const value = input.normalize("NFKC").replace(/\s/g, "");
  if (!value || value.length > 80 || !/^[\p{Script=Han}0-9之-]+$/u.test(value)) throw new Error("bad road");
  const road = /^(.*?(?:大道|路|街|巷|弄))(.*)$/.exec(value);
  if (!road) throw new Error("bad road");
  const tokens = [...road[2].matchAll(/([0-9一二三四五六七八九十百零〇]+(?:[之-][0-9一二三四五六七八九十百零〇]+)?)(段|巷|弄|號)/g)];
  if (tokens.map(t => t[0]).join("") !== road[2]) throw new Error("bad road");
  let pattern = "(^|[縣市鄉鎮區])" + spacing + literal(road[1]) + spacing;
  const units = ["段", "巷", "弄", "號"];
  let index = 0;
  const explicit = hasExplicitLane(value);
  for (const unit of units) {
    const token = tokens[index];
    if (token?.[2] === unit) {
      pattern += tokenNumber(token[1], unit) + spacing + unit + spacing;
      index++;
      if (unit === "號") return pattern + "($|[^0-9０-９])";
    } else {
      if (tokens.slice(index).some(t => t[2] === unit)) throw new Error("bad road");
      if (unit === "段" || ((includeLanes || explicit) && unit !== "號"))
        pattern += "(" + (unit === "段" ? numeral : number) + spacing + unit + spacing + ")?";
      if (unit === "號") pattern += "(" + number + spacing + "號|$)";
    }
  }
  if (index !== tokens.length) throw new Error("bad road");
  return pattern;
}
