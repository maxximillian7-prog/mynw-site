// Import existing, PUBLIC Trailyo event image URLs into editorial candidates.
// No licence filtering, no media replication, no AI generation, no auto-approval.
// Rights remain UNVERIFIED in Journal until independently established.
const ROOT="https://egjxgintpcoqhmdohabk.supabase.co/rest/v1/experiences";
const MEDIA_MODEL="trailyo_existing_image_reference";
const uuid=x=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(x||""));
const clean=(s,n=300)=>String(s??"").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,n);
const reply=(o,s=200)=>Response.json(o,{status:s,headers:{"cache-control":"no-store"}});
async function db(query,params=[]){
 const conn=process.env.DATABASE_URL;
 if(!conn)throw Error("journal_database_unavailable");
 const r=await fetch("https://"+new URL(conn).hostname+"/sql",{
  method:"POST",headers:{"content-type":"application/json","Neon-Connection-String":conn},
  body:JSON.stringify({query,params}),signal:AbortSignal.timeout(20000)
 });
 if(!r.ok)throw Error("journal_sql_http_"+r.status);
 const data=await r.json();return data.rows??data;
}
function photoSource(event,id){
 if(!event||event.status!=="published"||!uuid(id)||event.id!==id)return null;
 const raw=String(event.image_url||"");
 let url;try{url=new URL(raw)}catch{return null}
 // Never allow embedded credentials, non-HTTP or private/internal addresses.
 if(url.protocol!=="https:"||url.username||url.password||url.port||
    /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|::1)/i.test(url.hostname)||
    !url.hostname.includes(".")||raw.length>1800)return null;
 return {url:url.href,attribution:clean(event.image_attribution||"Imagem do evento no Trailyo",300),
         rightStatus:clean(event.image_rights_status||"unverified",50)};
}
async function importOne(item,event){
 const image=photoSource(event,item.external_id);
 if(!image)return "invalid_or_missing";
 const previous=await db("SELECT id,status FROM pr_media_assets WHERE item_id=$1::uuid AND generation_model=$2 AND public_url=$3 LIMIT 1",[item.id,MEDIA_MODEL,image.url]);
 if(previous.length)return "already";
 const note="Изображение опубликованного события Trailyo. Права повторного использования журналом НЕ проверялись. Исходный статус: "+image.rightStatus+".";
 const origin="Trailyo image URL: "+image.url+"; attribution: "+image.attribution+"; original rights: "+image.rightStatus;
 await db("INSERT INTO pr_media_assets(item_id,story_id,media_type,generation_model,generation_prompt,public_url,attribution,license_details,rights_verified,illustration_label_required,status) VALUES($1::uuid,(SELECT id FROM pr_story_drafts WHERE item_id=$1::uuid),'brand_generic',$2,'Existing Trailyo image, linked without checking licence, editorial approval required',$3,$4,$5,false,false,'candidate')",[item.id,MEDIA_MODEL,image.url,image.attribution||note,origin]);
 // The original link can be previewed; do not misrepresent image permissions.
 await db("UPDATE pr_items SET photo_url=$2,photo_rights='unverified',photo_attribution=$3,photo_license=NULL,photo_licence_url=NULL,updated_at=now() WHERE id=$1::uuid AND status='candidate' AND (photo_url IS NULL OR photo_url='')",[item.id,image.url,image.attribution]);
 return "linked_for_review";
}

