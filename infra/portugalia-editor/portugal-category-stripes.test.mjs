import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFileSync} from "node:fs";
import {retrofitQueuedCategoryStripes,stripeJpeg,CATEGORY_COLORS} from "./category-stripe-backfill.mjs";
const require=createRequire(import.meta.url);
const jpeg=require("./vendor/jpeg-js/index.cjs");
const source=readFileSync(new URL("./prbuffer.mjs",import.meta.url),"utf8");
const photoSource=readFileSync(new URL("./prphoto.mjs",import.meta.url),"utf8");
const editorSource=readFileSync(new URL("../../journalstudio/cloud/portugal/instagram-cover-design.js",import.meta.url),"utf8");
const categories=["news","events","work","tips","life","family","documents","places"];

function sampleJpeg(){
 const width=1080,height=1350,data=Buffer.alloc(width*height*4);
 for(let i=0;i<data.length;i+=4){data[i]=120;data[i+1]=160;data[i+2]=190;data[i+3]=255}
 return Buffer.from(jpeg.encode({width,height,data},75).data);
}
test("8 categories and visual preview share identical stripe colors",()=>{
 assert.equal(new Set(categories.map(k=>CATEGORY_COLORS[k])).size,8);
 for(const [k,v] of Object.entries(CATEGORY_COLORS))
  assert.ok(editorSource.includes(k+':"'+v+'"') || editorSource.includes(k+':"'+v+'"'),"Missing browser category color "+k);
 assert.match(source,/\/internal\/category-stripes/);
 assert.match(source,/x-neon-trigger-invocation-id/);
 assert.match(photoSource,/Number\(designVersion\)!==5/);
});
test("JPEG recoloring creates visible matching top and bottom, keeps photo center intact",()=>{
 const original=sampleJpeg();
 const out=stripeJpeg(original,"tips");
 assert.equal(out.category_color,CATEGORY_COLORS.tips);
 assert.equal(out.width,1080);assert.equal(out.height,1350);
 const result=jpeg.decode(out.bytes,{useTArray:true,formatAsRGBA:true});
 const at=(x,y)=>[...result.data.slice((y*1080+x)*4,(y*1080+x)*4+3)];
 const close=(a,b)=>assert.ok(Math.abs(a-b)<24, "Channel mismatch "+a+" vs "+b);
 const rgb=[0x25,0xB7,0x65];
 for(const pos of [at(300,10),at(300,1340)])pos.forEach((v,i)=>close(v,rgb[i]));
 for(const pos of [at(300,25),at(300,1324)])pos.forEach(v=>close(v,255));
 for(const pos of [at(300,70),at(300,600)]){close(pos[0],120);close(pos[1],160);close(pos[2],190)}
});
test("pre-scheduled Buffer post is edited in-place without new post, time or caption change",async()=>{
 const source=sampleJpeg(),id="83ffcdfe-9b66-4779-8675-8f8b88fdff6b";
 const pid="23029627-5ac2-43a7-9124-fa5843132ea5";
 const due=new Date(Date.now()+36e5).toISOString();
 const photo="https://mynw.app/journalstudio/instagram-retrofit/"+id+".jpg";
 const row={
  id:pid,item_id:id,status:"queued",buffer_post_id:"bufferAbcXYZ",scheduled_for:due,image_url:photo,
  caption:"Approved caption",primary_category:"tips",media_id:"11111111-1111-4111-8111-111111111111",
  story_id:null,media_type:"owned_original",rights_verified:true,attribution:"Owner",license_details:"Owned",approved_by:null
 };
 let approvedDbChanges=0,bufferCalls=0,savedPhoto="";
 const buffer=async(query,variables)=>{
  bufferCalls++;
  assert.match(query,/editPost/);
  assert.doesNotMatch(query,/createPost/);
  assert.equal(variables.input.id,row.buffer_post_id);
  assert.equal(variables.input.text,row.caption);
  assert.equal(variables.input.mode,undefined);
  assert.equal(variables.input.dueAt,undefined);
  return {editPost:{post:{id:row.buffer_post_id,text:row.caption,status:"scheduled",dueAt:due}}};
 };
 const sql=async(query)=>{
  if(query.startsWith("SELECT p.id"))return [row];
  if(query.startsWith("INSERT INTO public.pr_media_assets"))return [];
  if(query.startsWith("UPDATE public.pr_instagram_publications")){approvedDbChanges++;return [{id:pid}]}
  if(query.startsWith("INSERT INTO public.pr_instagram_delivery_events"))return [];
  throw Error("Unexpected SQL "+query.slice(0,90));
 };
 const result=await retrofitQueuedCategoryStripes({
  sql,buffer,bufferPostStatus:async()=>({id:row.buffer_post_id,status:"scheduled",dueAt:due,text:row.caption}),
  limit:2,
  fetchPhoto:async()=>({ok:true,arrayBuffer:async()=>new Uint8Array(source)}),
  savePhoto:async(key,bytes)=>{assert.match(key,/instagram-category-stripes/);assert.ok(bytes.byteLength>30000);savedPhoto=key;return "https://example.org/new-cover.jpg"}
 });
 assert.equal(result.updated,1);
 assert.equal(result.errors,0);
 assert.equal(bufferCalls,1);
 assert.equal(approvedDbChanges,1);
 assert.match(savedPhoto,/buffer-bufferAbcXYZ\.jpg$/);
});
test("mismatched Buffer time cannot change any post",async()=>{
 let bufferCalls=0;
 const due=new Date(Date.now()+36e5).toISOString();
 const row={id:"23029627-5ac2-43a7-9124-fa5843132ea5",item_id:"83ffcdfe-9b66-4779-8675-8f8b88fdff6b",status:"queued",buffer_post_id:"abc",scheduled_for:due,image_url:"https://mynw.app/journalstudio/instagram-retrofit/83ffcdfe-9b66-4779-8675-8f8b88fdff6b.jpg",caption:"A"};
 const r=await retrofitQueuedCategoryStripes({
  sql:async()=>[row],
  buffer:async()=>{bufferCalls++;return{}},
  bufferPostStatus:async()=>({id:"abc",status:"scheduled",dueAt:new Date(Date.now()+7200e3).toISOString(),text:"A"})
 });
 assert.equal(bufferCalls,0);assert.equal(r.updated,0);assert.equal(r.skipped,1);
});
