import { formatPing, propertyTypeLabel } from "@/lib/format";
import type { Property } from "./types";

type CellValue = string | number | null | undefined;

type Cell = {
  ref: string;
  value: CellValue;
  style?: number;
};

const textEncoder = new TextEncoder();

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
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function textCell(ref: string, value: CellValue, style = 1): Cell {
  return { ref, value, style };
}

function numberCell(ref: string, value: number | null | undefined, style = 3): Cell {
  return { ref, value: value == null ? "" : value, style };
}

function rowXml(rowNumber: number, cells: Cell[], height?: number) {
  const attrs = height ? ` r="${rowNumber}" ht="${height}" customHeight="1"` : ` r="${rowNumber}"`;
  return `<row${attrs}>${cells.map((cell) => {
    const style = cell.style == null ? "" : ` s="${cell.style}"`;
    if (typeof cell.value === "number") return `<c r="${cell.ref}"${style}><v>${cell.value}</v></c>`;
    return `<c r="${cell.ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xml(cell.value)}</t></is></c>`;
  }).join("")}</row>`;
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

function buildSheet(property: Property) {
  const notes = property.address_private || "";
  const bottomPrice = extractInternalValue(notes, "底價");
  const developer = extractInternalValue(notes, "開發");
  const showing = extractInternalValue(notes, "帶看") || extractInternalValue(notes, "帶看資訊");
  const completionDate = extractInternalValue(notes, "完工日");
  const lotNumber = extractInternalValue(notes, "地號");
  const highlights = listHighlights(property.highlights);
  const typeLabel = propertyTypeLabel(property.property_type);
  const rows = [
    rowXml(1, [textCell("A1", "物件發稿明細", 5), textCell("K1", "匯出 Excel", 6)], 30),
    rowXml(4, [textCell("A4", "產出來源", 7), textCell("C4", "AI 快速建檔 / 後台物件資料", 2), textCell("K4", "阿勇不動產顧問", 6)]),
    rowXml(7, [textCell("E7", "僅供內部參考，請勿轉傳", 8)], 26),
    rowXml(10, [textCell("A10", "合約、帶看說明", 5)], 24),
    rowXml(12, [textCell("A12", "案名", 7), textCell("C12", property.title, 2), textCell("G12", "類型", 7), textCell("H12", typeLabel, 2)]),
    rowXml(13, [textCell("A13", "總價", 7), numberCell("C13", property.price, 4), textCell("D13", "萬", 2), textCell("G13", "帶看", 7), textCell("H13", showing, 2)]),
    rowXml(14, [textCell("A14", "底價", 7), textCell("C14", bottomPrice, 2), textCell("G14", "開發", 7), textCell("H14", developer, 2)]),
    rowXml(15, [textCell("A15", "地址", 7), textCell("C15", property.address_public || "", 2), textCell("G15", "內部備註摘要", 7), textCell("H15", notes, 2)], 48),
    rowXml(16, [textCell("A16", "地號", 7), textCell("C16", lotNumber, 2)]),
    rowXml(18, [textCell("A18", "房地基本資料", 5)], 24),
    rowXml(20, [textCell("A20", "型態", 7), textCell("C20", typeLabel, 2)]),
    rowXml(23, [textCell("A23", "地坪", 7), textCell("C23", formatPing(property.land_area_ping), 2)]),
    rowXml(24, [textCell("A24", "建坪", 7), textCell("C24", formatPing(property.building_area_ping), 2), textCell("G24", "座向", 7), textCell("H24", property.orientation || "", 2)]),
    rowXml(25, [textCell("A25", "樓層", 7), textCell("C25", property.floor || "", 2)]),
    rowXml(26, [textCell("A26", "格局", 7), textCell("C26", property.layout || "", 2)]),
    rowXml(27, [textCell("A27", "完工日", 7), textCell("C27", completionDate, 2), textCell("G27", "屋齡", 7), textCell("H27", property.age == null ? "" : `${property.age}年`, 2)]),
    rowXml(28, [textCell("A28", "街景環境、社區說明", 5), textCell("G28", "推薦特色", 5)]),
    rowXml(29, [textCell("A29", "SEO Title", 7), textCell("B29", property.seo_title || "", 2), textCell("G29", highlights, 2)], 96),
    rowXml(34, [textCell("G34", "詳細介紹", 5)]),
    rowXml(35, [textCell("G35", property.description || "", 2)], 96),
    rowXml(43, [textCell("A43", "內部備註", 7), textCell("B43", notes, 2)], 96)
  ];

  const merges = [
    "A1:D3",
    "E7:J8",
    "A10:L10",
    "C12:F12",
    "H12:L12",
    "C14:F14",
    "H14:L14",
    "C15:F15",
    "H15:L16",
    "C16:F16",
    "A18:L18",
    "C20:F20",
    "C23:F23",
    "C24:F24",
    "H24:L24",
    "C25:F25",
    "C26:F26",
    "C27:F27",
    "H27:L27",
    "A28:F28",
    "G28:L28",
    "B29:F29",
    "G29:L33",
    "G34:L34",
    "G35:L42",
    "B43:L45"
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="A1:L45"/>
  <sheetViews><sheetView showGridLines="0" workbookViewId="0"/></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="12.7" customWidth="1"/>
    <col min="2" max="2" width="4.4" customWidth="1"/>
    <col min="3" max="3" width="12.9" customWidth="1"/>
    <col min="4" max="4" width="7" customWidth="1"/>
    <col min="5" max="5" width="4.7" customWidth="1"/>
    <col min="6" max="6" width="19.2" customWidth="1"/>
    <col min="7" max="7" width="13.5" customWidth="1"/>
    <col min="8" max="8" width="7.5" customWidth="1"/>
    <col min="9" max="9" width="5.4" customWidth="1"/>
    <col min="10" max="10" width="10.2" customWidth="1"/>
    <col min="11" max="11" width="14.5" customWidth="1"/>
    <col min="12" max="12" width="28.4" customWidth="1"/>
  </cols>
  <sheetData>${rows.join("")}</sheetData>
  <mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join("")}</mergeCells>
</worksheet>`;
}

