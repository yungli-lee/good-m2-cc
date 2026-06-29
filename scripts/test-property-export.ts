import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inflateRawSync } from "node:zlib";
import type { Property } from "../lib/properties/types";

const { buildPropertyExportXlsx } = await import("../lib/properties/export-xlsx.ts");

const property: Property = {
  id: "test",
  slug: "test",
  title: "測試 & <快官> \"幸福宅\"",
  address_public: "彰化市互助一街 & Google Maps: https://maps.google.com/?q=24.1,120.5&z=18",
  address_private: "完整地址：彰化縣鹿港鎮民權路119號\n底價：出價談\n開發：淑美 & 阿勇\n帶看：直接帶看\n完工日：70/6/26\n地號：彰化市廣鳳段1036地號\n特殊：A\u0001B",
  listing_no: "AK5384529",
  listing_type: "專任",
  listing_start_date: "2026-01-22",
  listing_end_date: "2026-04-21",
  owner_name: "王先生",
  owner_phone: "0912-345-678",
  developer_names: "淑美、阿勇",
  showing_instructions: "鑰匙在電表上，請先通知屋主 & 帶 Google Maps",
  price: 798,
  land_area_ping: 27.13,
  building_area_ping: 26.27,
  layout: "4房3廳2衛",
  age: 55.1,
  orientation: "坐西北朝東南",
  floor: "2樓",
  property_type: "townhouse",
  highlights: ["近快官交流道 & 台鳳", "低總價<好入手>", "Google Maps https://maps.google.com/?q=a&b=c"],
  description: "詳細介紹第一行\n第二行 & <tag> \"quote\"",
  status: "draft",
  is_featured: false,
  sort_order: 1000,
  seo_title: "SEO",
  meta_description: "meta",
  og_image_url: null,
  canonical_url: null,
  published_at: null,
  created_at: "",
  updated_at: "",
  deleted_at: null,
  property_media: []
};

function readZipEntry(zipPath: string, entryName: string) {
  const data = readFileSync(zipPath);
  let offset = 0;
  while (offset < data.length) {
    const signature = data.readUInt32LE(offset);
    if (signature !== 0x04034b50) break;
    const compression = data.readUInt16LE(offset + 8);
    const compressedSize = data.readUInt32LE(offset + 18);
    const fileNameLength = data.readUInt16LE(offset + 26);
    const extraLength = data.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = data.subarray(nameStart, nameStart + fileNameLength).toString("utf8");
    const dataStart = nameStart + fileNameLength + extraLength;
    const compressed = data.subarray(dataStart, dataStart + compressedSize);
    if (name === entryName) {
      if (compression === 0) return compressed;
      if (compression === 8) return inflateRawSync(compressed);
      throw new Error(`Unsupported ZIP compression ${compression}`);
    }
    offset = dataStart + compressedSize;
  }
  throw new Error(`ZIP entry not found: ${entryName}`);
}

function cellMap(sheetXml: string) {
  const cells = new Map<string, string>();
  for (const match of sheetXml.matchAll(/<c r="([A-Z]+\d+)"([^\/>]*)>([\s\S]*?)<\/c>/g)) {
    const text = match[3]
      .replace(/<[^>]+>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&");
    if (text) cells.set(match[1], text);
  }
  return cells;
}

const outputDir = join(tmpdir(), "good-m2-export-test");
mkdirSync(outputDir, { recursive: true });
const outputPath = join(outputDir, "property-export-test.xlsx");
writeFileSync(outputPath, buildPropertyExportXlsx(property));

execFileSync("unzip", ["-t", outputPath], { stdio: "pipe" });

const sheetXml = readZipEntry(outputPath, "xl/worksheets/sheet1.xml").toString("utf8");
const sheetPath = join(outputDir, "sheet1.xml");
writeFileSync(sheetPath, sheetXml);
execFileSync("python3", ["-c", "import sys, xml.etree.ElementTree as ET; ET.parse(sys.argv[1])", sheetPath], { stdio: "pipe" });

assert.match(sheetXml, /測試 &amp; &lt;快官&gt; &quot;幸福宅&quot;/);
assert.match(sheetXml, /https:\/\/maps\.google\.com\/\?q=a&amp;b=c/);
assert.match(sheetXml, /AK5384529/);
assert.match(sheetXml, /0912-345-678/);
assert.match(sheetXml, /鑰匙在電表上/);
assert.doesNotMatch(sheetXml, /\u0001/);

const cells = cellMap(sheetXml);
assert.equal(cells.get("C11"), "AK5384529");
assert.equal(cells.get("H11"), "2026-01-22 - 2026-04-21");
assert.equal(cells.get("C12"), property.title);
assert.equal(cells.get("C13"), "798萬");
assert.equal(cells.get("C14"), "出價談");
assert.equal(cells.get("H14"), "淑美、阿勇");
assert.equal(cells.get("C15"), "彰化縣鹿港鎮民權路119號");
assert.equal(cells.get("H15"), property.showing_instructions);
assert.equal(cells.get("C16"), "彰化市廣鳳段1036地號");
assert.equal(cells.get("C17"), "王先生 / 0912-345-678");
assert.equal(cells.get("C23"), "27.13 坪");
assert.equal(cells.get("C24"), "26.27 坪");
assert.equal(cells.get("H24"), "坐西北朝東南");
assert.equal(cells.get("C25"), "2樓");
assert.equal(cells.get("C26"), "4房3廳2衛");
assert.equal(cells.get("C27"), "70/6/26");
assert.equal(cells.get("H27"), "55.1年");
assert.match(cells.get("G29") || "", /近快官交流道 & 台鳳/);
assert.equal(cells.get("B43"), undefined);
for (const ref of ["G35", "H35", "I35", "J35", "K35", "L35"]) {
  assert.equal(cells.get(ref), undefined, `${ref} should stay blank for layout image`);
}

const buildingOutputPath = join(outputDir, "property-export-building-test.xlsx");
writeFileSync(buildingOutputPath, buildPropertyExportXlsx({ ...property, property_type: "building" }));
execFileSync("unzip", ["-t", buildingOutputPath], { stdio: "pipe" });
const buildingSheetXml = readZipEntry(buildingOutputPath, "xl/worksheets/sheet1.xml").toString("utf8");
const buildingSheetPath = join(outputDir, "building-sheet1.xml");
writeFileSync(buildingSheetPath, buildingSheetXml);
execFileSync("python3", ["-c", "import sys, xml.etree.ElementTree as ET; ET.parse(sys.argv[1])", buildingSheetPath], { stdio: "pipe" });
assert.match(buildingSheetXml, /大樓/);

console.log("property export tests passed");
