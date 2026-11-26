// Instagram/Buffer publisher for Portugal Journal. Authenticated editorial actions only.
const CHANNEL="6af8b0f062b70b94b031a50c";
const STUDIO="https://npsfaymjckcqhtyiafms.supabase.co";
const PUBLIC="sb_publishable_-HPESNuXtfZQo-gLREwi2Q_1_aAoxee";
const ALLOWED=new Set(["https://mynw.app","https://www.mynw.app"]);
const isUuid=v=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v||"");
const fail=(message,status=400)=>Object.assign(new Error(message),{status});
function json(data,status=200,origin=""){return new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin",...(origin?{"access-control-allow-origin":origin}:{})}})}
async function sql(query,params=[]){
 if(!process.env.DATABASE_URL)throw fail("Не настроено подключение базы",503);
 const r=await fetch("https://"+new URL(process.env.DATABASE_URL).hostname+"/sql",{
 method:"POST",headers:{"content-type":"application/json","Neon-Connection-String":process.env.DATABASE_URL},
 body:JSON.stringify({query,params}),signal:AbortSignal.timeout(16000)});
 const d=await r.json().catch(()=>({}));
 if(!r.ok){
  // Surface the safe PostgreSQL error and the failing SQL prefix in server logs
  // (never log connection strings, API keys or query parameter values).
  const cause=typeof d.error==="object"?(d.error?.message||d.error?.detail||JSON.stringify(d.error)):
   (d.error||d.message||d.detail||r.statusText);
  const msg=String(cause||"unknown").slice(0,250);
  console.error("PR_NEON_SQL_DETAIL",JSON.stringify({status:r.status,query:String(query).replace(/\\s+/g," ").slice(0,160),message:msg}));
  throw fail("Ошибка Neon SQL "+r.status+": "+msg.slice(0,130),503);
 }
 return d.rows??d;
}
async function identity(request){
 const authorization=request.headers.get("Authorization")||"";
 if(!authorization.startsWith("Bearer ")||authorization.length>3200)throw fail("Войдите в Journal Studio",401);
 const headers={"apikey":PUBLIC,"authorization":authorization};
 const [userResponse,projectsResponse]=await Promise.all([
  fetch(STUDIO+"/auth/v1/user",{headers,signal:AbortSignal.timeout(12000)}),
  fetch(STUDIO+"/functions/v1/studio-api/projects",{headers,signal:AbortSignal.timeout(12000)})]);
 if(!userResponse.ok||!projectsResponse.ok)throw fail("Редакционная сессия истекла",401);
 const user=await userResponse.json(),projects=await projectsResponse.json();
 const member=(projects.projects||[]).find(p=>p.slug==="nowgreen"&&["owner","chief_editor"].includes(p.role));
 if(!isUuid(user.id)||!member)throw fail("Недостаточно прав на публикацию",403);
 return {id:user.id,role:member.role};
}
async function buffer(query,variables={}){
 if(!process.env.BUFFER_API_KEY)throw fail("Buffer API не подключён",503);
 const r=await fetch("https://api.buffer.com",{method:"POST",headers:{
 "content-type":"application/json; charset=utf-8","authorization":"Bearer "+process.env.BUFFER_API_KEY
 },body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(30000)});
 const body=await r.json().catch(()=>({}));
 if(!r.ok||body.errors?.length)throw fail("Buffer: "+String(body.errors?.[0]?.message||"HTTP "+r.status).slice(0,240),502);
 return body.data||{};
}
async function fetchDraft(id){
 const rows=await sql("SELECT p.id,p.item_id,p.status,p.image_url,p.caption,p.buffer_post_id,p.scheduled_for,p.approved_by,p.approved_at,p.last_error,p.updated_at, a.status account_status, a.buffer_channel_id, a.enabled, i.title_ru, i.photo_rights, i.status item_status, d.status draft_status, w.state AS waitlist_status, w.target_time AS waitlist_due FROM public.pr_instagram_publications p JOIN public.pr_instagram_accounts a ON a.account_key=p.account_key JOIN public.pr_items i ON i.id=p.item_id JOIN public.pr_story_drafts d ON d.item_id=p.item_id LEFT JOIN public.pr_instagram_waitlist_4slots w ON w.item_id=p.item_id WHERE p.item_id=$1::uuid AND p.account_key='pt_ryadom' LIMIT 1",[id]);
 return rows[0]||null;
}
async function refreshPublishedStatus(row){
 if(!row?.buffer_post_id||!["queued","draft","publishing","published"].includes(row.status))return row;
 try{
  const fetched=(await buffer("query GetPost($input:PostInput!){post(input:$input){id status sentAt dueAt externalLink}}",{input:{id:row.buffer_post_id}})).post;
  if(!fetched||fetched.id!==row.buffer_post_id)return row;
  if(String(fetched.status).toLowerCase()==="sent"&&(row.status!=="published"||!row.published_at)){
   await sql("UPDATE public.pr_instagram_publications SET status='published',published_at=coalesce(published_at,$2::timestamptz,now()),updated_at=now() WHERE id=$1::uuid",[row.id,fetched.sentAt||null]);
   row.status="published";row.published_at=fetched.sentAt||new Date().toISOString();
  }
  return {...row,buffer_status:fetched.status,public_url:fetched.externalLink||null,buffer_due_at:fetched.dueAt||null};
 }catch(e){console.error("BUFFER_POST_STATUS_CHECK_FAILED",String(e.message).slice(0,160));return row}
}
async function ensureStage(itemId){
 await sql("SELECT publication_id FROM public.pr_stage_instagram_article($1::uuid)",[itemId]);
 const p=await fetchDraft(itemId);
 if(!p)throw fail("Статья ещё не утверждена и не готова к Instagram",409);
 return p;
}
async function verifyMedia(p){
 if(!p.image_url||!p.image_url.startsWith("https://"))throw fail("Для Instagram нужна утверждённая иллюстрация",409);
 if(!["owned","cc_licensed","permission_confirmed"].includes(p.photo_rights))throw fail("Права на выбранное фото не подтверждены для Instagram",409);
 const rows=await sql("SELECT m.media_type,m.rights_verified,m.status,m.illustration_label_required,m.storage_key FROM public.pr_media_assets m WHERE m.item_id=$1::uuid AND m.public_url=$2 AND m.status='approved' AND m.rights_verified=true LIMIT 1",[p.item_id,p.image_url]);
 const m=rows[0];
 if(!m||!["generated_illustration","licensed_original","owned_original"].includes(m.media_type))throw fail("Фото не одобрено для Instagram",409);
 if(m.media_type==="generated_illustration"&&(!m.illustration_label_required||!m.storage_key))throw fail("Для AI-обложки требуется маркировка и сохранённый файл",409);
 return m;
}
// Buffer/Instagram accepts images up to 5000px wide. Never mutate the approved
// original or its license/attribution: supply an optimized delivery URL only.
const IG_MAX_WIDTH=5000,IG_DELIVERY_WIDTH=1600;
async function instagramImageUrl(approvedUrl){
 const parsed=new URL(approvedUrl);
 if(parsed.protocol!=="https:"||parsed.username||parsed.password)throw fail("Некорректная HTTPS-ссылка на изображение",422);
 if(parsed.hostname==="upload.wikimedia.org"){
  const m=parsed.pathname.match(/^\/wikipedia\/commons\/[0-9a-f]\/([0-9a-f]{2})\/([^/]+)$/i);
  if(!m)throw fail("Неизвестный путь фото Wikimedia Commons — выберите другое изображение",422);
  let filename;
  try{filename=decodeURIComponent(m[2]).replace(/_/g," ")}catch{throw fail("Некорректное имя файла Wikimedia",422)}
  if(!filename||filename.length>250||filename.includes("/")||filename.includes("\\")||filename.includes(":"))throw fail("Некорректное имя файла Wikimedia",422);
  const api=new URL("https://commons.wikimedia.org/w/api.php");
  for(const [k,v] of Object.entries({action:"query",format:"json",prop:"imageinfo",iiprop:"url|size|mime",iiurlwidth:String(IG_DELIVERY_WIDTH),titles:"File:"+filename}))api.searchParams.set(k,v);
  let data;
  try{
   const response=await fetch(api.href,{headers:{accept:"application/json"},signal:AbortSignal.timeout(18000)});
   if(!response.ok)throw Error("HTTP "+response.status);
   data=await response.json();
  }catch(e){throw fail("Не удалось подготовить фотографию Wikimedia для Instagram: "+String(e.message).slice(0,75),503)}
  const page=Object.values(data.query?.pages||{})[0],info=page?.imageinfo?.[0];
  if(!info||!Number.isFinite(info.width)||!Number.isFinite(info.height)||info.width<320||info.height<320)throw fail("Размер изображения Wikimedia не подтверждён",422);
  if(info.width<=IG_MAX_WIDTH&&info.height<=IG_MAX_WIDTH&&info.size<=8000000)return approvedUrl;
  if(!info.thumburl||!Number.isFinite(info.thumbwidth)||!Number.isFinite(info.thumbheight)||
     info.thumbwidth>IG_MAX_WIDTH||info.thumbheight>IG_MAX_WIDTH||
     info.thumbwidth<320||info.thumbheight<320)throw fail("Wikimedia не смогла создать пригодное изображение до 5000 px",422);
  const thumbnail=new URL(info.thumburl);
  if(thumbnail.protocol!=="https:"||!["thumb.wikimedia.org","upload.wikimedia.org"].includes(thumbnail.hostname)||thumbnail.username||thumbnail.password)throw fail("Небезопасный адрес миниатюры Wikimedia",422);
  // Strip tracking parameters; the file is identical and Buffer reads it directly.
  thumbnail.search="";
  return thumbnail.href;
 }
 // Trusted image CDNs provide width-aware photo variants without reupload.
 if(parsed.hostname==="images.unsplash.com"&&parsed.pathname.startsWith("/photo-")){
  parsed.searchParams.set("w",String(IG_DELIVERY_WIDTH));
  parsed.searchParams.set("fit","max");
  parsed.searchParams.set("fm","jpg");
  parsed.searchParams.set("q","85");
  return parsed.href;
 }
 if(parsed.hostname==="images.pexels.com"&&/^\/photos\/\d+\//.test(parsed.pathname)){
  parsed.searchParams.set("w",String(IG_DELIVERY_WIDTH));
  parsed.searchParams.set("auto","compress");
  return parsed.href;
 }
 // Existing Neon AI covers are generated at 1536x1024 and already fit.
 return approvedUrl;
}
async function verifiedInstagramGeolocation(itemId){
 // Buffer requires a Facebook Page connection and a real Facebook location ID.
 // No coordinates-to-ID conversion or guessed place IDs are permitted.
 const locations=await sql(
  "SELECT g.facebook_place_id,g.place_name FROM public.pr_items i "+
  "JOIN public.pr_trailyo_event_details ev ON ev.item_id=i.id "+
  "JOIN public.pr_instagram_event_geotags g ON g.event_id=ev.event_id AND g.verified_at IS NOT NULL "+
  "JOIN public.pr_instagram_accounts a ON a.account_key='pt_ryadom' AND a.buffer_connection_route='facebook_page' "+
  "WHERE i.id=$1::uuid AND i.primary_category='events' LIMIT 1",
  [itemId]
 );
 return locations[0]?{id:locations[0].facebook_place_id,text:locations[0].place_name}:null;
}

/* Synchronize Instagram with the actual queued Telegram main-channel slot.
   Do not alter sent posts, media, or existing captions; Buffer is authoritative
   until its editPost response confirms the new scheduled timestamp. */
async function telegramTarget(itemId){
 const rows=await sql("SELECT scheduled_for,status FROM public.pr_posts WHERE item_id=$1::uuid AND destination_code='main' ORDER BY created_at DESC LIMIT 1",[itemId]);
 const tg=rows[0];
 if(!tg||!["queued","scheduled"].includes(tg.status)||!tg.scheduled_for)return null;
 const stamp=Date.parse(tg.scheduled_for);
 if(!Number.isFinite(stamp)||stamp<=Date.now()+2*60000)return null;
 return new Date(stamp).toISOString();
}
async function syncQueuedInstagram(pub,target){
 if(!pub?.buffer_post_id||pub.status!=="queued"||!target)return {action:"skipped"};
 const remote=(await buffer("query GetPost($input:PostInput!){post(input:$input){id status sentAt dueAt}}",{input:{id:pub.buffer_post_id}})).post;
 if(!remote||remote.id!==pub.buffer_post_id)throw fail("Buffer не нашёл исходный пост; расписание не менялось",409);
 if(String(remote.status).toLowerCase()==="sent"){
  await sql("UPDATE public.pr_instagram_publications SET status='published',published_at=coalesce(published_at,$2::timestamptz,now()),updated_at=now() WHERE id=$1::uuid AND status='queued'",[pub.id,remote.sentAt||null]);
  return {action:"already_published",buffer_post_id:pub.buffer_post_id};
 }
 if(String(remote.status).toLowerCase()==="error"){
  await sql("UPDATE public.pr_instagram_publications SET status='failed',last_error='Buffer сообщил об ошибке публикации; требуется проверить публикацию в Buffer перед повтором',updated_at=now() WHERE id=$1::uuid AND status='queued'",[pub.id]);
  return {action:"needs_review",buffer_post_id:pub.buffer_post_id};
 }
 if(!["scheduled","buffer","queued"].includes(String(remote.status).toLowerCase()))throw fail("Пост Buffer нельзя перенести из статуса "+remote.status,409);
 const targetMs=Date.parse(target),remoteMs=Date.parse(remote.dueAt||"");
 if(Number.isFinite(remoteMs)&&Math.abs(targetMs-remoteMs)<60000){
  await sql("UPDATE public.pr_instagram_publications SET scheduled_for=$2::timestamptz,last_error=NULL,updated_at=now() WHERE id=$1::uuid AND status='queued' AND buffer_post_id=$3",[pub.id,target,pub.buffer_post_id]);
  return {action:"already_aligned",buffer_post_id:pub.buffer_post_id,scheduled_for:target};
 }
 const data=await buffer("mutation Update($input:EditPostInput!){editPost(input:$input){... on PostActionSuccess{post{id status dueAt}} ... on MutationError{message}}}",{input:{id:pub.buffer_post_id,mode:"customScheduled",dueAt:target}});
 const result=data.editPost;
 if(!result?.post||result.post.id!==pub.buffer_post_id)throw fail("Buffer не подтвердил перенос: "+String(result?.message||"unknown").slice(0,180),502);
 const actual=Date.parse(result.post.dueAt||"");
 if(!Number.isFinite(actual)||Math.abs(actual-targetMs)>=60000)throw fail("Buffer вернул несовпадающее время; запись в базе не менялась",502);
 await sql("UPDATE public.pr_instagram_publications SET scheduled_for=$2::timestamptz,last_error=NULL,updated_at=now() WHERE id=$1::uuid AND status='queued' AND buffer_post_id=$3",[pub.id,new Date(actual).toISOString(),pub.buffer_post_id]);
 await sql("INSERT INTO public.pr_instagram_delivery_events(publication_id,event_type,meta_object_id) VALUES($1::uuid,$2,$3)",[pub.id,"buffer_time_aligned_to_telegram",pub.buffer_post_id]).catch(()=>{});
 return {action:"rescheduled",buffer_post_id:pub.buffer_post_id,scheduled_for:new Date(actual).toISOString()};
}
async function syncQueuedBatch(limit=25){
 const rows=await sql("SELECT ig.id,ig.item_id,ig.status,ig.buffer_post_id,ig.scheduled_for,tg.scheduled_for AS telegram_due FROM public.pr_instagram_publications ig JOIN public.pr_posts tg ON tg.item_id=ig.item_id AND tg.destination_code='main' WHERE ig.account_key='pt_ryadom' AND ig.status='queued' AND ig.buffer_post_id IS NOT NULL AND tg.status IN ('queued','scheduled') AND tg.scheduled_for>now()+interval '2 minutes' AND (ig.scheduled_for IS DISTINCT FROM tg.scheduled_for) ORDER BY tg.scheduled_for LIMIT $1",[Math.max(1,Math.min(25,Number(limit)||25))]);
 const out={ok:true,checked:rows.length,rescheduled:0,aligned:0,already_published:0,needs_review:0,failed:0,errors:[]};
 for(const pub of rows){
  try{
   const result=await syncQueuedInstagram(pub,new Date(pub.telegram_due).toISOString());
   if(result.action==="rescheduled")out.rescheduled++;
   else if(result.action==="already_aligned")out.aligned++;
   else if(result.action==="already_published")out.already_published++;
   else if(result.action==="needs_review")out.needs_review++;
  }catch(e){
   out.failed++;
   const error=String(e?.message||"Buffer error").slice(0,200);
   out.errors.push({item_id:pub.item_id,error});
   await sql("UPDATE public.pr_instagram_publications SET last_error=$2,updated_at=now() WHERE id=$1::uuid AND status='queued'",[pub.id,"Telegram sync: "+error]).catch(()=>{});
  }
 }
 return out;
}


// PT_FOUR_SLOTS_20261123: Buffer Free plan has 10 pending posts PER CHANNEL,
// not 10 posts/day. Refill safely from preapproved Buffer drafts at most one per run.
// All slot calculations use the DST-aware Portugal SQL function.
const BUFFER_PENDING_CAP=10;
async function instagramCapacity(){
 const rows=await sql("SELECT (SELECT count(*) FROM public.pr_instagram_publications WHERE status='queued' AND buffer_post_id IS NOT NULL)+ (SELECT count(*) FROM public.pr_instagram_retrofit_20261123 WHERE stage IN ('scheduled_repost','dispatching') AND target_time IS NOT NULL AND target_time>now()-interval '2 hours')+ (SELECT count(*) FROM public.pr_instagram_waitlist_4slots WHERE state='dispatching' AND target_time IS NOT NULL AND target_time>now()-interval '2 hours') AS filled");
 return Number(rows[0]?.filled||0);
}
async function nextInstagramDueAt(){
 const rows=await sql(
  "SELECT public.pr_next_portugal_publication_slot(greatest(now()+interval '5 minutes',COALESCE((SELECT max(t.due)+interval '1 minute' FROM ("+
   "SELECT scheduled_for AS due FROM public.pr_instagram_publications WHERE status='queued' AND buffer_post_id IS NOT NULL "+
   "UNION ALL SELECT target_time FROM public.pr_instagram_retrofit_20261123 WHERE stage IN ('scheduled_repost','dispatching') AND target_time IS NOT NULL "+
   "UNION ALL SELECT target_time FROM public.pr_instagram_waitlist_4slots WHERE state IN ('scheduled','dispatching') AND target_time IS NOT NULL"+
   ") t),now()+interval '5 minutes'))) AS next_due");
 const time=rows[0]?.next_due;
 if(!time||!Number.isFinite(Date.parse(time))||Date.parse(time)<Date.now()+60000)throw Error("Invalid next Lisbon calendar slot");
 return new Date(time).toISOString();
}
function isBufferQueued(status){return ["scheduled","buffer","queued"].includes(String(status||"").toLowerCase())}
async function bufferPostStatus(id){
 const data=await buffer("query FourSlotGetPost($input:PostInput!){post(input:$input){id status dueAt sentAt text error{message rawError supportUrl}}}",{input:{id}});
 return data.post;
}
async function reconcileInstagramPending(){
 // Capacity must reflect Buffer's real SENT/ERROR states, not stale DB queue.
 const rows=await sql("SELECT id,buffer_post_id,scheduled_for FROM public.pr_instagram_publications WHERE status='queued' AND buffer_post_id IS NOT NULL AND scheduled_for<now()+interval '8 minutes' ORDER BY scheduled_for LIMIT 12");
 const result={published:0,failed:0};
 for(const p of rows)try{
  const remote=await bufferPostStatus(p.buffer_post_id);
  if(String(remote?.status||"").toLowerCase()==="sent"){
   await sql("UPDATE public.pr_instagram_publications SET status='published',published_at=COALESCE(published_at,$2::timestamptz,now()),updated_at=now(),last_error=NULL WHERE id=$1::uuid AND status='queued' AND buffer_post_id=$3",[p.id,remote.sentAt||null,p.buffer_post_id]);
   result.published++;
  }else if(String(remote?.status||"").toLowerCase()==="error"){
   await sql("UPDATE public.pr_instagram_publications SET status='failed',last_error='Buffer delivery failed, manual review required',updated_at=now() WHERE id=$1::uuid AND status='queued' AND buffer_post_id=$2",[p.id,p.buffer_post_id]);
   result.failed++;
  }
 }catch(e){console.error("IG_CAPACITY_RECONCILE",String(e.message||e).slice(0,130))}
 const reposts=await sql("SELECT item_id,replacement_buffer_post_id,target_time FROM public.pr_instagram_retrofit_20261123 WHERE stage='scheduled_repost' AND target_time<now()+interval '8 minutes' ORDER BY target_time LIMIT 12");
 for(const r of reposts)try{
  const remote=await bufferPostStatus(r.replacement_buffer_post_id);
  if(String(remote?.status||"").toLowerCase()==="sent"){
   await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='published_repost',synced_at=now(),last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND stage='scheduled_repost'",[r.item_id]);
   result.published++;
  }else if(String(remote?.status||"").toLowerCase()==="error"){
   await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='needs_review',last_error='Buffer could not publish replacement; inspect Instagram before any retry',updated_at=now() WHERE item_id=$1::uuid AND stage='scheduled_repost'",[r.item_id]);
   result.failed++;
  }
 }catch(e){console.error("IG_REPOST_RECONCILE",String(e.message||e).slice(0,130))}
 return result;
}
async function scheduleRetrofitDraft(row,due){
 const oldId=String(row.replacement_buffer_post_id||"");
 if(!oldId)throw fail("Buffer draft ID missing; will not create a duplicate",409);
 const before=await bufferPostStatus(oldId);
 if(!before||before.id!==oldId)throw fail("Buffer draft was not found",409);
 if(isBufferQueued(before.status)){
  if(before.dueAt&&Math.abs(Date.parse(before.dueAt)-Date.parse(due))<60000){
   await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='scheduled_repost',target_time=$2::timestamptz,synced_at=now(),last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND stage IN ('draft_created','dispatching')",[row.item_id,due]);
   return {ok:true,recovered:true,id:oldId};
  }
  throw fail("Draft already scheduled for a different time; manual review required",409);
 }
 if(String(before.status).toLowerCase()==="sent"){
  await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='published_repost',synced_at=now(),updated_at=now() WHERE item_id=$1::uuid AND stage IN ('draft_created','dispatching')",[row.item_id]);
  return {ok:true,already_published:true,id:oldId};
 }
 if(String(before.status).toLowerCase()!=="draft")throw fail("Buffer post not a draft: "+before.status,409);
 const assets=[row.cover_url,...(Array.isArray(row.carousel_urls)?row.carousel_urls:JSON.parse(row.carousel_urls||"[]"))];
 if(!assets.length||assets.length>10||assets.some(x=>!/^https:\/\/mynw\.app\/journalstudio\/instagram-retrofit\/[0-9a-f-]{36}(?:-text-\d+)?\.jpg$/.test(x)))throw fail("Invalid Instagram assets",422);
 const input={id:oldId,text:row.caption,schedulingType:"automatic",mode:"customScheduled",dueAt:due,saveToDraft:false,
  metadata:{instagram:{type:"post",shouldShareToFeed:true,isAiGenerated:row.is_ai===true||row.is_ai==="t"}},
  assets:assets.map(url=>({image:{url}}))};
 const edited=(await buffer("mutation PromoteApprovedDraft($input:EditPostInput!){editPost(input:$input){... on PostActionSuccess{post{id status dueAt text}} ... on MutationError{message}}}",{input})).editPost;
 if(!edited?.post?.id||edited.post.id!==oldId||!isBufferQueued(edited.post.status)||edited.post.text!==row.caption||
   !edited.post.dueAt||Math.abs(Date.parse(edited.post.dueAt)-Date.parse(due))>=60000)
   throw fail("Buffer draft scheduling not confirmed: "+String(edited?.message||edited?.post?.status||"unknown"),502);
 await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='scheduled_repost',target_time=$2::timestamptz,synced_at=now(),last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND stage='dispatching'",[row.item_id,due]);
 return {ok:true,id:oldId,dueAt:due,assets:assets.length};
}
async function scheduleWaitlisted(row,due){
 const pub=await fetchDraft(row.item_id);
 if(!pub||pub.id!==row.publication_id||pub.buffer_post_id||!["awaiting_approval","draft","failed"].includes(pub.status))throw fail("Instagram item was already submitted or no longer eligible",409);
 if(pub.item_status!=="approved"||pub.draft_status!=="approved")throw fail("Editorial approval no longer valid",409);
 const media=await verifyMedia(pub);
 const finalCaption=(await sql("SELECT public.pr_prepare_instagram_caption($1::uuid) AS caption",[row.item_id]))[0]?.caption;
 if(!finalCaption||finalCaption.length>2200)throw fail("Instagram caption invalid",422);
 const mediaURL=await instagramImageUrl(pub.image_url);
 const data=await buffer("mutation ScheduleWaitlisted($input:CreatePostInput!){createPost(input:$input){... on PostActionSuccess{post{id status dueAt text}} ... on MutationError{message}}}",{input:{
  channelId:CHANNEL,mode:"customScheduled",dueAt:due,schedulingType:"automatic",saveToDraft:false,
  text:finalCaption,
  metadata:{instagram:{type:"post",shouldShareToFeed:true,isAiGenerated:media.media_type==="generated_illustration"}},
  assets:[{image:{url:mediaURL}}]
 }});
 const remote=data.createPost;
 if(!remote?.post?.id||!isBufferQueued(remote.post.status)||remote.post.text!==finalCaption||
    !remote.post.dueAt||Math.abs(Date.parse(remote.post.dueAt)-Date.parse(due))>=60000)
    throw fail("Buffer did not confirm queued post: "+String(remote?.message||"unknown"),502);
 await sql("UPDATE public.pr_instagram_publications SET status='queued',caption=$2,buffer_post_id=$3,scheduled_for=$4::timestamptz,approved_by=COALESCE(approved_by,$5),approved_at=COALESCE(approved_at,now()),last_error=NULL,updated_at=now() WHERE id=$1::uuid AND status IN ('awaiting_approval','draft','failed') AND buffer_post_id IS NULL",
  [row.publication_id,finalCaption,remote.post.id,due,row.queued_by||null]);
 await sql("UPDATE public.pr_instagram_waitlist_4slots SET state='scheduled',buffer_post_id=$2,target_time=$3::timestamptz,last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND state='dispatching'",
 [row.item_id,remote.post.id,due]);
 return {ok:true,id:remote.post.id,dueAt:due};
}

// PT_RAPID_OLD_REPLACEMENTS_20261123:
// One explicitly selected replacement per UTC minute. The selected 44 originals
// range from "Потеряли документы" through "Подать заявление в PSP/GNR", inclusive.
// Original Instagram posts are NEVER deleted here. Future/new queue entries are
// NEVER edited, and regular 08/13/18/23 scheduling remains untouched.
// A failed or ambiguous Buffer call PAUSES the batch to avoid double publishing.
async function rapidReplacementStatus(){
 const counts=await sql("SELECT state,count(*)::int n FROM public.pr_instagram_rapid_replace_20261123 GROUP BY state ORDER BY state");
 const summary={waiting:0,submitting:0,submitted:0,sent:0,needs_review:0};
 for(const c of counts)summary[c.state]=Number(c.n)||0;
 return summary;
}
async function rapidMarkSent(row,posted){
 const timestamp=posted?.sentAt&&Number.isFinite(Date.parse(posted.sentAt))?posted.sentAt:new Date().toISOString();
 await sql("UPDATE public.pr_instagram_rapid_replace_20261123 SET state='sent',confirmed_sent_at=$2::timestamptz,last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND state IN ('submitting','submitted')",
  [row.item_id,timestamp]);
 await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='published_repost',target_time=coalesce(target_time,$2::timestamptz),synced_at=now(),last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND replacement_buffer_post_id=$3",
 [row.item_id,timestamp,row.replacement_buffer_post_id]);
 return {action:"published",ordinal:row.ordinal,item_id:row.item_id,buffer_post_id:row.replacement_buffer_post_id,sent_at:timestamp};
}
async function rapidMarkReview(row,reason){
 const error=String(reason||"Unknown publishing error").slice(0,250);
 await sql("UPDATE public.pr_instagram_rapid_replace_20261123 SET state='needs_review',last_error=$2,updated_at=now() WHERE item_id=$1::uuid AND state IN ('waiting','submitting','submitted')",[row.item_id,error]);
 await sql("UPDATE public.pr_instagram_retrofit_20261123 SET last_error=$2,updated_at=now() WHERE item_id=$1::uuid",[row.item_id,"Fast replacement halted: "+error.slice(0,220)]).catch(()=>{});
 return {action:"paused_for_review",ordinal:row.ordinal,item_id:row.item_id,error};
}
async function rapidReplacementTick(){
 const tally=await rapidReplacementStatus();
 if(tally.needs_review>0){
  const failed=(await sql("SELECT item_id,ordinal,replacement_buffer_post_id,last_error FROM public.pr_instagram_rapid_replace_20261123 WHERE state='needs_review' ORDER BY ordinal LIMIT 1"))[0];
  if(failed){
   try{
    const p=await bufferPostStatus(failed.replacement_buffer_post_id);
    if(p?.error?.message){
     const detail="Instagram/Buffer: "+String(p.error.message).slice(0,190);
     await sql("UPDATE public.pr_instagram_rapid_replace_20261123 SET last_error=$2,updated_at=now() WHERE item_id=$1::uuid AND state='needs_review' AND last_error IS DISTINCT FROM $2",[failed.item_id,detail]);
     return {ok:true,action:"paused_for_review",ordinal:failed.ordinal,error:detail,count:tally};
    }
   }catch(e){console.error("PR_IG_RAPID_DIAGNOSTIC",String(e.message||e).slice(0,200))}
  }
  return {ok:true,action:"paused_for_review",error:failed?.last_error,count:tally};
 }
 if(tally.waiting+tally.submitting+tally.submitted===0)return {ok:true,action:"complete",count:tally};
 // Serialize ambiguous/in-flight requests: no two shareNow calls at once.
 const ongoing=(await sql("SELECT ordinal,item_id,replacement_buffer_post_id,last_request_at,state FROM public.pr_instagram_rapid_replace_20261123 WHERE state IN ('submitting','submitted') ORDER BY ordinal LIMIT 1"))[0];
 if(ongoing){
  try{
   const remote=await bufferPostStatus(ongoing.replacement_buffer_post_id);
   const status=String(remote?.status||"").toLowerCase();
   if(!remote||remote.id!==ongoing.replacement_buffer_post_id) return await rapidMarkReview(ongoing,"Buffer no longer returns this replacement ID");
   if(status==="sent"){
    await rapidMarkSent(ongoing,remote);
    // This same minute's tick may submit the next waiting article below,
    // preserving one actual outgoing submission per minute rather than
    // wasting every second tick on status confirmation.
   }else{
    if(status==="error"||status==="failed")return await rapidMarkReview(ongoing,"Buffer/Instagram publishing failed: "+String(remote.error?.message||status));
    if(ongoing.last_request_at&&Date.now()-Date.parse(ongoing.last_request_at)>10*60000)
       return await rapidMarkReview(ongoing,"Instagram publication not confirmed for 10 minutes; check Buffer and Instagram before retry");
    if(ongoing.state==="submitting"&&status==="draft"){
     // An ambiguous network response can leave a draft unchanged; never
     // auto-send a second time without a human check.
     return await rapidMarkReview(ongoing,"Publishing response was ambiguous; draft remains");
    }
    return {ok:true,action:"waiting_for_instagram_delivery",ordinal:ongoing.ordinal,remote_status:status,count:tally};
   }
  }catch(e){return {ok:false,action:"reconciliation_error",error:String(e.message||e).slice(0,200),count:tally}}
 }
 const last=(await sql("SELECT max(last_request_at) AS last_at FROM public.pr_instagram_rapid_replace_20261123"))[0]?.last_at;
 // Keep at least 55 seconds between outgoing shareNow requests; scheduled
 // worker ticks once per minute, never runs more than one per invocation.
 if(last&&Date.now()-Date.parse(last)<55000)return {ok:true,action:"one_minute_spacing",count:tally};
 const row=(await sql("SELECT q.ordinal,q.item_id,q.replacement_buffer_post_id,r.caption,r.cover_url,r.carousel_urls,r.stage,EXISTS(SELECT 1 FROM public.pr_media_assets m JOIN public.pr_items i ON i.id=m.item_id WHERE m.item_id=q.item_id AND m.public_url=i.photo_url AND m.status='approved' AND m.media_type='generated_illustration') AS is_ai FROM public.pr_instagram_rapid_replace_20261123 q JOIN public.pr_instagram_retrofit_20261123 r ON r.item_id=q.item_id WHERE q.state='waiting' ORDER BY q.ordinal LIMIT 1"))[0];
 if(!row)return {ok:true,action:"no_waiting",count:tally};
 if(!row.replacement_buffer_post_id||!["draft_created","scheduled_repost"].includes(row.stage)||!row.caption||row.caption.length>2200||row.caption.length<80)
  return await rapidMarkReview(row,"Invalid draft, caption or replacement stage: "+row.stage);
 const assets=[row.cover_url,...(Array.isArray(row.carousel_urls)?row.carousel_urls:JSON.parse(row.carousel_urls||"[]"))];
 if(assets.length<1||assets.length>10||assets.some(url=>!/^https:\/\/mynw\.app\/journalstudio\/instagram-retrofit\/[0-9a-f-]{36}(?:-text-\d+)?\.jpg$/.test(url)))
  return await rapidMarkReview(row,"Replacement assets invalid or too many for Instagram");
 const claim=await sql("UPDATE public.pr_instagram_rapid_replace_20261123 SET state='submitting',attempts=attempts+1,last_request_at=now(),updated_at=now() WHERE item_id=$1::uuid AND state='waiting' RETURNING ordinal",[row.item_id]);
 if(!claim.length)return {ok:true,action:"already_claimed"};
 try{
  const before=await bufferPostStatus(row.replacement_buffer_post_id);
  if(!before||before.id!==row.replacement_buffer_post_id)return await rapidMarkReview(row,"Buffer replacement ID not found");
  if(String(before.status||"").toLowerCase()==="sent")return {ok:true,...await rapidMarkSent(row,before),count:await rapidReplacementStatus()};
  const status=String(before.status||"").toLowerCase();
  if(!["draft","buffer","scheduled","queued"].includes(status))
   return await rapidMarkReview(row,"Replacement is not editable/publishable: "+status);
  // Change only this existing replacement Buffer post; NEVER create a new
  // Buffer ID or alter the normal scheduled original/new post.
  const result=(await buffer("mutation ReleaseOldReplacement($input:EditPostInput!){editPost(input:$input){... on PostActionSuccess{post{id status sentAt sharedNow shareMode text}} ... on MutationError{message}}}",
  {input:{id:row.replacement_buffer_post_id,mode:"shareNow",saveToDraft:false,schedulingType:"automatic",
    text:row.caption,metadata:{instagram:{type:"post",shouldShareToFeed:true,isAiGenerated:row.is_ai===true||row.is_ai==="t"}},
    assets:assets.map(url=>({image:{url}}))}})).editPost;
  if(!result?.post?.id||result.post.id!==row.replacement_buffer_post_id||result.post.text!==row.caption)
   return await rapidMarkReview(row,"Buffer did not confirm publish-now on existing draft: "+String(result?.message||"unknown"));
  if(result.post.status==="sent")return {ok:true,...await rapidMarkSent(row,result.post),count:await rapidReplacementStatus()};
  const remoteStatus=String(result.post.status||"").toLowerCase();
  if(!["buffer","scheduled","queued","pending","publishing","sending"].includes(remoteStatus))
   return await rapidMarkReview(row,"Buffer publish-now returned "+remoteStatus);
  if(result.post.shareMode&&result.post.shareMode!=="shareNow")
   return await rapidMarkReview(row,"Buffer ignored shareNow; returned "+result.post.shareMode);
  await sql("UPDATE public.pr_instagram_rapid_replace_20261123 SET state='submitted',last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND state='submitting'",[row.item_id]);
  await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='rapid_submitted',target_time=now(),updated_at=now() WHERE item_id=$1::uuid AND replacement_buffer_post_id=$2",[row.item_id,row.replacement_buffer_post_id]);
  return {ok:true,action:"submitted_to_instagram",ordinal:row.ordinal,buffer_post_id:row.replacement_buffer_post_id,remote_status:remoteStatus,count:await rapidReplacementStatus()};
 }catch(e){
  // Do not blindly retry an ambiguous API failure. Resolve only this fixed
  // Buffer ID and then stop the batch on non-confirmed status.
  try{
   const remote=await bufferPostStatus(row.replacement_buffer_post_id);
   if(remote?.status==="sent")return {ok:true,...await rapidMarkSent(row,remote),count:await rapidReplacementStatus()};
   if(remote?.id===row.replacement_buffer_post_id&&["buffer","scheduled","queued","sending","publishing"].includes(String(remote.status||"").toLowerCase())){
    await sql("UPDATE public.pr_instagram_rapid_replace_20261123 SET state='submitted',last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND state='submitting'",[row.item_id]);
    return {ok:true,action:"submission_reconciled",ordinal:row.ordinal,remote_status:remote.status};
   }
  }catch{}
  return await rapidMarkReview(row,String(e.message||e).slice(0,220));
 }
}

