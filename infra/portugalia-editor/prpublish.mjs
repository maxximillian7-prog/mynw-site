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
const TRAILYO_APP_URL="https://apps.apple.com/us/app/trailyo-events-in-portugal/id6832330654";
const richUrl=(word,url)=>({type:"url",text:word,url});
function publicHttps(source){
 try{
  const url=new URL(source);
  const hostname=url.hostname.toLowerCase();
  if(url.protocol!=="https:"||url.username||url.password||url.port||!hostname.includes(".")||
     /^(localhost|127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname))return null;
  return url;
 }catch{return null}
}
function embeddedLinks(value){
 const s=String(value||""),regex=/https:\/\/[^\s<>"']+/g,parts=[];let cursor=0,match;
 while((match=regex.exec(s))){
  const pre=s.slice(cursor,match.index);
  if(pre)parts.push(pre);
  const raw=match[0],clean=raw.replace(/[.,;!?]+$/,"");
  const link=publicHttps(clean);
  if(link)parts.push(richUrl(/(?:файл|фото|изображение)\s*:\s*$/i.test(pre)?"Фото":/(?:билет|бронирование)\s*:\s*$/i.test(pre)?"Билеты":"Ссылка",link.href));
  else parts.push(raw);
  if(raw.length!==clean.length)parts.push(raw.slice(clean.length));
  cursor=match.index+raw.length;
 }
 if(cursor<s.length)parts.push(s.slice(cursor));
 return parts.length>1?parts:(parts[0]??"");
}
function footerLine(line){
 const source=String(line||"").trim();
 const matches=[...source.matchAll(/https:\/\/[^\s<>"']+/g)].map(x=>x[0].replace(/[.,;!?]+$/,"")).filter(x=>publicHttps(x));
 if(/^Источник\s*:/i.test(source)&&matches.length){
  const url=matches[0];
  const rest=source.replace(/^Источник\s*:\s*/i,"").replace(url,"").trim();
  return rest?[richUrl("Источник",url)," — ",embeddedLinks(rest)]:richUrl("Источник",url);
 }
 if(/^Фото\s*:/i.test(source)&&matches.length){
  // Credit remains readable; the long direct media URL becomes one word.
  const url=matches.find(x=>/(?:файл|оригинал)\s*:\s*$/.test(source.slice(0,source.indexOf(x)).toLowerCase()))||matches[matches.length-1];
  const byline=source.replace(/^Фото\s*:\s*/i,"").replace(url,"").replace(/(?:файл|оригинал)\s*:\s*/gi,"").trim().replace(/[;·,\s]+$/,"");
  return byline?[richUrl("Фото",url)," — ",embeddedLinks(byline)]:richUrl("Фото",url);
 }
 return embeddedLinks(source);
}
function richBlocks(preparedText,photoUrl,isAiGenerated=false,isAfisha=false){
 const full=String(preparedText||"").trim();
 if(full.length<110||full.length>32000)throw Error("Full article length out of range");
 const url=publicHttps(photoUrl);
 if(!url)throw Error("Approved photograph URL missing or unsafe");
 const neonStore=process.env.AWS_ENDPOINT_URL_S3?new URL(process.env.AWS_ENDPOINT_URL_S3).hostname:"";
 const usualImage=["upload.wikimedia.org","thumb.wikimedia.org","images.pexels.com","images.unsplash.com","cdn.pixabay.com"].includes(url.hostname)
  ||(neonStore&&url.hostname===neonStore&&url.pathname.startsWith("/pr-editorial-media/ai-covers/"));
 // For Afisha, the database already requires a manually approved image
 // from a published Trailyo event. No licence assertion is added here.
 if(!usualImage&&!isAfisha)throw Error("Photo must be a licensed image or stored AI illustration");
 const paragraphs=full.split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean),title=paragraphs.shift();
 if(!title||title.length>255)throw Error("Article title missing or too long");
 const blocks=[{type:"photo",photo:{type:"photo",media:url.href}},{type:"heading",size:2,text:title}];
 if(isAiGenerated)blocks.push({type:"paragraph",text:"📷 AI-изображение · не документальное фото."});
 for(const section of paragraphs){
  if(section.startsWith("Источник:")){
   for(const line of section.split("\n").map(s=>s.trim()).filter(Boolean)){
    blocks.push({type:"footer",text:footerLine(line)});
   }
   continue;
  }
  const newline=section.indexOf("\n"),first=newline>=0?section.slice(0,newline).trim():"",rest=newline>=0?section.slice(newline+1).trim():"";
  if(first.length>=5&&first.length<=100&&/[.!?:»)]$/.test(first)&&rest.length>=20){
   blocks.push({type:"heading",size:5,text:embeddedLinks(first)},{type:"paragraph",text:embeddedLinks(rest)});
  }else blocks.push({type:"paragraph",text:embeddedLinks(section)});
 }
 if(isAfisha)blocks.push({type:"paragraph",text:["Больше событий в приложении ",richUrl("Trailyo",TRAILYO_APP_URL),"."]});
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
 // Database serializes concurrent cron invocations.
 // MAIN: >=120 min since last actual Main send, no sends 00:00-08:00 Lisbon.
 // AFISHA: no scheduling interval and no quiet hours; still approval-gated.
 return (await query("SELECT * FROM public.pr_claim_due_telegram_post()"))[0]||null;
}
async function publish(post){
 if(!token)throw Error("Telegram bot token missing");
 const blocks=richBlocks(post.prepared_text,post.approved_image_url,post.is_ai_generated===true,post.destination_code==="afisha");
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
  let messageId;
  try{messageId=await publish(post);}
  catch(e){
   report.failed++;const reason=safe(e?.message||e);
   report.errors.push({post_id:post.post_id,error:reason});
   try{
    await query("UPDATE public.pr_posts SET status='failed',last_error=$2 WHERE id=$1::uuid AND status='sending'",[post.post_id,reason]);
   }catch(dbError){report.errors.push({post_id:post.post_id,needs_manual_reconciliation:true,error:safe(dbError?.message||dbError)});}
   continue;
  }
  // The Telegram API has accepted the single Rich Message. Do not mark it
  // failed or resend on a subsequent DB error: reconcile its message_id.
  try{
   await query("UPDATE public.pr_posts SET status='sent',telegram_message_id=$2::bigint,telegram_photo_message_id=NULL,sent_at=now(),last_error=NULL WHERE id=$1::uuid AND status='sending'",[post.post_id,String(messageId)]);
   report.sent++;
  }catch(e){
   report.errors.push({post_id:post.post_id,needs_manual_reconciliation:true,telegram_message_id:messageId,error:safe(e?.message||e)});
  }
 }
 return report;
}
export default {async fetch(req){
 const path=new URL(req.url).pathname;
 if(path==="/health"){
  try{
   const rows=await query("SELECT destination_code,count(*) FILTER(WHERE status IN ('queued','scheduled')) AS pending,min(scheduled_for) FILTER(WHERE status IN ('queued','scheduled')) AS next_due_at,max(sent_at) FILTER(WHERE status='sent') AS last_sent_at FROM public.pr_posts WHERE destination_code IN ('main','afisha') GROUP BY destination_code");
   const channels=Object.fromEntries(rows.map(r=>[r.destination_code,{pending:Number(r.pending||0),next_due_at:r.next_due_at||null,last_sent_at:r.last_sent_at||null}]));
   return json({service:"portugalia-telegram-publisher",version:4,delivery_format:"RichMessage",ready:!!token&&!!dbConn,channels,policy:{main:{min_interval_minutes:120,quiet_hours_lisbon:"00:00-08:00"},afisha:{min_interval_minutes:0,quiet_hours_lisbon:null}},cron_every_minutes:5,photo_and_article_in_one:true});
  }catch(e){return json({service:"portugalia-telegram-publisher",version:4,ready:false,error:safe(e.message)},503);}
 }
 if(path!=="/run"&&path!=="/")return json({error:"Route not found"},404);
 try{return json(await execute())}catch(e){return json({ok:false,error:safe(e?.message||e)},500)}
}};