import { apartmentBuildingTemplateChunk0 } from "./apartment-building-template-chunk0.ts";
import { apartmentBuildingTemplateChunk1 } from "./apartment-building-template-chunk1.ts";
import { apartmentBuildingTemplateChunk2 } from "./apartment-building-template-chunk2.ts";
import { apartmentBuildingTemplateChunk3 } from "./apartment-building-template-chunk3.ts";

const templateBase64Chunks = [
  apartmentBuildingTemplateChunk0,
  apartmentBuildingTemplateChunk1,
  apartmentBuildingTemplateChunk2,
  apartmentBuildingTemplateChunk3
] as const;

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function concatBytes(parts: Uint8Array[]) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

function decodeTemplateZip() {
  // Chunks are split on base64 quartet boundaries. Decode each chunk, then join
  // the bytes to reconstruct the original XLSX exactly.
  return concatBytes(templateBase64Chunks.map(decodeBase64));
}

function uint16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function uint32(bytes: Uint8Array, offset: number) {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

const templateAdler32: Record<string, number> = {
  "_rels/.rels": 2318847329,
  "docProps/core.xml": 2982699524,
  "docProps/app.xml": 3872476334,
  "xl/workbook.xml": 4007165964,
  "xl/_rels/workbook.xml.rels": 836629690,
  "xl/theme/theme1.xml": 2979143658,
  "xl/worksheets/sheet1.xml": 3401624949,
  "xl/worksheets/_rels/sheet1.xml.rels": 2728158157,
  "xl/drawings/drawing1.xml": 7647079,
  "xl/drawings/_rels/drawing1.xml.rels": 2786496719,
  "xl/sharedStrings.xml": 1955212279,
  "xl/styles.xml": 3741732527,
  "xl/media/image1.jpeg": 2781203206,
  "xl/media/image2.jpeg": 1691061980,
  "[Content_Types].xml": 450222396
};

function writeUint32BE(bytes: Uint8Array, offset: number, value: number) {
  bytes[offset] = (value >>> 24) & 0xff;
  bytes[offset + 1] = (value >>> 16) & 0xff;
  bytes[offset + 2] = (value >>> 8) & 0xff;
  bytes[offset + 3] = value & 0xff;
}

async function inflateRaw(bytes: Uint8Array, name: string) {
  const adler = templateAdler32[name];
  if (adler == null) throw new Error(`Apartment building template checksum missing: ${name}`);

  // ZIP stores raw DEFLATE. Cloudflare's Edge runtime accepts zlib-wrapped
  // "deflate", so add a standard zlib header and the entry's Adler-32 trailer.
  const wrapped = new Uint8Array(bytes.length + 6);
  wrapped[0] = 0x78;
  wrapped[1] = 0x9c;
  wrapped.set(bytes, 2);
  writeUint32BE(wrapped, bytes.length + 2, adler);

  const stream = new Blob([wrapped.buffer]).stream().pipeThrough(
    new DecompressionStream("deflate")
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function getApartmentBuildingTemplateFiles() {
  const zip = decodeTemplateZip();
  const decoder = new TextDecoder();
  const files: Array<{ name: string; content: Uint8Array }> = [];
  let offset = 0;

  while (offset + 30 <= zip.length && uint32(zip, offset) === 0x04034b50) {
    const flags = uint16(zip, offset + 6);
    const method = uint16(zip, offset + 8);
    const compressedSize = uint32(zip, offset + 18);
    const filenameLength = uint16(zip, offset + 26);
    const extraLength = uint16(zip, offset + 28);

    if (flags & 0x08) throw new Error("Apartment building template ZIP data descriptors are unsupported");

    const nameStart = offset + 30;
    const dataStart = nameStart + filenameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (dataEnd > zip.length) throw new Error("Apartment building template ZIP is truncated");

    const name = decoder.decode(zip.subarray(nameStart, nameStart + filenameLength));
    const compressed = zip.slice(dataStart, dataEnd);
    const content =
      method === 0 ? compressed :
      method === 8 ? await inflateRaw(compressed, name) :
      (() => { throw new Error(`Unsupported ZIP compression method ${method}`); })();

    files.push({ name, content });
    offset = dataEnd;
  }

  if (!files.some((file) => file.name === "xl/worksheets/sheet1.xml")) {
    throw new Error("Apartment building template worksheet is missing");
  }

  return files;
}