// PT_INTERLEAVED_REPLACEMENTS_20261123:
// The 42 historic articles not previously sent/flagged are scheduled at
// 10:30, 15:30 and 20:30 Lisbon, one strictly between daytime normal slots.
// Only the existing Buffer draft IDs are edited; 08/13/18/23 new posts untouched.
// Cap scheduled Buffer posts at 10 and refill after each outgoing publication.
// Rejected spam article (rapid ordinal 2) is excluded from this queue.
async function reconcileInterleavedReplacements(){
 const report={published:0,flagged:0};
 const pending=await sql("SELECT item_id,replacement_buffer_post_id,target_time FROM public.pr_instagram_interleave_20261123 WHERE state='scheduled' AND target_time<now()+interval '10 minutes' ORDER BY target_time LIMIT 6");
 for(const row of pending){
  try{
   const remote=await bufferPostStatus(row.replacement_buffer_post_id);
   const status=String(remote?.status||"").toLowerCase();
   if(status==="sent"){
    await sql("UPDATE public.pr_instagram_interleave_20261123 SET state='published',published_at=COALESCE($2::timestamptz,now()),updated_at=now() WHERE item_id=$1::uuid AND state='scheduled'",[row.item_id,remote.sentAt||null]);
    await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='published_repost',synced_at=now(),updated_at=now(),last_error=NULL WHERE item_id=$1::uuid AND replacement_buffer_post_id=$2 AND stage='scheduled_repost'",[row.item_id,row.replacement_buffer_post_id]);
    report.published++;
   }else if(status==="error"||status==="failed"){
    const reason="Instagram/Buffer: "+String(remote?.error?.message||"post failed").slice(0,210);
    await sql("UPDATE public.pr_instagram_interleave_20261123 SET state='needs_review',last_error=$2,updated_at=now() WHERE item_id=$1::uuid AND state='scheduled'",[row.item_id,reason]);
    await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='needs_review',last_error=$2,updated_at=now() WHERE item_id=$1::uuid AND stage='scheduled_repost'",[row.item_id,reason]);
    report.flagged++;
   }
  }catch(e){console.error("IG_INTERLEAVE_VERIFY",String(e?.message||e).slice(0,170))}
 }
 return report;
}
async function alignOldScheduledReplacement(){
 const row=(await sql("SELECT q.item_id,q.ordinal,q.replacement_buffer_post_id,q.target_time,r.stage,r.target_time AS old_time FROM public.pr_instagram_interleave_20261123 q JOIN public.pr_instagram_retrofit_20261123 r ON r.item_id=q.item_id WHERE q.state='reschedule_pending' ORDER BY q.ordinal LIMIT 1"))[0];
 if(!row)return null;
 try{
  if(row.stage!=="scheduled_repost")throw Error("Previously scheduled Buffer replacement changed stage");
  const remote=await bufferPostStatus(row.replacement_buffer_post_id);
  if(!remote||remote.id!==row.replacement_buffer_post_id||!isBufferQueued(remote.status))throw Error("Previously scheduled Buffer ID is no longer queued");
  const desired=new Date(row.target_time).toISOString();
  if(!remote.dueAt||Math.abs(Date.parse(remote.dueAt)-Date.parse(desired))>=60000){
   const out=(await buffer("mutation MoveOldReplacement($input:EditPostInput!){editPost(input:$input){... on PostActionSuccess{post{id status dueAt}} ... on MutationError{message}}}",{
    input:{id:row.replacement_buffer_post_id,mode:"customScheduled",dueAt:desired}
   })).editPost;
   if(!out?.post?.id||out.post.id!==row.replacement_buffer_post_id||
      !isBufferQueued(out.post.status)||!out.post.dueAt||Math.abs(Date.parse(out.post.dueAt)-Date.parse(desired))>=60000)
      throw Error("Buffer rejected existing replacement reschedule: "+String(out?.message||out?.post?.status||"unknown"));
  }
  await sql("UPDATE public.pr_instagram_retrofit_20261123 SET target_time=$2::timestamptz,synced_at=now(),updated_at=now(),last_error=NULL WHERE item_id=$1::uuid AND stage='scheduled_repost'",[row.item_id,desired]);
  await sql("UPDATE public.pr_instagram_interleave_20261123 SET state='scheduled',scheduled_at=now(),last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND state='reschedule_pending'",[row.item_id]);
  return {action:"rescheduled_existing_buffer_id",ordinal:row.ordinal,due:desired};
 }catch(e){
  const message=String(e.message||e).slice(0,240);
  // On an ambiguous edit error, the same existing Buffer ID can still be
  // inspected manually. Avoid moving other posts around it.
  await sql("UPDATE public.pr_instagram_interleave_20261123 SET state='needs_review',last_error=$2,updated_at=now() WHERE item_id=$1::uuid AND state='reschedule_pending'",[row.item_id,message]);
  return {action:"needs_review",ordinal:row.ordinal,error:message};
 }
}
// Reclaim missed historic slots without blocking the rest of the archive.
// The old slot calendar remains 10:30 / 15:30 / 20:30 Europe/Lisbon (DST-aware).
// Select a future unoccupied slot while retaining the *same* approved Buffer draft ID.
async function nextOldReplacementDue(requested){
 const rows=await sql(
  "WITH proposed AS ("+
  "SELECT (((now() AT TIME ZONE 'Europe/Lisbon')::date+g.n)+v.t) AT TIME ZONE 'Europe/Lisbon' AS due "+
  "FROM generate_series(0,35) AS g(n) CROSS JOIN (VALUES (TIME '10:30'),(TIME '15:30'),(TIME '20:30')) AS v(t)) "+
  "SELECT due FROM proposed s "+
  "WHERE due >= greatest(now()+interval '18 minutes',$1::timestamptz) "+
  "AND NOT EXISTS (SELECT 1 FROM public.pr_instagram_interleave_20261123 q "+
  "WHERE q.state IN ('scheduled','dispatching','reschedule_pending') "+
  "AND abs(extract(epoch from (q.target_time-s.due)))<3600) "+
  "AND NOT EXISTS (SELECT 1 FROM public.pr_instagram_publications p "+
  "WHERE p.status='queued' AND p.buffer_post_id IS NOT NULL "+
  "AND abs(extract(epoch from (p.scheduled_for-s.due)))<3600) "+
  "AND NOT EXISTS (SELECT 1 FROM public.pr_instagram_waitlist_4slots w "+
  "WHERE w.state IN ('dispatching','scheduled') AND w.target_time IS NOT NULL "+
  "AND abs(extract(epoch from (w.target_time-s.due)))<3600) "+
  "ORDER BY due LIMIT 1",
  [requested]
 );
 const due=rows[0]?.due;
 if(!due||!Number.isFinite(Date.parse(due))||Date.parse(due)<Date.now()+17*60000)
  throw Error("No eligible old replacement slot in the next 35 days");
 return new Date(due).toISOString();
}
async function refillInstagramQueue(){
 const reconciliation=await reconcileInstagramPending();
 const interleaveReconciliation=await reconcileInterleavedReplacements();
 const existingMove=await alignOldScheduledReplacement();
 const count=await instagramCapacity();
 const report={ok:true,limit:BUFFER_PENDING_CAP,scheduled_count:count,reconciliation,interleave_reconciliation:interleaveReconciliation,existing_move:existingMove,action:"full"};
 if(count>=BUFFER_PENDING_CAP)return report;
 // Current NEW approved articles always take priority, and keep exact original
 // 08/13/18/23 Lisbon slots. Only after those are staged, add old replacements.
 const wait=(await sql("SELECT w.* FROM public.pr_instagram_waitlist_4slots w JOIN public.pr_instagram_publications p ON p.id=w.publication_id WHERE w.state='waiting' AND p.buffer_post_id IS NULL ORDER BY w.requested_at LIMIT 1"))[0];
 // A spam-flagged or failed article remains isolated in needs_review:
 // never let it disable unrelated old drafts.
 const old=(await sql(
 "SELECT q.item_id,q.ordinal,q.replacement_buffer_post_id,q.target_time AS interleave_due,r.cover_url,r.carousel_urls,r.caption,"+
 "EXISTS(SELECT 1 FROM public.pr_media_assets m JOIN public.pr_items i ON i.id=m.item_id WHERE m.item_id=q.item_id AND m.public_url=i.photo_url AND m.status='approved' AND m.media_type='generated_illustration') AS is_ai "+
 "FROM public.pr_instagram_interleave_20261123 q "+
 "JOIN public.pr_instagram_retrofit_20261123 r ON r.item_id=q.item_id AND r.replacement_buffer_post_id=q.replacement_buffer_post_id "+
 "WHERE q.state='waiting' AND r.stage='draft_created' "+
 "ORDER BY q.ordinal LIMIT 1"))[0];
 if(!wait&&!old)return {...report,action:"nothing_to_fill"};
 // Fair interleaving: 4 daily NEW slots versus 3 daytime OLD slots.
 // Compare the *actual next free slot*, not the presence of a new waitlist item.
 // A steady stream of new approvals must not permanently starve old updates.
 const newDue=wait?await nextInstagramDueAt():null;
 const oldDue=old?await nextOldReplacementDue(old.interleave_due):null;
 const sendNew=Boolean(wait)&&(!old||Date.parse(newDue)<=Date.parse(oldDue));
 const source=sendNew?"new_article":"old_replacement";
 const id=(sendNew?wait:old).item_id;
 const due=sendNew?newDue:oldDue;
 const claim=sendNew?
  await sql("UPDATE public.pr_instagram_waitlist_4slots SET state='dispatching',target_time=$2::timestamptz,attempt_count=attempt_count+1,updated_at=now() WHERE item_id=$1::uuid AND state='waiting' RETURNING item_id",[id,due]):
  await sql("UPDATE public.pr_instagram_interleave_20261123 SET state='dispatching',target_time=$2::timestamptz,attempts=attempts+1,updated_at=now() WHERE item_id=$1::uuid AND state='waiting' RETURNING item_id",[id,due]);
 if(!claim.length)return {...report,action:"already_processing",source};
 try{
  if(sendNew){
   const out=await scheduleWaitlisted(wait,due);
   return {...report,action:"scheduled_new",source,item_id:id,...out};
  }
  const rclaim=await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='dispatching',target_time=$2::timestamptz,attempts=attempts+1,updated_at=now() WHERE item_id=$1::uuid AND stage='draft_created' RETURNING item_id",[id,due]);
  if(!rclaim.length)throw Error("Replacement draft already changed stage");
  const out=await scheduleRetrofitDraft(old,due);
  if(!out?.ok)throw Error("No Buffer confirmation for replacement");
  await sql("UPDATE public.pr_instagram_interleave_20261123 SET state='scheduled',scheduled_at=now(),last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND state='dispatching'",[id]);
  return {...report,action:"scheduled_old_between_new",source,ordinal:old.ordinal,item_id:id,...out};
 }catch(e){
  const error=String(e?.message||e).slice(0,240);
  if(sendNew){
   // Buffer CreatePost can succeed before its response is lost, so never
   // blindly retry the same new article without reconciling its channel.
   await sql("UPDATE public.pr_instagram_waitlist_4slots SET state='needs_review',last_error=$2,updated_at=now() WHERE item_id=$1::uuid AND state='dispatching'",[id,error]);
  }else{
   let remote=null;
   try{remote=await bufferPostStatus(old.replacement_buffer_post_id)}catch{}
   const match=remote&&isBufferQueued(remote.status)&&remote.dueAt&&Math.abs(Date.parse(remote.dueAt)-Date.parse(due))<60000;
   if(match){
    await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='scheduled_repost',target_time=$2::timestamptz,last_error=NULL,synced_at=now(),updated_at=now() WHERE item_id=$1::uuid AND stage='dispatching'",[id,due]);
    await sql("UPDATE public.pr_instagram_interleave_20261123 SET state='scheduled',scheduled_at=now(),last_error=NULL,updated_at=now() WHERE item_id=$1::uuid AND state='dispatching'",[id]);
    return {...report,action:"scheduled_old_reconciled",source,item_id:id,dueAt:due};
   }
   // A confirmed unchanged draft is safe to leave in draft; an ambiguous
   // remote status blocks further old replacements but not new articles.
   const safelyDraft=remote&&String(remote.status||"").toLowerCase()==="draft";
   await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage=$2,last_error=$3,updated_at=now() WHERE item_id=$1::uuid AND stage='dispatching'",[id,safelyDraft?"draft_created":"needs_review",error]);
   await sql("UPDATE public.pr_instagram_interleave_20261123 SET state=$2,last_error=$3,updated_at=now() WHERE item_id=$1::uuid AND state='dispatching'",[id,safelyDraft?"waiting":"needs_review",error]);
  }
  return {...report,action:"needs_review_or_retry_later",source,item_id:id,error};
 }
}

