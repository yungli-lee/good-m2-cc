import { getPropertyExportTemplateFiles } from "./export-template.ts";
import type { Property } from "./types";

type CellValue = string | number | null | undefined;

const textEncoder = new TextEncoder();

function formatPing(value?: number | null) {
  if (value == null) return "-";
  return `${Number(value).toLocaleString("zh-TW", { maximumFractionDigits: 2 })} 坪`;
}

function propertyTypeLabel(value: string) {
  const labels: Record<string, string> = {
    townhouse: "透天",
    apartment: "公寓",
    building: "大樓",
    land: "土地",
    farmland: "農地",
    building_land: "建地",
    storefront: "店面",
    factory: "廠房",
    other: "其他"
  };
  return labels[value] || value;
}

const crcTable = new Uint32Array(256).map((_, index) => {
  let crc = index;
  for (let bit = 0; bit < 8; bit += 1) {
    crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32(buffer: Uint8Array, offset: number, value: number) {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
  buffer[offset + 2] = (value >>> 16) & 0xff;
  buffer[offset + 3] = (value >>> 24) & 0xff;
}

function concatBytes(parts: Uint8Array[]) {
  const size = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function makeZip(files: Array<{ name: string; content: string | Uint8Array }>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const nameBytes = textEncoder.encode(file.name);
    const contentBytes = typeof file.content === "string" ? textEncoder.encode(file.content) : file.content;
    const checksum = crc32(contentBytes);

    const localHeader = new Uint8Array(30 + nameBytes.length);
    writeUint32(localHeader, 0, 0x04034b50);
    writeUint16(localHeader, 4, 20);
    writeUint16(localHeader, 6, 0x0800);
    writeUint16(localHeader, 8, 0);
    writeUint16(localHeader, 10, 0);
    writeUint16(localHeader, 12, 0);
    writeUint32(localHeader, 14, checksum);
    writeUint32(localHeader, 18, contentBytes.length);
    writeUint32(localHeader, 22, contentBytes.length);
    writeUint16(localHeader, 26, nameBytes.length);
    writeUint16(localHeader, 28, 0);
    localHeader.set(nameBytes, 30);
    localParts.push(localHeader, contentBytes);

    const centralHeader = new Uint8Array(46 + nameBytes.length);
    writeUint32(centralHeader, 0, 0x02014b50);
    writeUint16(centralHeader, 4, 20);
    writeUint16(centralHeader, 6, 20);
    writeUint16(centralHeader, 8, 0x0800);
    writeUint16(centralHeader, 10, 0);
    writeUint16(centralHeader, 12, 0);
    writeUint16(centralHeader, 14, 0);
    writeUint32(centralHeader, 16, checksum);
    writeUint32(centralHeader, 20, contentBytes.length);
    writeUint32(centralHeader, 24, contentBytes.length);
    writeUint16(centralHeader, 28, nameBytes.length);
    writeUint16(centralHeader, 30, 0);
    writeUint16(centralHeader, 32, 0);
    writeUint16(centralHeader, 34, 0);
    writeUint16(centralHeader, 36, 0);
    writeUint32(centralHeader, 38, 0);
    writeUint32(centralHeader, 42, localOffset);
    centralHeader.set(nameBytes, 46);
    centralParts.push(centralHeader);

    localOffset += localHeader.length + contentBytes.length;
  }

  const centralDirectory = concatBytes(centralParts);
  const end = new Uint8Array(22);
  writeUint32(end, 0, 0x06054b50);
  writeUint16(end, 8, files.length);
  writeUint16(end, 10, files.length);
  writeUint32(end, 12, centralDirectory.length);
  writeUint32(end, 16, localOffset);
  writeUint16(end, 20, 0);

  return concatBytes([...localParts, centralDirectory, end]);
}

function xml(value: CellValue) {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeBase64(value: string) {
  const normalized = value.replace(/\s/g, "");
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function decodeText(bytes: Uint8Array) {
  return new TextDecoder().decode(bytes);
}

function cellSortKey(ref: string) {
  const column = ref.match(/[A-Z]+/)?.[0] || "";
  let columnIndex = 0;
  for (const char of column) columnIndex = columnIndex * 26 + char.charCodeAt(0) - 64;
  return columnIndex;
}

function inlineStringCell(ref: string, value: CellValue, existingAttrs = "") {
  const attrs = existingAttrs
    .replace(/\s+r="[^"]*"/, "")
    .replace(/\s+t="[^"]*"/, "")
    .replace(/\s+cm="[^"]*"/, "")
    .replace(/\s+vm="[^"]*"/, "")
    .replace(/\s+ph="[^"]*"/, "")
    .replace(/\s*\/\s*$/, "");
  return `<c r="${ref}"${attrs} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
}

function replaceCell(sheetXml: string, ref: string, value: CellValue) {
  const cellPattern = new RegExp(`<c r="${ref}"([^>]*)>[\\s\\S]*?<\\/c>`);
  if (cellPattern.test(sheetXml)) {
    return sheetXml.replace(cellPattern, (_match, attrs: string) => inlineStringCell(ref, value, attrs));
  }
  const selfClosingCellPattern = new RegExp(`<c r="${ref}"([^>]*)\\/>`);
  if (selfClosingCellPattern.test(sheetXml)) {
    return sheetXml.replace(selfClosingCellPattern, (_match, attrs: string) => inlineStringCell(ref, value, attrs));
  }

  const rowNumber = ref.match(/\d+/)?.[0];
  if (!rowNumber) return sheetXml;
  const rowPattern = new RegExp(`(<row[^>]* r="${rowNumber}"[^>]*>)([\\s\\S]*?)(<\\/row>)`);
  return sheetXml.replace(rowPattern, (_match, open: string, cells: string, close: string) => {
    const cellRefs = Array.from(cells.matchAll(/<c r="([A-Z]+\d+)"/g)).map((match) => match[1]);
    const nextRef = cellRefs.find((cellRef) => cellSortKey(cellRef) > cellSortKey(ref));
    const cellXml = inlineStringCell(ref, value);
    if (!nextRef) return `${open}${cells}${cellXml}${close}`;
    return `${open}${cells.replace(new RegExp(`(<c r="${nextRef}"[\\s\\S]*?<\\/c>)`), `${cellXml}$1`)}${close}`;
  });
}

function extractInternalValue(notes: string, label: string) {
  const pattern = new RegExp(`^${label}\\s*[:：]\\s*(.+)$`, "m");
  return notes.match(pattern)?.[1]?.trim() || "";
}

function listHighlights(value?: string[]) {
  return (value || []).filter(Boolean).join("\n");
}

function filenameSafe(value: string) {
  const cleaned = Array.from(value.normalize("NFKC"))
    .map((char) => (/[\p{Script=Han}a-zA-Z0-9_-]/u.test(char) ? char : "-"))
    .join("")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
  return cleaned || "property";
}

function checkedOption(label: string, options: string[]) {
  return options.map((option) => `${option === label ? "▪️" : "□"}${option}`).join(" ");
}

function propertyUseLine(property: Property) {
  if (property.property_type === "land" || property.property_type === "farmland" || property.property_type === "building_land") {
    return checkedOption("土地", ["住宅", "店面", "辦公", "住辦", "住店", "車位", "廠房", "土地", "其他"]);
  }
  if (property.property_type === "factory") {
    return checkedOption("廠房", ["住宅", "店面", "辦公", "住辦", "住店", "車位", "廠房", "土地", "其他"]);
  }
  if (property.property_type === "storefront") {
    return checkedOption("店面", ["住宅", "店面", "辦公", "住辦", "住店", "車位", "廠房", "土地", "其他"]);
  }
  return checkedOption("住宅", ["住宅", "店面", "辦公", "住辦", "住店", "車位", "廠房", "土地", "其他"]);
}

function propertyTypeLine(property: Property) {
  const firstLine = [
    property.property_type === "townhouse" ? "▪️透天" : "□透天",
    "□別墅",
    "□一般套房",
    "□商務套房",
    "□學生套房",
    "□農舍"
  ].join(" ");
  const usage = [
    property.property_type === "storefront" ? "□住宅用 ▪️商業用" : "□住宅用 □商業用",
    property.property_type === "factory" ? "▪️工業用" : "□工業用",
    property.property_type === "farmland" ? "▪️農業用" : "□農業用",
    "□特定用",
    property.property_type === "building_land" ? "▪️法定用" : "□法定用",
    "□其他用"
  ].join(" ");
  return `${firstLine}\n${usage}\n`;
}

function buildTemplateValues(property: Property) {
  const notes = property.address_private || "";
  const bottomPrice = extractInternalValue(notes, "底價");
  const developer = property.developer_names || extractInternalValue(notes, "開發");
  const showing = property.showing_instructions || extractInternalValue(notes, "帶看") || extractInternalValue(notes, "帶看資訊");
  const completionDate = extractInternalValue(notes, "完工日");
  const lotNumber = extractInternalValue(notes, "地號");
  const highlights = listHighlights(property.highlights);
  const listingPeriod = [property.listing_start_date, property.listing_end_date].filter(Boolean).join(" - ");
  const managementNotes = [
    property.listing_no ? `委託書編號：${property.listing_no}` : "",
    property.listing_type ? `委託類型：${property.listing_type}` : "",
    listingPeriod ? `委託期間：${listingPeriod}` : "",
    property.owner_name ? `屋主名稱：${property.owner_name}` : "",
    property.owner_phone ? `屋主電話：${property.owner_phone}` : "",
    developer ? `開發：${developer}` : "",
    showing ? `帶看：${showing}` : "",
    notes
  ].filter(Boolean).join("\n");

  return {
    A8: property.listing_type ? checkedOption(property.listing_type, ["專任", "一般委託", "口頭約"]) : "▪️口頭約",
    A9: "廣告▪️刊登 □不刊登(原因:______)                             ",
    C12: property.title,
    C13: property.price == null ? "" : `${property.price}萬`,
    C14: bottomPrice,
    H14: developer,
    C15: property.address_public || "",
    H15: showing,
    C16: lotNumber,
    C19: propertyUseLine(property),
    C20: propertyTypeLine(property),
    C23: formatPing(property.land_area_ping),
    C24: formatPing(property.building_area_ping),
    H24: property.orientation || "",
    C25: property.floor || "",
    C26: property.layout || "",
    C27: completionDate,
    H27: property.age == null ? "" : `${property.age}年`,
    B29: propertyTypeLabel(property.property_type),
    G29: highlights,
    G35: property.description || "",
    B43: managementNotes
  } satisfies Record<string, CellValue>;
}

function buildSheetFromTemplate(property: Property, sheetXml: string) {
  return Object.entries(buildTemplateValues(property)).reduce(
    (xmlText, [ref, value]) => replaceCell(xmlText, ref, value),
    sheetXml
  );
}

export function buildPropertyExportXlsx(property: Property) {
  const files = getPropertyExportTemplateFiles(property.property_type).map((file) => {
    const content = decodeBase64(file.base64);
    if (file.name === "xl/worksheets/sheet1.xml") {
      return { name: file.name, content: buildSheetFromTemplate(property, decodeText(content)) };
    }
    return { name: file.name, content };
  });

  return makeZip(files);
}

export function propertyExportFilename(property: Pick<Property, "title" | "price">) {
  const price = property.price == null ? "" : `${property.price}萬`;
  return `${filenameSafe(property.title)}${price}.xlsx`;
}
