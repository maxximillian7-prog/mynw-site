
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { Image } from "jsr:@matmen/imagescript@3.20.3";
const ROOT=Deno.env.get("SUPABASE_URL")||"", KEY=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"", ANON=Deno.env.get("SUPABASE_ANON_KEY")||"";
const H={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","Access-Control-Allow-Origin":"https://mynw.app","Access-Control-Allow-Headers":"authorization,apikey,content-type,x-darkfactory-session","Access-Control-Allow-Methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS","X-Content-Type-Options":"nosniff","Vary":"Origin"};
const send=(code:number,data:unknown)=>new Response(JSON.stringify(data),{status:code,headers:H});
const hex=(a:Uint8Array)=>Array.from(a).map(x=>x.toString(16).padStart(2,"0")).join("");
async function hash(s:string){return hex(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))))}
async function db(path:string,method="GET",body?:unknown,merge=false):Promise<any[]>{
 const res=await fetch(ROOT+"/rest/v1/"+path,{method,headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json",Prefer:merge?"resolution=merge-duplicates,return=representation":"return=representation"},body:body===undefined?undefined:JSON.stringify(body)});
 if(!res.ok)throw Error("Database request "+res.status);
 return await res.json();
}
async function auth(req:Request){
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer "))throw Error("Unauthorized");
 const res=await fetch(ROOT+"/auth/v1/user",{headers:{apikey:ANON,Authorization:bearer}});
 if(!res.ok)throw Error("Unauthorized");
 const u=await res.json();
 if(!/^[a-f0-9-]{36}$/i.test(u?.id||"")||!u?.email_confirmed_at)throw Error("Unauthorized");
 const roles=await db("studio_memberships?select=role&user_id=eq."+u.id+"&active=eq.true&role=in.(owner,chief_editor,editor)&limit=1");
 if(!roles.length)throw Error("Forbidden");
 return u.id as string;
}
async function gate(id:string,req:Request){
 const tok=req.headers.get("x-darkfactory-session")||"";
 if(!/^[a-f0-9]{64}$/.test(tok))throw Error("Locked");
 const rows=await db("darkfactory_sessions?select=user_id,expires_at&token_hash=eq."+await hash(tok)+"&user_id=eq."+id+"&expires_at=gt."+encodeURIComponent(new Date().toISOString())+"&limit=1");
 if(!rows.length)throw Error("Locked");
}
const uuid=(v:unknown)=>typeof v==="string"&&/^[a-f0-9-]{36}$/i.test(v);
const formats=new Set(["card","photo_story","carousel","timeline","comparison","reel_story"]);
const themes=new Set(["black_press","acid_brutal"]);
const statuses=new Set(["review","approved","rejected","needs_changes"]);
const str=(v:unknown,max:number)=>typeof v==="string"?v.trim().slice(0,max):"";
const publicCaption=(v:unknown,max:number)=>str(v,max).split(/\r?\n/).filter(line=>!/(^\s*(?:🔎|📚)?\s*(?:источники|source links?|sources|references|bibliography)\s*:|https?:\/\/|www\.|(?:^|\s)doi:)/i.test(line)).join("\n").trim().slice(0,max);
const fail=(s:string)=>{throw Error(s)};
const clean=(v:any,edit=false)=>{
 const item:any={};
 if(!edit||"title"in v)item.title=str(v.title,180)||fail("Title required");
 if(!edit||"hook"in v)item.hook=str(v.hook,1200);
 if(!edit||"punch"in v)item.punch=str(v.punch,1600)||fail("Punch required");
 if(!edit||"body"in v)item.body=str(v.body,2200);
 if(!edit||"format_type"in v){if(!formats.has(v.format_type))fail("Invalid format");item.format_type=v.format_type}
 if(!edit||"theme_variant"in v){if(!themes.has(v.theme_variant))fail("Invalid theme");item.theme_variant=v.theme_variant}
 if(!edit||"topic"in v)item.topic=str(v.topic,80)||"life";
 if(!edit||"scene_variant"in v){const n=Number(v.scene_variant||0);if(!Number.isInteger(n)||n<0||n>99)fail("Invalid scene");item.scene_variant=n}
 if(!edit||"dialogue"in v){if(!Array.isArray(v.dialogue))fail("Invalid dialogue");item.dialogue=v.dialogue.slice(0,10).map((a:any)=>({speaker:str(a?.speaker,45),text:str(a?.text,400)}))}
 if(!edit||"caption_instagram"in v)item.caption_instagram=publicCaption(v.caption_instagram,2200);
 if(!edit||"caption_telegram"in v)item.caption_telegram=publicCaption(v.caption_telegram,3800);
 if(!edit||"caption_telegram_en"in v)item.caption_telegram_en=publicCaption(v.caption_telegram_en,3800);
 for(const f of ["caption_instagram_en","title_en","hook_en","body_en","visual_prompt_en"])if(!edit||f in v)item[f]=f==="caption_instagram_en"?publicCaption(v[f],2200):str(v[f],1700);
 if(!edit||"source_urls"in v)item.source_urls=Array.isArray(v.source_urls)?v.source_urls.filter((x:any)=>typeof x==="string"&&x.startsWith("https://")).slice(0,6):[];
 if(!edit||"evidence"in v)item.evidence=Array.isArray(v.evidence)?v.evidence.slice(0,6):[];
 if(!edit||"fact_verification"in v)item.fact_verification=["verified","source_checked","unverified","disputed"].includes(v.fact_verification)?v.fact_verification:"unverified";
 if(!edit||"visual_status"in v)item.visual_status=["pending","ready","failed"].includes(v.visual_status)?v.visual_status:"pending";
 if(!edit||"format_mode"in v)item.format_mode=v.format_mode==="manual"?"manual":"auto";
 if(!edit||"visual_prompt"in v)item.visual_prompt=str(v.visual_prompt,700);
 if(!edit||"art_variant"in v){const n=Number(v.art_variant||0);if(!Number.isInteger(n)||n<0||n>63)fail("Invalid art variant");item.art_variant=n}
 if(!edit||"editorial_score"in v)item.editorial_score=Math.min(100,Math.max(0,Math.round(Number(v.editorial_score)||0)));
 if(!edit||"creative_notes"in v)item.creative_notes=str(v.creative_notes,600);
 if(edit)for(const field of ["status_instagram","status_telegram","status_telegram_en"])if(field in v){if(!statuses.has(v[field]))fail("Invalid status");item[field]=v[field]}
 return item;
};

function autoFormat(v:any):string{
 const hook=String(v.hook||"").toLowerCase(),body=String(v.body||"").toLowerCase(),title=String(v.title||"").toLowerCase();
 const punch=String(v.punch||"").toLowerCase(),t=[title,hook,body,punch].join(" ");
 const dialogue=Array.isArray(v.dialogue)?v.dialogue.filter((s:any)=>s&&String(s.text||"").trim()):[];
 if(dialogue.length>=2 || (/^[—\-–]\s/.test(String(v.hook||""))&&/^[—\-–]\s/.test(String(v.punch||""))))return "chat";
 if(/(^|\s)(объявили|сообщили|новость|введён|открыли|запустили|постановили|запретили|газета|министерство|пресс-служба|скандал|официально)/.test(t) && !/скидк|распродаж/.test(title))return "dark_news";
 if(/(^|\s)(реклам|скидк|акци[яюи]|тариф|прайс|подписк|vip|спецпредложен|услуг|пакет\s|купите|закажите|в продаже|доставк|программа\s)/.test(hook+" "+title))return "fake_ad";
 if(body.length>95||(body.length>50&&(t.match(/[.!?…]/g)||[]).length>=4))return "carousel";
 if(body.length>38||[hook,body,punch].join("").length>215)return "animated_story";
 return "card";
}
const visualThemes:Record<string,string[]>={
 office:["noir CEO chair, cigar smoke, anonymous boardroom, red tie","late night corporate tower, lonely executive, ominous desks","corporate contract shredded, vintage luxury office"],
 romance:["cracked wedding cake and separate couple, red roses, art noir","red lipstick on cold contract, broken mirror, closeup","unhappy couple at a decadent wedding"],
 money:["bank vault bulging with banknotes, moral decay","banker under gold desk lamp and credit papers","casino chips on a torn family portrait"],
 bureaucracy:["towers of dossiers and exhausted clerks, vintage archive","rubber stamps and an endless corridor, corrupt administration"],
 social:["smartphone with unread texts in the rain, neon red","vain influencer alone in dark hotel room"],
 luxury:["arrogant guests at a champagne banquet, noir","luxury lobby and jaded skeletal concierge"],
 service:["dark hotel reception and red brass bell","noir call center, tired operator and headset"],
 psychology:["ornate therapist couch in dim vintage office","cracked golden mirror, red velvet curtain"],
 life:["social satire city at night","crowded elevator of deadpan people"]
};
function pickVisual(v:any,i:number){
 const a=visualThemes[v.topic]||visualThemes.life;
 return a[(i+String(v.title||"").length)%a.length];
}
function similarity(a:string,b:string){
 const tok=(s:string)=>new Set(s.toLowerCase().replace(/[^a-z0-9а-яё]+/gi," ").split(" ").filter(x=>x.length>3));
 const aa=tok(a),bb=tok(b);let n=0;for(const x of aa)if(bb.has(x))n++;return n/Math.max(1,Math.min(aa.size,bb.size));
}
async function aiJson(system:string,query:string,tokens=3400){
 const key=Deno.env.get("OPENAI_API_KEY")?.trim();if(!key)throw Error("AI_UNAVAILABLE");
 // Cost policy: use the selected GPT-6 text model and prohibit expensive fallback.
 const models=["gpt-6-luna"];
 let lastStatus=0;
 for(const model of models){
  const isReasoning=/^gpt-[56]/.test(model);
  const params:any={model,response_format:{type:"json_object"},
   messages:[{role:"system",content:system},{role:"user",content:query}]};
  if(isReasoning){params.reasoning_effort="none";params.max_completion_tokens=tokens}
  else{params.temperature=.92;params.max_tokens=tokens}
  const resp=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",
   headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
   body:JSON.stringify(params)});
  const data=await resp.json().catch(()=>({}));lastStatus=resp.status;
  if(!resp.ok){
   if((resp.status===400||resp.status===404||resp.status===403)&&model!==models[models.length-1])continue;
   throw Error("AI request failed: "+resp.status);
  }
  const raw=String(data?.choices?.[0]?.message?.content||"");
  if(!raw.trim())throw Error("AI returned empty text");
  try{return JSON.parse(raw)}catch{throw Error("AI JSON output invalid")}
 }
 throw Error("AI request failed: "+lastStatus);
}

