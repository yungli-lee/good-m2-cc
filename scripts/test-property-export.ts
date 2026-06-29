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
  address_private: "底價：出價談\n開發：淑美 & 阿勇\n帶看：直接帶看\n完工日：70/6/26\n地號：彰化市廣鳳段1036地號\n特殊：A\u0001B",
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
assert.match(sheetXml, /https:\/\/maps\.google\.com\/\?q=24\.1,120\.5&amp;z=18/);
assert.doesNotMatch(sheetXml, /\u0001/);

const buildingOutputPath = join(outputDir, "property-export-building-test.xlsx");
writeFileSync(buildingOutputPath, buildPropertyExportXlsx({ ...property, property_type: "building" }));
execFileSync("unzip", ["-t", buildingOutputPath], { stdio: "pipe" });
const buildingSheetXml = readZipEntry(buildingOutputPath, "xl/worksheets/sheet1.xml").toString("utf8");
const buildingSheetPath = join(outputDir, "building-sheet1.xml");
writeFileSync(buildingSheetPath, buildingSheetXml);
execFileSync("python3", ["-c", "import sys, xml.etree.ElementTree as ET; ET.parse(sys.argv[1])", buildingSheetPath], { stdio: "pipe" });
assert.match(buildingSheetXml, /大樓/);

console.log("property export tests passed");