async function schedule(id,options,userId){
 const original=await ensureStage(id);
 if(original.item_status!=="approved"||original.draft_status!=="approved")throw fail("Сначала утвердите статью",409);
 if(original.account_status!=="connected"||original.buffer_channel_id!==CHANNEL)throw fail("Instagram не подключён",503);
 const pairedTime=await telegramTarget(id);
 if(original.status==="queued"&&options.schedule_mode!=="now"&&pairedTime&&original.buffer_post_id){
  const sync=await syncQueuedInstagram(original,pairedTime);
  return {ok:true,already_scheduled:true,sync_action:sync.action,buffer_post_id:original.buffer_post_id,scheduled_for:sync.scheduled_for||pairedTime};
 }
 if(["published","publishing","preparing","container_created"].includes(original.status)||(original.status==="queued"&&options.schedule_mode!=="now"))return {ok:true,already_scheduled:true,buffer_post_id:original.buffer_post_id,scheduled_for:original.scheduled_for};
 if(!["draft","awaiting_approval","failed","queued"].includes(original.status))throw fail("Подготовка Instagram не завершена: "+original.status,409);
 const media=await verifyMedia(original);
 if(options.schedule_mode!=="now" && (await instagramCapacity())>=BUFFER_PENDING_CAP){
  await sql("INSERT INTO public.pr_instagram_waitlist_4slots(item_id,publication_id,queued_by,request_mode,state) VALUES($1::uuid,$2::uuid,$3,$4,'waiting') ON CONFLICT(item_id) DO UPDATE SET queued_by=EXCLUDED.queued_by,request_mode=EXCLUDED.request_mode,updated_at=now() WHERE public.pr_instagram_waitlist_4slots.state IN ('waiting','needs_review')",
   [id,original.id,userId,"automatic"]);
  return {ok:true,waitlisted:true,buffer_queue_full:true,limit:BUFFER_PENDING_CAP,message:"Одобрено. Очередь Buffer 10/10; материал поставлен в резерв и будет автоматически опубликован в ближайший свободный слот 08:00/13:00/18:00/23:00 (Лиссабон)."};
 }
 let dueAt,mode=options.schedule_mode||"default";
 const immediate=mode==="now";
 if(immediate){dueAt=new Date().toISOString()}
 else if(pairedTime){dueAt=pairedTime;mode="manual"}
 else if(mode==="manual"){
  const value=String(options.publish_at||options.scheduled_for||"");
  if(!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(Date.parse(value))||Date.parse(value)<Date.now()+60000)throw fail("Укажите будущую дату для Instagram",400);
  dueAt=new Date(value).toISOString();
 }else if(mode==="delay"){
  const mins=Number(options.delay_minutes||options.schedule_delay_minutes);
  if(!Number.isInteger(mins)||mins<1||mins>525600)throw fail("Неверная задержка",400);
  dueAt=new Date(Date.now()+mins*60000).toISOString();
 }else if(mode==="default"){
  dueAt=await nextInstagramDueAt();
 }else throw fail("Неизвестный режим расписания",400);
 const acquired=await sql("UPDATE public.pr_instagram_publications SET status='preparing',attempts=attempts+1,last_error=NULL,updated_at=now() WHERE id=$1::uuid AND status IN ('draft','awaiting_approval','failed','queued') RETURNING id",[original.id]);
 if(!acquired.length)return {ok:true,already_processing:true};
 try{
  let result;
  const [geolocation,deliveryImageUrl]=await Promise.all([
    verifiedInstagramGeolocation(original.item_id),
    instagramImageUrl(original.image_url)
  ]);
  const metadata={instagram:{type:"post",shouldShareToFeed:true,isAiGenerated:media.media_type==="generated_illustration",...(geolocation?{geolocation}:{})}};
  const input={
    text:original.caption,
    schedulingType:"automatic",
    mode:immediate?"shareNow":"customScheduled",
    ...(!immediate?{dueAt}:{}),
    saveToDraft:false,
    metadata,
    assets:[{image:{url:deliveryImageUrl}}]
  };
  if(original.buffer_post_id){
    result=(await buffer("mutation Update($input:EditPostInput!){editPost(input:$input){... on PostActionSuccess{post{id text status dueAt}} ... on MutationError{message}}}",{input:{...input,id:original.buffer_post_id}})).editPost;
  }else{
    result=(await buffer("mutation Create($input:CreatePostInput!){createPost(input:$input){... on PostActionSuccess{post{id text status dueAt}} ... on MutationError{message}}}",{input:{...input,channelId:CHANNEL}})).createPost;
  }
  if(!result?.post?.id)throw fail("Buffer отказал: "+(result?.message||"публикация не создана"),502);
  if(result.post.text!==original.caption)throw fail("Buffer вернул текст с ошибкой кодировки; проверьте черновик вручную",502);
  const published=String(result.post.status||"").toLowerCase()==="sent";
  await sql("UPDATE public.pr_instagram_publications SET status=$5,buffer_post_id=$2,scheduled_for=$3::timestamptz,approved_by=$4::text,approved_at=now(),published_at=CASE WHEN $5='published' THEN now() ELSE NULL END,buffer_created_at=coalesce(buffer_created_at,now()),last_error=NULL,updated_at=now() WHERE id=$1::uuid",[original.id,result.post.id,dueAt,userId,published?"published":"queued"]);
  await sql("INSERT INTO public.pr_instagram_delivery_events(publication_id,event_type,meta_object_id) VALUES($1::uuid,$2,$3)",[original.id,immediate?"buffer_share_now_requested":"buffer_scheduled",result.post.id]);
  return {ok:true,scheduled:!immediate,dispatched:immediate,published,buffer_post_id:result.post.id,scheduled_for:dueAt,status:result.post.status,optimized_image:deliveryImageUrl!==original.image_url};
 }catch(e){
  const error=String(e.message||"Buffer error");
  if(!immediate && /scheduled posts limit reached|10 scheduled posts out of 10 allowed|posts limit reached/i.test(error)){
   await sql("UPDATE public.pr_instagram_publications SET status='awaiting_approval',last_error=NULL,updated_at=now() WHERE id=$1::uuid AND status='preparing' AND buffer_post_id IS NULL",[original.id]);
   await sql("INSERT INTO public.pr_instagram_waitlist_4slots(item_id,publication_id,queued_by,request_mode,state) VALUES($1::uuid,$2::uuid,$3,'automatic','waiting') ON CONFLICT(item_id) DO UPDATE SET state='waiting',queued_by=EXCLUDED.queued_by,updated_at=now() WHERE public.pr_instagram_waitlist_4slots.state IN ('waiting','needs_review')",[id,original.id,userId]);
   return {ok:true,waitlisted:true,buffer_queue_full:true,limit:BUFFER_PENDING_CAP,message:"Buffer 10/10: статья принята в резерв автоматической публикации по 4 фиксированным часам."};
  }
  await sql("UPDATE public.pr_instagram_publications SET status='failed',last_error=$2,updated_at=now() WHERE id=$1::uuid",[original.id,error.slice(0,250)]).catch(()=>{});
  throw e;
 }
}