const DARK_WRITER="You are the ruthless science fact editor of viral international entertainment magazine НЕТ! СЕРЬЁЗНО? / NO, SERIOUSLY? Main audience: everyday people who need instant genuine 'NO WAY, REALLY?!' moments. Focus on bizarre but TRUE concise stand-alone facts about animals, the human body, science, nature, space, psychology, everyday objects and counterintuitive physical laws. NO historical events, dates, war, battles, disasters, royal trivia, biographies, places with historical events, lists of ordinary curiosities. Every fact should produce an immediate surprising mental picture; prioritize 'a wombat makes cubes', 'humans emit invisible visible-spectrum light', 'a frog can survive winter with its heart stopped' over generic history. Avoid cliches and facts that need excessive qualifications. NEVER invent or exaggerate, no myths, no medical misinformation or false certainty. Provide two genuine independently verifiable HTTPS source URLs per fact in INTERNAL source_urls ONLY, from distinct trustworthy domains, and do not fabricate URLs. In caption_instagram (RU), caption_instagram_en (fluent creative English), caption_telegram (RU), caption_telegram_en (English for Telegram), body, body_en and hook fields DO NOT mention references, studies as lists, websites, URLs, sources, citations or bibliographies; NO links or source sections in any public-facing publication. Each publication needs a compelling short 'NO WAY' hook, a lively but accurate 140-180 word explanation per language, with scientifically precise nuances, a clear mental picture, and 2-4 short paragraphs, and a natural share/comment question; no generic filler. Write Russian creatively and idiomatically; independently adapt English. Detailed body/body_en should contain enough factual detail for 5-7 legible carousel slides, with short sentences and clean paragraph breaks. The closing sentence is a memorable accurate takeaway, not a repeat of the headline. No all-caps entire paragraphs. Make 10 diverse themes with card,photo_story,carousel,comparison,reel_story. Return JSON {items:[{title,title_en,hook,hook_en,body,body_en,punch,topic,format_type,source_urls,caption_instagram,caption_instagram_en,caption_telegram,caption_telegram_en,visual_prompt,visual_prompt_en,editorial_score}]} only.";
const DARK_CRITIC="You are a skeptical fact-checker for extraordinary natural and scientific claims. Only accept facts independently supported by the actual supplied excerpts from two different trustworthy domains. Check whether the assertion is surprising AND accurate without sensationalized claims. Differentiate evidence from conjecture, precise age estimates from known dates, analogy from literal fact. Reject any unsupported detail or claim, especially when only a similar story appears on a linked page. Return JSON {verified:boolean,reason:string}. JSON only.";
async function fetchExcerpt(url:string){
 try{
  const u=new URL(url);if(u.protocol!=="https:"||/^\d+\.\d+\.\d+\.\d+$/.test(u.hostname)||/localhost|\.local$/.test(u.hostname))return "";
  const c=new AbortController(),tm=setTimeout(()=>c.abort(),8000);
  try{const r=await fetch(url,{signal:c.signal,headers:{"Accept":"text/html,text/plain,application/json"}});
   if(!r.ok||!/text|json|html/.test(r.headers.get("content-type")||""))return "";
   return (await r.text()).slice(0,75000).replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]*>/g," ").replace(/\s+/g," ").slice(0,7000);
  }finally{clearTimeout(tm)}
 }catch{return ""}
}
async function factCheck(v:any){
 const links=(Array.isArray(v.source_urls)?v.source_urls:[]).filter((x:any)=>typeof x==="string"&&x.startsWith("https://")).slice(0,4);
 if(links.length<2)return {ok:false,reason:"At least two source links needed",evidence:[]};
 const ss=await Promise.all(links.map(async(url:string)=>({url,excerpt:await fetchExcerpt(url)})));
 const live=ss.filter(x=>x.excerpt.length>400);
 if(new Set(live.map(x=>new URL(x.url).hostname.replace(/^www\./,""))).size<2)return {ok:false,reason:"Two independent readable sources unavailable",evidence:ss.map(x=>({url:x.url,readable:x.excerpt.length>400}))};
 try{
  const judgment=await aiJson(DARK_CRITIC,"Claim "+JSON.stringify({title:v.title,hook:v.hook,body:v.body,punch:v.punch})+" and SOURCES "+JSON.stringify(live.slice(0,2)),1000);
  return {ok:judgment.verified===true,reason:String(judgment.reason||"").slice(0,250),evidence:live.map(x=>({url:x.url,readable:true,checked_at:new Date().toISOString()}))};
 }catch{return {ok:false,reason:"Fact-check model unavailable",evidence:[]}}
}
async function openaiBatch(){
 const histories=["immune system contains about 1.8 trillion cells weighing about 1.2 kg","human body emits ultraweak light invisible to eyes","intestinal lining is renewed every three to five days","human vision can detect single photons under laboratory conditions","Saturn average density is lower than water","Moon recedes Earth by 3.8 centimeters annually","Sun volume holds 1.3 million Earths","Jupiter has deep liquid hydrogen ocean","venus flytrap counts electrical impulses before closing and digestion","skunk cabbage flowers generate warmth and melt snow","wood frogs endure partial freezing and heartbeat interruption","archerfish distinguish human faces","water triple point with solid liquid gas simultaneously","ultrasonic standing waves levitate water droplets","some fungi build lightning-like electrical networks","snowflakes have complex air-driven shape variations","probability in one shuffled deck of cards is astronomically tiny","lunar regolith contains oxygen chemically bound to minerals","surface tension of water can float metal needles","birds use earth magnetic field to migrate","sea creatures use fluorescence to signal","gravity can bend starlight around galaxies","light takes eight minutes from Sun to Earth","a proton contains sea of quarks and gluons"]
 const offset=(new Date().getUTCDate()*3)%histories.length;
 const list=[...histories.slice(offset),...histories.slice(0,offset)];
 const recent=await db("darkfactory_items?select=title,hook&order=created_at.desc&limit=200");
 const avoid=recent.map((x:any)=>String(x.title||"")).filter(Boolean);
 const draft=await aiJson(DARK_WRITER,"Make TEN distinct, independently verifiable, truly astonishing facts with EXACT editorial category mix: 2 HUMAN BODY, 2 SPACE, 2 PHYSICS, 2 PLANTS, 1 ANIMALS, and 1 NUMBERS or EARTH. Prefer counterintuitive, spectacular but accurate findings, not vague trivia. Every fact must have a precise qualification and reputable real source; never invent citations or sensationalize interpretations. Rotate publication formats across card/photo_story/carousel/timeline/comparison/reel_story, and apply their format accent scheme: card coral #FF6659, carousel acid-yellow #D7FF38, photo_story cyan #38D5EC, comparison amber #FFBD45, timeline violet #B895F7, reel_story pink #F47DB9. Avoid exact repetition. Not historical events; use these leads only as inspiration: "+JSON.stringify(list)+"; AVOID previously used headlines/stories: "+JSON.stringify(avoid.slice(0,150))+". Do not fabricate sources or claim certainty without evidence; image prompts must explicitly specify AI editorial illustration, not documentary photography.",10000);
 if(!Array.isArray(draft.items))throw Error("No facts generated");
 const candidates=draft.items.slice(0,10).filter((v:any)=>!recent.some((x:any)=>String(x.title||"").toLowerCase()===String(v.title||"").toLowerCase()));
 const work=async(v:any,i:number)=>{
  v.format_type=["card","photo_story","carousel","timeline","comparison","reel_story"][i%6];
  v.format_mode="manual";v.theme_variant=i%2?"acid_brutal":"black_press";v.scene_variant=i;v.art_variant=i;v.dialogue=[];
  v.visual_prompt=String(v.visual_prompt||"")+"; AI-generated editorial illustration; no fake documentary photography";
  v.visual_status="pending";
  if(!v.caption_telegram_en)v.caption_telegram_en="🤯 <b>"+String(v.title_en||v.title)+"</b>\n\n"+String(v.body_en||"")+"\n\nShare this with a curious friend! 🤯";
  const checked=await factCheck(v);
  v.fact_verification=checked.ok?"verified":"unverified";v.evidence=checked.evidence;
  v.creative_notes="Fact verification: "+checked.reason;
  try{
   const row=clean(v);
   // Restore the full narrative in all four public posts. AI's brief caption
   // is a closing question, never a replacement for the verified story.
   const completeCopy=(lang:"ru"|"en",network:"instagram"|"telegram"):string=>{
    const en=lang==="en",title=String(en?row.title_en||row.title:row.title||"").trim();
    const hook=String(en?row.hook_en||row.hook:row.hook||"").trim();
    const body=String(en?row.body_en||row.body:row.body||"").trim();
    const short=String(en?(network==="instagram"?row.caption_instagram_en:row.caption_telegram_en):
      (network==="instagram"?row.caption_instagram:row.caption_telegram)||"").trim();
    const limit=network==="instagram"?2200:3800;
    if(body.length<200)throw Error("Missing full fact narrative for "+lang);
    if(short.includes(body)&&short.length<=limit)return short;
    const headline=network==="telegram"?"🤯 <b>"+title+"</b>":"🤯 "+title;
    let full=[headline,hook,body].filter(Boolean).join("\n\n");
    if(full.length>limit)full=[headline,body].join("\n\n");
    if(full.length>limit)throw Error("Verified narrative over "+network+" limit");
    if(short&&short.length<=300&&!full.includes(short)&&full.length+short.length+2<=limit)
      full+="\n\n"+short;
    return full;
   };
   row.caption_instagram=completeCopy("ru","instagram");
   row.caption_instagram_en=completeCopy("en","instagram");
   row.caption_telegram=completeCopy("ru","telegram");
   row.caption_telegram_en=completeCopy("en","telegram");
   return {...row,source:"fact_research_v1",status_instagram:"review",status_telegram:"review",status_telegram_en:"review",fact_verification:v.fact_verification,evidence:v.evidence,visual_status:"pending",creative_notes:v.creative_notes};
  }catch(e){console.warn("Fact discarded",String(e));return null}
 };
 const items:any[]=[];
 for(let i=0;i<candidates.length;i+=3){
  const results=await Promise.all(candidates.slice(i,i+3).map((v:any,j:number)=>work(v,i+j)));
  items.push(...results.filter(Boolean));
 }
 if(!items.length)throw Error("No structurally valid facts");
 return items;
}
// Storage is reached via the Supabase/Cloudflare gateway from the Edge Runtime.
// A transient 520 can occur between consecutive JPEG slide uploads, even for
// files well below the 8 MiB bucket limit. Retry the SAME immutable object path
// and verify existence after ambiguous outcomes; never create duplicate posts.
async function uploadPublicSocialAsset(storagePath:string,data:Uint8Array,type:string):Promise<void>{
 const objectUrl=ROOT+"/storage/v1/object/darkfactory-social/"+storagePath;
 const publicUrl=ROOT+"/storage/v1/object/public/darkfactory-social/"+storagePath;
 const transient=new Set([408,425,429,500,502,503,504,520,522,524]);
 const alreadySaved=async():Promise<boolean>=>{
  try{
   const head=await fetch(publicUrl,{method:"HEAD",cache:"no-store",
    headers:{apikey:KEY,Authorization:"Bearer "+KEY},
    signal:AbortSignal.timeout(6500)});
   const contentLength=Number(head.headers.get("content-length"));
   return head.ok&&contentLength===data.byteLength;
  }catch{return false}
 };
 let lastStatus=0;
 for(let attempt=1;attempt<=4;attempt++){
  let uploaded:Response|null=null;
  try{
   uploaded=await fetch(objectUrl,{method:"POST",
    headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":type,"x-upsert":"false"},
    body:data,signal:AbortSignal.timeout(16000)});
  }catch(err){
   console.warn("darkfactory_media: storage attempt network error",attempt,String(err).slice(0,130));
  }
  if(uploaded?.ok)return;
  lastStatus=uploaded?.status||0;
  // A gateway 520 can hide a completed write. Only consider it saved when
  // the immutable object is publicly retrievable with the expected byte size.
  if((!uploaded||transient.has(lastStatus)||lastStatus===409)&&await alreadySaved())return;
  if(uploaded&&!transient.has(lastStatus)){
   console.error("darkfactory_media: non-retryable storage status",lastStatus,storagePath);
   throw Error("Instagram/Telegram media storage error HTTP "+lastStatus+
    ". Проверьте доступность хранилища и повторите сохранение медиа.");
  }
  if(attempt<4){
   console.warn("darkfactory_media: transient storage failure",lastStatus,"attempt",attempt,storagePath);
   await new Promise(resolve=>setTimeout(resolve,450*Math.pow(2,attempt-1)+Math.floor(Math.random()*150)));
  }
 }
 throw Error("Временный сбой Supabase Storage"+
  (lastStatus?" (HTTP "+lastStatus+")":" (соединение)")+
  " после 4 попыток. Не отправлено в Buffer. Обновите страницу и повторите публикацию; предыдущие успешные публикации не дублируются.");
}

async function serviceRpc(name:string,payload:unknown):Promise<any>{
 const resp=await fetch(ROOT+"/rest/v1/rpc/"+name,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify(payload)});
 if(!resp.ok)throw Error("RPC "+name+" "+resp.status);
 return await resp.json();
}

type Lang = "ru"|"en";
function tgLocale(v:string):Lang|null{return v==="ru"||v==="en"?v:null}
async function requireTelegramAdmin(id:string){
 const roles=await db("studio_memberships?select=role&user_id=eq."+id+"&active=eq.true&role=in.(owner,chief_editor)&limit=1");
 if(!roles.length)throw Error("Forbidden");
}

function safeChatInput(v:any):string{
 const value=String(v||"").trim().replace(/^https?:\/\/t\.me\//i,"@").replace(/\/$/,"");
 if(/^@[a-zA-Z0-9_]{5,32}$/.test(value)||/^-100\d{5,20}$/.test(value))return value;
 throw Error("Укажите точный @username публичного Telegram-канала");
}
async function tgRequest(token:string,method:string,params:Record<string,unknown>){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),15000);
 try{
  const res=await fetch("https://api.telegram.org/bot"+token+"/"+method,{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify(params),signal:c.signal
  });
  const j=await res.json().catch(()=>({}));
  if(!res.ok||!j.ok)throw Error("Telegram "+method+": "+String(j.description||res.status).slice(0,190).replaceAll(token,"[secret]"));
  return j.result;
 }finally{clearTimeout(timer)}
}
async function tgToken(locale:Lang):Promise<string>{
 const v=await serviceRpc("darkfactory_telegram_secret_read",{p_locale:locale});
 if(typeof v!=="string"||!/^\d{6,15}:[a-zA-Z0-9_-]{30,}$/.test(v))throw Error("Telegram bot token not configured");
 return v;
}
async function tgValidate(token:string,rawChat:string){
 const me=await tgRequest(token,"getMe",{});if(!me?.is_bot||!me?.id)throw Error("Not a Telegram bot token");
 const chat=await tgRequest(token,"getChat",{chat_id:rawChat});
 if(chat?.type!=="channel")throw Error("Выбранный адрес не является Telegram-каналом");
 if(["pt_ryadom","pt_afisha","pt_ryadom_chat"].includes(String(chat.username||"").toLowerCase()))throw Error("Нельзя подключить канал Португалия рядом к другому проекту");
 const member=await tgRequest(token,"getChatMember",{chat_id:String(chat.id),user_id:me.id});
 if(member?.status!=="administrator"||member?.can_post_messages!==true)throw Error("Добавьте бота администратором канала с правом публикации сообщений");
 return {channel_id:String(chat.id),username:chat.username?"@"+chat.username:"",title:String(chat.title||""),
  bot_id:Number(me.id),bot_username:String(me.username||""),
  can_post_messages:true,checked_at:new Date().toISOString()};
}
function tgSafeCaption(raw:string,max=990){
 const text=String(raw||"").replace(/<[^>]+>/g,"").replace(/https?:\/\/[^\s]+/g,"").replace(/\r/g,"").trim();
 if(text.length<=max)return text;
 const start=text.slice(0,max-1);
 const stop=Math.max(start.lastIndexOf(". "),start.lastIndexOf("! "),start.lastIndexOf("? "),start.lastIndexOf("\n\n"));
 if(stop>max*0.62)return start.slice(0,stop+1).trim();
 return start.slice(0,start.lastIndexOf(" "))+ "…";
}
async function tgSendPhoto(token:string,channelId:string,filePath:string,caption:string){
 const path=filePath.replace(/^\/+/,"");
 if(!/^shocking-facts\/[a-f0-9-]{36}\/[a-zA-Z0-9._-]+\.(webp|png|jpg|jpeg)$/i.test(path))throw Error("Image path not in approved private storage");
 const img=await fetch(ROOT+"/storage/v1/object/studio-private/"+path,{
  headers:{apikey:KEY,Authorization:"Bearer "+KEY},signal:AbortSignal.timeout(12000)
 });
 if(!img.ok)throw Error("Private image unavailable");
 const bytes=await img.arrayBuffer();if(bytes.byteLength>9*1024*1024||bytes.byteLength<1000)throw Error("Invalid image size");
 const data=new FormData();data.append("chat_id",channelId);data.append("caption",caption);
 const ext=path.split(".").pop()?.toLowerCase()||"webp";
 const mime=ext==="png"?"image/png":ext==="jpg"||ext==="jpeg"?"image/jpeg":"image/webp";
 data.append("photo",new Blob([bytes],{type:mime}),"fact."+ext);
 const res=await fetch("https://api.telegram.org/bot"+token+"/sendPhoto",{
  method:"POST",body:data,signal:AbortSignal.timeout(35000)
 });
 const j=await res.json().catch(()=>({}));
 if(!res.ok||!j.ok)throw Error("Telegram sendPhoto: "+String(j.description||res.status).slice(0,180).replaceAll(token,"[secret]"));
 return j.result;
}


