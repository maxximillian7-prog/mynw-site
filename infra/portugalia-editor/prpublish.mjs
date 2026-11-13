// Portugal Ryadom: Telegram Rich Message publisher, approved content only.
// Single photo + full article in one message. No new AI image generation.
// The editor must approve an article, photo, sources, then enqueue it.
const dbConn=process.env.DATABASE_URL, token=process.env.TELEGRAM_BOT_TOKEN;
const safe=s=>String(s||"").replace(/[\x00-\x1f\x7f]/g," ").slice(0,280);
const json=(x,status=200)=>Response.json(x,{status,headers:{"cache-control":"no-store"}});
async function query(q,params=[]){
 if(!dbConn)throw Error("Database credentials missing");
 const host=new URL(dbConn).hostname;
 const response=await fetch("https://"+host+"/sql",{
  method:"POST",
  headers:{"content-type":"application/json","Neon-Connection-String":dbConn},
  body:JSON.stringify({query:q,params}),signal:AbortSignal.timeout(18000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw Error("Database request failed "+response.status+": "+safe(JSON.stringify(data)));
 return data.rows??data;
}
function richBlocks(preparedText,photoUrl){
 const full=String(preparedText||"").trim();
 if(full.length<110||full.length>32000)throw Error("Full article length out of range");
 let url;try{url=new URL(photoUrl)}catch{throw Error("Approved photograph URL missing")}
 if(url.protocol!=="https:"||url.username||url.password||
    !["upload.wikimedia.org","thumb.wikimedia.org","images.pexels.com","images.unsplash.com","cdn.pixabay.com"].includes(url.hostname))
  throw Error("Photo is not hosted by an approved image provider");
 const paragraphs=full.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean),title=paragraphs.shift();
 if(!title||title.length>255)throw Error("Article title missing or too long");
 const blocks=[{type:"photo",photo:{type:"photo",media:url.href}},{type:"heading",size:2,text:title}];
 for(const section of paragraphs){
  if(section.startsWith("Источник:")){blocks.push({type:"footer",text:section});continue;}
  const newline=section.indexOf("\n"),first=newline>=0?section.slice(0,newline).trim():"",rest=newline>=0?section.slice(newline+1).trim():"";
  if(first.length>=5&&first.length<=100&&/[.!?:»)]$/.test(first)&&rest.length>=20){
   blocks.push({type:"heading",size:5,text:first},{type:"paragraph",text:rest});
  }else blocks.push({type:"paragraph",text:section});
 }
 if(blocks.length>500)throw Error("Article has too many rich blocks");
 return blocks;
}
async function promote(){
 const sql=`WITH todo AS (
  SELECT p.id FROM public.pr_posts p
  JOIN public.pr_destinations dst ON dst.code=p.destination_code AND dst.is_enabled AND dst.telegram_chat_id IS NOT NULL
  JOIN LATERAL public.pr_item_publication_check(p.item_id) gate ON gate.allowed=true
  JOIN public.pr_story_drafts d ON d.item_id=p.item_id AND d.status='approved' AND d.context_verified AND d.needs_more_facts=false
  WHERE p.status='queued' AND (p.scheduled_for IS NULL OR p.scheduled_for<=now())
  ORDER BY p.created_at LIMIT 8 FOR UPDATE OF p SKIP LOCKED
 )
 UPDATE public.pr_posts p SET status='scheduled',scheduled_for=coalesce(p.scheduled_for,now())
 FROM todo WHERE p.id=todo.id RETURNING p.id`;
 return query(sql);
}
async function claim(){
 const sql=`WITH todo AS (
 SELECT p.id,q.post_id,q.item_id,q.destination_code,q.telegram_chat_id,q.prepared_text,q.approved_image_url
 FROM public.pr_posts p JOIN public.pr_telegram_delivery_queue q ON q.post_id=p.id
 WHERE p.status='scheduled' AND q.approved_image_url IS NOT NULL
 AND EXISTS(
   SELECT 1 FROM public.pr_media_assets a
   WHERE a.item_id=p.item_id AND a.public_url=q.approved_image_url
    AND a.status='approved' AND a.rights_verified
    AND a.media_type IN ('licensed_original','owned_original')
 )
 ORDER BY p.created_at LIMIT 1 FOR UPDATE OF p SKIP LOCKED
 ), claimed AS (
  UPDATE public.pr_posts p SET status='sending',attempts=p.attempts+1,last_error=NULL
  FROM todo t WHERE p.id=t.id RETURNING p.id,p.attempts,p.telegram_thread_id
 )
 SELECT t.*,c.attempts,c.telegram_thread_id FROM todo t JOIN claimed c ON t.id=c.id`;
 return (await query(sql))[0]||null;
}
async function publish(post){
 if(!token)throw Error("Telegram bot token missing");
 const blocks=richBlocks(post.prepared_text,post.approved_image_url);
 const body={chat_id:String(post.telegram_chat_id),rich_message:{blocks}};
 if(post.telegram_thread_id)body.message_thread_id=Number(post.telegram_thread_id);
 const response=await fetch("https://api.telegram.org/bot"+token+"/sendRichMessage",{
  method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify(body),signal:AbortSignal.timeout(45000)
 });
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok!==true||!data.result?.message_id)
  throw Error("Telegram rich message "+response.status+": "+safe(data.description||"unknown error"));
 return data.result.message_id;
}
async function execute(){
 if(!dbConn||!token)throw Error("Publisher credentials missing");
 const promoted=await promote(),report={ok:true,format:"RichMessage",promoted:promoted.length,sent:0,failed:0,errors:[]};
 for(let i=0;i<4;i++){
  const post=await claim();if(!post)break;
  try{
   const messageId=await publish(post);
   await query("UPDATE public.pr_posts SET status='sent',telegram_message_id=$2::bigint,telegram_photo_message_id=NULL,sent_at=now(),last_error=NULL WHERE id=$1::uuid AND status='sending'",[post.post_id,String(messageId)]);
   report.sent++;
  }catch(e){
   report.failed++;const reason=safe(e?.message||e);
   report.errors.push({post_id:post.post_id,error:reason});
   try{
    await query("UPDATE public.pr_posts SET status='failed',last_error=$2 WHERE id=$1::uuid AND status='sending'",[post.post_id,reason]);
   }catch(dbError){report.errors.push({post_id:post.post_id,needs_manual_reconciliation:true,error:safe(dbError?.message||dbError)});}
  }
 }
 return report;
}
export default {async fetch(req){
 const path=new URL(req.url).pathname;
 if(path==="/health"){
  try{
   const rows=await query("SELECT count(*) n FROM public.pr_posts WHERE status='scheduled'");
   return json({service:"portugalia-telegram-publisher",version:2,delivery_format:"RichMessage",ready:!!token&&!!dbConn,scheduled_count:Number(rows[0]?.n||0),photo_and_article_in_one:true});
  }catch(e){return json({service:"portugalia-telegram-publisher",version:2,ready:false,error:safe(e.message)},503);}
 }
 if(path!=="/run"&&path!=="/")return json({error:"Route not found"},404);
 try{return json(await execute())}catch(e){return json({ok:false,error:safe(e?.message||e)},500)}
}};