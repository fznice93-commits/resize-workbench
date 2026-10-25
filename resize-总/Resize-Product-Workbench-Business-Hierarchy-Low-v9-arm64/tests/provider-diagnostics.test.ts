import test from"node:test";
import assert from"node:assert/strict";
import{mkdtemp,readFile}from"node:fs/promises";
import{tmpdir}from"node:os";
import{join,resolve}from"node:path";
import sharp from"sharp";
import{AppError}from"../src/server/errors.js";
import{HiModelsProvider,sanitizeProviderDetail,sanitizeRequestId}from"../src/server/provider.js";
import type{KeychainAdapter}from"../src/server/keychain.js";
import{openDatabase}from"../src/server/db.js";
import{LocalRuntime,type RuntimeProviderFactory}from"../src/server/runtime.js";
import{BatchFlow}from"../src/server/batch-flow.js";

const keys:KeychainAdapter={status:async()=>({configured:true}),read:async()=>"private-test-key",save:async()=>{},delete:async()=>{}};
const request={image:Buffer.from([137,80,78,71,13,10,26,10]),prompt:"fixed",size:"720x1600",key:""};

test("HTTP 400 keeps only bounded safe diagnostic fields",async()=>{
 const fetcher=(async()=>new Response(JSON.stringify({error:{code:"invalid_size",message:"Supported sizes are 1024x1024, 1024x1536, or 1536x1024"}}),{status:400,headers:{"content-type":"application/json","x-request-id":"req_20260825-abc"}}))as typeof fetch;
 const provider=new HiModelsProvider(keys,fetcher);
 await assert.rejects(provider.generate(request,new AbortController().signal),(error:unknown)=>{const value=error as AppError&{status?:number;failureDetail?:string;requestId?:string};assert.equal(value.code,"INVALID_PROVIDER_REQUEST");assert.equal(value.status,400);assert.equal(value.failureDetail,"invalid_size: Supported sizes are 1024x1024, 1024x1536, or 1536x1024");assert.equal(value.requestId,"req_20260825-abc");return true});
});

test("diagnostic sanitizers reject secrets, image payloads and invalid request IDs",()=>{
 assert.equal(sanitizeProviderDetail("Authorization: Bearer secret-value"),null);
 assert.equal(sanitizeProviderDetail("inlineData base64 payload"),null);
 assert.equal(sanitizeProviderDetail("bad token-abcdefghijklmnopqrstuvwxyz0123456789"),"bad [redacted]");
 assert.equal(sanitizeRequestId("request id with spaces"),null);
 assert.equal(sanitizeRequestId("req-safe_123"),"req-safe_123");
});

test("runtime persists and batch API exposes only sanitized diagnostic metadata",async()=>{
 const root=await mkdtemp(join(tmpdir(),"resize-diagnostic-")),db=openDatabase(join(root,"metadata.sqlite"));
 const factory:RuntimeProviderFactory=()=>({generate:async()=>{throw Object.assign(new AppError("INVALID_PROVIDER_REQUEST"),{status:400,failureDetail:"invalid_size: use a supported size",requestId:"req-safe_456"})}});
 const runtime=new LocalRuntime(db,root,keys,factory);await runtime.initialize();
 const image=await sharp({create:{width:80,height:50,channels:3,background:"white"}}).png().toBuffer(),flow=new BatchFlow(runtime,"diagnostic-session"),batch=await flow.create(image,[{width:720,height:1600,profile:"mb"}])as{id:string};
 const confirmation=flow.issue(batch.id);flow.submit(batch.id,confirmation.nonce,true);
 for(let n=0;n<200;n++){if((flow.get(batch.id)as{status:string}).status==="PAUSED_FAILED")break;if(n===199)throw new Error("diagnostic batch timeout");await new Promise(resolve=>setTimeout(resolve,5))}
 const item=flow.items(batch.id)[0]!;assert.equal(item.failure_class,"INVALID_PROVIDER_REQUEST");assert.equal(item.failure_detail,"invalid_size: use a supported size");assert.equal(item.provider_http_status,400);assert.equal(item.request_id,"req-safe_456");
 const row=db.prepare("SELECT failure_detail,request_id FROM attempts WHERE job_id=?").get(item.job_id)as{failure_detail:string;request_id:string};assert.equal(row.failure_detail,"invalid_size: use a supported size");assert.equal(row.request_id,"req-safe_456");db.close();
});

test("client renders safe Provider detail and request ID",async()=>{const source=await readFile(resolve("src/client/main.tsx"),"utf8");assert.match(source,/具体原因：/);assert.match(source,/Request ID：/);assert.doesNotMatch(source,/Authorization value|private-test-key/)});