// Instagram cover+caption retrofit (2026-11-23).
// Buffer cannot edit or delete already SENT Instagram media: create unposted
// replacement DRAFTS for those originals; never duplicate published Instagram posts.
// For queued posts, edit existing Buffer ID without changing the publishing slot.
async function retrofitInstagramBatch(limit=4){
 const size=Math.max(1,Math.min(8,Number(limit)||4));
 const rows=await sql(
  "SELECT r.item_id,r.publication_id,r.source_status,r.source_buffer_post_id,r.cover_url,r.carousel_urls,r.caption,r.full_text,r.attempts,"+
  "p.status AS current_status,p.buffer_post_id AS current_buffer_id,p.scheduled_for,"+
  "i.photo_url AS source_photo,"+
  "EXISTS(SELECT 1 FROM public.pr_media_assets m WHERE m.item_id=i.id AND m.public_url=i.photo_url AND m.status='approved' AND m.rights_verified=true AND m.media_type='generated_illustration') AS ai_original "+
  "FROM public.pr_instagram_retrofit_20261123 r "+
  "JOIN public.pr_instagram_publications p ON p.id=r.publication_id AND p.item_id=r.item_id "+
  "JOIN public.pr_items i ON i.id=r.item_id "+
  "WHERE r.stage='ready' AND r.attempts<3 AND p.status IN ('queued','published') "+
  "AND p.buffer_post_id IS NOT NULL AND i.status='approved' "+
  "ORDER BY CASE WHEN p.status='published' THEN 0 ELSE 1 END,p.scheduled_for NULLS LAST,r.created_at LIMIT $1",[size]);
 const report={ok:true,checked:rows.length,queued_updated:0,drafts_created:0,already_sent:0,skipped:0,failed:0,items:[]};
 for(const row of rows){
  const err=async(message,failed=true)=>{
   const reason=String(message||"unknown").slice(0,280);
   await sql("UPDATE public.pr_instagram_retrofit_20261123 SET attempts=attempts+1,last_error=$2,stage=CASE WHEN attempts>=2 THEN 'needs_review' ELSE 'ready' END,updated_at=now() WHERE item_id=$1::uuid AND stage='ready'",[row.item_id,reason]).catch(()=>{});
   if(failed)report.failed++;else report.skipped++;
   report.items.push({item_id:row.item_id,error:reason});
  };
  try{
   if(!row.current_buffer_id||row.current_buffer_id!==row.source_buffer_post_id){
    await err("Buffer ID changed since the editorial retrofit snapshot");continue;
   }
   if(!row.caption||row.caption.length>2200||row.caption.length<80){
    await err("Instagram caption outside 80..2200 characters");continue;
   }
   const urls=[row.cover_url,...(Array.isArray(row.carousel_urls)?row.carousel_urls:JSON.parse(row.carousel_urls||"[]"))];
   if(urls.length>10||urls.length<1||urls.some(x=>!/^https:\/\/mynw\.app\/journalstudio\/instagram-retrofit\/[0-9a-f-]{36}(?:-text-\d+)?\.jpg$/.test(x))){
    await err("Invalid or excessive Instagram carousel assets");continue;
   }
   let missing=[];
   for(const asset of urls){
    const check=await fetch(asset,{method:"HEAD",signal:AbortSignal.timeout(12000)});
    if(!check.ok)missing.push(asset.slice(-65)+":"+check.status);
   }
   if(missing.length){await err("Cover upload not yet visible: "+missing.join(", "),false);continue}
   const remote=(await buffer(
    "query GetPost($input:PostInput!){post(input:$input){id status dueAt sentAt text}}",
    {input:{id:row.current_buffer_id}})).post;
   if(!remote||remote.id!==row.current_buffer_id){await err("Buffer post not found");continue}
   const remoteStatus=String(remote.status||"").toLowerCase();
   const alreadySent=remoteStatus==="sent";
   const ai= row.ai_original===true||row.ai_original==="t";
   const assets=urls.map(x=>({image:{url:x}}));
   const metadata={instagram:{type:"post",shouldShareToFeed:true,isAiGenerated:ai}};
   if(row.current_status==="published"||alreadySent||remoteStatus==="error"){
    if(alreadySent&&row.current_status!=="published"){
     await sql("UPDATE public.pr_instagram_publications SET status='published',published_at=COALESCE(published_at,$2::timestamptz,now()),updated_at=now() WHERE id=$1::uuid AND status='queued'",[row.publication_id,remote.sentAt||null]);
    }
    // Reserve the one-time draft operation BEFORE Buffer API side effects.
    // If a response is ambiguous, never retry blindly and create duplicates.
    const claimed=await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='creating_draft',attempts=attempts+1,updated_at=now() WHERE item_id=$1::uuid AND stage='ready' RETURNING item_id",[row.item_id]);
    if(!claimed.length){report.skipped++;continue}
    // Already-published Buffer posts are immutable: save distinct drafts
    // using their own Buffer IDs, retaining originals and their analytics.
    const created=(await buffer(
     "mutation RetrofitDraft($input:CreatePostInput!){createPost(input:$input){... on PostActionSuccess{post{id text status}} ... on MutationError{message}}}",
     {input:{channelId:CHANNEL,text:row.caption,mode:"addToQueue",saveToDraft:true,needsApproval:false,
       schedulingType:"automatic",metadata,assets}})).createPost;
    if(!created?.post?.id||String(created.post.status||"").toLowerCase()!=="draft"||created.post.text!==row.caption){
     await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='needs_review',last_error=$2,updated_at=now() WHERE item_id=$1::uuid AND stage='creating_draft'",[row.item_id,"Buffer did not confirm unique draft: "+String(created?.message||"unexpected response").slice(0,150)]);
     report.failed++;continue
    }
    await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='draft_created',replacement_buffer_post_id=$2,last_error=NULL,synced_at=now(),updated_at=now() WHERE item_id=$1::uuid AND stage='creating_draft'",[row.item_id,created.post.id]);
    if(remoteStatus==="error"){
      await sql("UPDATE public.pr_instagram_publications SET status='failed',last_error='Исходный пост Buffer в состоянии error; создан новый черновик для ручной проверки',updated_at=now() WHERE id=$1::uuid AND status='queued'",[row.publication_id]).catch(()=>{});
    }
    report.drafts_created++;report.items.push({item_id:row.item_id,status:"draft_created",buffer_post_id:created.post.id});
    continue;
   }
   if(!["scheduled","buffer","queued"].includes(String(remote.status||"").toLowerCase())){
    await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='needs_review',attempts=attempts+1,last_error=$2,updated_at=now() WHERE item_id=$1::uuid AND stage='ready'",[row.item_id,"Existing Buffer post is "+String(remote.status||"unknown")+"; reconcile it before replacement"]).catch(()=>{});
    report.skipped++;report.items.push({item_id:row.item_id,status:"needs_review",buffer_status:remote.status});continue;
   }
   if(row.scheduled_for && new Date(row.scheduled_for).getTime()<Date.now()+4*60000){
    await err("Queued post is too close to its publishing time; avoid race with Buffer",false);continue;
   }
   const changed=(await buffer(
    "mutation RetrofitEdit($input:EditPostInput!){editPost(input:$input){... on PostActionSuccess{post{id text status dueAt}} ... on MutationError{message}}}",
    {input:{id:row.current_buffer_id,text:row.caption,metadata,assets}})).editPost;
   if(!changed?.post?.id||changed.post.id!==row.current_buffer_id||changed.post.text!==row.caption) {
    await err("Buffer edit not confirmed: "+String(changed?.message||"unexpected response"));continue
   }
   if(row.scheduled_for&&changed.post.dueAt&&Math.abs(Date.parse(changed.post.dueAt)-Date.parse(row.scheduled_for))>60000){
    await err("Buffer returned a different publishing slot; requires reconciliation");continue;
   }
   await sql("UPDATE public.pr_instagram_publications SET caption=$2,image_url=$3,updated_at=now(),last_error=NULL WHERE id=$1::uuid AND status='queued' AND buffer_post_id=$4",
     [row.publication_id,row.caption,row.cover_url,row.current_buffer_id]);
   await sql("UPDATE public.pr_instagram_retrofit_20261123 SET stage='queued_updated',attempts=attempts+1,last_error=NULL,synced_at=now(),updated_at=now() WHERE item_id=$1::uuid AND stage='ready'",[row.item_id]);
   report.queued_updated++;report.items.push({item_id:row.item_id,status:"queued_updated",buffer_post_id:row.current_buffer_id,assets:urls.length});
  }catch(e){await err(String(e.message||e))}
 }
 return report;
}

