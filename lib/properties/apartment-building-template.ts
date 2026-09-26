import { apartmentBuildingTemplateChunk0 } from "./apartment-building-template-chunk0.ts";
import { apartmentBuildingTemplateChunk1 } from "./apartment-building-template-chunk1.ts";
import { apartmentBuildingTemplateChunk2 } from "./apartment-building-template-chunk2.ts";
import { apartmentBuildingTemplateChunk3 } from "./apartment-building-template-chunk3.ts";

const templateBase64 =
  apartmentBuildingTemplateChunk0 +
  apartmentBuildingTemplateChunk1 +
  apartmentBuildingTemplateChunk2 +
  apartmentBuildingTemplateChunk3;

function decodeBase64(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
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

async function inflateRaw(bytes: Uint8Array) {
  // Keep the ZIP inflater Web/Edge-runtime native. Copy into an ArrayBuffer-backed
  // view so TypeScript/Next does not infer SharedArrayBuffer for BlobPart.
  const copy = Uint8Array.from(bytes);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(
    new DecompressionStream("deflate-raw")
  );
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function getApartmentBuildingTemplateFiles() {
  const zip = decodeBase64(templateBase64);
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
      method === 8 ? await inflateRaw(compressed) :
      (() => { throw new Error(`Unsupported ZIP compression method ${method}`); })();

    files.push({ name, content });
    offset = dataEnd;
  }

  if (!files.some((file) => file.name === "xl/worksheets/sheet1.xml")) {
    throw new Error("Apartment building template worksheet is missing");
  }

  return files;
}
