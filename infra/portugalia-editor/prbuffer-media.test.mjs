import test from "node:test";
import assert from "node:assert/strict";
import { instagramImageUrl } from "./prbuffer.mjs";

const original="https://upload.wikimedia.org/wikipedia/commons/3/3f/Child_during_dental_checkup_in_clinic_with_dentist_examining_teeth.jpg";
const thumbnail="https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Child_during_dental_checkup_in_clinic_with_dentist_examining_teeth.jpg/1920px-Child_during_dental_checkup_in_clinic_with_dentist_examining_teeth.jpg";

test("Buffer uses an optimized Wikimedia image when approved photo is 6048px",async()=>{
 const saved=globalThis.fetch;let called=0;
 globalThis.fetch=async(target)=>{
  called++;
  const u=new URL(target);
  assert.equal(u.hostname,"commons.wikimedia.org");
  assert.equal(u.searchParams.get("iiurlwidth"),"1600");
  assert.equal(u.searchParams.get("titles"),"File:Child during dental checkup in clinic with dentist examining teeth.jpg");
  return new Response(JSON.stringify({query:{pages:{199976164:{imageinfo:[{
   width:6048,height:4032,size:6601738,mime:"image/jpeg",
   thumburl:thumbnail+"?utm_source=commons.wikimedia.org",
   thumbwidth:1600,thumbheight:1067
  }]}}}}),{status:200,headers:{"content-type":"application/json"}});
 };
 try{
  const optimized=await instagramImageUrl(original);
  assert.equal(optimized,thumbnail);
  assert.equal(called,1);
  assert.equal(original,"https://upload.wikimedia.org/wikipedia/commons/3/3f/Child_during_dental_checkup_in_clinic_with_dentist_examining_teeth.jpg");
 }finally{globalThis.fetch=saved}
});

test("Small Wikimedia image keeps approved original without modification",async()=>{
 const saved=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({query:{pages:{a:{imageinfo:[{
  width:1200,height:800,size:350000,mime:"image/jpeg"
 }]}}}}),{status:200});
 try{assert.equal(await instagramImageUrl(original),original)}finally{globalThis.fetch=saved}
});

test("Untrusted Wikimedia thumbnail host is rejected",async()=>{
 const saved=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({query:{pages:{a:{imageinfo:[{
  width:6048,height:4032,size:6601738,mime:"image/jpeg",
  thumburl:"https://images.evil.example/steal.jpg",thumbwidth:1600,thumbheight:1067
 }]}}}}),{status:200});
 try{await assert.rejects(()=>instagramImageUrl(original),/Небезопасный адрес миниатюры/)}
 finally{globalThis.fetch=saved}
});

test("Unsplash, Pexels and Neon image variants are handled safely",async()=>{
 const u=new URL(await instagramImageUrl("https://images.unsplash.com/photo-123?ixlib=rb-4.0.3"));
 assert.equal(u.searchParams.get("w"),"1600");
 assert.equal(u.searchParams.get("fm"),"jpg");
 const p=new URL(await instagramImageUrl("https://images.pexels.com/photos/1234/person.jpeg"));
 assert.equal(p.searchParams.get("w"),"1600");
 const neon="https://example.storage.c-7.eu-central-1.aws.neon.tech/pr-editorial-media/ai-covers/example.jpg";
 assert.equal(await instagramImageUrl(neon),neon);
 await assert.rejects(()=>instagramImageUrl("http://upload.wikimedia.org/wikipedia/commons/3/3f/unsafe.jpg"),/HTTPS/);
});