function localPostingParts(date:Date){
 const entries=new Intl.DateTimeFormat("en-GB",{
  timeZone:"Europe/Lisbon",year:"numeric",month:"2-digit",day:"2-digit",
  hour:"2-digit",minute:"2-digit",weekday:"short",hourCycle:"h23"
 }).formatToParts(date);
 const parts=Object.fromEntries(entries.map(p=>[p.type,p.value]));
 const week:any={Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6,Sun:7};
 return {date:parts.year+"-"+parts.month+"-"+parts.day,
  clock:parts.hour+":"+parts.minute,week:week[parts.weekday]||0};
}
function sanitizeTGFull(text:string):string{
 // Telegram uses plain text here so no markup or URLs accidentally enter public copy.
 return String(text||"").replace(/<\/?b>/gi,"").replace(/<[^>]*>/g,"")
  .replace(/https?:\/\/[^\s]+/gi,"").replace(/\r/g,"").trim();
}
// A single full-length Telegram message with a 1600x1600 headline cover linked above the article.
async function tgSquareAssetUrl(itemId:string,locale:string,sourcePath:string):Promise<string>{
 if(!uuid(itemId)||!["ru","en"].includes(locale))throw Error("Invalid Telegram cover request");
 const [asset]=await db("darkfactory_telegram_assets?select=*&item_id=eq."+itemId+"&locale=eq."+locale+"&limit=1");
 if(!asset)throw Error("Квадратная Telegram-обложка ещё не подготовлена. Откройте предпросмотр и сохраните её.");
 const [item]=await db("darkfactory_items?select=title,title_en,image_storage_path&id=eq."+itemId+"&limit=1");
 const title=String((locale==="ru"?item?.title:item?.title_en||item?.title)||"").trim();
 if(!item||asset.source_image_path!==sourcePath||asset.source_image_path!==item.image_storage_path||
    asset.title_snapshot!==title||asset.width!==1600||asset.height!==1600)
  throw Error("Квадратная Telegram-обложка устарела после изменения фото или заголовка. Подготовьте её заново.");
 const stored=String(asset.storage_path||"");
 if(!/^telegram-squares\/[a-f0-9-]{36}\/(ru|en)\/[a-f0-9-]{36}\.jpg$/i.test(stored))
  throw Error("Invalid archived Telegram image path");
 const url=ROOT+"/storage/v1/object/public/darkfactory-social/"+stored;
 const head=await fetch(url,{method:"HEAD",signal:AbortSignal.timeout(10000)}).catch(()=>null);
 if(!head?.ok)throw Error("Квадратное фото Telegram недоступно по публичной ссылке");
 return url;
}
async function tgPostOnePhotoFullText(token:string,chat:string,path:string,message:string,locale:string,itemId:string){
 const plain=sanitizeTGFull(message);
 if(plain.length<80||plain.length>4000)throw Error("Telegram text must have 80–4000 characters");
 const squareUrl=await tgSquareAssetUrl(itemId,locale,path);
 const posted=await tgRequest(token,"sendMessage",{
  chat_id:chat,text:plain,
  link_preview_options:{url:squareUrl,prefer_large_media:true,show_above_text:true,is_disabled:false}
 });
 if(!posted?.message_id)throw Error("Telegram did not confirm the single-message publication");
 return {message_id:posted.message_id,extra_message_id:null,preview_url:squareUrl};
}
// Confirmed deliveries from Telegram, Instagram and manual posts govern
// the spacing between different facts. The four versions of the same fact
// may share an identical timestamp.
async function latestOtherFactPublication(itemId:string):Promise<string|null>{
 const rows=await db("darkfactory_published_archive?select=published_at&item_id=neq."+itemId+
  "&order=published_at.desc&limit=1");
 return rows[0]?.published_at||null;
}
function latestPostTime(...times:(string|null|undefined)[]):string|null{
 const values=times.filter((t):t is string=>Boolean(t)&&Number.isFinite(Date.parse(t as string)));
 return values.length?values.reduce((a,b)=>Date.parse(a)>Date.parse(b)?a:b):null;
}
async function runScheduleTick(){
 const now=new Date();
 const schedules=await db("darkfactory_schedule_settings?select=*&enabled=eq.true&destination=in.(telegram_ru,telegram_en)");
 if(!schedules.length)return {checked:0,queued:0,sent:0,reason:"Telegram scheduling is disabled"};
 const config=new Map(schedules.map((v:any)=>[v.destination,v]));
 const due=await db("darkfactory_publish_queue?select=*&status=eq.scheduled&run_at=lte."+encodeURIComponent(now.toISOString())+
 "&destination=in.(telegram_ru,telegram_en)&order=run_at.asc&limit=12");
 const results:any[]=[];let sent=0;
 for(const job of due){
  // The due list is a snapshot. A previous iteration may have moved both
  // translations together; never send a job whose live slot is now in the future.
  const [live]=await db("darkfactory_publish_queue?select=status,run_at&id=eq."+job.id+"&limit=1");
  if(!live||live.status!=="scheduled"||Date.parse(live.run_at)>Date.now())continue;
  const pairDest=job.destination==="telegram_ru"?"telegram_en":"telegram_ru";
  const [pair]=await db("darkfactory_publish_queue?select=id,status,run_at&item_id=eq."+
   job.item_id+"&destination=eq."+pairDest+"&limit=1");
  if(!pair || ["blocked","unknown","cancelled","sending"].includes(pair.status)){
   const reason=!pair?"RU/EN companion is missing":
    "RU/EN companion needs review ("+pair.status+"); this fact is held, others continue";
   await db("darkfactory_publish_queue?id=eq."+job.id+"&status=eq.scheduled","PATCH",{
    status:"blocked",error:reason,updated_at:new Date().toISOString()
   });
   results.push({id:job.id,status:"blocked_pair",reason});continue;
  }
  if(pair.status==="scheduled" &&
     (Math.abs(Date.parse(pair.run_at)-Date.parse(live.run_at))>60000 || Date.parse(pair.run_at)>Date.now())){
   // One bad slot must not make RU and EN publish different facts at the same hour.
   // The database RPC now atomically moves the two queued Telegram translations.
   try{
    const after=new Date(Math.max(Date.now()+60000,Date.parse(pair.run_at),Date.parse(live.run_at))).toISOString();
    const moved=await serviceRpc("darkfactory_reschedule_job",{p_queue_id:job.id,p_after:after});
    results.push({id:job.id,status:"paired_rescheduled",run_at:moved.run_at});
   }catch(e){results.push({id:job.id,status:"held_for_pair",reason:String(e).slice(0,130)})}
   continue;
  }
  const cfg=config.get(job.destination);if(!cfg)continue;
  const locale=job.destination==="telegram_ru"?"ru":"en";
  const [channel]=await db("darkfactory_telegram_channels?select=*&locale=eq."+locale+"&enabled=eq.true&limit=1");
  if(!channel){results.push({id:job.id,status:"paused",reason:"channel disconnected"});continue}
  const parts=localPostingParts(new Date()),day=parts.date;
  const weekdayAllowed=Array.isArray(cfg.allowed_weekdays)&&cfg.allowed_weekdays.includes(parts.week);
  const excluded=Array.isArray(cfg.excluded_dates)&&cfg.excluded_dates.includes(day);
  const timeAllowed=parts.clock>="08:00"&&parts.clock<="23:59"&&
   parts.clock>=String(cfg.active_start).slice(0,5)&&parts.clock<=String(cfg.active_end).slice(0,5);
  const recent=await db("darkfactory_publish_queue?select=sent_at,run_at,status&destination=eq."+job.destination+
   "&status=eq.sent&order=sent_at.desc&limit=150");
  const todaySent=recent.filter((p:any)=>p.sent_at&&localPostingParts(new Date(p.sent_at)).date===day).length;
  const last=latestPostTime(recent.find((p:any)=>p.sent_at)?.sent_at,
   await latestOtherFactPublication(String(job.item_id)));
  const enoughGap=!last||Date.now()-new Date(last).getTime()>=Number(cfg.min_gap_minutes)*60000;
  if(!weekdayAllowed||excluded||!timeAllowed||todaySent>=Number(cfg.max_per_day)||!enoughGap){
   try{
    const moved=await serviceRpc("darkfactory_reschedule_job",{p_queue_id:job.id,p_after:new Date(Math.max(
     Date.now(),last?new Date(last).getTime()+Number(cfg.min_gap_minutes)*60000:Date.now()
    )).toISOString()});
    results.push({id:job.id,status:"rescheduled",run_at:moved.run_at});
   }catch(e){results.push({id:job.id,status:"hold",reason:String(e).slice(0,120)})}
   continue;
  }
  const [item]=await db("darkfactory_items?select=id,fact_verification,editorial_deferred,visual_status,status_telegram,status_telegram_en,image_storage_path&id=eq."+job.item_id+"&limit=1");
  if(!item||item.editorial_deferred||item.fact_verification!=="verified"||item.visual_status!=="ready"||
   (locale==="ru"?item.status_telegram:item.status_telegram_en)!=="approved"||!job.media_path){
    await db("darkfactory_publish_queue?id=eq."+job.id+"&status=eq.scheduled","PATCH",{
     status:"cancelled",error:"Fact, approval or immutable media is no longer valid",updated_at:new Date().toISOString()
    });
    results.push({id:job.id,status:"cancelled"});continue;
  }
  // Preflight BOTH language covers before sending the first message in a pair.
  // A missing or stale asset blocks just this fact, never unrelated queue rows.
  try{
   if(pair.status==="scheduled"){
    await Promise.all(["ru","en"].map((l)=>
     tgSquareAssetUrl(String(job.item_id),l,String(job.media_path))));
   }else{
    await tgSquareAssetUrl(String(job.item_id),locale,String(job.media_path));
   }
  }catch(err){
   const reason=String(err instanceof Error?err.message:err).slice(0,250);
   await db("darkfactory_publish_queue?item_id=eq."+job.item_id+
    "&destination=in.(telegram_ru,telegram_en)&status=eq.scheduled","PATCH",{
     status:"blocked",error:"Pair preflight: "+reason,updated_at:new Date().toISOString()
    });
   results.push({id:job.id,status:"blocked_pair_media",reason});continue;
  }
   const claimed=await db("darkfactory_publish_queue?id=eq."+job.id+"&status=eq.scheduled","PATCH",{
   status:"sending",attempts:Number(job.attempts||0)+1,locked_at:new Date().toISOString(),updated_at:new Date().toISOString()
  });
  if(!claimed.length)continue;
  try{
   const token=await tgToken(locale as Lang);
   const checked=await tgValidate(token,String(channel.channel_id));
   if(checked.channel_id!==String(channel.channel_id))throw Error("Channel mismatch");
   const out=await tgPostOnePhotoFullText(token,String(channel.channel_id),String(job.media_path),String(job.snapshot_text),locale,String(job.item_id));
   const sentAt=new Date().toISOString();
   await db("darkfactory_publish_queue?id=eq."+job.id,"PATCH",{
    status:"sent",message_id:out.message_id,extra_message_id:out.extra_message_id,
    sent_at:sentAt,updated_at:sentAt,error:null
   });
   results.push({id:job.id,status:"sent",message_id:out.message_id});sent++;
  }catch(e){
   // Unknown outcome can mean Telegram accepted the photo but not the text.
   // Never retry automatically; editor must reconcile channel manually.
   const reason=String(e instanceof Error?e.message:e).slice(0,300);
   await db("darkfactory_publish_queue?id=eq."+job.id,"PATCH",{
    status:"unknown",error:reason,updated_at:new Date().toISOString()
   }).catch(()=>{});
   results.push({id:job.id,status:"unknown",reason});
  }
 }
 return {checked:due.length,sent,results};
}


async function bufferRequest(query:string,variables:Record<string,unknown>={},secretOverride?:string){
 const key=secretOverride||await serviceRpc("darkfactory_buffer_key_read",{});
 if(!key)throw Error("Buffer API key is not configured");
 const res=await fetch("https://api.buffer.com",{method:"POST",
  headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},
  body:JSON.stringify({query,variables}),signal:AbortSignal.timeout(23000)});
 const payload=await res.json().catch(()=>({}));
 if(!res.ok||Array.isArray(payload.errors)&&payload.errors.length){
  throw Error("Buffer API: "+String(payload.errors?.[0]?.message||"HTTP "+res.status).slice(0,200));
 }
 return payload.data||{};
}
async function bufferDiscover(secretOverride?:string){
 const account=await bufferRequest("query GetOrganizations { account { organizations { id } } }",{},secretOverride);
 const organizations=account.account?.organizations||[];
 const channels:any[]=[];
 for(const org of organizations.slice(0,20)){
  const result=await bufferRequest(
   "query GetChannels($input:ChannelsInput!){ channels(input:$input){id name displayName service isQueuePaused isDisconnected isLocked} }",
   {input:{organizationId:org.id}},secretOverride);
  for(const c of result.channels||[]){
   if(String(c.service).toLowerCase()==="instagram")channels.push({
    id:c.id,name:c.name,display_name:c.displayName,
    organization_id:org.id,service:c.service,queue_paused:c.isQueuePaused===true,disconnected:c.isDisconnected===true,locked:c.isLocked===true
   });
  }
 }
 return channels;
}
async function bufferPreparePost(itemId:string,locale:"ru"|"en",mode:"shareNow"|"customScheduled",actor:string,fromWorker=false){
 const destination="instagram_"+locale;
 const [channel]=await db("darkfactory_buffer_channels?select=*&destination=eq."+destination+"&enabled=eq.true&limit=1");
 if(!channel)throw Error("Instagram "+locale.toUpperCase()+" not connected to Buffer");
 const [fact]=await db("darkfactory_items?select=*&id=eq."+itemId+"&limit=1");
 if(!fact)throw Error("Fact not found");
 if(fact.editorial_deferred||fact.fact_verification!=="verified"||fact.status_instagram!=="approved"||
  fact.visual_status!=="ready"||(fact.source_urls||[]).length<2)
  throw Error("Fact, media or Instagram approval is incomplete");
 if(fact.format_type==="reel_story")throw Error("Reels publication requires an actual video; only a cover preview exists");
 const text=String(locale==="ru"?fact.caption_instagram:fact.caption_instagram_en||"").trim();
 if(text.length<80||text.length>2200)throw Error("Instagram caption must be 80–2200 chars");
 const assets=await db("darkfactory_instagram_assets?select=slide_number,image_url&item_id=eq."+itemId+
  "&locale=eq."+locale+"&order=slide_number.asc");
 if(!assets.length)throw Error("First prepare Instagram visuals from the preview");
 if(assets.length>10||assets.some((a:any,i:number)=>a.slide_number!==i+1))
  throw Error("Instagram assets must be a consecutive carousel of up to 10 slides");
 const prior=await db("darkfactory_buffer_posts?select=*&item_id=eq."+itemId+"&destination=eq."+destination+"&limit=1");
 if(prior.length)throw Error("Instagram post has already been submitted or its delivery requires checking");
 const active=await db("darkfactory_publish_queue?select=*&item_id=eq."+itemId+
  "&destination=eq."+destination+"&status=in.(scheduled,blocked)&order=run_at.asc&limit=1");
 const finished=await db("darkfactory_publish_queue?select=id&item_id=eq."+itemId+
  "&destination=eq."+destination+"&status=in.(sent,submitted,unknown,sending)&limit=1");
 if(finished.length&&!fromWorker)throw Error("This Instagram fact is already published or its delivery is unresolved");
 let due_at:string|null=null;
 if(mode==="customScheduled"){
  const job=active[0];
  if(!job||!["scheduled","blocked"].includes(job.status))throw Error("No approved scheduled slot");
  due_at=String(job.run_at);
  if(new Date(due_at).getTime()<Date.now()+120000)throw Error("Scheduled time must be at least 2 minutes in the future");
 }
 // Unique claim is stored before network access; a network failure leaves unknown,
 // never auto-retries a possibly accepted post.
 const claimed=await db("darkfactory_buffer_posts","POST",{
  item_id:itemId,destination,status:"creating",mode,due_at,created_by:actor
 });
 if(!claimed.length)throw Error("Could not reserve Buffer publication");
 try{
  const data=await bufferRequest(
   "mutation CreatePost($input:CreatePostInput!){ createPost(input:$input){... on PostActionSuccess{post{id status dueAt}} ... on MutationError{message}} }",
   {input:{
    text,channelId:channel.channel_id,schedulingType:"automatic",mode,needsApproval:false,
    ...(due_at?{dueAt:due_at}:{}),
    aiAssisted:true,metadata:{instagram:{type:"post",shouldShareToFeed:true,isAiGenerated:true}},
    assets:assets.map((a:any)=>({image:{url:a.image_url}}))
   }});
  const output=data.createPost;
  if(!output?.post?.id)throw Error("Buffer did not confirm post: "+String(output?.message||"Unknown response"));
  await db("darkfactory_buffer_posts?id=eq."+claimed[0].id,"PATCH",{
   status:"submitted",buffer_post_id:output.post.id,
   due_at:output.post.dueAt||due_at,updated_at:new Date().toISOString(),error:null
  });
  // Mark only this fact's own queue entry. Other items and future times are untouched.
  if(mode==="shareNow"&&!fromWorker)await db("darkfactory_publish_queue?destination=eq."+destination+
   "&item_id=eq."+itemId+"&status=in.(scheduled,blocked)","PATCH",{
    status:"cancelled",error:"Sent immediately through Buffer; other queue slots unchanged",updated_at:new Date().toISOString()
   });
  else await db("darkfactory_publish_queue?destination=eq."+destination+
   "&item_id=eq."+itemId+"&status=in.(scheduled,blocked)","PATCH",{
    status:"submitted",buffer_post_id:output.post.id,sent_at:null,updated_at:new Date().toISOString(),
    error:null
   });
  return {buffer_post_id:output.post.id,buffer_status:output.post.status,
   scheduled_for:output.post.dueAt||due_at,mode,submitted:true};
 }catch(e){
  const detail=String(e instanceof Error?e.message:e).slice(0,360);
  await db("darkfactory_buffer_posts?id=eq."+claimed[0].id,"PATCH",{status:"unknown",error:detail,updated_at:new Date().toISOString()}).catch(()=>{});
  throw Error("Buffer delivery uncertain; no retry: "+detail);
 }
}



