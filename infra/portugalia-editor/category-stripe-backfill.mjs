/**
 * Portugal Ryadom / Instagram: migrate ONLY already scheduled Buffer photos to the
 * category stripe design. Never publish, create, delete, or reschedule a Buffer post.
 * Images are re-encoded locally using vendored jpeg-js (BSD/Apache), no AI credits.
 */
import {createHash,createHmac} from "node:crypto";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const jpeg=require("./vendor/jpeg-js/index.cjs");

export const CATEGORY_COLORS=Object.freeze({
 news:"#E34450",events:"#F28D24",work:"#2776E8",tips:"#25B765",
 life:"#0CB5A6",family:"#8558D9",documents:"#E6B92F",places:"#37A5DF",
 default:"#72879C"
});
const MODEL="pt_ryadom_category_stripes_queued_v5";
const BUCKET="pr-editorial-media";
const ALLOWED_SOURCE=/^https:\/\/(?:mynw\.app\/journalstudio\/instagram-retrofit\/[a-f0-9-]{36}\.jpg|br-young-paper-b972wmgd\.storage\.c-7\.eu-central-1\.aws\.neon\.tech\/pr-editorial-media\/instagram-covers\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.jpg)$/i;
const isQueueStatus=x=>["queued","buffer","scheduled"].includes(String(x||"").toLowerCase());
const hash=v=>createHash("sha256").update(v).digest("hex");
const hmac=(key,v)=>createHmac("sha256",key).update(v).digest();
const isUuid=x=>/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(x||"");
const errorString=e=>String(e?.message||e).slice(0,190);

export function stripeJpeg(bytes,category){
 const src=Buffer.isBuffer(bytes)?bytes:Buffer.from(bytes);
 if(src.byteLength<10000||src.byteLength>6_000_000||src[0]!==255||src[1]!==216)
  throw Error("Input must be a reasonably sized JPEG");
 const input=jpeg.decode(src,{useTArray:true,formatAsRGBA:true,tolerantDecoding:false});
 const {width:w,height:h,data}=input;
 if(w!==1080||h!==1350)throw Error("Only verified 1080x1350 published cover JPEGs are supported");
 const color=CATEGORY_COLORS[category]||CATEGORY_COLORS.default;
 const [r,g,b]=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16));
 for(let y=0;y<h;y++){
  if(y>=27 && y<h-27)continue;
  const white=(y>=24&&y<27)||(y>=h-27&&y<h-24);
  for(let x=0;x<w;x++){
   const at=(y*w+x)*4;
   data[at]=white?255:r;data[at+1]=white?255:g;data[at+2]=white?255:b;data[at+3]=255;
  }
 }
 const result=Buffer.from(jpeg.encode({data,width:w,height:h},85).data);
 if(result.byteLength>5_000_000||result.byteLength<30_000)throw Error("Encoded image size invalid");
 return {bytes:result,category_color:color,width:w,height:h};
}

async function uploadJpeg(key,image){
 const access=process.env.AWS_ACCESS_KEY_ID,secret=process.env.AWS_SECRET_ACCESS_KEY;
 const region=process.env.AWS_REGION||"eu-central-1",endpoint=process.env.AWS_ENDPOINT_URL_S3;
 if(!access||!secret||!endpoint)throw Error("Neon object storage is not configured");
 const base=new URL(endpoint);
 const path="/"+BUCKET+"/"+key.split("/").map(encodeURIComponent).join("/");
 const url=base.origin+path;
 const now=new Date(),iso=now.toISOString().replace(/[:-]|\.\d{3}/g,""),date=iso.slice(0,8);
 const payloadHash=hash(image);
 const headers={"content-type":"image/jpeg","host":base.host,"x-amz-content-sha256":payloadHash,"x-amz-date":iso};
 const signed="content-type;host;x-amz-content-sha256;x-amz-date";
 const canonical="PUT\n"+path+"\n\n"+Object.entries(headers).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+":"+v+"\n").join("")+"\n"+signed+"\n"+payloadHash;
 const scope=date+"/"+region+"/s3/aws4_request",toSign="AWS4-HMAC-SHA256\n"+iso+"\n"+scope+"\n"+hash(canonical);
 const signing=hmac(hmac(hmac(hmac("AWS4"+secret,date),region),"s3"),"aws4_request");
 const signature=createHmac("sha256",signing).update(toSign).digest("hex");
 const auth="AWS4-HMAC-SHA256 Credential="+access+"/"+scope+", SignedHeaders="+signed+", Signature="+signature;
 const response=await fetch(url,{method:"PUT",headers:{...headers,Authorization:auth},body:image,signal:AbortSignal.timeout(40000)});
 if(!response.ok)throw Error("Storage upload failed, HTTP "+response.status);
 return url;
}

