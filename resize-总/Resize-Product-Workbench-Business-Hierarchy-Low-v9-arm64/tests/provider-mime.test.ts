import test from"node:test";
import assert from"node:assert/strict";
import sharp from"sharp";
import{AppError}from"../src/server/errors.js";
import{buildMultipart}from"../src/server/provider.js";

const request=(image:Buffer)=>({image,prompt:"fixed",size:"1024x1024",key:""});

test("multipart image declares the true MIME type and matching filename",async()=>{
 const fixtures=[
  [await sharp({create:{width:8,height:8,channels:3,background:"red"}}).png().toBuffer(),"image/png","source.png"],
  [await sharp({create:{width:8,height:8,channels:3,background:"green"}}).jpeg().toBuffer(),"image/jpeg","source.jpg"],
  [await sharp({create:{width:8,height:8,channels:3,background:"blue"}}).webp().toBuffer(),"image/webp","source.webp"]
 ]as const;
 for(const[image,mime,name]of fixtures){const part=buildMultipart(request(image)).get("image");assert.ok(part instanceof File);assert.equal(part.type,mime);assert.equal(part.name,name)}
});

test("multipart construction rejects unknown image bytes locally",()=>{
 assert.throws(()=>buildMultipart(request(Buffer.from("not-an-image"))),(error:unknown)=>error instanceof AppError&&error.code==="IMAGE_DECODE_FAILED");
});