async function reconcileBufferDeliveryStatus(){
 const keyConfigured=await serviceRpc("darkfactory_buffer_key_read",{});
 if(!keyConfigured)return {checked:0,status:"not_connected"};
 // Recheck uncertain Buffer deliveries read-only: Instagram may have actually
 // published despite Buffer reporting an error. Never re-create the post.
 const records=await db("darkfactory_buffer_posts?select=id,item_id,destination,buffer_post_id,status,mode,due_at,last_checked_at"+
  "&status=in.(submitted,unknown,failed)&order=created_at.asc&limit=80");
 const now=Date.now(),pending=records.filter((p:any)=>{
  if(!p.buffer_post_id)return false;
  if(p.last_checked_at&&now-Date.parse(p.last_checked_at)<(["unknown","failed"].includes(p.status)?6*3600000:15*60000))return false;
  // Do not repeatedly query far-future scheduled posts.
  if(p.mode==="customScheduled"&&p.due_at&&Date.parse(p.due_at)>now+6*3600000)return false;
  return true;
 }).slice(0,8);
 let published=0,failed=0;const outcomes:any[]=[];
 for(const rec of pending){
  try{
   const result=await bufferRequest(
    "query GetPost($input:PostInput!){post(input:$input){id status sentAt dueAt externalLink error{message rawError supportUrl}}}",
    {input:{id:rec.buffer_post_id}});
   const post=result.post;
   if(!post||post.id!==rec.buffer_post_id)throw Error("Buffer did not return the expected post");
   const update:any={last_checked_at:new Date().toISOString(),updated_at:new Date().toISOString()};
   if(post.status==="sent"){
    update.status="published";
    update.published_at=post.sentAt||new Date().toISOString();
    update.public_url=post.externalLink||null;
   }else if(post.status==="error"){
    // Buffer may report an error even after Instagram made the post public.
    // Preserve the Buffer ID and stop automatic retries until Instagram is checked.
    update.status="unknown";
    const errorDetails=String(post.error?.message||post.error?.rawError||"delivery uncertain").replace(/[\r\n]/g," ").slice(0,230);
    update.error="Buffer: "+errorDetails+"; verify Instagram before retrying";
   }
   if(post.dueAt&&post.status==="scheduled")update.due_at=post.dueAt;
   await db("darkfactory_buffer_posts?id=eq."+rec.id,"PATCH",update);
   if(post.status==="sent"){
    await db("darkfactory_publish_queue?item_id=eq."+rec.item_id+
     "&destination=eq."+rec.destination+"&status=in.(submitted,unknown,blocked)","PATCH",{
       status:"sent",sent_at:update.published_at,updated_at:new Date().toISOString()
     });
    published++;
   }else if(post.status==="error"){
    await db("darkfactory_publish_queue?item_id=eq."+rec.item_id+
     "&destination=eq."+rec.destination+"&status=in.(submitted,unknown,blocked)","PATCH",{
       status:"unknown",error:update.error+"; the post may already be live.",
       updated_at:new Date().toISOString()
     });
    failed++;
   }
   outcomes.push({destination:rec.destination,status:post.status});
  }catch(e){
   await db("darkfactory_buffer_posts?id=eq."+rec.id,"PATCH",{last_checked_at:new Date().toISOString()}).catch(()=>{});
   outcomes.push({destination:rec.destination,status:"check_failed",reason:String(e instanceof Error?e.message:e).slice(0,100)});
  }
 }
 return {checked:pending.length,published,failed,outcomes};
}

