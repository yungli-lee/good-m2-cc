import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { createRequire } from "node:module";
import { runInThisContext } from "node:vm";
import ts from "typescript";
import { createElement, type ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { resolveMediaDelivery, mediaTierPolicies } from "../lib/media/delivery.ts";


// Render the real TSX components without introducing a test-runner dependency.
const nativeRequire = createRequire(import.meta.url);
const modules = new Map<string, { exports: Record<string, ComponentType<Record<string, unknown>>> }>();
function loadSource(filename: string): Record<string, ComponentType<Record<string, unknown>>> {
  const path = [filename, `${filename}.tsx`, `${filename}.ts`].find(existsSync)!;
  if (modules.has(path)) return modules.get(path)!.exports;
  const loadedModule = { exports: {} };
  modules.set(path, loadedModule);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
  }).outputText;
  runInThisContext(`(function(require,module,exports){${code}\n})`, { filename: path })(
    (id: string) => id.startsWith("@/") ? loadSource(resolve(id.slice(2)))
      : id.startsWith(".") ? loadSource(resolve(dirname(path), id)) : nativeRequire(id), loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const url = "https://project.supabase.co/storage/v1/object/public/property-media/owner/photo.jpeg";
const { PropertyDetailImage } = loadSource(resolve("components/media/property-detail-image"));
const { ImageLightbox } = loadSource(resolve("components/media/image-lightbox"));
const { PropertyMediaGallery } = loadSource(resolve("components/media/property-media-gallery"));
const render = (component: ComponentType<Record<string, unknown>>, props: Record<string, unknown>) => renderToStaticMarkup(createElement(component, props));
const image = (id: string, sort_order: number, is_cover = false) => ({ id, url: url.replace("photo",id), media_type: "image", sort_order, is_cover, created_at: "2026-01-01", deleted_at: null });
for (const tier of ["detail", "fullscreen"] as const) {
  const d = resolveMediaDelivery({publicUrl:url},tier);
  assert.deepEqual(d.widths, tier === "detail" ? [640,960,1280,1600] : [1280,1600,2048]);
  assert.equal(d.quality,tier === "detail" ? 82 : 86);
  for (const candidate of d.srcSet.split(", ")) {
    const params = new URL(candidate.split(" ")[0]).searchParams;
    assert.equal(params.get("resize"),"contain"); assert.equal(params.has("height"),false);
  }
  for (const fallback of ["https://external.example/photo.jpg?v=2",url.replace("jpeg","mp4")]) {
    const d = resolveMediaDelivery({publicUrl:fallback},tier);
    assert.equal(d.src,fallback); assert.equal(d.srcSet,"");
  }
}
assert.equal(resolveMediaDelivery({publicUrl:url},"original").src,url);
const main = render(PropertyDetailImage,{sourceUrl:url,alt:"cover",main:true});
assert.match(main,/render\/image\/public/); assert.match(main,/resize=contain/);
assert.match(main,/srcSet=/); assert.match(main,/sizes=/); assert.match(main,/loading="eager"/);
const deferred = render(PropertyDetailImage,{sourceUrl:url,alt:"deferred"});
assert.match(deferred,/data-deferred-image/); assert.doesNotMatch(deferred,/<img|src=|photo.jpeg/);
const ext = render(PropertyDetailImage,{sourceUrl:"https://external.example/photo.jpg",alt:"external",main:true});
assert.match(ext,/src="https:\/\/external.example\/photo.jpg"/); assert.doesNotMatch(ext,/srcSet=/);
const images = [image("cover",3,true),image("second",1),image("third",2)];
const before = JSON.stringify(images);
const props = {media:images,title:"Property",propertyId:"p"};
const html = render(PropertyMediaGallery,props);
assert.match(html,/cover.jpeg/); assert.doesNotMatch(html,/second.jpeg|third.jpeg/);
assert.equal((html.match(/data-deferred-image/g)||[]).length,2);
assert.equal(JSON.stringify(images),before);
assert.doesNotMatch(render(PropertyMediaGallery,{...props,display:"details"}),/<img/);
assert.equal((render(PropertyMediaGallery,{...props,display:"cover"}).match(/<img/g)||[]).length,1);
const lightboxProps = {images,title:"Property",onChange:()=>{},onClose:()=>{}};
assert.equal(render(ImageLightbox,{...lightboxProps,activeIndex:null}),"");
for (let activeIndex=0;activeIndex<images.length;activeIndex++) {
  const box = render(ImageLightbox,{...lightboxProps,activeIndex});
  assert.equal((box.match(/<img/g)||[]).length,1,"only the selected fullscreen image mounts");
  assert.match(box,new RegExp(images[activeIndex].id+".jpeg"));
  assert.match(box,/quality=86/); assert.match(box,/resize=contain/);
  for(let i=0;i<images.length;i++) if(i!==activeIndex) assert.ok(!box.includes(images[i].id+".jpeg"));
}
const video = {...image("video",0,true),media_type:"video",url:url.replace("photo.jpeg","tour.mp4"),thumbnail_url:"https://external.example/poster.jpg"};
const videoHtml=render(PropertyMediaGallery,{...props,media:[video,...images.map(i=>({...i,is_cover:false}))]});
assert.match(videoHtml,/poster.jpg/); assert.doesNotMatch(videoHtml,/tour.mp4|<video/);
assert.equal(mediaTierPolicies["property-card"].quality,80); assert.equal(mediaTierPolicies.card.quality,75);
console.log("Property detail delivery and on-demand fullscreen rendering: PASS");

// Exercise the real observer callback without adding a DOM/test dependency.
let admitted = false;
let effect: (() => void | (() => void)) | undefined;
let callback: IntersectionObserverCallback | undefined;
let disconnected = 0;
const target = {};
const fakeReact = {
  useRef: () => ({ current: target }),
  useState: () => [admitted, (value: boolean) => { admitted = value; }],
  useEffect: (fn: typeof effect) => { effect = fn; }
};
const observerModule = { exports: {} as Record<string, (props: Record<string, unknown>) => { props: Record<string, unknown> }> };
const observerCode = ts.transpileModule(readFileSync("components/media/property-detail-image.tsx", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }
}).outputText;
const fakeObserver = class {
  constructor(cb: IntersectionObserverCallback) { callback = cb; }
  observe(element: unknown) { assert.equal(element, target); }
  disconnect() { disconnected++; }
};
runInThisContext(`(function(require,module,exports,window,IntersectionObserver){${observerCode}\n})`)(
  (id: string) => id === "react" ? fakeReact : id.startsWith("@/") ? loadSource(resolve(id.slice(2))) : nativeRequire(id),
  observerModule, observerModule.exports, { IntersectionObserver: fakeObserver }, fakeObserver
);
observerModule.exports.PropertyDetailImage({ sourceUrl: url, alt: "photo" });
const cleanup = effect?.();
const entry = (visible: boolean, width: number) => [{ isIntersecting: visible, intersectionRect: { width, height: width } }] as IntersectionObserverEntry[];
callback?.(entry(false, 0), {} as IntersectionObserver);
assert.equal(admitted, false, "offscreen images stay source-free");
callback?.(entry(true, 0), {} as IntersectionObserver);
assert.equal(admitted, false, "zero-area/hidden copies stay source-free");
callback?.(entry(true, 200), {} as IntersectionObserver);
assert.equal(admitted, true, "visible slots acquire their source");
assert.equal(disconnected, 1, "observation stops after loading");
const loaded = observerModule.exports.PropertyDetailImage({ sourceUrl: url, alt: "photo" });
assert.equal(loaded.props.loading, "lazy");
assert.equal(loaded.props.tier, "detail");
assert.equal(loaded.props.sourceUrl, url);
if (typeof cleanup === "function") cleanup();
assert.equal(disconnected, 2, "unmount cleans up the observer");
console.log("Property detail visibility admission: PASS");
