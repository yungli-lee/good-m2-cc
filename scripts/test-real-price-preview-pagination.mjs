// Exercise the actual route against a scripted database client, without credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=ts.transpileModule(fs.readFileSync('app/api/public/real-price/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
async function run(results,{production=false,page=1}={}){
  const calls=[];
  const db={from(table){
    const call={table,operations:[]};calls.push(call);
    const builder={then(resolve,reject){const result=results.shift();assert.ok(result,'unexpected database query');return Promise.resolve(result).then(resolve,reject);}};
    for(const method of ['select','eq','in','gte','lte','filter','ilike','order','range'])builder[method]=(...args)=>{call.operations.push([method,...args]);return builder;};
    return builder;
  }};
  const sandboxModule={exports:{}};
  const context={exports:sandboxModule.exports,module:sandboxModule,Request,URL,console:{error(){}},process:{env:{CF_PAGES_BRANCH:'feature/real-price-public-search-v1',REAL_PRICE_PUBLIC_SEARCH_ENABLED:'true'}},require(name){
    if(name==='next/server')return {NextResponse:{json(body,init={}){return {body,status:init.status||200};}}};
    if(name.endsWith('/server'))return {createSupabaseAdminClient:()=>db};
    if(name.endsWith('/env'))return {getSupabaseEnv:()=>({url:'https://niorteztdbuyusemsgwa.supabase.co',serviceRoleKey:'test-only'}),getRequestContext:()=>null};
    if(name.endsWith('/date-range'))return {parseSearchDate:s=>s};
    if(name.endsWith('/road-search'))return {roadSearchPattern:s=>s};
    throw Error(name);
  }};
  vm.runInNewContext(source,context);
  const host=production?'good.m2.cc':'test.good-m2-cc.pages.dev';
  const response=await sandboxModule.exports.GET(new Request(`https://${host}/api/public/real-price?dataset=sale&county=彰化縣&district=秀水鄉&from=2026-08-01&to=2026-08-31&page=${page}`));
  assert.equal(results.length,0,'unused database results');
  return {response,calls};
}
(async()=>{
  const ok=(data,count=null)=>({data,count,error:null});
  const row={id:7,transaction_date:'2026-08-10',county:'彰化縣',dataset_type:'sale',raw_record:{備註:' 原文； '}};
  const page=await run([ok([{id:7}],21),ok([row]),ok([{transaction_id:7,detail_type:'parking',parking_type:'坡道平面',parking_price_ntd:2000000}])],{page:2});
  assert.equal(page.response.status,200);assert.equal(page.response.body.total,21);
  assert.equal(page.response.body.data[0].official_note,' 原文； ');
  assert.equal(page.response.body.data[0].details[0].parking_price_ntd,2000000);
  assert.equal('raw_record' in page.response.body.data[0],false);
  assert.equal(page.calls[0].operations[0][1],'id');
  for(const filter of [['eq','district','秀水鄉'],['gte','transaction_date','2026-08-01'],['lte','transaction_date','2026-08-31']])assert.ok(page.calls[0].operations.some(x=>JSON.stringify(x)===JSON.stringify(filter)));
  assert.ok(page.calls[1].operations.some(x=>x[0]==='in'&&x[1]==='id'&&x[2][0]===7));
  const empty=await run([ok([],0)]);assert.equal(empty.response.body.data.length,0);assert.equal(empty.calls.length,1);
  const outside=await run([{data:null,count:null,error:{code:'PGRST103'}},ok([{id:7}],21)],{page:3});
  assert.equal(outside.response.status,200);assert.equal(outside.response.body.total,21);assert.equal(outside.response.body.data.length,0);
  assert.deepEqual(outside.calls[0].operations.filter(x=>x[0]==='range'),[['range',40,59],['range',0,0]]);
  const error=await run([{data:null,count:null,error:{code:'57014'}}]);assert.equal(error.response.status,503);assert.equal(error.calls.length,1);
  const changed=await run([ok([{id:7}],1),ok([{...row,id:8}])]);assert.equal(changed.response.status,503);
  const production=await run([ok([row],1)],{production:true});assert.equal(production.calls[0].table,'moi_verified_transactions');assert.equal(production.calls.length,1);assert.equal(production.response.body.preview_sample,false);
  console.log('Preview pagination: 7 route scenarios passed (paging, filters, notes/parking, empty, out-of-range, cancellation, changed page, Production isolation).');
})().catch(error=>{console.error(error);process.exitCode=1;});