const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`;

const rootRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`;

const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="物件發稿明細" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="16"/><color rgb="FF102343"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FF102343"/><name val="Calibri"/></font>
  </fonts>
  <fills count="5">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF102343"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFC99A43"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFFFF7DF"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFD9DEE8"/></left><right style="thin"><color rgb="FFD9DEE8"/></right><top style="thin"><color rgb="FFD9DEE8"/></top><bottom style="thin"><color rgb="FFD9DEE8"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="9">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

const appProps = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties" xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
  <Application>阿勇不動產顧問</Application>
</Properties>`;

function coreProps(title: string) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xml(title)}</dc:title>
  <dc:creator>阿勇不動產顧問</dc:creator>
  <cp:lastModifiedBy>阿勇不動產顧問</cp:lastModifiedBy>
  <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
  <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
</cp:coreProperties>`;
}

export function buildPropertyExportXlsx(property: Property) {
  return makeZip([
    { name: "[Content_Types].xml", content: contentTypes },
    { name: "_rels/.rels", content: rootRels },
    { name: "docProps/app.xml", content: appProps },
    { name: "docProps/core.xml", content: coreProps(property.title) },
    { name: "xl/workbook.xml", content: workbook },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRels },
    { name: "xl/styles.xml", content: styles },
    { name: "xl/worksheets/sheet1.xml", content: buildSheet(property) }
  ]);
}

export function propertyExportFilename(property: Pick<Property, "title" | "price">) {
  const price = property.price == null ? "" : `${property.price}萬`;
  return `${filenameSafe(property.title)}${price}.xlsx`;
}
