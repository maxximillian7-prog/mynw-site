// Portugal Ryadom: reuse EXISTING Trailyo artwork for already-published events.
// No image generation, no auto-approval, no Telegram sending.
import {createHash,createHmac} from "node:crypto";
const SUPABASE="https://egjxgintpcoqhmdohabk.supabase.co";
const ROOT=SUPABASE+"/rest/v1/experiences";
const TRUSTED=SUPABASE+"/storage/v1/object/public/trailyo-covers/";
const BUCKET="pr-editorial-media";
const uuid=x=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(x||""));
const clean=(s,n=350)=>String(s??"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,n);
const reply=(o,s=200)=>Response.json(o,{status:s,headers:{"cache-control":"no-store"}});
async function db(query,params=[]){
 const conn=process.env.DATABASE_URL;
 if(!conn)throw Error("journal_database_unavailable");
 const host=new URL(conn).hostname;
 const r=await fetch("https://"+host+"/sql",{method:"POST",headers:{"content-type":"application/json","Neon-Connection-String":conn},body:JSON.stringify({query,params}),signal:AbortSignal.timeout(20000)});
 if(!r.ok)throw Error("journal_sql_http_"+r.status);
 const data=await r.json();return data.rows??data;
}
const hash=x=>createHash("sha256").update(x).digest("hex");
const hmac=(k,s)=>createHmac("sha256",k).update(s).digest();
async function storePng(storageKey,bytes){
 const access=process.env.AWS_ACCESS_KEY_ID,secret=process.env.AWS_SECRET_ACCESS_KEY,endpoint=process.env.AWS_ENDPOINT_URL_S3,region=process.env.AWS_REGION||"eu-central-1";
 if(!access||!secret||!endpoint)throw Error("journal_media_storage_unavailable");
 const origin=new URL(endpoint);
 const path="/"+BUCKET+"/"+storageKey.split("/").map(encodeURIComponent).join("/");
 const url=origin.origin+path,dateFull=new Date().toISOString().replace(/[:-]|\.\d{3}/g,""),date=dateFull.slice(0,8);
 const sha=hash(bytes),headers={"content-type":"image/png","host":origin.host,"x-amz-content-sha256":sha,"x-amz-date":dateFull};
 const signed="content-type;host;x-amz-content-sha256;x-amz-date";
 const canonical="PUT\n"+path+"\n\n"+Object.entries(headers).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+":"+v+"\n").join("")+"\n"+signed+"\n"+sha;
 const scope=date+"/"+region+"/s3/aws4_request",message="AWS4-HMAC-SHA256\n"+dateFull+"\n"+scope+"\n"+hash(canonical);
 const signing=hmac(hmac(hmac(hmac("AWS4"+secret,date),region),"s3"),"aws4_request");
 const sig=createHmac("sha256",signing).update(message).digest("hex");
 const authorization="AWS4-HMAC-SHA256 Credential="+access+"/"+scope+", SignedHeaders="+signed+", Signature="+sig;
 const res=await fetch(url,{method:"PUT",headers:{...headers,Authorization:authorization},body:bytes,signal:AbortSignal.timeout(45000)});
 if(!res.ok)throw Error("journal_media_store_http_"+res.status);
 return url;
}
function verifiedCover(image,eventId){
 if(!uuid(eventId)||image?.image_rights_status!=="permission_confirmed")return null;
 if(!["published"].includes(image.status))return null;
 let u;try{u=new URL(image.image_url)}catch{return null}
 if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash||!u.href.startsWith(TRUSTED))return null;
 const storageKey=u.href.slice(TRUSTED.length);
 if(!["events/"+eventId+".png","ai-imported-events/"+eventId+".png"].includes(storageKey))return null;
 const attribution=clean(image.image_attribution,280);
 if(!/AI.generated|original Trailyo category cover/i.test(attribution))return null;
 return {url:u.href,attribution,storageKey};
}
async function importOne(item,event){
 const cover=verifiedCover(event,item.external_id);
 if(!cover)return "not_verified";
 const existing=await db("SELECT id,status,storage_bucket FROM pr_media_assets WHERE item_id=$1::uuid AND generation_model='trailyo_original_ai_import' AND status IN ('candidate','approved') AND storage_bucket=$2 LIMIT 1",[item.id,BUCKET]);
 if(existing.length)return "already";
 const image=await fetch(cover.url,{redirect:"error",signal:AbortSignal.timeout(22000)});
 if(!image.ok)throw Error("trailyo_cover_http_"+image.status);
 const contentType=(image.headers.get("content-type")||"").toLowerCase();
 if(!contentType.startsWith("image/png"))throw Error("trailyo_cover_invalid_type");
 const raw=Buffer.from(await image.arrayBuffer());
 if(raw.byteLength<2048||raw.byteLength>9_000_000||raw.subarray(0,8).toString("hex")!=="89504e470d0a1a0a")throw Error("trailyo_cover_invalid_png");
 // Copy the EXISTING, rights-verified original into Journal-controlled storage.
 const key="ai-covers/trailyo/"+item.external_id+".png";
 const publicUrl=await storePng(key,raw);
 const label="AI-изображение Trailyo · не официальный постер мероприятия";
 const rights="Original Trailyo cover; permission_confirmed in published experience; "+cover.attribution+"; source "+cover.url;
 const old=await db("SELECT id FROM pr_media_assets WHERE item_id=$1::uuid AND status='generated' AND generation_model IN ('trailyo_original_ai_import','trailyo_existing_ai') ORDER BY created_at DESC LIMIT 1",[item.id]);
 if(old.length){
  await db("UPDATE pr_media_assets SET media_type='generated_illustration',generation_model='trailyo_original_ai_import',generation_prompt='Existing rights-verified event cover reused from Trailyo, NOT generated again',storage_bucket=$2,storage_key=$3,public_url=$4,attribution=$5,license_details=$6,rights_verified=true,illustration_label_required=true,status='candidate',failure_reason=NULL WHERE id=$1::uuid",[old[0].id,BUCKET,key,publicUrl,label,rights]);
 }else{
  await db("INSERT INTO pr_media_assets(item_id,story_id,media_type,generation_model,generation_prompt,storage_bucket,storage_key,public_url,attribution,license_details,rights_verified,illustration_label_required,status) VALUES($1::uuid,(SELECT id FROM pr_story_drafts WHERE item_id=$1::uuid),'generated_illustration','trailyo_original_ai_import','Existing rights-verified Trailyo event cover (not generated again)',$2,$3,$4,$5,$6,true,true,'candidate') ON CONFLICT (item_id,storage_key) DO NOTHING",[item.id,BUCKET,key,publicUrl,label,rights]);
 }
 // Candidate is visible to the editor, but does not become an approved cover.
 await db("UPDATE pr_items SET photo_url=$2,photo_rights='permission_confirmed',photo_attribution=$3,photo_license='Trailyo-owned illustration; not documentary',updated_at=now() WHERE id=$1::uuid AND status='candidate' AND (photo_url IS NULL OR photo_url='')",[item.id,publicUrl,label]);
 return "copied_for_review";
}
async function scan(){
 const [cursor]=await db("SELECT next_offset FROM pr_trailyo_media_scan WHERE code='trailyo_events'");
 const offset=Math.max(0,Number(cursor?.next_offset||0));
 const items=await db("SELECT i.id,i.external_id FROM pr_items i JOIN pr_sources s ON s.id=i.source_id WHERE s.code='trailyo_events' AND i.status='candidate' AND i.duplicate_of IS NULL AND COALESCE(i.ends_at,i.starts_at)>now() AND i.external_id ~ '^[0-9a-f-]{36}$' ORDER BY i.id LIMIT 25 OFFSET $1",[offset]);
 if(!items.length){
  await db("UPDATE pr_trailyo_media_scan SET next_offset=0,last_run=now(),last_error=NULL WHERE code='trailyo_events'");
  return {ok:true,reset:true,checked:0};
 }
 const ids=items.map(i=>i.external_id).filter(uuid);
 if(!ids.length)return {ok:true,skipped:"no_valid_ids"};
 const url=new URL(ROOT);
 url.searchParams.set("select","id,status,image_url,image_rights_status,image_attribution");
 url.searchParams.set("id","in.("+ids.join(",")+")");
 url.searchParams.set("status","eq.published");
 url.searchParams.set("limit","30");
 const response=await fetch(url,{headers:{apikey:process.env.TRAILYO_PUBLISHABLE_KEY,accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(17000)});
 if(!response.ok)throw Error("trailyo_events_http_"+response.status);
 const records=await response.json();if(!Array.isArray(records))throw Error("trailyo_invalid_response");
 const map=new Map(records.map(e=>[e.id,e]));
 let copied=0,skipped=0,failed=0;
 for(const item of items){const event=map.get(item.external_id);if(!event){skipped++;continue;}
  try{const result=await importOne(item,event);if(result==="copied_for_review")copied++;else skipped++;}
  catch(e){failed++; /* one broken cover must not block the batch */ }
 }
 await db("UPDATE pr_trailyo_media_scan SET next_offset=$1,last_run=now(),seen=seen+$2,imported=imported+$3,last_error=NULL WHERE code='trailyo_events'",[items.length<25?0:offset+items.length,items.length,copied]);
 return {ok:true,checked:items.length,published_event_matches:records.length,copied_for_review:copied,skipped,failed,telegram_sent:0};
}
export default {async fetch(req){
 const path=new URL(req.url).pathname;
 if(req.method==="GET"&&path==="/health")return reply({ok:true,service:"prtrailmedia",version:2,mode:"reuse_published_verified_trailyo_images_only",source:"existing_trailyo_experiences",openai_generation:false,needs_editor_approval:true,storage_configured:Boolean(process.env.AWS_ACCESS_KEY_ID&&process.env.AWS_SECRET_ACCESS_KEY&&process.env.AWS_ENDPOINT_URL_S3),source_key_configured:Boolean(process.env.TRAILYO_PUBLISHABLE_KEY)});
 if(req.method!=="POST"||!req.headers.get("x-neon-trigger-invocation-id"))return reply({error:"scheduled_only"},403);
 if(!process.env.TRAILYO_PUBLISHABLE_KEY)return reply({ok:true,skipped:"trailyo_key_missing"});
 try{return reply(await scan());}
 catch(e){const msg=clean(e?.message||e,120);try{await db("UPDATE pr_trailyo_media_scan SET last_run=now(),last_error=$1 WHERE code='trailyo_events'",[msg]);}catch{}return reply({ok:false,error:msg},500)}
}};