export async function retrofitQueuedCategoryStripes({sql,buffer,bufferPostStatus,limit=2,fetchPhoto=fetch,savePhoto=uploadJpeg}){
 const result={checked:0,updated:0,skipped:0,errors:0,items:[],create_posts:0};
 const take=Math.max(1,Math.min(4,Number(limit)||2));
 const candidates=await sql(
  "SELECT p.id,p.item_id,p.status,p.buffer_post_id,p.scheduled_for,p.image_url,p.caption,"+
  "i.primary_category, i.title_ru,m.id AS media_id,m.story_id,m.media_type,m.generation_model,m.generation_prompt,"+
  "m.attribution,m.license_details,m.rights_verified,m.illustration_label_required,m.approved_by,m.approved_at "+
  "FROM public.pr_instagram_publications p "+
  "JOIN public.pr_items i ON i.id=p.item_id "+
  "JOIN LATERAL(SELECT * FROM public.pr_media_assets WHERE item_id=p.item_id "+
  " AND public_url=p.image_url AND status='approved' AND rights_verified=true "+
  " ORDER BY approved_at DESC NULLS LAST,created_at DESC LIMIT 1)m ON TRUE "+
  "WHERE p.account_key='pt_ryadom' AND p.status='queued' AND p.buffer_post_id IS NOT NULL "+
  "AND p.scheduled_for>now()+interval '25 minutes' "+
  "AND coalesce(m.generation_model,'')<>$1 "+
  "ORDER BY p.scheduled_for LIMIT $2",[MODEL,take]);
 for(const row of candidates){
  result.checked++;
  try{
   if(!isUuid(row.item_id)||!isUuid(row.id)||!ALLOWED_SOURCE.test(String(row.image_url||""))){
    result.skipped++;result.items.push({item_id:row.item_id,reason:"unrecognized source image"});continue;
   }
   // Refuse carousels with additional slides. One stripe per only full-frame cover.
   let oldPrompt={};try{oldPrompt=typeof row.generation_prompt==="object"?row.generation_prompt:JSON.parse(row.generation_prompt||"{}")}catch{}
   if(Array.isArray(oldPrompt.slides)&&oldPrompt.slides.length){
    result.skipped++;result.items.push({item_id:row.item_id,reason:"carousel requires manual review"});continue;
   }
   const remote=await bufferPostStatus(row.buffer_post_id);
   if(!remote||remote.id!==row.buffer_post_id||!isQueueStatus(remote.status)){
    result.skipped++;result.items.push({item_id:row.item_id,reason:"post not in Buffer queue"});continue;
   }
   const expected=Date.parse(row.scheduled_for),actual=Date.parse(remote.dueAt||"");
   if(!Number.isFinite(expected)||!Number.isFinite(actual)||Math.abs(expected-actual)>60_000||
     expected-Date.now()<25*60000||remote.text!==row.caption){
    result.skipped++;result.items.push({item_id:row.item_id,reason:"remote text or schedule mismatch"});continue;
   }
   const source=await fetchPhoto(row.image_url,{redirect:"error",signal:AbortSignal.timeout(25000)});
   if(!source.ok)throw Error("Could not retrieve approved photo, HTTP "+source.status);
   const bytes=new Uint8Array(await source.arrayBuffer());
   const decorated=stripeJpeg(bytes,row.primary_category);
   const key="instagram-category-stripes/"+row.item_id+"/buffer-"+row.buffer_post_id+".jpg";
   const url=await savePhoto(key,decorated.bytes);
   // Never generate a new Buffer post or adjust the user's publication time.
   const metadata={instagram:{type:"post",shouldShareToFeed:true,isAiGenerated:row.media_type==="generated_illustration"}};
   const updated=(await buffer(
    "mutation CategoryStripeEdit($input:EditPostInput!){editPost(input:$input){... on PostActionSuccess{post{id text status dueAt}} ... on MutationError{message}}}",
    {input:{id:row.buffer_post_id,text:row.caption,metadata,assets:[{image:{url}}]}})).editPost;
   if(!updated?.post||updated.post.id!==row.buffer_post_id||updated.post.text!==row.caption||
      !isQueueStatus(updated.post.status) ||
      (updated.post.dueAt && Math.abs(Date.parse(updated.post.dueAt)-expected)>60_000))
    throw Error("Buffer edit was not fully confirmed; inspect the original Buffer post before retry");
   const proof=JSON.stringify({design_version:5,category:row.primary_category,source_photo_url:row.image_url,
    buffer_post_id:row.buffer_post_id,source_media_id:row.media_id});
   await sql("INSERT INTO public.pr_media_assets(item_id,story_id,media_type,generation_model,generation_prompt,storage_bucket,storage_key,public_url,attribution,license_details,rights_verified,illustration_label_required,status,approved_by,approved_at) "+
     "VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,'approved',$12,now()) "+
     "ON CONFLICT (item_id,storage_key) DO NOTHING",
     [row.item_id,row.story_id,row.media_type,MODEL,proof,BUCKET,key,url,
      String(row.attribution||"")+"; Category stripes without changes to original article photo",
      String(row.license_details||"")+"; derived JPEG from previously approved cover",row.illustration_label_required===true,
      row.approved_by||null]);
   const dbResult=await sql(
    "UPDATE public.pr_instagram_publications SET image_url=$2,updated_at=now() WHERE id=$1::uuid "+
    "AND status='queued' AND buffer_post_id=$3 AND image_url=$4 RETURNING id",
    [row.id,url,row.buffer_post_id,row.image_url]);
   if(dbResult.length!==1)throw Error("Buffer updated but database changed concurrently; manual reconciliation required");
   await sql("INSERT INTO public.pr_instagram_delivery_events(publication_id,event_type,meta_object_id) "+
      "VALUES($1::uuid,'category_stripe_v5_buffer_edited',$2)",[row.id,row.buffer_post_id]).catch(()=>{});
   result.updated++;
   result.items.push({item_id:row.item_id,category:row.primary_category,color:decorated.category_color,status:"Buffer edit verified",buffer_post_id:row.buffer_post_id});
  }catch(e){
   result.errors++;result.items.push({item_id:row.item_id,error:errorString(e)});
   console.error("PR_CATEGORY_STRIPE_BACKFILL",row.item_id,errorString(e));
  }
 }
 return result;
}
