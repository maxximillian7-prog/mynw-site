import {neon} from './driver.mjs';
const db=neon(process.env.DATABASE_URL),q=(s,p=[])=>db.query(s,p);
const root='https://egjxgintpcoqhmdohabk.supabase.co/rest/v1/experiences';
const trusted='https://egjxgintpcoqhmdohabk.supabase.co/storage/v1/object/public/trailyo-covers/';
const reply=(j,status=200)=>Response.json(j,{status});
const uuid=s=>/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(String(s||''));
export default {async fetch(req){
 const path=new URL(req.url).pathname;
 if(req.method==='GET'&&path==='/health')return reply({ok:true,mode:'approved_ai_covers_only',telegram_sending:false});
 if(req.method!=='POST'||!req.headers.get('x-neon-trigger-invocation-id'))return reply({error:'scheduled_only'},403);
 if(!process.env.TRAILYO_PUBLISHABLE_KEY)return reply({ok:true,skipped:'public_key_unavailable'});
 try{
  const [cursor]=await q("SELECT next_offset FROM pr_trailyo_media_scan WHERE code='trailyo_events'");const offset=cursor?.next_offset||0;
  const items=await q("SELECT i.id,i.external_id FROM pr_items i JOIN pr_sources s ON s.id=i.source_id WHERE s.code='trailyo_events' AND i.status='candidate' AND i.starts_at>now() AND i.external_id ~ '^[0-9a-f-]{36}$' ORDER BY i.id LIMIT 25 OFFSET $1",[offset]);
  if(!items.length){
   await q("UPDATE pr_trailyo_media_scan SET next_offset=0,last_run=now(),last_error=NULL WHERE code='trailyo_events'");
   return reply({ok:true,reset:true,items:0});
  }
  const ids=items.map(i=>i.external_id).filter(uuid);
  if(!ids.length)return reply({ok:true,skipped:'no_valid_events'});
  const u=new URL(root);
  u.searchParams.set('select','id,image_url,image_rights_status,image_attribution,attribution,source_license');
  u.searchParams.set('id','in.('+ids.join(',')+')');
  u.searchParams.set('status','eq.published');
  u.searchParams.set('limit','30');
  const r=await fetch(u,{headers:{apikey:process.env.TRAILYO_PUBLISHABLE_KEY,accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!r.ok)throw Error('public_rest_'+r.status);
  const data=await r.json();if(!Array.isArray(data))throw Error('unexpected_public_rest_json');
  const known=new Map(items.map(i=>[i.external_id,i.id]));let imported=0,skipped=0;
  for(const x of data){
   const local=known.get(x.id);if(!local){skipped++;continue}
   const image=String(x.image_url||'');
   // Only original AI illustrations stored in the operator's own public Trailyo storage.
   if(x.image_rights_status!=='permission_confirmed'||!image.startsWith(trusted)||!String(x.image_attribution||'').toLowerCase().includes('ai-generated')){skipped++;continue}
   if(image.length>1100||!image.toLowerCase().endsWith('.png')){skipped++;continue}
   const exists=await q("SELECT id FROM pr_media_assets WHERE item_id=$1::uuid AND public_url=$2 LIMIT 1",[local,image]);
   if(exists.length){skipped++;continue}
   const story=await q("SELECT id FROM pr_story_drafts WHERE item_id=$1::uuid LIMIT 1",[local]);
   await q("INSERT INTO pr_media_assets(item_id,story_id,media_type,generation_model,generation_prompt,storage_bucket,storage_key,public_url,attribution,license_details,rights_verified,illustration_label_required,status,generated_at) VALUES($1::uuid,$2::uuid,'generated_illustration','trailyo_existing_ai','Reuse of existing, original Trailyo AI cover for the same event','trailyo-covers',NULL,$3,$4,$5,true,true,'generated',now())",[local,story[0]?.id||null,image,String(x.image_attribution||'').slice(0,300),String(x.source_license||'').slice(0,300)]);
   // Existing verified AI cover takes priority; reject an unspent duplicate generation job.
   await q("UPDATE pr_media_assets SET status='rejected',failure_reason='already_has_verified_trailyo_ai_cover' WHERE item_id=$1::uuid AND media_type='generated_illustration' AND status='candidate' AND public_url IS NULL",[local]);
   imported++;
  }
  await q("UPDATE pr_trailyo_media_scan SET next_offset=$1,last_run=now(),seen=seen+$2,imported=imported+$3,last_error=NULL WHERE code='trailyo_events'",[items.length<25?0:offset+items.length,items.length,imported]);
  return reply({ok:true,checked:items.length,public_events:data.length,reused_licensed_ai_covers:imported,skipped,telegram_sent:0});
 }catch(e){const error=String(e.message||e).slice(0,100);try{await q("UPDATE pr_trailyo_media_scan SET last_run=now(),last_error=$1 WHERE code='trailyo_events'",[error])}catch{}return reply({ok:false,error},500)}
 }};