async function runInstagramScheduleTick(){
 const conf=await db("darkfactory_schedule_settings?select=*&enabled=eq.true&destination=in.(instagram_ru,instagram_en)");
 if(!conf.length)return {checked:0,submitted:0,status:"off"};
 const byDest=new Map(conf.map((x:any)=>[x.destination,x]));
 const due=await db("darkfactory_publish_queue?select=*&status=eq.scheduled&destination=in.(instagram_ru,instagram_en)&run_at=lte."+
  encodeURIComponent(new Date().toISOString())+"&order=run_at.asc&limit=8");
 const outcomes:any[]=[];let submitted=0;const seen=new Set();
 for(const job of due){
  const cfg:any=byDest.get(job.destination);if(!cfg||seen.has(job.destination))continue;
  seen.add(job.destination);
  const locale=job.destination.slice(-2) as "ru"|"en";
  const now=new Date(),p=localPostingParts(now);
  const allowed=cfg.allowed_weekdays?.includes(p.week)&&!cfg.excluded_dates?.includes(p.date)&&
   p.clock>="08:00"&&p.clock<="23:59"&&p.clock>=String(cfg.active_start).slice(0,5)&&p.clock<=String(cfg.active_end).slice(0,5);
  const older=await db("darkfactory_publish_queue?select=run_at,sent_at,status&destination=eq."+job.destination+
   "&status=in.(sent,submitted)&order=run_at.desc&limit=160");
  const processedToday=older.filter((x:any)=>localPostingParts(new Date(x.run_at)).date===p.date).length;
  const latest=latestPostTime(older[0]?.sent_at||older[0]?.run_at||null,
   await latestOtherFactPublication(String(job.item_id)));
  const gapEnough=!latest||Date.now()-new Date(latest).getTime()>=Number(cfg.min_gap_minutes)*60000;
  if(!allowed||processedToday>=Number(cfg.max_per_day)||!gapEnough){
   try{
    const after=latest?new Date(Math.max(Date.now(),new Date(latest).getTime()+
     Number(cfg.min_gap_minutes)*60000)):now;
    const moved=await serviceRpc("darkfactory_reschedule_job",{p_queue_id:job.id,p_after:after.toISOString()});
    outcomes.push({id:job.id,status:"rescheduled",run_at:moved.run_at});
   }catch(e){outcomes.push({id:job.id,status:"held",reason:String(e).slice(0,100)})}
   continue;
  }
  const [channel]=await db("darkfactory_buffer_channels?select=channel_id&destination=eq."+job.destination+"&enabled=eq.true&limit=1");
  if(!channel){outcomes.push({id:job.id,status:"paused",reason:"Buffer channel disconnected"});continue}
  const [fact]=await db("darkfactory_items?select=fact_verification,editorial_deferred,status_instagram,visual_status&limit=1&id=eq."+job.item_id);
  const media=await db("darkfactory_instagram_assets?select=id&item_id=eq."+job.item_id+"&locale=eq."+locale+"&limit=1");
  if(!fact||fact.editorial_deferred||fact.fact_verification!=="verified"||fact.status_instagram!=="approved"||fact.visual_status!=="ready"||!media.length){
   await db("darkfactory_publish_queue?id=eq."+job.id+"&status=eq.scheduled","PATCH",{
    status:"blocked",error:"Instagram slide(s) or approval missing",updated_at:new Date().toISOString()
   });outcomes.push({id:job.id,status:"blocked"});continue;
  }
  const [claimed]=await db("darkfactory_publish_queue?id=eq."+job.id+"&status=eq.scheduled","PATCH",{
   status:"sending",locked_at:new Date().toISOString(),updated_at:new Date().toISOString()
  });
  if(!claimed)continue;
  try{
   const result=await bufferPreparePost(job.item_id,locale,"shareNow","00000000-0000-0000-0000-000000000000",true);
   await db("darkfactory_publish_queue?id=eq."+job.id,"PATCH",{
    status:"submitted",buffer_post_id:result.buffer_post_id,
    error:null,updated_at:new Date().toISOString()
   });
   submitted++;outcomes.push({id:job.id,status:"submitted",buffer_post_id:result.buffer_post_id});
  }catch(e){
   const err=String(e instanceof Error?e.message:e).slice(0,300);
   await db("darkfactory_publish_queue?id=eq."+job.id,"PATCH",{
    status:"blocked",error:err,updated_at:new Date().toISOString()
   }).catch(()=>{});
   outcomes.push({id:job.id,status:"blocked",reason:err});
  }
 }
 return {checked:due.length,submitted,outcomes};
}

Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:H,status:204});
 try{


 if(req.method==="POST"&&new URL(req.url).pathname.endsWith("/darkfactory/cron-publish")){
  const token=req.headers.get("x-darkfactory-cron")||"";
  if(!/^[a-f0-9]{64}$/.test(token)||await serviceRpc("darkfactory_check_cron",{candidate:token})!==true)
    return send(403,{error:"Forbidden"});
  const telegram=await runScheduleTick();const instagram=await runInstagramScheduleTick();const bufferStatus=await reconcileBufferDeliveryStatus();return send(200,{telegram,instagram,bufferStatus,at:new Date().toISOString()});
 }
 if(req.method==="POST"&&new URL(req.url).pathname.endsWith("/darkfactory/cron-generate")){
  const token=req.headers.get("x-darkfactory-cron")||"";
  if(!/^[a-f0-9]{64}$/.test(token))return send(403,{error:"Forbidden"});
  const valid=await serviceRpc("darkfactory_check_cron",{candidate:token});
  if(valid!==true)return send(403,{error:"Forbidden"});
  const claimed=await serviceRpc("darkfactory_claim_daily",{});
  if(claimed!==true)return send(200,{status:"skipped",reason:"queue cap or already ran"});
  try{
   const settings=await db("darkfactory_settings?select=daily_limit&limit=1");
   const limit=Math.min(10,Number(settings[0]?.daily_limit||10));
   const jokes=(await openaiBatch()).slice(0,limit);
   const inserted=await db("darkfactory_items","POST",jokes);
   await db("darkfactory_cron_log","POST",{status:"ok",generated:inserted.length});
   return send(200,{status:"ok",generated:inserted.length});
  }catch(e){
   const msg=String(e?.message||e).slice(0,280);
   await db("darkfactory_cron_log","POST",{status:"error",generated:0,reason:msg});
   throw e;
  }
 }
 const id=await auth(req);
 const pathname=new URL(req.url).pathname; const pos=pathname.indexOf("/darkfactory");
 const path=pos>=0?(pathname.slice(pos+"/darkfactory".length)||"/"):pathname;
 if(path==="/health"&&req.method==="GET")return send(200,{ok:true,ai_enabled:Boolean(Deno.env.get("OPENAI_API_KEY"))});
 if(path==="/unlock"&&req.method==="POST"){
  const a=await db("darkfactory_attempts?select=failures,locked_until&user_id=eq."+id+"&limit=1");
  if(a[0]?.locked_until&&Date.parse(a[0].locked_until)>Date.now())return send(429,{error:"Слишком много попыток. Повторите позднее."});
  const payload=await req.json().catch(()=>({}));
  if(typeof payload.pin!=="string"||!/^[0-9]{4,12}$/.test(payload.pin))return send(400,{error:"Введите PIN"});
  const result=await fetch(ROOT+"/rest/v1/rpc/darkfactory_check_pin",{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify({candidate:payload.pin})});
  if(!result.ok)throw Error("Gate unavailable");
  const good=await result.json();
  if(good!==true){
   const count=(a[0]?.failures||0)+1;
   await db("darkfactory_attempts?on_conflict=user_id","POST",{user_id:id,failures:count,locked_until:count>=5?new Date(Date.now()+15*60*1000).toISOString():null,updated_at:new Date().toISOString()},true);
   return send(count>=5?429:403,{error:count>=5?"Доступ временно заблокирован":"Неверный PIN"});
  }
  await db("darkfactory_attempts?on_conflict=user_id","POST",{user_id:id,failures:0,locked_until:null,updated_at:new Date().toISOString()},true);
  const token=hex(crypto.getRandomValues(new Uint8Array(32)));
  const expires=new Date(Date.now()+2*60*60*1000).toISOString();
  await db("darkfactory_sessions","POST",{user_id:id,token_hash:await hash(token),expires_at:expires});
  return send(200,{token,expires_at:expires});
 }
 await gate(id,req);
 // Confirmed posts only: submitted Buffer work or unknown delivery is not published.
 if(path==="/published"&&req.method==="GET"){
  const entries=await db("darkfactory_published_archive?select=*&order=published_at.desc&limit=1000");
  return send(200,{entries,count:entries.length,timezone:"Europe/Lisbon"});
 }
 if(path==="/settings"&&req.method==="GET"){
  const [config]=await db("darkfactory_settings?select=auto_enabled,daily_limit,pending_limit,last_run_on&limit=1");
  return send(200,{settings:config||{},ai_enabled:Boolean(Deno.env.get("OPENAI_API_KEY"))});
 }
 if(path==="/settings"&&req.method==="PATCH"){
  const input=await req.json().catch(()=>({}));
  if(typeof input.auto_enabled!=="boolean")return send(400,{error:"Invalid auto_enabled"});
  const [config]=await db("darkfactory_settings?id=eq.true","PATCH",{auto_enabled:input.auto_enabled,updated_at:new Date().toISOString()});
  return send(200,{settings:config});
 }

 if(path==="/telegram/channels"&&req.method==="GET"){
  const channels=await db("darkfactory_telegram_channels?select=locale,channel_id,username,title,bot_username,enabled,checked_at&order=locale");
  return send(200,{channels:channels.map((x:any)=>({...x,configured:Boolean(x.channel_id&&x.enabled)}))});
 }
 const tgRoute=path.match(/^\/telegram\/channels\/(ru|en)\/(connect|verify|test|disconnect)$/);
 if(tgRoute&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const locale=tgRoute[1] as Lang,action=tgRoute[2];
  const existing=await db("darkfactory_telegram_channels?select=*&locale=eq."+locale+"&limit=1");
  if(action==="disconnect"){
   // Keep encrypted credentials in Vault, but immediately disable all posting.
   await db("darkfactory_telegram_channels?locale=eq."+locale,"PATCH",{enabled:false,updated_at:new Date().toISOString()});
   return send(200,{enabled:false});
  }
  if(action==="connect"){
   const body=await req.json().catch(()=>({}));
   const botToken=String(body.token||"").trim();
   if(!/^\d{6,15}:[a-zA-Z0-9_-]{30,}$/.test(botToken))return send(400,{error:"Нужен токен бота из @BotFather"});
   const checked=await tgValidate(botToken,safeChatInput(body.chat_id));
   const others=await db("darkfactory_telegram_channels?select=channel_id&locale=neq."+locale+"&enabled=eq.true");
   if(others.some((x:any)=>x.channel_id===checked.channel_id))return send(409,{error:"Русский и английский языки не могут публиковаться в один и тот же канал"});
   await serviceRpc("darkfactory_telegram_secret_write",{p_locale:locale,p_token:botToken});
   const rows=await db("darkfactory_telegram_channels?on_conflict=locale","POST",
    {locale,...checked,secret_name:"darkfactory_telegram_"+locale+"_token",enabled:true,updated_at:new Date().toISOString()},true);
   return send(200,{channel:rows[0],connected:true});
  }
  if(!existing[0]?.enabled)return send(409,{error:"Сначала подключите Telegram-канал"});
  const token=await tgToken(locale);
  const checked=await tgValidate(token,String(existing[0].channel_id));
  if(checked.channel_id!==existing[0].channel_id)return send(409,{error:"Channel ID mismatch"});
  if(action==="verify"){
   const rows=await db("darkfactory_telegram_channels?locale=eq."+locale,"PATCH",{checked_at:new Date().toISOString(),title:checked.title,bot_username:checked.bot_username});
   return send(200,{verified:true,channel:rows[0]});
  }
  if(action==="test"){
   const testMessage=locale==="ru"?"✅ Тест API Journal Studio · НЕТ! СЕРЬЁЗНО?!\n\nПодключение проверено. Автопубликация пока отключена.":
    "✅ Journal Studio API test · NO, SERIOUSLY?!\n\nConnection verified. Automatic publishing is not enabled yet.";
   const out=await tgRequest(token,"sendMessage",{chat_id:checked.channel_id,text:testMessage,disable_notification:true});
   return send(200,{sent:true,message_id:out.message_id,channel_title:checked.title});
  }
 }

 // Editorial calendar mirrors Portugal Nearby's approve -> schedule -> release workflow.
 if(path==="/schedule"&&req.method==="GET"){
  const settings=await db("darkfactory_schedule_settings?select=*&order=destination");
  const queue=await db("darkfactory_publish_queue?select=*&order=run_at.asc&limit=300");
  const instant_deliveries=await db("darkfactory_instant_deliveries?select=item_id,destination,status,sent_at,message_id,started_at&order=started_at.desc&limit=200");
  return send(200,{settings,queue,instant_deliveries,timezone:"Europe/Lisbon",quiet_hours:{start:"00:00",end:"08:00"},
    instagram_notice:"Instagram posting requires separate approved account integrations; queue is preview-only."});
 }
 const settingPath=path.match(/^\/schedule\/settings\/(telegram_ru|telegram_en|instagram_ru|instagram_en)$/);
 if(settingPath&&req.method==="PATCH"){
  await requireTelegramAdmin(id);
  const destination=settingPath[1],body=await req.json().catch(()=>({}));
  const [previous]=await db("darkfactory_schedule_settings?select=enabled,active_start,active_end&destination=eq."+destination+"&limit=1");
  if(!previous)return send(404,{error:"Настройки канала не найдены. Обновите журнал."});
  const wasEnabled=previous.enabled===true;
  const patch:any={updated_at:new Date().toISOString()};
  if(typeof body.enabled==="boolean"){
  
   if(body.enabled&&!wasEnabled&&destination.startsWith("instagram_")){
    const match=await db("darkfactory_buffer_channels?select=channel_id&destination=eq."+destination+"&enabled=eq.true&limit=1");
    if(!match.length)return send(409,{error:"Сначала привяжите отдельный Instagram к Buffer API"});
    const key=await serviceRpc("darkfactory_buffer_key_read",{});
    if(!key)return send(409,{error:"Buffer API key is not configured"});
   }
   if(body.enabled&&!wasEnabled&&destination.startsWith("telegram_")){
    const locale=destination.slice(-2);
    const connected=await db("darkfactory_telegram_channels?select=channel_id&enabled=eq.true&locale=eq."+locale+"&limit=1");
    if(!connected.length)return send(409,{error:"Telegram channel is not connected"});
   }
   patch.enabled=body.enabled;
  }
  if("min_gap_minutes"in body){
   if(!Number.isInteger(body.min_gap_minutes)||body.min_gap_minutes<60||body.min_gap_minutes>1440)return send(400,{error:"Minimum gap must be at least 60 minutes"});
   patch.min_gap_minutes=body.min_gap_minutes;
  }
  if("max_per_day"in body){
   if(!Number.isInteger(body.max_per_day)||body.max_per_day<1||body.max_per_day>16)return send(400,{error:"Daily limit 1–16"});
   patch.max_per_day=body.max_per_day;
  }
  if("active_start"in body){
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.active_start)||body.active_start<"08:00")return send(400,{error:"Posting cannot start before 08:00 Europe/Lisbon"});
   patch.active_start=body.active_start;
  }
  if("active_end"in body){
   if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(body.active_end)||body.active_end>"23:59")return send(400,{error:"Posting must end before midnight"});
   patch.active_end=body.active_end;
  }
  if("allowed_weekdays"in body){
   const days=body.allowed_weekdays;
   if(!Array.isArray(days)||days.length<1||days.length>7||days.some((n:any)=>!Number.isInteger(n)||n<1||n>7)||new Set(days).size!==days.length)return send(400,{error:"Invalid weekdays"});
   patch.allowed_weekdays=days;
  }
  if("excluded_dates"in body){
   const dates=body.excluded_dates;
   if(!Array.isArray(dates)||dates.length>150||dates.some((x:any)=>typeof x!=="string"||!/^20\d\d-\d\d-\d\d$/.test(x)))return send(400,{error:"Invalid excluded dates"});
   patch.excluded_dates=dates;
  }
  if(typeof body.auto_queue==="boolean")patch.auto_queue=body.auto_queue;
  const timeStart=String(patch.active_start||previous.active_start||"08:00").slice(0,5);
  const timeEnd=String(patch.active_end||previous.active_end||"23:59").slice(0,5);
  if(timeStart>=timeEnd)return send(400,{error:"Время окончания должно быть позже времени начала (Лиссабон)."});
  const [settings]=await db("darkfactory_schedule_settings?destination=eq."+destination,"PATCH",patch);
  if(!settings)return send(409,{error:"Сервер не подтвердил запись настроек. Повторите попытку."});
  if(destination.startsWith("instagram_")&&patch.enabled===true&&!wasEnabled){
   // Previously approved entries may have been intentionally blocked while
   // the Instagram channel was disconnected. Unblock only this channel.
   const waiting=await db("darkfactory_publish_queue?select=item_id&destination=eq."+destination+"&status=eq.blocked");
   for(const row of waiting){
    const [fact]=await db("darkfactory_items?select=status_instagram,fact_verification&limit=1&id=eq."+row.item_id);
    const locale=destination.slice(-2);
    const assets=await db("darkfactory_instagram_assets?select=id&item_id=eq."+row.item_id+
     "&locale=eq."+locale+"&limit=1");
    if(fact?.status_instagram==="approved"&&fact?.fact_verification==="verified"&&assets.length)
     await db("darkfactory_publish_queue?item_id=eq."+row.item_id+"&destination=eq."+destination+"&status=eq.blocked","PATCH",{status:"scheduled",error:null,updated_at:new Date().toISOString()});
   }
  }
  return send(200,{settings});
 }
 const moveQueue=path.match(/^\/schedule\/queue\/([a-f0-9-]{36})\/reschedule$/i);
 if(moveQueue&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const input=await req.json().catch(()=>({}));
  const after=String(input.after||"");
  if(!/^\d{4}-\d\d-\d\dT\d\d:\d\d/.test(after)||!Number.isFinite(Date.parse(after)))return send(400,{error:"Use a valid timestamp with timezone"});
  const moved=await serviceRpc("darkfactory_reschedule_job",{p_queue_id:moveQueue[1],p_after:new Date(after).toISOString()});
  return send(200,{entry:moved});
 }
 // Resolve an ambiguous Buffer error only after the chief editor has verified
 // the matching Instagram permalink. Never republish while status is uncertain.
 const confirmedInstagram=path.match(/^\/schedule\/queue\/([a-f0-9-]{36})\/confirm-instagram$/i);
 if(confirmedInstagram&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const input=await req.json().catch(()=>({}));
  if(input.confirmed!==true)return send(400,{error:"Подтвердите, что пост уже опубликован в Instagram"});
  const [job]=await db("darkfactory_publish_queue?select=*&id=eq."+confirmedInstagram[1]+"&limit=1");
  if(!job||!["instagram_ru","instagram_en"].includes(job.destination))
   return send(404,{error:"Публикация Instagram не найдена"});
  const handle=job.destination==="instagram_ru"?"net_seryozno":"no.seriously.facts";
  let permalink:string;
  try{
   const url=new URL(String(input.public_url||"").trim());
   if(url.protocol!=="https:"||!["instagram.com","www.instagram.com"].includes(url.hostname))
    return send(400,{error:"Нужна ссылка на Instagram"});
   const escapedHandle=handle.replaceAll(".","\\.");
   const match=url.pathname.match(new RegExp("^/"+escapedHandle+"/(p|reel)/([A-Za-z0-9_-]+)/?$","i"));
   if(!match)return send(400,{error:"Укажите ссылку на пост именно аккаунта @"+handle+" в формате instagram.com/"+handle+"/p/..."});
   permalink="https://www.instagram.com/"+handle+"/"+match[1].toLowerCase()+"/"+match[2]+"/";
  }catch{return send(400,{error:"Укажите корректную HTTPS-ссылку на Instagram"})}
  if(job.status==="sent"){
   const [existing]=await db("darkfactory_buffer_posts?select=public_url&buffer_post_id=eq."+job.buffer_post_id+"&limit=1");
   return send(200,{already_confirmed:true,public_url:existing?.public_url||permalink});
  }
  if(!["blocked","unknown"].includes(job.status)||!job.buffer_post_id)
   return send(409,{error:"Для этой публикации нет неоднозначного статуса Buffer, повторная отправка не требуется"});
  const [record]=await db("darkfactory_buffer_posts?select=*&buffer_post_id=eq."+job.buffer_post_id+
   "&item_id=eq."+job.item_id+"&destination=eq."+job.destination+"&limit=1");
  if(!record||!["failed","unknown"].includes(record.status))
   return send(409,{error:"Связанный Buffer-пост не найден или его статус изменился"});
  const [fact]=await db("darkfactory_items?select=title&id=eq."+job.item_id+"&limit=1");
  if(!fact)return send(404,{error:"Материал не найден"});
  const publishTime=job.run_at||new Date().toISOString();
  const nowTime=new Date().toISOString();
  await db("darkfactory_published_archive?on_conflict=item_id,destination","POST",{
   item_id:job.item_id,destination:job.destination,published_at:publishTime,
   title_snapshot:fact.title,text_snapshot:job.snapshot_text||"",
   external_post_id:job.buffer_post_id,public_url:permalink,
   source_kind:"instagram_editor_confirmed"
  },true);
  await db("darkfactory_buffer_posts?id=eq."+record.id,"PATCH",{
   status:"published",published_at:publishTime,public_url:permalink,error:null,
   last_checked_at:nowTime,updated_at:nowTime
  });
  const updated=await db("darkfactory_publish_queue?id=eq."+job.id+
   "&status=in.(blocked,unknown)","PATCH",{
   status:"sent",sent_at:publishTime,error:null,updated_at:nowTime
  });
  if(!updated.length)return send(409,{error:"Статус очереди успел измениться; обновите экран"});
  return send(200,{confirmed:true,entry:updated[0],public_url:permalink});
 }

 const cancelQueue=path.match(/^\/schedule\/queue\/([a-f0-9-]{36})\/cancel$/i);
 if(cancelQueue&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const row=await db("darkfactory_publish_queue?id=eq."+cancelQueue[1]+"&status=in.(scheduled,blocked)","PATCH",{status:"cancelled",updated_at:new Date().toISOString()});
  if(!row.length)return send(409,{error:"Can only cancel unpublished scheduled items"});
  return send(200,{entry:row[0]});
 }

 // Human editorial verification when source pages cannot be parsed by automated tools.
 // No auto-publication, and editor attests to personally reviewing two independent links.
 const manualVerify=path.match(/^\/items\/([a-f0-9-]{36})\/verify-editor$/i);
 if(manualVerify&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const body=await req.json().catch(()=>({}));
  if(body.confirmed!==true)return send(400,{error:"Редактор должен явно подтвердить личную проверку источников"});
  const [material]=await db("darkfactory_items?select=*&id=eq."+manualVerify[1]+"&limit=1");
  if(!material)return send(404,{error:"Факт не найден"});
  const links=(Array.isArray(material.source_urls)?material.source_urls:[]).filter(
   (v:any)=>typeof v==="string"&&v.startsWith("https://")
  );
  if(links.length<2)return send(409,{error:"Для ручного подтверждения нужно минимум два HTTPS-источника"});
  const sourceDomain=(address:string):string=>{
   const u=new URL(address);
   if(u.protocol!=="https:"||u.username||u.password)throw Error("Недопустимая ссылка на источник");
   const host=u.hostname.toLowerCase().replace(/^www\./,"");
   if(!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(host)||host.endsWith(".local"))
    throw Error("Недопустимый адрес источника");
   const parts=host.split(".");
   const suffix=parts.slice(-2).join(".");
   const multi=new Set(["co.uk","org.uk","ac.uk","gov.uk","com.au","org.au","co.nz","com.br"]);
   return parts.slice(-(multi.has(suffix)?3:2)).join(".");
  };
  let domains:string[];
  try{domains=links.map(sourceDomain)}
  catch{return send(400,{error:"Источники должны содержать корректные HTTPS-ссылки на публичные сайты"});}
  if(new Set(domains).size<2)return send(409,{error:"Два источника должны быть независимыми и находиться на разных доменах"});
  const now=new Date().toISOString();
  const reason=String(body.note||"Редактор лично сверил утверждение с двумя независимыми источниками").trim().slice(0,300);
  const evidence=links.map((url:string,index:number)=>({
   url,domain:domains[index],method:"manual_editorial_check",
   checked_at:now,editor_confirmed:true
  }));
  const [saved]=await db("darkfactory_items?id=eq."+material.id,"PATCH",{
   fact_verification:"verified",evidence,
   creative_notes:("Manual editorial verification: "+reason).slice(0,600),
   reviewed_by:id,reviewed_at:now,updated_at:now
  });
  await db("darkfactory_reviews","POST",{
   item_id:material.id,actor_id:id,action:"fact_verified_manual",
   changed_fields:["fact_verification","evidence"],
   status_instagram:saved.status_instagram,status_telegram:saved.status_telegram,
   snapshot:{method:"manual_editorial_check",note:reason,source_urls:links,
    sources:domains,reviewed_at:now,published:false}
  });
  return send(200,{verified:true,status:"verified",method:"editor",item:saved,source_count:new Set(domains).size});
 }

 // Editorial fact check: only the actual two-source verification can set "verified".
 const verifyMatch=path.match(/^\/items\/([a-f0-9-]{36})\/recheck$/i);
 if(verifyMatch&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const [material]=await db("darkfactory_items?select=*&id=eq."+verifyMatch[1]+"&limit=1");
  if(!material)return send(404,{error:"Fact not found"});
  const links=material.source_urls||[];
  if(links.length<2)return send(409,{error:"Нужны два независимых источника для фактчекинга"});
  const result=await factCheck(material);
  const status=result.ok?"verified":"unverified";
  const now=new Date().toISOString();
  const patch:any={fact_verification:status,evidence:result.evidence,
   creative_notes:("Fact check: "+result.reason).slice(0,600),updated_at:now};
  if(!result.ok){patch.status_instagram="review";patch.status_telegram="review";patch.status_telegram_en="review"}
  const [saved]=await db("darkfactory_items?id=eq."+material.id,"PATCH",patch);
  if(!result.ok)
   await db("darkfactory_publish_queue?item_id=eq."+material.id+"&status=in.(scheduled,blocked)","PATCH",{
    status:"cancelled",error:"Fact check did not confirm the claim",updated_at:now
   });
  await db("darkfactory_reviews","POST",{item_id:material.id,actor_id:id,
   action:result.ok?"fact_verified":"fact_unverified",changed_fields:["fact_verification"],
   status_instagram:saved?.status_instagram,status_telegram:saved?.status_telegram,
   snapshot:{reason:result.reason,evidence:result.evidence,source_urls:links,verified:result.ok}});
  return send(200,{verified:result.ok,status,reason:result.reason,evidence:result.evidence,item:saved});
 }
 // Explicitly flag an item as unconfirmed. It stays editable and cannot publish.
 const unconfirmed=path.match(/^\/items\/([a-f0-9-]{36})\/unconfirmed$/i);
 if(unconfirmed&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const input=await req.json().catch(()=>({}));
  const note=String(input.reason||"Редакция пока не подтвердила факт").trim().slice(0,350);
  const [item]=await db("darkfactory_items?select=*&id=eq."+unconfirmed[1]+"&limit=1");
  if(!item)return send(404,{error:"Факт не найден"});
  const now=new Date().toISOString();
  const [saved]=await db("darkfactory_items?id=eq."+item.id,"PATCH",{
   fact_verification:"unverified",status_instagram:"review",
   status_telegram:"review",status_telegram_en:"review",
   creative_notes:("Fact held unconfirmed: "+note).slice(0,600),updated_at:now
  });
  await db("darkfactory_publish_queue?item_id=eq."+item.id+"&status=in.(scheduled,blocked)","PATCH",{
   status:"cancelled",error:"Fact marked unconfirmed by editor",updated_at:now
  });
  await db("darkfactory_reviews","POST",{item_id:item.id,actor_id:id,action:"fact_unverified",
   changed_fields:["fact_verification"],status_instagram:saved.status_instagram,
   status_telegram:saved.status_telegram,snapshot:{reason:note,source_urls:item.source_urls||[]}});
  return send(200,{unconfirmed:true,item:saved});
 }
 // A draft may be held for later regardless of current factual verification.
 const deferred=path.match(/^\/items\/([a-f0-9-]{36})\/(defer|resume)$/i);
 if(deferred&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const [item]=await db("darkfactory_items?select=id,editorial_deferred&id=eq."+deferred[1]+"&limit=1");
  if(!item)return send(404,{error:"Факт не найден"});
  const hold=deferred[2]==="defer",now=new Date().toISOString();
  const patch:any={editorial_deferred:hold,updated_at:now};
  if(hold){
   patch.editorial_deferred_at=now;
   patch.status_instagram="review";patch.status_telegram="review";patch.status_telegram_en="review";
  }
  const [saved]=await db("darkfactory_items?id=eq."+item.id,"PATCH",patch);
  if(hold)await db("darkfactory_publish_queue?item_id=eq."+item.id+"&status=in.(scheduled,blocked)","PATCH",{
   status:"cancelled",error:"Publication deferred by editor",updated_at:now
  });
  await db("darkfactory_reviews","POST",{item_id:item.id,actor_id:id,
   action:hold?"deferred":"resumed",changed_fields:["editorial_deferred"],
   status_instagram:saved.status_instagram,status_telegram:saved.status_telegram,
   snapshot:{editorial_deferred:hold,at:now}});
  return send(200,{deferred:hold,item:saved});
 }
 // Confirm a chosen ORIGINAL photo, including one already set as current. This records
 // explicit editorial approval without approving the entire article for publication.
 const mediaApprove=path.match(/^\/items\/([a-f0-9-]{36})\/media-approve$/i);
 if(mediaApprove&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const body=await req.json().catch(()=>({}));
  if(!uuid(body.version_id)||body.confirmed!==true)
   return send(400,{error:"Укажите архивную версию и подтвердите выбор фотографии"});
  const itemId=mediaApprove[1];
  const [version]=await db("darkfactory_media_versions?select=id,item_id,storage_path,kind&item_id=eq."+
   itemId+"&id=eq."+body.version_id+"&limit=1");
  if(!version)return send(404,{error:"Версия фотографии не найдена в архиве этой статьи"});
  const verified=await serviceRpc("darkfactory_media_exists",{p_path:version.storage_path});
  if(verified!==true)return send(404,{error:"Исходное фото отсутствует в защищённом хранилище"});
  const [old]=await db("darkfactory_items?select=id,image_storage_path,status_instagram,status_telegram,status_telegram_en&id=eq."+
   itemId+"&limit=1");
  if(!old)return send(404,{error:"Материал не найден"});
  const changed=old.image_storage_path!==version.storage_path;
  let item=old;
  if(changed){
   const now=new Date().toISOString();
   await db("darkfactory_publish_queue?item_id=eq."+itemId+"&status=in.(scheduled,blocked)","PATCH",{
    status:"cancelled",error:"Одобрена другая фотография, требуется повторная приёмка",updated_at:now
   });
   [item]=await db("darkfactory_items?id=eq."+itemId,"PATCH",{
    image_storage_path:version.storage_path,visual_status:"ready",
    status_instagram:"review",status_telegram:"review",status_telegram_en:"review",updated_at:now
   });
  }
  const [review]=await db("darkfactory_reviews","POST",{
   item_id:itemId,actor_id:id,action:"photo_approved",
   changed_fields:changed?["image_storage_path","visual_status"]:["image_storage_path"],
   status_instagram:item.status_instagram,status_telegram:item.status_telegram,
   snapshot:{media_version_id:version.id,storage_path:version.storage_path,
    kind:version.kind,approved:true,published:false,changed_photo:changed}
  });
  return send(200,{approved:true,selected:version.id,approval_at:review?.created_at||new Date().toISOString(),
   changed_photo:changed,item});
 }
 const restoreMedia=path.match(/^\/items\/([a-f0-9-]{36})\/media-restore$/i);
 if(restoreMedia&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const raw=await req.json().catch(()=>({}));
  if(!uuid(raw.version_id))return send(400,{error:"Invalid media version"});
  const history=await db("darkfactory_media_versions?select=storage_path&item_id=eq."+restoreMedia[1]+"&id=eq."+raw.version_id+"&limit=1");
  if(!history.length)return send(404,{error:"Media version not found"});
  const store=history[0].storage_path;
  const verified=await serviceRpc("darkfactory_media_exists",{p_path:store});
  if(verified!==true)return send(404,{error:"The archived media object is no longer available"});
  await db("darkfactory_publish_queue?item_id=eq."+restoreMedia[1]+"&status=in.(scheduled,blocked)","PATCH",{status:"cancelled",error:"Media restored, reapproval required",updated_at:new Date().toISOString()});
  const [item]=await db("darkfactory_items?id=eq."+restoreMedia[1],"PATCH",{
   image_storage_path:store,visual_status:"ready",status_instagram:"review",status_telegram:"review",status_telegram_en:"review",updated_at:new Date().toISOString()
  });
  return send(200,{restored:true,item});
 }
 const approveMatch=path.match(/^\/items\/([a-f0-9-]{36})\/approve-all$/i);
 if(approveMatch&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const [fact]=await db("darkfactory_items?select=*&id=eq."+approveMatch[1]+"&limit=1");
  if(!fact)return send(404,{error:"Material not found"});
  if(fact.editorial_deferred)return send(409,{error:"Публикация отложена. Сначала нажмите «Вернуть к публикации»"});
   if(fact.fact_verification!=="verified"||(fact.source_urls||[]).length<2)return send(409,{error:"Сначала проверьте факт и минимум два независимых источника"});
  if(fact.visual_status!=="ready"||!fact.image_storage_path)return send(409,{error:"Сначала загрузите или сгенерируйте одно постоянное изображение"});
  if(String(fact.caption_instagram||"").length<100||String(fact.caption_instagram_en||"").length<100||
    String(fact.caption_telegram||"").length<100||String(fact.caption_telegram_en||"").length<100)return send(409,{error:"Подготовьте полные тексты RU и EN для обеих площадок"});
  const mediaPresent=await serviceRpc("darkfactory_media_exists",{p_path:fact.image_storage_path});
  if(mediaPresent!==true)return send(409,{error:"Исходное изображение отсутствует в постоянном хранилище"});
  await db("darkfactory_items?id=eq."+fact.id,"PATCH",{
   status_instagram:"approved",status_telegram:"approved",status_telegram_en:"approved",
   reviewed_by:id,reviewed_at:new Date().toISOString(),updated_at:new Date().toISOString()
  });
  const cfg=await db("darkfactory_schedule_settings?select=destination,auto_queue&order=destination");
  const queued:any[]=[],errors:any[]=[],skipped:string[]=[];
  for(const destination of cfg.filter((x:any)=>x.auto_queue).map((x:any)=>x.destination)){
   try{
    if(destination.startsWith("telegram_")){
     const manual=await db("darkfactory_instant_deliveries?select=id&item_id=eq."+fact.id+"&destination=eq."+destination+"&limit=1");
     if(manual.length){skipped.push(destination+" (already sent or requires review)");continue}
    }else{
     const posted=await db("darkfactory_buffer_posts?select=id&item_id=eq."+fact.id+"&destination=eq."+destination+"&limit=1");
     if(posted.length){skipped.push(destination+" (already submitted to Buffer)");continue}
    }
    const added=await serviceRpc("darkfactory_queue_fact",{p_item_id:fact.id,p_destination:destination,p_after:new Date().toISOString()});queued.push(added);
   }catch(e){errors.push({destination,error:String(e instanceof Error?e.message:e).slice(0,120)})}
  }
  return send(errors.length?207:200,{approved:true,item_id:fact.id,queue:queued,errors,skipped});
 }
 const signedMedia=path.match(/^\/items\/([a-f0-9-]{36})\/media$/i);
 if(signedMedia&&req.method==="GET"){
  const [fact]=await db("darkfactory_items?select=id,image_storage_path,visual_status&id=eq."+signedMedia[1]+"&limit=1");
  if(!fact)return send(404,{error:"Fact not found"});
  if(!fact.image_storage_path)return send(200,{image_url:null,visual_status:fact.visual_status});
  const link=await fetch(ROOT+"/storage/v1/object/sign/studio-private/"+fact.image_storage_path,{
   method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},
   body:JSON.stringify({expiresIn:1800})
  });
  if(!link.ok)return send(502,{error:"The permanent media exists in the database but URL could not be refreshed."});
  const val=await link.json();
  return send(200,{image_url:val.signedURL?ROOT+"/storage/v1"+val.signedURL:null,storage_path:fact.image_storage_path,expires_in:1800});
 }
 if(signedMedia&&req.method==="PUT"){
  await requireTelegramAdmin(id);
  const contentType=String(req.headers.get("content-type")||"").split(";")[0].trim().toLowerCase();
  const ext=contentType==="image/png"?"png":contentType==="image/jpeg"?"jpg":contentType==="image/webp"?"webp":"";
  if(!ext)return send(415,{error:"Use PNG, JPEG or WebP"});
  const byteLength=Number(req.headers.get("content-length")||0);
  if(byteLength>8*1024*1024)return send(413,{error:"Image exceeds 8 MB"});
  const body=await req.arrayBuffer();
  if(body.byteLength<1000||body.byteLength>8*1024*1024)return send(413,{error:"Invalid image length"});
  const bytes=new Uint8Array(body);
  const isValid=ext==="jpg"?(bytes[0]===255&&bytes[1]===216&&bytes[2]===255):
    ext==="png"?(bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71):
    (String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP");
  if(!isValid)return send(422,{error:"Image signature does not match extension"});
  const [fact]=await db("darkfactory_items?select=id&id=eq."+signedMedia[1]+"&limit=1");
  if(!fact)return send(404,{error:"Fact not found"});
  const storagePath="shocking-facts/"+fact.id+"/"+crypto.randomUUID()+"."+ext;
  const uploaded=await fetch(ROOT+"/storage/v1/object/studio-private/"+storagePath,{
   method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":contentType,"x-upsert":"false"},body:bytes
  });
  if(!uploaded.ok)throw Error("Private media storage "+uploaded.status);
  await db("darkfactory_media_versions","POST",{item_id:fact.id,storage_path:storagePath,kind:"uploaded",byte_size:bytes.byteLength,content_type:contentType,created_by:id});
  await db("darkfactory_publish_queue?item_id=eq."+fact.id+"&status=in.(scheduled,blocked)","PATCH",{status:"cancelled",error:"Media replaced, reapproval required",updated_at:new Date().toISOString()});
  await db("darkfactory_items?id=eq."+fact.id,"PATCH",{image_storage_path:storagePath,visual_status:"ready",image_generation_error:null,status_instagram:"review",status_telegram:"review",status_telegram_en:"review",updated_at:new Date().toISOString()});
  const media=await db("darkfactory_media_versions?select=id,storage_path,kind,created_at&item_id=eq."+fact.id+"&order=created_at.desc");
  return send(200,{saved:true,storage_path:storagePath,versions:media});
 }
 // Existing photos live in a PRIVATE bucket. Sign each archived version for editorial
 // thumbnails and full-size review; paths alone cannot be displayed by the browser.
 const libraryPath=path==="/media-library"&&req.method==="GET";
 const mediaHistory=path.match(/^\/items\/([a-f0-9-]{36})\/media-history$/i);
 if(libraryPath||(mediaHistory&&req.method==="GET")){
  const itemId=mediaHistory?.[1]||null;
  const media=await db("darkfactory_media_versions?select=id,item_id,storage_path,kind,created_at,byte_size,content_type"+
   (itemId?"&item_id=eq."+itemId:"")+"&order=created_at.desc&limit=120");
  const facts=await db("darkfactory_items?select=id,title,title_en,image_storage_path"+
   (itemId?"&id=eq."+itemId:"")+"&limit=1000");
  const factById=new Map(facts.map((f:any)=>[f.id,f]));
  const reviews=await db("darkfactory_reviews?select=item_id,snapshot,created_at"+
   (itemId?"&item_id=eq."+itemId:"")+
   "&action=eq.photo_approved&order=created_at.desc&limit=500");
  const newestApproval=new Map<string,any>();
  for(const row of reviews)if(!newestApproval.has(row.item_id))newestApproval.set(row.item_id,row);
  const archive=await Promise.all(media.map(async(v:any)=>{
   const fact:any=factById.get(v.item_id);
   const goodPath=typeof v.storage_path==="string"&&
    /^shocking-facts\/[a-f0-9-]{36}\/[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(v.storage_path)&&
    v.storage_path.split("/")[1]===v.item_id;
   let image_url:string|null=null;
   if(goodPath){
    try{
     const link=await fetch(ROOT+"/storage/v1/object/sign/studio-private/"+v.storage_path,{
      method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},
      body:JSON.stringify({expiresIn:1800}),signal:AbortSignal.timeout(12000)
     });
     if(link.ok){
      const data=await link.json();
      if(typeof data?.signedURL==="string"&&data.signedURL.startsWith("/object/sign/"))
       image_url=ROOT+"/storage/v1"+data.signedURL;
     }
    }catch(err){console.warn("media archive signing failure",v.id,String(err).slice(0,100))}
   }
   return {id:v.id,item_id:v.item_id,kind:v.kind,created_at:v.created_at,
    byte_size:v.byte_size,content_type:v.content_type,
    title:fact?.title||"Без названия",title_en:fact?.title_en||"",
    current:Boolean(fact&&fact.image_storage_path===v.storage_path),
    approved:Boolean(newestApproval.get(v.item_id)?.snapshot?.media_version_id===v.id&&
      fact&&fact.image_storage_path===v.storage_path),
    approved_at:newestApproval.get(v.item_id)?.snapshot?.media_version_id===v.id?
      newestApproval.get(v.item_id).created_at:null,
    available:Boolean(image_url),image_url};
  }));
  return send(200,{versions:archive,total:archive.length,
   scope:itemId?"article":"library",expires_in:1800});
 }

 // Immediate manual editorial override: sends ONLY the selected approved fact.
 // Does not use or reallocate any time slots. Its own queued copy is cancelled
 // after confirmed send to prevent duplicate posting; other jobs remain intact.

 if(path==="/buffer/posts"&&req.method==="GET"){
  const posts=await db("darkfactory_buffer_posts?select=item_id,destination,status,mode,buffer_post_id,public_url,published_at,error,due_at,created_at"+
   "&order=created_at.desc&limit=100");
  return send(200,{posts});
 }
 if(path==="/buffer/status"&&req.method==="GET"){
  const key=await serviceRpc("darkfactory_buffer_key_read",{});
  const channels=await db("darkfactory_buffer_channels?select=destination,channel_id,channel_name,organization_id,enabled,confirmed_at&order=destination");
  return send(200,{key_configured:Boolean(key),channels});
 }
 if(path==="/buffer/key"&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const body=await req.json().catch(()=>({}));
  const key=String(body.api_key||"").trim();
  if(key.length<20||key.length>600)return send(400,{error:"Invalid Buffer API key"});
  const channels=await bufferDiscover(key);
  await serviceRpc("darkfactory_buffer_key_write",{p_key:key});
  return send(200,{saved:true,instagram_channels:channels});
 }
 if(path==="/buffer/channels"&&req.method==="GET"){
  await requireTelegramAdmin(id);
  const channels=await bufferDiscover();
  return send(200,{channels});
 }
 if(path==="/buffer/connect"&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const body=await req.json().catch(()=>({}));
  const locale=body.locale,channelId=String(body.channel_id||""),orgId=String(body.organization_id||"");
  if(!["ru","en"].includes(locale)||!channelId||!orgId)return send(400,{error:"Choose an Instagram channel for RU or EN"});
  const all=await bufferDiscover();
  const channel=all.find((c:any)=>c.id===channelId&&c.organization_id===orgId);
  if(!channel)return send(404,{error:"Buffer does not list this Instagram channel"});
  const expectedHandle=locale==="ru"?"net_seryozno":"no.seriously.facts";
  if(String(channel.name||"").toLowerCase()!==expectedHandle)
   return send(409,{error:"Это Instagram другого проекта. Для НЕТ! СЕРЬЁЗНО?! разрешены только net_seryozno (RU) и no.seriously.facts (EN)"});
  if(channel.disconnected||channel.locked)
   return send(409,{error:"Instagram недоступен в Buffer. Проверьте подключение и ограничения аккаунта"});
  const [result]=await db("darkfactory_buffer_channels?on_conflict=destination","POST",{
   destination:"instagram_"+locale,organization_id:orgId,channel_id:channelId,
   channel_name:channel.display_name||channel.name,enabled:true,
   confirmed_at:new Date().toISOString(),updated_at:new Date().toISOString()
  },true);
  // Connecting a channel does not start autodelivery. Calendar controls it.
  return send(200,{connected:true,channel:result});
 }
 const instagramMedia=path.match(/^\/instagram\/items\/([a-f0-9-]{36})\/(ru|en)\/slides\/([1-9]|10)$/i);
 if(instagramMedia&&req.method==="PUT"){
  await requireTelegramAdmin(id);
  const [fact]=await db("darkfactory_items?select=id,status_instagram&limit=1&id=eq."+instagramMedia[1]);
  const destination="instagram_"+instagramMedia[2];
  const prev=await db("darkfactory_buffer_posts?select=id&item_id=eq."+instagramMedia[1]+"&destination=eq."+destination+"&limit=1");
  if(prev.length)return send(409,{error:"This item was already submitted to Buffer; create a new version"});

  if(!fact)return send(404,{error:"Fact not found"});
  const type=String(req.headers.get("Content-Type")||"").split(";")[0].toLowerCase();
  if(type!=="image/jpeg"&&type!=="image/png")return send(415,{error:"Only JPEG or PNG"});
  const data=new Uint8Array(await req.arrayBuffer());
  if(data.byteLength<1000||data.byteLength>8*1024*1024)return send(413,{error:"Image must be 1 KB–8 MB"});
  const jpeg=data[0]===255&&data[1]===216&&data[2]===255;
  const png=data[0]===137&&data[1]===80&&data[2]===78&&data[3]===71;
  if(!(type==="image/jpeg"&&jpeg||type==="image/png"&&png))return send(422,{error:"Invalid file signature"});
  const path="social/"+instagramMedia[1]+"/"+instagramMedia[2]+"/"+crypto.randomUUID()+(jpeg?".jpg":".png");
  await uploadPublicSocialAsset(path,data,type);

  if(Number(instagramMedia[3])===1){
   // A new carousel replaces the old slide manifest, not the immutable files.
   await db("darkfactory_instagram_assets?item_id=eq."+instagramMedia[1]+
    "&locale=eq."+instagramMedia[2],"DELETE");
   if(fact.status_instagram==="approved"){
    await db("darkfactory_items?id=eq."+instagramMedia[1],"PATCH",{
     status_instagram:"review",updated_at:new Date().toISOString()
    });
    await db("darkfactory_publish_queue?item_id=eq."+instagramMedia[1]+
     "&destination=eq.instagram_"+instagramMedia[2]+"&status=in.(scheduled,blocked)","PATCH",{
     status:"cancelled",error:"Instagram visual refreshed; reapproval needed",updated_at:new Date().toISOString()
    });
   }
  }
  const url=ROOT+"/storage/v1/object/public/darkfactory-social/"+path;
  const [asset]=await db("darkfactory_instagram_assets?on_conflict=item_id,locale,slide_number","POST",{
   item_id:instagramMedia[1],locale:instagramMedia[2],slide_number:Number(instagramMedia[3]),
   storage_path:path,image_url:url,created_at:new Date().toISOString()
  },true);
  // Uploaded media is not a publication and is reusable after approval.
  return send(200,{saved:true,asset});
 }
 const igMediaList=path.match(/^\/instagram\/items\/([a-f0-9-]{36})\/(ru|en)\/slides$/i);
 if(igMediaList&&req.method==="GET"){
  const assets=await db("darkfactory_instagram_assets?select=slide_number,image_url,created_at&item_id=eq."+
   igMediaList[1]+"&locale=eq."+igMediaList[2]+"&order=slide_number.asc");
  return send(200,{assets});
 }
 const igPublish=path.match(/^\/instagram\/items\/([a-f0-9-]{36})\/(ru|en)\/buffer-publish$/i);
 if(igPublish&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const data=await req.json().catch(()=>({}));
  const mode=data.mode==="now"?"shareNow":data.mode==="schedule"?"customScheduled":null;
  if(!mode)return send(400,{error:"Choose now or schedule"});
  const result=await bufferPreparePost(igPublish[1],igPublish[2] as "ru"|"en",mode,id);
  return send(200,result);
 }

 // Upload or inspect a square Telegram headline cover; private editor roles only.
 const squareMedia=path.match(/^\/telegram\/items\/([a-f0-9-]{36})\/(ru|en)\/asset$/i);
 if(squareMedia&&req.method==="PUT"){
  await requireTelegramAdmin(id);
  const itemId=squareMedia[1],locale=squareMedia[2];
  const [fact]=await db("darkfactory_items?select=id,title,title_en,visual_status,image_storage_path&id=eq."+itemId+"&limit=1");
  if(!fact||fact.visual_status!=="ready"||!fact.image_storage_path)
   return send(409,{error:"Нужен исходный сохранённый снимок"});
  if(String(req.headers.get("Content-Type")||"").split(";")[0].toLowerCase()!=="image/jpeg")
   return send(415,{error:"Требуется JPEG 1600×1600"});
  const bytes=new Uint8Array(await req.arrayBuffer());
  if(bytes.length<1000||bytes.length>8*1024*1024||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)
   return send(413,{error:"Недопустимый размер или формат JPEG"});
  const decoded=await Image.decode(bytes).catch(()=>null);
  if(!decoded||decoded.width!==1600||decoded.height!==1600)
   return send(422,{error:"Квадратный Telegram-шаблон должен быть ровно 1600×1600"});
  const imagePath="telegram-squares/"+itemId+"/"+locale+"/"+crypto.randomUUID()+".jpg";
  await uploadPublicSocialAsset(imagePath,bytes,"image/jpeg");
  const title=String((locale==="ru"?fact.title:fact.title_en||fact.title)||"").trim();
  const publicUrl=ROOT+"/storage/v1/object/public/darkfactory-social/"+imagePath;
  const [asset]=await db("darkfactory_telegram_assets?on_conflict=item_id,locale","POST",{
   item_id:itemId,locale,storage_path:imagePath,image_url:publicUrl,source_image_path:fact.image_storage_path,
   title_snapshot:title,width:1600,height:1600,updated_at:new Date().toISOString()
  },true);
  return send(200,{saved:true,asset:{locale:asset.locale,url:asset.image_url,width:1600,height:1600}});
 }
 if(squareMedia&&req.method==="GET"){
  const [row]=await db("darkfactory_telegram_assets?select=*&item_id=eq."+squareMedia[1]+"&locale=eq."+squareMedia[2]+"&limit=1");
  if(!row)return send(200,{ready:false});
  const [fact]=await db("darkfactory_items?select=title,title_en,image_storage_path&id=eq."+squareMedia[1]+"&limit=1");
  const title=String((squareMedia[2]==="ru"?fact?.title:fact?.title_en||fact?.title)||"").trim();
  const ready=Boolean(fact&&row.source_image_path===fact.image_storage_path&&row.title_snapshot===title);
  return send(200,{ready,url:ready?row.image_url:null,width:1600,height:1600});
 }
 // Previous 16:9 endpoint is deliberately retired to prevent old visuals.
 const legacyWide=path.match(/^\/telegram\/items\/([a-f0-9-]{36})\/preview-wide$/i);
 if(legacyWide&&req.method==="POST")
  return send(410,{error:"Обновите редактор: Telegram теперь использует обложку 1:1 с заголовком."});

 // Confirm exactly the previewed, already-archived photo and selected channel copies.
 // Editors no longer need to mark the same saved photo as approved elsewhere.
 const previewApproval=path.match(/^\/items\/([a-f0-9-]{36})\/approve-preview$/i);
 if(previewApproval&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const data=await req.json().catch(()=>({}));
  const allowed=new Set(["telegram_ru","telegram_en","instagram_ru","instagram_en"]);
  const destinations=Array.isArray(data.destinations)?[...new Set(data.destinations)]:[];
  if(!destinations.length||destinations.some((d:any)=>!allowed.has(d)))
   return send(400,{error:"Укажите хотя бы один допустимый канал"});
  const [fact]=await db("darkfactory_items?select=*&id=eq."+previewApproval[1]+"&limit=1");
  if(!fact)return send(404,{error:"Материал не найден"});
  if(fact.editorial_deferred)return send(409,{error:"Материал отложен. Верните к публикации перед утверждением."});
  if(fact.fact_verification!=="verified"||!Array.isArray(fact.source_urls)||fact.source_urls.length<2)
   return send(409,{error:"Факт необходимо подтвердить по двум источникам до публикации"});
  if(!fact.image_storage_path || await serviceRpc("darkfactory_media_exists",{p_path:fact.image_storage_path})!==true)
   return send(409,{error:"Фото пока не сохранено в постоянном архиве"});
  for(const dest of destinations){
   const name=dest==="telegram_ru"?"caption_telegram":dest==="telegram_en"?"caption_telegram_en":
    dest==="instagram_ru"?"caption_instagram":"caption_instagram_en";
   const text=dest.startsWith("telegram_")?sanitizeTGFull(String(fact[name]||"")):String(fact[name]||"").trim();
   if(text.length<80||text.length>(dest.startsWith("telegram_")?4000:2200))
    return send(409,{error:"Текст для "+dest+" должен содержать 80–"+(dest.startsWith("telegram_")?4000:2200)+" символов"});
  }
  const updates:any={visual_status:"ready",reviewed_by:id,reviewed_at:new Date().toISOString(),
   updated_at:new Date().toISOString()};
  for(const dest of destinations)updates[dest==="telegram_ru"?"status_telegram":dest==="telegram_en"?"status_telegram_en":"status_instagram"]="approved";
  const rows=await db("darkfactory_items?id=eq."+fact.id,"PATCH",updates);
  return send(200,{approved:true,verified_media:true,destinations,item:rows[0]});
 }

 const immediate=path.match(/^\/telegram\/items\/([a-f0-9-]{36})\/(ru|en)\/publish-now$/i);
 if(immediate&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const itemId=immediate[1],locale=immediate[2],destination="telegram_"+locale;
  const [channel]=await db("darkfactory_telegram_channels?select=*&locale=eq."+locale+"&enabled=eq.true&can_post_messages=eq.true&limit=1");
  if(!channel)return send(409,{error:"Подключение Telegram не подтверждено"});
  const [fact]=await db("darkfactory_items?select=*&id=eq."+itemId+"&limit=1");
  if(!fact)return send(404,{error:"Факт не найден"});
  if(fact.editorial_deferred)return send(409,{error:"Материал отложен. Верните к публикации прежде чем отправлять пост."});
  if(fact.fact_verification!=="verified"||!Array.isArray(fact.source_urls)||fact.source_urls.length<2||
   fact.visual_status!=="ready"||!fact.image_storage_path||
   (locale==="ru"?fact.status_telegram:fact.status_telegram_en)!=="approved")
   return send(409,{error:"Публикация доступна только после проверки, загрузки фото и утверждения"});
  const body=String(locale==="ru"?fact.caption_telegram:fact.caption_telegram_en||"");
  if(sanitizeTGFull(body).length<80)return send(409,{error:"Полный текст Telegram ещё не подготовлен"});
  if(await serviceRpc("darkfactory_media_exists",{p_path:fact.image_storage_path})!==true)
   return send(409,{error:"Оригинальное фото отсутствует"});
  const priorPublication=await db("darkfactory_publish_queue?select=id,status&item_id=eq."+itemId+
   "&destination=eq."+destination+"&status=in.(sending,sent,unknown,submitted)&limit=1");
  if(priorPublication.length)return send(409,{
   error:priorPublication[0].status==="sent"?"Этот факт уже опубликован в Telegram":
    "Исход предыдущей отправки неизвестен либо отправка ещё выполняется. Проверьте канал.",
   existing_status:priorPublication[0].status
  });
  const prior=await db("darkfactory_instant_deliveries?select=*&item_id=eq."+itemId+
   "&destination=eq."+destination+"&limit=1");
  if(prior.length)return send(409,{error:"Этот факт уже отправляли вручную. Повтор запрещён, чтобы избежать дубля",delivery:prior[0]});
  // Authenticated only, owner/chief_editor, single-use unique claim.
  const claim=await db("darkfactory_instant_deliveries","POST",
   {item_id:itemId,destination,status:"sending",created_by:id,started_at:new Date().toISOString()});
  if(!claim.length)throw Error("Could not claim immediate post");
  let outcome:any;
  try{
   // Freeze only this fact's queued copy BEFORE the Telegram network request.
   // Other queue entries and their scheduled times remain completely unchanged.
   await db("darkfactory_publish_queue?item_id=eq."+itemId+"&destination=eq."+destination+
    "&status=eq.scheduled","PATCH",{status:"blocked",error:"Manual publish now in progress",updated_at:new Date().toISOString()});
   const simultaneouslySending=await db("darkfactory_publish_queue?select=id&item_id=eq."+itemId+
    "&destination=eq."+destination+"&status=eq.sending&limit=1");
   if(simultaneouslySending.length)throw Error("Scheduled delivery already in progress; check channel before retry");
   const token=await tgToken(locale as Lang);
   const checked=await tgValidate(token,String(channel.channel_id));
   if(String(checked.channel_id)!==String(channel.channel_id))throw Error("Channel mismatch");
   outcome=await tgPostOnePhotoFullText(token,String(channel.channel_id),fact.image_storage_path,body,locale,itemId);
   await db("darkfactory_instant_deliveries?id=eq."+claim[0].id,"PATCH",{
    status:"sent",message_id:outcome.message_id,extra_message_id:outcome.extra_message_id,
    sent_at:new Date().toISOString()
   });
   await db("darkfactory_publish_queue?item_id=eq."+itemId+"&destination=eq."+destination+
    "&status=in.(scheduled,blocked)","PATCH",{status:"cancelled",error:"This item was published now; no queue slots shifted",updated_at:new Date().toISOString()});
   return send(200,{sent:true,destination,message_id:outcome.message_id,extra_message_id:outcome.extra_message_id,
    queue_unchanged_except_selected_item:true});
  }catch(e){
   const problem=String(e instanceof Error?e.message:e).slice(0,400);
   // Network or second Telegram call may have succeeded: no automated replay.
   await db("darkfactory_instant_deliveries?id=eq."+claim[0].id,"PATCH",{
    status:"unknown",error:problem
   }).catch(()=>{});
   await db("darkfactory_publish_queue?item_id=eq."+itemId+"&destination=eq."+destination+
    "&status=in.(scheduled,blocked)","PATCH",{status:"blocked",error:"Manual delivery outcome unknown; inspect the channel",updated_at:new Date().toISOString()}).catch(()=>{});
   return send(502,{error:"Исход отправки требует проверки в Telegram. Автоповтор заблокирован.",detail:problem});
  }
 }
 const publishRoute=path.match(/^\/telegram\/items\/([a-f0-9-]{36})\/(ru|en)\/publish$/i);
 if(publishRoute&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const dest="telegram_"+publishRoute[2],itemId=publishRoute[1];
  const [channel]=await db("darkfactory_telegram_channels?select=enabled&locale=eq."+publishRoute[2]+"&enabled=eq.true&limit=1");
  if(!channel)return send(409,{error:"Channel not connected"});
  const [fact]=await db("darkfactory_items?select=id,fact_verification,editorial_deferred,visual_status,status_telegram,status_telegram_en&id=eq."+itemId+"&limit=1");
  if(!fact||fact.editorial_deferred||fact.fact_verification!=="verified"||fact.visual_status!=="ready"||
   (publishRoute[2]==="ru"?fact.status_telegram:fact.status_telegram_en)!=="approved")
   return send(409,{error:"Чтобы запланировать пост, верните его из «Отложено», подтвердите факт и утвердите Telegram-версию."});
  const queued=await serviceRpc("darkfactory_queue_fact",{p_item_id:itemId,p_destination:dest,p_after:new Date().toISOString()});
  return send(200,{queued:true,entry:queued,message:"Добавлено в очередь с соблюдением тихих часов и интервала"});
 }
 if(path==="/items"&&req.method==="GET"){
  const rows=await db("darkfactory_items?select=*&order=created_at.desc&limit=1000");
  const signed=await Promise.all(rows.filter((x:any)=>x.image_storage_path).slice(0,40).map(async(x:any)=>{
   try{const res=await fetch(ROOT+"/storage/v1/object/sign/studio-private/"+x.image_storage_path,{method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:1800})});const a=res.ok?await res.json():{};return {id:x.id,url:a.signedURL?ROOT+"/storage/v1"+a.signedURL:null}}
   catch{return {id:x.id,url:null}}
  }));
  const urls=new Map(signed.map(x=>[x.id,x.url]));
  return send(200,{items:rows.map((x:any)=>({...x,image_url:urls.get(x.id)||null}))});
 }
 if(path==="/items"&&req.method==="POST"){
  const raw=await req.json();
  const row=clean(raw);
  if(row.format_mode==="auto")row.format_type="card";
  if(!row.visual_prompt)row.visual_prompt=pickVisual(row,Math.floor(Math.random()*40));
  const found=await db("darkfactory_items","POST",{...row,source:"manual",created_by:id});
  return send(201,{item:found[0]});
 }
 if(path==="/generate"&&req.method==="POST"){
  const batch=await openaiBatch();
  const rows=await db("darkfactory_items","POST",batch.map((a:any)=>({...a,created_by:id})));
  return send(201,{items:rows});
 }


 const imageMatch=path.match(/^\/items\/([a-f0-9-]{36})\/generate-image$/i);
 if(imageMatch&&req.method==="POST"){
  await requireTelegramAdmin(id);
  const [fact]=await db("darkfactory_items?select=*&id=eq."+imageMatch[1]+"&limit=1");
  if(!fact)return send(404,{error:"Материал не найден"});
  const reqBody=await req.json().catch(()=>({}));
  const oldPath=String(fact.image_storage_path||"");
  if(oldPath&&reqBody.replace_existing!==true)return send(409,{error:"Для платной перегенерации подтвердите замену фото"});
  if(fact.visual_status==="generating"&&Date.now()-Date.parse(fact.updated_at)<8*60000)
   return send(409,{error:"Изображение уже генерируется"});
  if(fact.fact_verification==="disputed")return send(409,{error:"Факт спорный, исправьте его перед созданием изображения"});
  // Paid media is normally created only after the editorial fact text was approved.
  // An explicit editor may opt in to early generation; this action still requires admin authorization.
  const editorialApproved=[fact.status_instagram,fact.status_telegram,fact.status_telegram_en].includes("approved");
  if(!editorialApproved&&reqBody.confirm_preapproval_generation!==true)
   return send(409,{error:"Сначала утвердите текст хотя бы для одной площадки. Для осознанной ранней генерации передайте confirm_preapproval_generation:true."});
  // Manual resets must not rewrite or erase the history of generated media.
  const [quota]=await db("darkfactory_settings?select=image_limit_reset_at&id=eq.true&limit=1");
  const resetTime=quota?.image_limit_reset_at?Date.parse(quota.image_limit_reset_at):0;
  const windowStart=new Date(Math.max(Date.now()-86400000,Number.isFinite(resetTime)?resetTime:0)).toISOString();
  const cost=await db("darkfactory_items?select=id&image_generated_at=gte."+
    encodeURIComponent(windowStart)+"&limit=30");
  if(cost.length>=12)return send(429,{error:"Суточный лимит генераций изображений достигнут (12). Сброс не удаляет историю."});
  const key=Deno.env.get("OPENAI_API_KEY")?.trim();
  if(!key)return send(503,{error:"Не задан ключ Image API"});
  const model="gpt-image-2.5-flare"; // The image policy forbids High and ignores legacy model overrides.
  const concept=String(fact.visual_prompt_en||fact.visual_prompt||fact.title_en||fact.title).trim().slice(0,1400);
  if(concept.length<16)return send(409,{error:"Сначала заполните промпт визуала"});
  const accents:Record<string,string>={card:"#FF6659",carousel:"#D7FF38",photo_story:"#38D5EC",comparison:"#FFBD45",timeline:"#B895F7",reel_story:"#F47DB9"};
  const palette="a tiny restrained "+(accents[String(fact.format_type)]||accents.card)+" practical-light accent matching the editorial publication format";
  const prompt="ONE original premium science fact magazine illustration for NO, SERIOUSLY?! / НЕТ! СЕРЬЁЗНО?!; same unified established series style: cinematic photorealism, credible real-world physics, rich organic textures, deep charcoal-black shadows, bold yet elegant contrast, dark luxurious editorial atmosphere, restrained colours with "+palette+" practical-light accents. Centered iconic subject, dark text-safe negative space, full-bleed single scene. Composable by center cropping to both 4:5 Instagram and square Telegram covers. Fact scene: "+concept+". Absolutely NO words, letters, diagrams, posters, collages, logos, watermarks, typography, UI or fake archival evidence. Scientifically plausible details; no cartoon styling.";
  const claimed=await db("darkfactory_items?id=eq."+fact.id+"&visual_status=eq."+encodeURIComponent(fact.visual_status),"PATCH",{
   visual_status:"generating",image_generation_error:null,updated_at:new Date().toISOString()
  });
  if(!claimed.length)return send(409,{error:"Генерация уже запущена или состояние изменилось"});
  try{
   const im=await fetch("https://api.openai.com/v1/images/generations",{
    method:"POST",signal:AbortSignal.timeout(125000),
    headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},
    body:JSON.stringify({model,prompt,quality:"medium",size:"1024x1536",n:1,output_format:"webp",output_compression:75})
   });
   if(!im.ok)throw Error("Image API "+im.status+" "+(await im.text()).slice(0,180));
   const result=await im.json(),b64=result?.data?.[0]?.b64_json;
   if(typeof b64!=="string")throw Error("Image API did not return an image");
   const binary=atob(b64),bytes=new Uint8Array(binary.length);
   for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
   if(bytes.length<1000||bytes.length>8388608||String.fromCharCode(...bytes.slice(0,4))!=="RIFF")
    throw Error("Image size or WebP format invalid");
   const filename="shocking-facts/"+fact.id+"/"+crypto.randomUUID()+".webp";
   const upload=await fetch(ROOT+"/storage/v1/object/studio-private/"+filename,{
    method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"image/webp","x-upsert":"false"},
    body:bytes,signal:AbortSignal.timeout(20000)
   });
   if(!upload.ok)throw Error("Private photo archive "+upload.status);
   await db("darkfactory_media_versions","POST",{
    item_id:fact.id,storage_path:filename,kind:"generated",byte_size:bytes.length,content_type:"image/webp",created_by:id
   });
   const stamp=new Date().toISOString();
   const updated=await db("darkfactory_items?id=eq."+fact.id,"PATCH",{
    image_storage_path:filename,image_generated_at:stamp,visual_status:"ready",image_generation_error:null,
    status_instagram:"review",status_telegram:"review",status_telegram_en:"review",updated_at:stamp
   });
   if(oldPath)await db("darkfactory_publish_queue?item_id=eq."+fact.id+
    "&status=in.(scheduled,blocked)","PATCH",{
     status:"cancelled",error:"Photo regenerated; editorial reapproval required",updated_at:stamp
    });
   const sig=await fetch(ROOT+"/storage/v1/object/sign/studio-private/"+filename,{
    method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+KEY,"Content-Type":"application/json"},
    body:JSON.stringify({expiresIn:1800})
   });
   const data=sig.ok?await sig.json():{};
   return send(200,{item:updated[0],image_url:data.signedURL?ROOT+"/storage/v1"+data.signedURL:null,
    style_version:"seriously-format-accents-v3",regenerated:Boolean(oldPath)});
  }catch(err){
   const msg=String(err instanceof Error?err.message:err).slice(0,400);
   await db("darkfactory_items?id=eq."+fact.id,"PATCH",{
    visual_status:oldPath?"ready":"failed",image_generation_error:msg,
    updated_at:new Date().toISOString()
   }).catch(()=>{});
   return send(502,{error:msg});
  }
 }

 const matchRewrite=path.match(/^\/items\/([a-f0-9-]{36})\/rewrite$/i);
 if(matchRewrite&&req.method==="POST"){
  const payload=await req.json().catch(()=>({}));
  const mode=String(payload.mode||"stronger");
  const modes:Record<string,string>={
   stronger:"Strengthen the astonishing factual hook without adding any details absent from the cited sources.",
   darker:"Give the true fact an atmospheric, cinematic tone. Do not fabricate anything.",
   shorter:"Shorten the factual hook while preserving precise names, dates and verifiable details.",
   twist:"Lead with the most astonishing sourced fact and make the context immediately understandable.",
   image:"Text must remain exactly the same; propose a cinematic AI-generated historical illustration explicitly not claiming to be an archival photograph."
  };
  if(!(mode in modes))return send(400,{error:"Invalid rewrite mode"});
  const [old]=await db("darkfactory_items?select=*&id=eq."+matchRewrite[1]+"&limit=1");
  if(!old)return send(404,{error:"Not found"});
  const result=await aiJson(DARK_WRITER, "Here is a verified astonishing scientific or natural fact requiring evidence-backed editing: "+JSON.stringify({title:old.title,hook:old.hook,body:old.body,punch:old.punch,dialogue:old.dialogue,topic:old.topic})+" Instruction: "+modes[mode]+" Return JSON {item:{title,hook,body,punch,topic,dialogue,caption_instagram,caption_instagram_en,title_en,hook_en,body_en,caption_telegram,caption_telegram_en,source_urls,visual_prompt,visual_prompt_en}}. Do not invent claims or sources. No explanations.",1800);
  const v=result.item||result;
  const patch:any=mode==="image" ? {visual_prompt:str(v.visual_prompt,700)||pickVisual(old,Math.floor(Math.random()*10)),art_variant:(old.art_variant+1+Math.floor(Math.random()*4))%64,scene_variant:(old.scene_variant+1+Math.floor(Math.random()*4))%64}
     :clean({...old,...v},false);
  if(mode!=="image"&&old.format_mode!=="manual")patch.format_type="card";
  patch.format_mode=old.format_mode;
  patch.scene_variant=(old.scene_variant+1+Math.floor(Math.random()*6))%64;
  patch.status_instagram="review";patch.status_telegram="review";patch.status_telegram_en="review";patch.fact_verification="unverified";patch.updated_at=new Date().toISOString();
  const updated=await db("darkfactory_items?id=eq."+matchRewrite[1],"PATCH",patch);
  if(updated.length)await db("darkfactory_reviews","POST",{item_id:matchRewrite[1],actor_id:id,action:"ai_"+mode,
   changed_fields:mode==="image"?["visual_prompt","art_variant","scene_variant"]:["title","hook","body","punch","format_type"],
   status_instagram:"review",status_telegram:"review",snapshot:{title:updated[0].title,punch:updated[0].punch}});
  return send(200,{item:updated[0]});
 }
 const match=path.match(/^\/items\/([a-f0-9-]{36})$/i);
 if(match&&req.method==="PATCH"){
  const raw=await req.json();
  const row=clean(raw,true);
  if(!Object.keys(row).length)return send(400,{error:"No changes"});


  const contentFields=["title","hook","body","punch","title_en","hook_en","body_en","source_urls"];
  const visualFields=["visual_prompt","visual_prompt_en","theme_variant","format_type","art_variant","scene_variant"];
  const copyFields=["caption_instagram","caption_instagram_en","caption_telegram","caption_telegram_en"];
  const reviewFields=["status_instagram","status_telegram","status_telegram_en"];
  const [old]=await db("darkfactory_items?select=*&id=eq."+match[1]+"&limit=1");
  if(!old)return send(404,{error:"Not found"});
  const changed=Object.keys(row).filter(k=>JSON.stringify(row[k])!==JSON.stringify(old[k]));
  if(changed.length===0)return send(200,{item:old,unchanged:true});
  const substantive=changed.filter(k=>contentFields.includes(k)||visualFields.includes(k)||copyFields.includes(k));
  const needsReview=substantive.length>0;
  const essential=changed.some(k=>contentFields.includes(k));
  if(needsReview){
   row.status_instagram="review";
   row.status_telegram="review";
   row.status_telegram_en="review";
   if(essential)row.fact_verification="unverified";
  }
  if((row.status_instagram==="approved"||row.status_telegram==="approved"||row.status_telegram_en==="approved")){
   const [currentRow]=await db("darkfactory_items?select=fact_verification,visual_status,source_urls,caption_instagram_en,caption_telegram,caption_telegram_en&limit=1&id=eq."+match[1]);
   if(!currentRow||currentRow.fact_verification!=="verified"||currentRow.visual_status!=="ready"||(currentRow.source_urls||[]).length<2||!currentRow.caption_instagram_en||!currentRow.caption_telegram||(row.status_telegram_en==="approved"&&!currentRow.caption_telegram_en))return send(409,{error:"Публикация требует двух источников, подтверждённого факта, EN-текста и готового изображения"});
  }
  if("status_instagram"in row||"status_telegram"in row||"status_telegram_en"in row){row.reviewed_by=id;row.reviewed_at=new Date().toISOString()}
  row.updated_at=new Date().toISOString();
  const found=await db("darkfactory_items?id=eq."+match[1],"PATCH",row);
  if(found.length&&needsReview){
   // Cancel only after the revision has actually been committed.
   await db("darkfactory_publish_queue?item_id=eq."+match[1]+"&status=in.(scheduled,blocked)","PATCH",{
    status:"cancelled",error:"Edited after approval; requires reapproval",updated_at:new Date().toISOString()
   });
  }

  if(found.length){
   const action=changed.length?"revision":"review";
   await db("darkfactory_reviews","POST",{item_id:match[1],actor_id:id,action,
    changed_fields:changed.length?changed:Object.keys(row).filter(k=>k.startsWith("status_")),
    status_instagram:found[0].status_instagram,status_telegram:found[0].status_telegram,
    snapshot:{title:found[0].title,format:found[0].format_type,punch:found[0].punch,theme:found[0].theme_variant}});
  }
  return found.length?send(200,{item:found[0]}):send(404,{error:"Not found"});
 }
 if(path==="/lock"&&req.method==="POST"){
  const tok=req.headers.get("x-darkfactory-session")||"";
  await db("darkfactory_sessions?user_id=eq."+id+"&token_hash=eq."+await hash(tok),"DELETE");
  return send(200,{ok:true});
 }
 return send(404,{error:"Not found"});
 }catch(err){
 const msg=String(err?.message||err);
 const status=msg==="Unauthorized"?401:msg==="Forbidden"?403:msg==="Locked"?423:msg==="AI_UNAVAILABLE"?503:msg.startsWith("Database")||msg.startsWith("AI request failed")?502:400;
 console.error("darkfactory_api:",msg);
 return send(status,{error:status>=500?"Сервер временно недоступен":msg==="Locked"?"Введите дополнительный PIN":msg});
 }
});
