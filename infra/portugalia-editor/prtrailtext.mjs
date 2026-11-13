import {neon} from "./driver.mjs";
const db=neon(process.env.DATABASE_URL),sql=(q,p=[])=>db.query(q,p);
const SUPABASE="https://egjxgintpcoqhmdohabk.supabase.co";
const safe=(s,n=7000)=>String(s??"").replace(/<[^>]*>/g," ").replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim().slice(0,n);
const uuid=x=>/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(x||"");
const res=(x,s=200)=>Response.json(x,{status:s});
export default {async fetch(req){
 const route=new URL(req.url).pathname;
 if(route==="/health")return res({ok:true,service:"prtrailtext",description:"source_ru_translation_sync",mode:"staging_only"});
 if(req.method!=="POST"||!req.headers.get("x-neon-trigger-invocation-id"))return res({error:"schedule_only"},403);
 if(!process.env.TRAILYO_PUBLISHABLE_KEY)return res({ok:true,skipped:"public_key_not_configured"});
 try{
 const candidates=await sql("SELECT i.id,i.external_id,i.summary_ru,d.id draft_id,d.status draft_status,d.ai_model,d.source_context_used FROM pr_items i JOIN pr_sources s ON s.id=i.source_id LEFT JOIN pr_story_drafts d ON d.item_id=i.id WHERE s.code='trailyo_events' AND i.duplicate_of IS NULL AND i.status='candidate' AND i.external_id ~ '^[0-9a-f-]{36}$' AND (length(coalesce(i.summary_ru,''))<=520 OR length(coalesce(d.source_context_used,'')) BETWEEN 495 AND 505 OR i.title_ru IS NULL) ORDER BY i.discovered_at DESC LIMIT 30");
 if(!candidates.length)return res({ok:true,skipped:"no_truncated_translation"});
 const items=candidates.filter(x=>uuid(x.external_id));
 const u=new URL(SUPABASE+"/rest/v1/event_translations");
 u.searchParams.set("select","event_id,locale,title,description");
 u.searchParams.set("event_id","in.("+items.map(x=>x.external_id).join(",")+")");
 u.searchParams.set("locale","eq.ru");
 u.searchParams.set("limit","40");
 const r=await fetch(u,{headers:{"apikey":process.env.TRAILYO_PUBLISHABLE_KEY,"accept":"application/json"},redirect:"error",signal:AbortSignal.timeout(17000)});
 if(!r.ok)throw Error("trailyo_translations_http_"+r.status);
 const list=await r.json();if(!Array.isArray(list))throw Error("invalid_translations_response");
 const byId=new Map(list.map(x=>[x.event_id,x]));
 let restored=0,draftsRebuilt=0,missing=0,incomplete=0,withheld=0;
 for(const item of items){
  const tr=byId.get(item.external_id);
  if(!tr){missing++;continue}
  const body=safe(tr.description),title=safe(tr.title,240);
  if(body.length<150||!/[А-Яа-яЁё]/.test(body)||!/[.!?…»)]$/.test(body)){incomplete++;continue}
  if(body.length<=safe(item.summary_ru).length+15){withheld++;continue}
  const edit=await sql("SELECT 1 FROM pr_editorial_revisions WHERE item_id=$1::uuid AND action IN ('save','verify_facts','approve','reopen') LIMIT 1",[item.id]);
  if(edit.length){withheld++;continue}
  await sql("UPDATE pr_items SET summary_ru=$2,title_ru=CASE WHEN title_ru IS NULL OR title_ru='' THEN $3 ELSE title_ru END,updated_at=now() WHERE id=$1::uuid AND status='candidate'",[item.id,body,title]);
  restored++;
  if(item.draft_id&&["draft","needs_facts"].includes(item.draft_status)&&["source_translation_bootstrap","gpt-6-luna"].includes(item.ai_model)){
   const dot=body.search(/[.!?]\s/);const first=(dot>50&&dot<270)?body.slice(0,dot+1):body.slice(0,165).replace(/\s+\S*$/,"");
   const rest=body.slice(first.length).trim();
   if(rest.length>=170&&/[.!?…»)]$/.test(rest)){
    await sql("UPDATE pr_story_drafts SET lead_ru=$2,story_ru=$3,source_context_used=$4,needs_more_facts=false,context_verified=false,status='draft',updated_at=now() WHERE id=$1::uuid AND status IN ('draft','needs_facts') AND reviewer IS NULL",[item.draft_id,first,rest,body]);
    draftsRebuilt++;
   }else{
    await sql("UPDATE pr_story_drafts SET source_context_used=$2,needs_more_facts=true,status='needs_facts',updated_at=now() WHERE id=$1::uuid AND status IN ('draft','needs_facts') AND reviewer IS NULL",[item.draft_id,body]);
   }
  }
 }
 return res({ok:true,checked:items.length,found_translation:list.length,restored_full_ru:restored,recreated_drafts:draftsRebuilt,missing_ru:missing,incomplete_ru:incomplete,withheld_for_safety:withheld,telegram_sent:0});
 }catch(e){return res({ok:false,error:String(e.message||e).slice(0,120)},500)}
}};
