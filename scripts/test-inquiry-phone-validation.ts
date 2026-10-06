import assert from "node:assert/strict";
import { inquirySchema, normalizeContactPhone } from "../lib/inquiries/schema.ts";

const base = {
  form_type: "concierge-sell",
  name: "測試",
  email: "",
  message: "這是一筆測試需求內容，超過十個字。",
  property_id: "",
  source_page: "/guide"
};

for (const [input, expected] of [
  ["0912333555", "0912333555"],
  ["0912-333-555", "0912333555"],
  ["04-7222345", "047222345"],
  ["04 7222345", "047222345"],
  ["02-2345-6789", "0223456789"],
  ["+886 912-333-555", "0912333555"],
  ["+886 4 7222345", "047222345"]
] as const) {
  assert.equal(normalizeContactPhone(input), expected);
  const parsed = inquirySchema.safeParse({ ...base, phone: input });
  assert.ok(parsed.success, input);
  if (parsed.success) assert.equal(parsed.data.phone, expected);
}

for (const input of ["04", "12345678", "09-12", "02-123"]) {
  assert.equal(inquirySchema.safeParse({ ...base, phone: input }).success, false, input);
}

console.log("Inquiry phone validation: mobile, landline and +886 PASS");
