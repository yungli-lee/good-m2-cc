import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";
const loadDependency = createRequire(import.meta.url);
function compile(path, modules) {
  const out = ts.transpileModule(fs.readFileSync(path, 'utf8').replace('} catch { return json({ error: \"暫時無法整理需求，請稍後再試\" }, 503); }', '} catch (e) { console.error(e); return json({ error: \"暫時無法整理需求，請稍後再試\" }, 503); }'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(out, { exports, require: name => name in modules ? modules[name] : loadDependency(name), Request, Response, URL, URLSearchParams, Date, AbortSignal, TextEncoder, console });
  return exports;
}
const schema = compile('lib/concierge/schema.ts', { '../properties/collection-link.ts': compile('lib/properties/collection-link.ts', {}) });
let enabled = false, queryFails = false, calls = 0;
let modelOutputs = [];
const route = compile('app/api/public/concierge/route.ts', {
  'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  '@/lib/concierge/schema': schema,
  '@/lib/concierge/model': { conciergeEnv: () => ({ key: enabled ? 'mock' : '' }), modelJson: async () => { if (!modelOutputs.length) throw new Error('provider down'); return modelOutputs.shift(); } },
  '@/lib/concierge/limit': { takeConciergeSlot: () => () => {} },
  '@/lib/properties/collection-link': compile('lib/properties/collection-link.ts', {}),
  '@/lib/properties/queries': { searchPublishedProperties: async (_, __, filters) => { calls++; assert.equal(filters.maxPrice, 800); return { error: queryFails ? {} : null, data: [{ id: 'public-id', slug: 'public-slug', title: '公開物件', price: 688, district: '鹿港鎮', description: '公開描述', private_owner: 'DO NOT EXPOSE', bottom_price: 500 }] }; } },
  '@/lib/content/queries': { listPublicKnowledgeItems: async () => ({ data: [], error: null }) },
  '@/lib/properties/guide-speech-env': { getGuideSpeechEnv: () => ({ enabled: false }) },
  '@/lib/concierge/audio-token': { signReply: async () => 'mock-token' }
});
function request(message, extra = {}, origin) { return new Request('https://example.com/api/public/concierge', { method: 'POST', headers: { ...(origin ? { origin } : {}) }, body: JSON.stringify({ message, ...extra }) }); }
(async () => {
  let response = await route.POST(request('鹿港800萬以下住宅'));
  assert.equal(response.status, 200);
  let body = await response.json();
  assert.equal(body.mode, 'guided'); assert.equal(body.properties[0].title, '公開物件');
  assert.ok(!JSON.stringify(body).includes('DO NOT EXPOSE')); assert.ok(!JSON.stringify(body).includes('bottom_price'));
  assert.ok(body.searchHref.includes('price_max=800')); assert.equal(response.headers.get('cache-control'), 'no-store');
  const previousCalls = calls;
  response = await route.POST(request('我想委託出租')); assert.equal(response.status, 200); assert.equal(calls, previousCalls);
  response = await route.POST(request('租屋')); assert.equal((await response.json()).properties.length, 0);
  assert.equal((await route.POST(request('hello', {}, 'https://attacker.example'))).status, 403);
  assert.equal((await route.POST(request('x'.repeat(501)))).status, 422);
  queryFails = true; assert.equal((await route.POST(request('鹿港800萬以下住宅'))).status, 503); queryFails = false;
  enabled = true; response = await route.POST(request('鹿港800萬以下住宅')); assert.equal((await response.json()).mode, 'guided');
  modelOutputs = [schema.inferNeeds('鹿港800萬以下住宅', schema.needsSchema.parse({})), { answer: '可查看 https://invented.example/secret' }];
  response = await route.POST(request('鹿港800萬以下住宅')); body = await response.json();
  assert.equal(body.mode, 'ai'); assert.ok(!body.answer.includes('invented.example')); assert.equal(body.properties[0].slug, 'public-slug');
  console.log('PASS API public projection, filters, rentals, withdrawal query errors, cross-origin, provider fallback, verified links');
})().catch(e => { console.error(e); process.exitCode = 1; });