async function syncEventDetails(item,event){
 if(!event||event.status!=="published"||event.id!==item.external_id)return false;
 const validDate=v=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||""))?String(v):null;
 const validMoment=v=>v&&/^\d{4}-\d{2}-\d{2}[T ]/.test(String(v))?String(v):null;
 const lat=Number(event.event_latitude),lon=Number(event.event_longitude);
 const coords=event.event_latitude!=null&&event.event_longitude!=null&&Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180;
 await db("INSERT INTO public.pr_trailyo_event_details(item_id,event_id,city,venue,starts_on,ends_on,time_known,starts_at,ends_at,source_time_text,latitude,longitude) VALUES($1::uuid,$2::uuid,$3,$4,$5::date,$6::date,$7,$8::timestamptz,$9::timestamptz,$10,$11::double precision,$12::double precision) ON CONFLICT(item_id) DO UPDATE SET event_id=excluded.event_id,city=excluded.city,venue=excluded.venue,starts_on=excluded.starts_on,ends_on=excluded.ends_on,time_known=excluded.time_known,starts_at=excluded.starts_at,ends_at=excluded.ends_at,source_time_text=excluded.source_time_text,latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now()",[item.id,item.external_id,clean(event.city,140)||null,clean(event.venue,230)||null,validDate(event.starts_on),validDate(event.ends_on),event.time_known===true,validMoment(event.starts_at),validMoment(event.ends_at),clean(event.source_time_text,120)||null,coords?lat:null,coords?lon:null]);
 return true;
}
async function scan(){
 const [state]=await db("SELECT next_offset FROM pr_trailyo_media_scan WHERE code='trailyo_events'");
 const offset=Math.max(0,Number(state?.next_offset||0));
 const items=await db("SELECT i.id,i.external_id FROM pr_items i JOIN pr_sources s ON s.id=i.source_id WHERE s.code='trailyo_events' AND i.primary_category='events' AND i.status='candidate' AND i.duplicate_of IS NULL AND COALESCE(i.ends_at,i.starts_at)>now() AND i.external_id ~ '^[0-9a-f-]{36}$' ORDER BY i.id LIMIT 30 OFFSET $1",[offset]);
 if(!items.length){
  await db("UPDATE pr_trailyo_media_scan SET next_offset=0,last_run=now(),last_error=NULL WHERE code='trailyo_events'");
  return {ok:true,reset:true,checked:0};
 }
 const ids=items.map(i=>i.external_id).filter(uuid);
 const url=new URL(ROOT);
 url.searchParams.set("select","id,status,image_url,image_attribution,image_rights_status,city,venue,starts_at,ends_at,starts_on,ends_on,time_known,source_time_text,event_latitude,event_longitude");
 url.searchParams.set("id","in.("+ids.join(",")+")");
 url.searchParams.set("status","eq.published");url.searchParams.set("limit","40");
 const res=await fetch(url,{headers:{apikey:process.env.TRAILYO_PUBLISHABLE_KEY,accept:"application/json"},redirect:"error",signal:AbortSignal.timeout(20000)});
 if(!res.ok)throw Error("trailyo_experiences_http_"+res.status);
 const events=await res.json();if(!Array.isArray(events))throw Error("trailyo_bad_response");
 const found=new Map(events.map(event=>[event.id,event]));
 let linked=0,skipped=0,failed=0,metadata_synced=0;
 for(const item of items){
  const event=found.get(item.external_id);
  try{if(await syncEventDetails(item,event))metadata_synced++;}
  catch(e){failed++; /* do not block the image candidate */ }
  try{if(await importOne(item,event)==="linked_for_review")linked++;else skipped++;}
  catch(e){failed++;/* continue importing other valid Trailyo artwork */}
 }
 await db("UPDATE pr_trailyo_media_scan SET next_offset=$1,last_run=now(),seen=seen+$2,imported=imported+$3,last_error=$4 WHERE code='trailyo_events'",[items.length<30?0:offset+items.length,items.length,linked,failed?failed+" image(s) failed; remaining processed":null]);
 return {ok:true,checked:items.length,linked_for_editor:linked,event_metadata_synced:metadata_synced,skipped,failed,auto_approved:0,telegram_sent:0};
}
export default {async fetch(req){
 const path=new URL(req.url).pathname;
 if(req.method==="GET"&&path==="/health")return reply({ok:true,service:"prtrailmedia",version:4,geo_and_event_time_sync:true,mode:"all_existing_published_trailyo_images",license_filter:false,rights_marked_unverified:true,requires_manual_editorial_approval:true,api_key_configured:Boolean(process.env.TRAILYO_PUBLISHABLE_KEY)});
 if(req.method!=="POST"||!req.headers.get("x-neon-trigger-invocation-id"))return reply({error:"scheduled_only"},403);
 if(!process.env.TRAILYO_PUBLISHABLE_KEY)return reply({ok:true,skipped:"trailyo_key_missing"});
 try{return reply(await scan());}
 catch(e){const msg=clean(e?.message||e,120);try{await db("UPDATE pr_trailyo_media_scan SET last_run=now(),last_error=$1 WHERE code='trailyo_events'",[msg]);}catch{}return reply({ok:false,error:msg},500)}
}};
