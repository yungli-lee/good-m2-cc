import assert from "node:assert/strict";
import { normalizePacificPhotoUrl, parsePacificPhotos, readPacificPhoto, PACIFIC_PHOTO_MAX_BYTES } from "../lib/properties/pacific-photos.ts";

const url = "https://hq.houseol.com.tw/images/pictures/2559AA6344769a.jpg";
const rows = [
  { saleID: "S2984754", type: 5, sysFileName: url.replace("a.jpg", "b.jpg") },
  { saleID: "S2984754", type: 1, sysFileName: url },
  { saleID: "S2984754", type: 4, sysFileName: url.replace("a.jpg", "qr.jpg") }
];
const photos = parsePacificPhotos([...rows, ...rows], "S2984754");
assert.equal(photos.length, 2);
assert.equal(photos[0].label, "現場照片");
assert.equal(photos[1].label, "格局圖");
assert.equal(parsePacificPhotos(rows, "S999").length, 0);
for (const source of ["http://hq.houseol.com.tw/images/pictures/a.jpg", "https://evil.com/a.jpg", "https://hq.houseol.com.tw.evil.com/images/pictures/a.jpg", "https://hq.houseol.com.tw/images/pictures/a.svg", "https://user:pass@hq.houseol.com.tw/images/pictures/a.jpg", "https://hq.houseol.com.tw/images/pictures/../../private/a.jpg"]) {
  assert.throws(() => normalizePacificPhotoUrl(source));
}
const jpg = new Uint8Array([255, 216, 255, 224]);
assert.equal((await readPacificPhoto(new Response(jpg, { headers: { "content-type": "image/jpeg" } }))).bytes.length, 4);
await assert.rejects(readPacificPhoto(new Response("html", { headers: { "content-type": "image/jpeg" } })));
await assert.rejects(readPacificPhoto(new Response(jpg, { status: 302, headers: { "content-type": "image/jpeg" } })));
await assert.rejects(readPacificPhoto(new Response(new Uint8Array(PACIFIC_PHOTO_MAX_BYTES + 1), { headers: { "content-type": "image/jpeg" } })));
console.log("PASS: Pacific photo filtering, source restrictions, order, deduplication, MIME/signature and streamed size");
