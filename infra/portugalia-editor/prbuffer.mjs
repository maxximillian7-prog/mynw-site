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
 if(!r.ok)throw fail("Ошибка Neon SQL "+r.status,503);
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
 const rows=await sql("SELECT p.id,p.item_id,p.status,p.image_url,p.caption,p.buffer_post_id,p.scheduled_for,p.approved_by,p.approved_at,p.last_error,p.updated_at, a.status account_status, a.buffer_channel_id, a.enabled, i.title_ru, i.photo_rights, i.status item_status, d.status draft_status FROM public.pr_instagram_publications p JOIN public.pr_instagram_accounts a ON a.account_key=p.account_key JOIN public.pr_items i ON i.id=p.item_id JOIN public.pr_story_drafts d ON d.item_id=p.item_id WHERE p.item_id=$1::uuid AND p.account_key='pt_ryadom' LIMIT 1",[id]);
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
async function schedule(id,options,userId){
 const original=await ensureStage(id);
 if(original.item_status!=="approved"||original.draft_status!=="approved")throw fail("Сначала утвердите статью",409);
 if(original.account_status!=="connected"||original.buffer_channel_id!==CHANNEL)throw fail("Instagram не подключён",503);
 if(["published","publishing","preparing","container_created"].includes(original.status)||(original.status==="queued"&&options.schedule_mode!=="now"))return {ok:true,already_scheduled:true,buffer_post_id:original.buffer_post_id,scheduled_for:original.scheduled_for};
 if(!["draft","awaiting_approval","failed","queued"].includes(original.status))throw fail("Подготовка Instagram не завершена: "+original.status,409);
 const media=await verifyMedia(original);
 let dueAt,mode=options.schedule_mode||"default";
 const immediate=mode==="now";
 if(immediate){dueAt=new Date().toISOString()}
 else if(mode==="manual"){
  const value=String(options.publish_at||options.scheduled_for||"");
  if(!/^\d{4}-\d{2}-\d{2}T/.test(value)||!Number.isFinite(Date.parse(value))||Date.parse(value)<Date.now()+60000)throw fail("Укажите будущую дату для Instagram",400);
  dueAt=new Date(value).toISOString();
 }else if(mode==="delay"){
  const mins=Number(options.delay_minutes||options.schedule_delay_minutes);
  if(!Number.isInteger(mins)||mins<1||mins>525600)throw fail("Неверная задержка",400);
  dueAt=new Date(Date.now()+mins*60000).toISOString();
 }else if(mode==="default"){
  const max=await sql("SELECT greatest(now()+interval '2 hours',coalesce(max(scheduled_for)+interval '2 hours',now()+interval '2 hours')) AS next FROM public.pr_instagram_publications WHERE status IN ('queued','publishing') AND scheduled_for>now()-interval '1 day'");
  dueAt=new Date(max[0].next).toISOString();
 }else throw fail("Неизвестный режим расписания",400);
 const acquired=await sql("UPDATE public.pr_instagram_publications SET status='preparing',attempts=attempts+1,last_error=NULL,updated_at=now() WHERE id=$1::uuid AND status IN ('draft','awaiting_approval','failed','queued') RETURNING id",[original.id]);
 if(!acquired.length)return {ok:true,already_processing:true};
 try{
  let result;
  const geolocation=await verifiedInstagramGeolocation(original.item_id);
  const metadata={instagram:{type:"post",shouldShareToFeed:true,isAiGenerated:media.media_type==="generated_illustration",...(geolocation?{geolocation}:{})}};
  const input={
    text:original.caption,
    schedulingType:"automatic",
    mode:immediate?"shareNow":"customScheduled",
    ...(!immediate?{dueAt}:{}),
    saveToDraft:false,
    metadata,
    assets:[{image:{url:original.image_url}}]
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
  return {ok:true,scheduled:!immediate,dispatched:immediate,published,buffer_post_id:result.post.id,scheduled_for:dueAt,status:result.post.status};
 }catch(e){
  await sql("UPDATE public.pr_instagram_publications SET status='failed',last_error=$2,updated_at=now() WHERE id=$1::uuid",[original.id,String(e.message||"Buffer error").slice(0,250)]).catch(()=>{});
  throw e;
 }
}
export default {async fetch(request){
 const url=new URL(request.url),origin=ALLOWED.has(request.headers.get("origin"))?request.headers.get("origin"):"";
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":origin,"access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"Authorization,Content-Type","access-control-max-age":"600"}});
 if(["GET","POST"].includes(request.method)&&url.pathname==="/health"){const state={ok:true,service:"prbuffer",token_configured:!!process.env.BUFFER_API_KEY,database_configured:!!process.env.DATABASE_URL,verification_secret_configured:!!process.env.PR_BUFFER_SETUP_SECRET};console.log("PRBUFFER_HEALTH",JSON.stringify(state));return json(state,200,origin)}
 if(request.method==="POST"&&url.pathname==="/verify"){
  if(!process.env.PR_BUFFER_SETUP_SECRET||request.headers.get("x-pr-buffer-secret")!==process.env.PR_BUFFER_SETUP_SECRET)return json({error:"unauthorized"},401,origin);
  try{const r=await buffer('query{channel(input:{id:"'+CHANNEL+'"}){id name service}}'); const c=r.channel;return json({ok:!!c&&c.id===CHANNEL,channel_id:c?.id,name:c?.name,service:c?.service},200,origin)}
  catch(e){return json({ok:false,error:e.message},503,origin)}
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
  if(url.pathname==="/api/instagram/schedule"&&request.method==="POST"){
   const data=await request.json().catch(()=>({}));
   if(!isUuid(data.item_id))throw fail("Неверный ID статьи",400);
   const result=await schedule(data.item_id,data,editor.id);
   return json(result,200,origin);
  }
  return json({error:"not_found"},404,origin);
 }catch(e){return json({ok:false,error:String(e.message||"Ошибка соединения").slice(0,320)},e.status||500,origin)}
}};