export default {async fetch(request){
 const url=new URL(request.url),origin=ALLOWED.has(request.headers.get("origin"))?request.headers.get("origin"):"";
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":origin,"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Authorization,Content-Type","access-control-max-age":"600"}});
 if(["GET","POST"].includes(request.method)&&url.pathname==="/health"){const state={ok:true,service:"prbuffer",version:9,category_stripe_buffer_in_place:true,category_stripe_storage_configured:Boolean(process.env.AWS_ACCESS_KEY_ID&&process.env.AWS_SECRET_ACCESS_KEY&&process.env.AWS_ENDPOINT_URL_S3),interleaved_old_replacements:true,rapid_old_replacement_one_per_minute:false,lisbon_slots:['08:00','13:00','18:00','23:00'],buffer_pending_cap:10,auto_refill:true,instagram_retrofit:true,instagram_image_delivery:"wikimedia_1600",token_configured:!!process.env.BUFFER_API_KEY,database_configured:!!process.env.DATABASE_URL,verification_secret_configured:!!process.env.PR_BUFFER_SETUP_SECRET};console.log("PRBUFFER_HEALTH",JSON.stringify(state));return json(state,200,origin)}
 if(request.method==="POST"&&url.pathname==="/verify"){
  if(!process.env.PR_BUFFER_SETUP_SECRET||request.headers.get("x-pr-buffer-secret")!==process.env.PR_BUFFER_SETUP_SECRET)return json({error:"unauthorized"},401,origin);
  try{const r=await buffer('query{channel(input:{id:"'+CHANNEL+'"}){id name service}}'); const c=r.channel;return json({ok:!!c&&c.id===CHANNEL,channel_id:c?.id,name:c?.name,service:c?.service},200,origin)}
  catch(e){return json({ok:false,error:e.message},503,origin)}
 }
 if(request.method==="POST"&&url.pathname==="/internal/category-stripes"){
  // Only Neon scheduled triggers may invoke; no user request ever creates a new post.
  if(!request.headers.get("x-neon-trigger-invocation-id"))return json({error:"forbidden"},403,origin);
  try{
   // Legacy 24px full-width color bands are retired. Never rewrite approved media.
   return json({ok:true,disabled:true,reason:"full_width_category_stripes_retired"},200,origin);
  }catch(e){
   console.error("PR_INSTAGRAM_CATEGORY_STRIPES_ERROR",String(e.message||e).slice(0,180));
   return json({ok:false,error:String(e.message||e).slice(0,180)},503,origin);
  }
 }
 if(request.method==="POST"&&url.pathname==="/internal/retrofit"){
  if(!request.headers.get("x-neon-trigger-invocation-id"))return json({error:"forbidden"},403,origin);
  try{return json(await retrofitInstagramBatch(8),200,origin)}
  catch(e){return json({ok:false,error:String(e.message||e).slice(0,220)},503,origin)}
 }
 if(request.method==="POST"&&url.pathname==="/internal/rapid-replace"){
  if(!request.headers.get("x-neon-trigger-invocation-id"))return json({error:"forbidden"},403,origin);
  try{
   const result=await rapidReplacementTick();
   console.log("PR_IG_RAPID_REPLACE",JSON.stringify(result));
   return json(result,200,origin);
  }catch(e){
   console.error("PR_IG_RAPID_REPLACE_ERROR",String(e.message||e).slice(0,240));
   return json({ok:false,error:String(e.message||e).slice(0,240)},503,origin);
  }
 }
 if(request.method==="POST"&&url.pathname==="/internal/refill"){
  if(!request.headers.get("x-neon-trigger-invocation-id"))return json({error:"forbidden"},403,origin);
  try{const result=await refillInstagramQueue();console.log('PR_IG_REFILL',JSON.stringify(result));return json(result,200,origin)}
  catch(e){console.error('PR_IG_REFILL_FAILED',String(e.message||e).slice(0,260));return json({ok:false,error:String(e.message||e).slice(0,260)},503,origin)}
 }
 if(request.method==="POST"&&url.pathname==="/internal/sync"){
  if(!request.headers.get("x-neon-trigger-invocation-id"))return json({error:"forbidden"},403,origin);
  try{return json(await syncQueuedBatch(25),200,origin)}
  catch(e){return json({ok:false,error:String(e.message).slice(0,220)},503,origin)}
 }
 try{
  const editor=await identity(request);
  if(url.pathname==="/api/instagram"&&request.method==="GET"){
   const id=url.searchParams.get("item_id");if(!isUuid(id))throw fail("Неверный ID",400);
   return json({ok:true,instagram:await refreshPublishedStatus(await fetchDraft(id))},200,origin);
  }
  if(url.pathname==="/api/instagram/approve"&&request.method==="POST"){
   if(editor.role!=="owner")throw fail("Это утверждение доступно только владельцу журнала",403);
   const data=await request.json().catch(()=>({}));
   if(!isUuid(data.item_id))throw fail("Неверный ID статьи",400);
   const result=await sql("SELECT * FROM public.pr_owner_approve_for_instagram($1::uuid,$2::uuid,$3::text)",[data.item_id,editor.id,String(data.note||"").slice(0,1500)]);
   return json({ok:true,approval:result[0]||null},200,origin);
  }
  if(url.pathname==="/api/instagram/sync"&&request.method==="POST"){
   if(editor.role!=="owner")throw fail("Сверка очереди доступна владельцу",403);
   const data=await request.json().catch(()=>({}));
   return json(await syncQueuedBatch(data.limit||25),200,origin);
  }
  if(url.pathname==="/api/instagram/schedule"&&request.method==="POST"){
   const data=await request.json().catch(()=>({}));
   if(!isUuid(data.item_id))throw fail("Неверный ID статьи",400);
   const result=await schedule(data.item_id,data,editor.id);
   return json(result,200,origin);
  }
  return json({error:"not_found"},404,origin);
 }catch(e){return json({ok:false,error:String(e.message||"Ошибка соединения").slice(0,320)},e.status||500,origin)}
}};

// Exported for deterministic regression tests; authenticated routes remain unchanged.
export { instagramImageUrl };
