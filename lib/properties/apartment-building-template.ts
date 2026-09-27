import { apartmentBuildingTemplateChunk0a } from "./apartment-building-template-chunk0a.ts";
import { apartmentBuildingTemplateChunk0b } from "./apartment-building-template-chunk0b.ts";
import { apartmentBuildingTemplateChunk0c } from "./apartment-building-template-chunk0c.ts";
import { apartmentBuildingTemplateChunk0d } from "./apartment-building-template-chunk0d.ts";
import { apartmentBuildingTemplateChunk0e } from "./apartment-building-template-chunk0e.ts";
import { apartmentBuildingTemplateChunk0f } from "./apartment-building-template-chunk0f.ts";
import { apartmentBuildingTemplateChunk0g } from "./apartment-building-template-chunk0g.ts";
import { apartmentBuildingTemplateChunk0h } from "./apartment-building-template-chunk0h.ts";
import { apartmentBuildingTemplateChunk1 } from "./apartment-building-template-chunk1.ts";
import { apartmentBuildingTemplateChunk2 } from "./apartment-building-template-chunk2.ts";
import { apartmentBuildingTemplateChunk3 } from "./apartment-building-template-chunk3.ts";

const templateBase64Chunks = [
  apartmentBuildingTemplateChunk0a,
  apartmentBuildingTemplateChunk0b,
  apartmentBuildingTemplateChunk0c,
  apartmentBuildingTemplateChunk0d,
  apartmentBuildingTemplateChunk0e,
  apartmentBuildingTemplateChunk0f,
  apartmentBuildingTemplateChunk0g,
  apartmentBuildingTemplateChunk0h,
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

type Huffman = {
  byLength: Array<Map<number, number> | undefined>;
  maxLength: number;
};

class DeflateBitReader {
  private bitOffset = 0;

  constructor(private readonly bytes: Uint8Array) {}

  readBits(count: number) {
    let value = 0;
    for (let bit = 0; bit < count; bit += 1) {
      const byteIndex = this.bitOffset >>> 3;
      if (byteIndex >= this.bytes.length) throw new Error("Unexpected end of DEFLATE stream");
      value |= ((this.bytes[byteIndex] >>> (this.bitOffset & 7)) & 1) << bit;
      this.bitOffset += 1;
    }
    return value >>> 0;
  }

  alignByte() {
    this.bitOffset = (this.bitOffset + 7) & ~7;
  }
}

function reverseBits(value: number, length: number) {
  let reversed = 0;
  for (let index = 0; index < length; index += 1) {
    reversed = (reversed << 1) | ((value >>> index) & 1);
  }
  return reversed >>> 0;
}

function buildHuffman(lengths: number[]): Huffman {
  const maxLength = Math.max(0, ...lengths);
  const counts = new Array(maxLength + 1).fill(0);
  for (const length of lengths) if (length > 0) counts[length] += 1;

  const nextCode = new Array(maxLength + 1).fill(0);
  let code = 0;
  for (let bits = 1; bits <= maxLength; bits += 1) {
    code = (code + (counts[bits - 1] || 0)) << 1;
    nextCode[bits] = code;
  }

  const byLength: Array<Map<number, number> | undefined> = new Array(maxLength + 1);
  lengths.forEach((length, symbol) => {
    if (!length) return;
    const canonical = nextCode[length]++;
    const reversed = reverseBits(canonical, length);
    const table = byLength[length] || new Map<number, number>();
    table.set(reversed, symbol);
    byLength[length] = table;
  });

  return { byLength, maxLength };
}

function decodeHuffman(reader: DeflateBitReader, tree: Huffman) {
  let code = 0;
  for (let length = 1; length <= tree.maxLength; length += 1) {
    code |= reader.readBits(1) << (length - 1);
    const symbol = tree.byLength[length]?.get(code);
    if (symbol != null) return symbol;
  }
  throw new Error("Invalid Huffman code in DEFLATE stream");
}

const lengthBase = [
  3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
  35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258
];
const lengthExtra = [
  0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
  3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0
];
const distanceBase = [
  1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145, 8193,
  12289, 16385, 24577
];
const distanceExtra = [
  0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
  7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13
];

function fixedTrees() {
  const literalLengths = new Array(288).fill(0);
  for (let symbol = 0; symbol <= 143; symbol += 1) literalLengths[symbol] = 8;
  for (let symbol = 144; symbol <= 255; symbol += 1) literalLengths[symbol] = 9;
  for (let symbol = 256; symbol <= 279; symbol += 1) literalLengths[symbol] = 7;
  for (let symbol = 280; symbol <= 287; symbol += 1) literalLengths[symbol] = 8;
  return {
    literal: buildHuffman(literalLengths),
    distance: buildHuffman(new Array(32).fill(5))
  };
}

function dynamicTrees(reader: DeflateBitReader) {
  const literalCount = reader.readBits(5) + 257;
  const distanceCount = reader.readBits(5) + 1;
  const codeLengthCount = reader.readBits(4) + 4;
  const order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  const codeLengths = new Array(19).fill(0);
  for (let index = 0; index < codeLengthCount; index += 1) {
    codeLengths[order[index]] = reader.readBits(3);
  }

  const codeTree = buildHuffman(codeLengths);
  const lengths: number[] = [];
  const total = literalCount + distanceCount;

  while (lengths.length < total) {
    const symbol = decodeHuffman(reader, codeTree);
    if (symbol <= 15) {
      lengths.push(symbol);
      continue;
    }

    if (symbol === 16) {
      if (!lengths.length) throw new Error("Invalid DEFLATE repeat code");
      const repeat = reader.readBits(2) + 3;
      const previous = lengths[lengths.length - 1];
      for (let index = 0; index < repeat; index += 1) lengths.push(previous);
      continue;
    }

    if (symbol === 17) {
      const repeat = reader.readBits(3) + 3;
      for (let index = 0; index < repeat; index += 1) lengths.push(0);
      continue;
    }

    if (symbol === 18) {
      const repeat = reader.readBits(7) + 11;
      for (let index = 0; index < repeat; index += 1) lengths.push(0);
      continue;
    }

    throw new Error("Invalid DEFLATE code-length symbol");
  }

  return {
    literal: buildHuffman(lengths.slice(0, literalCount)),
    distance: buildHuffman(lengths.slice(literalCount, total))
  };
}

function inflateRaw(bytes: Uint8Array) {
  const reader = new DeflateBitReader(bytes);
  const output: number[] = [];
  let isFinal = false;

  while (!isFinal) {
    isFinal = reader.readBits(1) === 1;
    const blockType = reader.readBits(2);

    if (blockType === 0) {
      reader.alignByte();
      const length = reader.readBits(16);
      const inverted = reader.readBits(16);
      if (((length ^ 0xffff) & 0xffff) !== inverted) {
        throw new Error("Invalid uncompressed DEFLATE block length");
      }
      for (let index = 0; index < length; index += 1) output.push(reader.readBits(8));
      continue;
    }

    if (blockType === 3) throw new Error("Reserved DEFLATE block type");

    const trees = blockType === 1 ? fixedTrees() : dynamicTrees(reader);

    while (true) {
      const symbol = decodeHuffman(reader, trees.literal);
      if (symbol < 256) {
        output.push(symbol);
        continue;
      }
      if (symbol === 256) break;
      if (symbol < 257 || symbol > 285) throw new Error("Invalid DEFLATE length symbol");

      const lengthIndex = symbol - 257;
      const length = lengthBase[lengthIndex] + reader.readBits(lengthExtra[lengthIndex]);
      const distanceSymbol = decodeHuffman(reader, trees.distance);
      if (distanceSymbol > 29) throw new Error("Invalid DEFLATE distance symbol");
      const distance = distanceBase[distanceSymbol] + reader.readBits(distanceExtra[distanceSymbol]);
      if (distance <= 0 || distance > output.length) throw new Error("Invalid DEFLATE back-reference");

      for (let index = 0; index < length; index += 1) {
        output.push(output[output.length - distance]);
      }
    }
  }

  return Uint8Array.from(output);
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
      method === 8 ? inflateRaw(compressed) :
      (() => { throw new Error(`Unsupported ZIP compression method ${method}`); })();

    files.push({ name, content });
    offset = dataEnd;
  }

  if (!files.some((file) => file.name === "xl/worksheets/sheet1.xml")) {
    throw new Error("Apartment building template worksheet is missing");
  }

  return files;
}
