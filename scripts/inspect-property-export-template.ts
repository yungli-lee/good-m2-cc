import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const source = readFileSync(new URL("../lib/properties/export-template.ts", import.meta.url), "utf8");
const root = mkdtempSync(join(tmpdir(), "property-template-"));
const out = join(root, "template");
mkdirSync(out, { recursive: true });
const templateFiles = Array.from(source.matchAll(/name:\s*'([^']+)',\s*base64:\s*`([\s\S]*?)`/g), (match) => ({
  name: match[1],
  base64: match[2].replace(/\s/g, ""),
}));
if (!templateFiles.some(({ name }) => name === "xl/worksheets/sheet1.xml")) {
  throw new Error("sheet1 template base64 not found");
}
for (const file of templateFiles) {
  const target = join(out, file.name);
  mkdirSync(join(target, ".."), { recursive: true });
  writeFileSync(target, Buffer.from(file.base64, "base64"));
}

const read = (path: string) => readFileSync(join(out, path), "utf8");
const shared = read("xl/sharedStrings.xml");
const decodeXml = (value: string) => value.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#xA;/g, "\n");
const sharedStrings = Array.from(shared.matchAll(/<si>([\s\S]*?)<\/si>/g), (m) =>
  Array.from(m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g), (text) => decodeXml(text[1])).join("")
);
const sheet = read("xl/worksheets/sheet1.xml");
const merged = Array.from(sheet.matchAll(/<mergeCell ref="([^"]+)"/g), (m) => m[1]);
const cells = Array.from(sheet.matchAll(/<c\s+([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)).map((m) => {
  const attrs = m[1] || "";
  const body = m[2] || "";
  const ref = attrs.match(/r="([A-Z]+\d+)"/)?.[1] || "";
  const type = attrs.match(/t="([^"]+)"/)?.[1] || "numberOrStyle";
  const style = attrs.match(/s="(\d+)"/)?.[1] || null;
  const raw = body.match(/<v>([\s\S]*?)<\/v>/)?.[1] || body.match(/<t[^>]*>([\s\S]*?)<\/t>/)?.[1] || "";
  const value = type === "s" ? sharedStrings[Number(raw)] || "" : decodeXml(raw);
  return { ref, type, sharedIndex: type === "s" ? Number(raw) : null, value, style, attributes: attrs };
}).filter((cell) => cell.ref && cell.value);

console.log(JSON.stringify({
  files: ["xl/worksheets/sheet1.xml", "xl/sharedStrings.xml", "xl/styles.xml", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/drawings/*", "xl/worksheets/_rels/*"],
  mergedRanges: merged,
  sharedStringCount: sharedStrings.length,
  nonEmptyCells: cells,
  xmlParts: ["xl/styles.xml", "xl/workbook.xml", "xl/_rels/workbook.xml.rels"].map((name) => ({ name, bytes: read(name).length })),
  drawings: execFileSync("find", [out, "-path", "*/xl/drawings/*", "-type", "f", "-print"], { encoding: "utf8" }).trim().split("\n").filter(Boolean).map((file) => ({
    name: file.slice(out.length + 1),
    xml: readFileSync(file, "utf8"),
  }))
}, null, 2));
