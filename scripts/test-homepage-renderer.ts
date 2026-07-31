import assert from "node:assert/strict";
const { buildHomepageViewModel } = await import("../lib/homepage/view-model.ts");
const company = { brand_name:"品牌", brand_tagline:"副標", line_url:"https://example.com", brand_logo_url:"/logo.png" } as any;
const model = buildHomepageViewModel({ company, navigation:[], campaigns:[{id:"2",status:"published",archived_at:null,sort_order:2,title:"後",subtitle:null,eyebrow:null,body:null,image_alt:null,fallback_image_url:null,cta_label:null,cta_href:null} as any,{id:"1",status:"published",archived_at:null,sort_order:1,title:"前",subtitle:null,eyebrow:null,body:null,image_alt:null,fallback_image_url:null,cta_label:null,cta_href:null} as any], pages:[] });
assert.deepEqual(model.sections.map((section)=>section.title),["前","後"]);
assert.equal(model.sections.filter((section)=>section.enabled).length,2);
assert.equal(model.seo.title,"品牌");
console.log("homepage renderer tests passed");
