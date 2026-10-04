import assert from "node:assert/strict";

process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN = "test-token";
process.env.LINE_MESSAGING_RECIPIENT_ID = "U1234567890";
process.env.NEXT_PUBLIC_SITE_URL = "https://good.m2.cc";

const { formatInquiryLineMessage } = await import("../lib/line/inquiry.ts");

const text = formatInquiryLineMessage({
  id: "11111111-1111-4111-8111-111111111111",
  formType: "property-inquiry",
  name: "王先生",
  phone: "0912345678",
  email: "test@example.com",
  message: "想了解這間物件，請問週日下午方便看屋嗎？",
  propertyId: "22222222-2222-4222-8222-222222222222",
  propertyTitle: "鹿港民族路市心黃金店住",
  propertySlug: "property-mtthqxjn",
  sourcePage: "/properties/property-mtthqxjn"
});

assert.ok(text.includes("🔔 網站新詢問"));
assert.ok(text.includes("王先生"));
assert.ok(text.includes("0912345678"));
assert.ok(text.includes("鹿港民族路市心黃金店住"));
assert.ok(text.includes("週日下午"));
assert.ok(text.includes("/admin/inquiries/11111111-1111-4111-8111-111111111111"));
assert.ok(text.length <= 5000);

console.log("Inquiry LINE notification formatting PASS");
