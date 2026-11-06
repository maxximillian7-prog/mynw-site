
const base=Deno.env.get("SUPABASE_URL")!,svc=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!;
const model=Deno.env.get("STUDIO_AI_MODEL")||"gpt-4.1-mini";
const available=()=>Boolean(Deno.env.get("OPENAI_API_KEY")?.trim());
const H={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type, x-studio-cron","Access-Control-Allow-Methods":"GET,POST,OPTIONS","X-Content-Type-Options":"nosniff"};
const reply=(status:number,obj:unknown)=>new Response(JSON.stringify(obj),{status,headers:H});
const idok=(x:any)=>typeof x==="string"&&/^[\da-f]{8}-[\da-f-]{27}$/i.test(x);
const lang=(x:any)=>["ru","pt-PT","en","uk","fr","de","es","it"].includes(x)?x:null;
const title=(x:any,max=180)=>{if(typeof x!=="string"||!x.trim()||x.length>max)throw Error("Invalid text");return x.trim()};
const sql=(s:any)=>encodeURIComponent(s);
async function db(path:string,config:RequestInit={}):Promise<any[]>{
 const r=await fetch(base+"/rest/v1/"+path,{...config,headers:{apikey:svc,Authorization:"Bearer "+svc,"Content-Type":"application/json","Prefer":"return=representation",...config.headers}});
 if(!r.ok){const t=await r.text();throw Error("DB "+r.status+" "+t.slice(0,180))}
 return await r.json();
}
async function rpc(name:string,data:any){
 const r=await fetch(base+"/rest/v1/rpc/"+name,{method:"POST",headers:{apikey:svc,Authorization:"Bearer "+svc,"Content-Type":"application/json"},body:JSON.stringify(data)});
 if(!r.ok)throw Error("RPC "+r.status);return await r.json();
}
async function user(req:Request){
 const t=req.headers.get("authorization")||"";
 if(!t.startsWith("Bearer "))throw Error("Unauthorized");
 const r=await fetch(base+"/auth/v1/user",{headers:{apikey:anon,Authorization:t}});
 if(!r.ok)throw Error("Unauthorized");
 const u=await r.json();if(!idok(u.id)||!u.email_confirmed_at)throw Error("Unauthorized");return u;
}
async function project(slug:string){
 const rows=await db("studio_projects?select=id,slug,name,default_locale&slug=eq."+sql(slug)+"&is_active=eq.true&limit=1");
 if(!rows.length)throw Error("Project not found");return rows[0];
}
async function member(projectId:string,userId:string,allowed:string[]){
 const [m]=await db("studio_memberships?select=role&project_id=eq."+projectId+"&user_id=eq."+userId+"&active=eq.true&limit=1");
 if(!m||!allowed.includes(m.role))throw Error("Forbidden");return m.role as string;
}
async function post(id:string,uid:string,roles:string[]){
 if(!idok(id))throw Error("Invalid post");
 const [p]=await db("studio_posts?select=*&id=eq."+id+"&limit=1");
 if(!p)throw Error("Post not found");
 const role=await member(p.project_id,uid,roles);
 if(role==="author"&&p.owner_user_id!==uid)throw Error("Forbidden");
 return {p,role};
}
async function persona(id:string,projectId:string){
 if(!idok(id))throw Error("Invalid AI author");
 const [a]=await db("studio_authors?select=id,project_id,name,kind,focus,voice_style,bio,tagline,preferred_locale,is_active&project_id=eq."+projectId+"&id=eq."+id+"&limit=1");
 if(!a||a.kind!=="ai"||!a.is_active)throw Error("AI author is unavailable");
 return a;
}
const textSchema={type:"object",additionalProperties:false,required:["title","summary","category","blocks"],properties:{
 title:{type:"string"},summary:{type:"string"},category:{type:"string"},
 blocks:{type:"array",items:{type:"object",additionalProperties:false,required:["type","text"],properties:{type:{type:"string",enum:["heading","text","quote"]},text:{type:"string"}}}}
}};
const translationSchema={type:"object",additionalProperties:false,required:["title","summary","translations"],properties:{
 title:{type:"string"},summary:{type:"string"},
 translations:{type:"array",items:{type:"object",additionalProperties:false,required:["index","field","text"],properties:{index:{type:"integer"},field:{type:"string"},text:{type:"string"}}}}
}};
async function llm(system:string,prompt:string,schema:any,formatName:string,maxTokens=3700){
 const key=Deno.env.get("OPENAI_API_KEY")?.trim();
 if(!key)throw Error("AI_PROVIDER_NOT_CONFIGURED");
 const r=await fetch("https://api.openai.com/v1/chat/completions",{
  method:"POST",signal:AbortSignal.timeout(85000),
  headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},
  body:JSON.stringify({model,temperature:0.65,max_completion_tokens:maxTokens,
   messages:[{role:"system",content:system},{role:"user",content:prompt}],
   response_format:{type:"json_schema",json_schema:{name:formatName,strict:true,schema}}})
 });
 if(!r.ok){const t=await r.text();throw Error("AI_PROVIDER_"+r.status+": "+t.slice(0,150))}
 const obj=await r.json();
 const message=obj.choices?.[0]?.message;
 if(message?.refusal)throw Error("AI_PROVIDER_REFUSAL");
 if(!message?.content)throw Error("Empty AI response");
 let body;try{body=JSON.parse(message.content)}catch{throw Error("Invalid AI JSON response")}
 return {body,usage:obj.usage||{}};
}
async function finish(jobId:string,status:string,update:any={}){
 await db("studio_ai_jobs?id=eq."+jobId,{method:"PATCH",body:JSON.stringify({status,finished_at:new Date().toISOString(),...update})});
}
const toBlocks=(arr:any,limit=35)=>{
 if(!Array.isArray(arr)||!arr.length||arr.length>limit)throw Error("Malformed article");
 return arr.map(x=>{
  if(!x||!["heading","text","quote"].includes(x.type)||typeof x.text!=="string"||x.text.length>8000||!x.text.trim())throw Error("Invalid content");
  return {type:x.type,text:x.text.trim()}
 });
};
async function generateJob(j:any){
 const a=await persona(j.author_id,j.project_id);
 const [p]=await db("studio_projects?select=slug,name&id=eq."+j.project_id+"&limit=1");
 if(!p)throw Error("Project unavailable");
 const recent=await db("studio_posts?select=title&project_id=eq."+j.project_id+"&author_id=eq."+a.id+"&order=created_at.desc&limit=12");
 const topic=(j.topic||"").trim().slice(0,500);
 const language=lang(j.target_locale)||"ru";
 const prompt=[
  "Write one fresh, helpful gardening editorial article in language "+language+".",
  "Persona: "+a.name+". Focus: "+a.focus+". Bio: "+a.bio+". Voice: "+a.voice_style+".",
  topic?"REQUIRED REQUESTED TOPIC: "+topic:"Choose an original, useful, concrete idea based on the author's focus, season-aware but not dependent on unverified current weather.",
  "Avoid near-duplicates of these titles: "+recent.map(x=>x.title).join(" | "),
  "Write 450-800 words split across 6-12 blocks with headings and short clear paragraphs. Summary 100-240 characters.",
  "No invented expert experience, personal real-world memories, scientific studies, URLs or sources.",
  "Plant care varies by species, climate and season; express uncertainty where applicable. No dangerous pesticides or toxic mixtures.",
  "Output only the requested JSON fields title, summary, category, blocks."
 ].join("\n");
 const r=await llm("You are a skilled AI gardening magazine writer. You are clearly an AI persona. Never pretend to be a human with lived gardening experience. Follow the topic and style carefully. Return structured JSON.",prompt,textSchema,"journal_article",4600);
 const obj=r.body,blocks=toBlocks(obj.blocks);
 const name=title(obj.title,200),summary=String(obj.summary||"").slice(0,400),category=String(obj.category||"").slice(0,70);
 const [post]=await db("studio_posts",{method:"POST",body:JSON.stringify({
  project_id:j.project_id,owner_user_id:j.requested_by,author_id:a.id,slug:crypto.randomUUID(),
  title:name,summary,category,locale:language,blocks,status:"draft",template_id:"editorial"
 })});
 await db("studio_placements?on_conflict=post_id,channel,locale",{method:"POST",headers:{"Prefer":"resolution=ignore-duplicates,return=representation"},body:JSON.stringify({post_id:post.id,channel:p.slug,locale:language})});
 await finish(j.id,"completed",{post_id:post.id,input_tokens:r.usage.prompt_tokens||null,output_tokens:r.usage.completion_tokens||null,output:{title:name,author:a.name,source:"AI",requires_editor_approval:true}});
 return {post_id:post.id,title:name,author:a.name,locale:language};
}
function translationFields(blocks:any[]){
 const entries:any[]=[];
 blocks.forEach((block,index)=>{
  const fields=block.type==="image"?["caption","alt"]:block.type==="link"?["label"]:["text"];
  for(const field of fields)if(typeof block[field]==="string"&&block[field].trim())entries.push({index,field,text:block[field]});
 });
 return entries;
}
async function translateJob(j:any){
 if(!idok(j.source_post_id))throw Error("Missing source article");
 const [p]=await db("studio_posts?select=*&id=eq."+j.source_post_id+"&project_id=eq."+j.project_id+"&limit=1");
 if(!p||!["draft","changes_requested","in_review","approved","scheduled","published"].includes(p.status))throw Error("Translation requires an approved or editable article");
 const target=lang(j.target_locale);if(!target||target===p.locale)throw Error("Select a different target language");
 const fields=translationFields(p.blocks||[]);
 if(fields.length>80)throw Error("Too many article blocks for one translation");
 const system="Expert professional translator, preserve factual meaning and headings, native fluency for locale "+target+". Preserve each source index and field name EXACTLY, never add or omit entries; return JSON only. Never translate URLs, IDs or media.";
 const data=JSON.stringify({from:p.locale,to:target,title:p.title,summary:p.summary,entries:fields});
 if(data.length>26000)throw Error("Article exceeds translation size limit");
 const r=await llm(system,data,translationSchema,"journal_translation",4700);
 const output=r.body,arr=output.translations;
 if(!Array.isArray(arr)||arr.length!==fields.length)throw Error("Translated field count mismatch");
 for(let i=0;i<fields.length;i++){
  const original=fields[i],translated=arr[i];
  if(translated?.index!==original.index||translated.field!==original.field||typeof translated.text!=="string"||translated.text.length>9000)
   throw Error("Translation structure mismatch");
 }
 const translatedBlocks=structuredClone(p.blocks);
 for(const t of arr)translatedBlocks[t.index][t.field]=t.text.trim();
 const newTitle=title(output.title,200),newSummary=String(output.summary||"").slice(0,400);
 const [fresh]=await db("studio_posts?select=revision,status& id=eq.".replace("& ","&")+p.id+"&limit=1");
 if(!fresh||fresh.revision!==p.revision)throw Error("Source article changed during translation");
 const body={post_id:p.id,locale:target,source_revision:p.revision,title:newTitle,summary:newSummary,
  blocks:translatedBlocks,status:"draft",model,requested_by:j.requested_by,reviewed_at:null,reviewed_by:null,updated_at:new Date().toISOString()};
 await db("studio_ai_translations?on_conflict=post_id,locale",{
  method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=representation"},body:JSON.stringify(body)});
 await finish(j.id,"completed",{post_id:p.id,source_post_id:p.id,input_tokens:r.usage.prompt_tokens||null,output_tokens:r.usage.completion_tokens||null,output:{locale:target,source_revision:p.revision,requires_editor_review:true}});
 return {post_id:p.id,locale:target,translated:true,status:"draft"};
}
async function runJob(jobId:string){
 const j=await rpc("studio_claim_ai_job",{p_job:jobId});
 if(!j)return {skipped:true};
 try{return j.kind==="translate"?await translateJob(j):await generateJob(j)}
 catch(e){const m=String(e instanceof Error?e.message:e);const blocked=m.includes("AI_PROVIDER_NOT_CONFIGURED");
  await finish(j.id,blocked?"blocked":"failed",{error:blocked?"OpenAI API key has not been configured":m.slice(0,450)});
  return {error:blocked?"API key not configured":m.slice(0,180),job_id:j.id,blocked};
 }
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:H});
 try{
 const u=new URL(req.url),path=u.pathname.split("/").filter(Boolean),ix=path.indexOf("studio-ai"),action=path.slice(ix+1).join("/");
 if(action==="tick"&&req.method==="POST"){
  const token=req.headers.get("x-studio-cron")||"";
  if(token.length!==64||await rpc("studio_verify_ai_worker",{p_token:token})!==true)return reply(403,{error:"Forbidden"});
  const pending=await db("studio_ai_jobs?select=id&status=eq.pending&scheduled_for=lte."+encodeURIComponent(new Date().toISOString())+"&order=scheduled_for.asc&limit=3");
  const results=[];for(const j of pending)results.push(await runJob(j.id));
  return reply(200,{processed:results.length,results});
 }
 const caller=await user(req);
 if(action==="health"&&req.method==="GET")return reply(200,{provider_configured:available(),model,automatic_queue_available:true,editor_approval_required:true});
 if(action==="jobs"&&req.method==="GET"){
  const pr=await project(title(u.searchParams.get("project"),48));const role=await member(pr.id,caller.id,["owner","chief_editor","editor","author"]);
  const filter=role==="author"?"&requested_by=eq."+caller.id:"";
  return reply(200,{jobs:await db("studio_ai_jobs?select=id,kind,topic,status,error,post_id,source_post_id,target_locale,author_id,created_at,finished_at,input_tokens,output_tokens&project_id=eq."+pr.id+filter+"&order=created_at.desc&limit=35")});
 }
 if(action==="schedules"&&req.method==="GET"){
  const pr=await project(title(u.searchParams.get("project"),48));
  await member(pr.id,caller.id,["owner","chief_editor","editor"]);
  return reply(200,{schedules:await db("studio_ai_schedules?select=id,author_id,enabled,locale,topic_hint,cadence_days,monthly_limit,next_run_at&project_id=eq."+pr.id+"&order=created_at.asc")});
 }
 if(action==="schedule"&&req.method==="POST"){
  const b=await req.json(),pr=await project(title(b.project,48));
  await member(pr.id,caller.id,["owner","chief_editor"]);
  const a=await persona(b.author_id,pr.id),enabled=b.enabled===true;
  if(enabled&&!available())throw Error("AI_PROVIDER_NOT_CONFIGURED");
  const locale=lang(b.locale)||"ru",cadence=Number(b.cadence_days||7),monthly=Number(b.monthly_limit||4);
  if(!Number.isInteger(cadence)||cadence<1||cadence>30||!Number.isInteger(monthly)||monthly<1||monthly>31)throw Error("Invalid schedule limits");
  const hint=String(b.topic_hint||"").slice(0,320);
  const first=new Date(Date.now()+24*3600000).toISOString();
  const rows=await db("studio_ai_schedules?on_conflict=project_id,author_id",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=representation"},body:JSON.stringify({
   project_id:pr.id,author_id:a.id,created_by:caller.id,enabled,locale,topic_hint:hint,cadence_days:cadence,monthly_limit:monthly,next_run_at:first,updated_at:new Date().toISOString()
  })});
  return reply(200,{schedule:rows[0]});
 }
 if(action==="generate"&&req.method==="POST"){
  const b=await req.json(),pr=await project(title(b.project,48));await member(pr.id,caller.id,["owner","chief_editor","editor"]);
  if(!available())throw Error("AI_PROVIDER_NOT_CONFIGURED");
  const personaRecord=await persona(b.author_id,pr.id);
  const locale=lang(b.locale)||personaRecord.preferred_locale||"ru";
  const topic=String(b.topic||"").slice(0,450);
  const [job]=await db("studio_ai_jobs",{method:"POST",body:JSON.stringify({kind:"generate",project_id:pr.id,requested_by:caller.id,author_id:personaRecord.id,topic,target_locale:locale,model,status:"pending",options:{origin:topic?"by_topic":"auto_topic"}})});
  const result=await runJob(job.id);
  return reply(result.error?503:200,{...result,job_id:job.id});
 }
 // Generate an unpublished, editor-reviewed profile translation draft.
 if(action==="translate-author-profile"&&req.method==="POST"){
  const b=await req.json(),pr=await project(title(b.project,48));
  await member(pr.id,caller.id,["owner","chief_editor","editor"]);
  if(!available())throw Error("AI_PROVIDER_NOT_CONFIGURED");
  if(!idok(b.author_id))throw Error("Invalid author");
  const [a]=await db("studio_authors?select=id,name,kind,tagline,bio,focus,preferred_locale,is_active&project_id=eq."+pr.id+"&id=eq."+b.author_id+"&limit=1");
  if(!a||!a.is_active)throw Error("Author not found");
  const target=lang(b.locale);
  if(!target||target===(a.preferred_locale||"ru"))throw Error("Choose another target language");
  const keys=["name","tagline","bio","focus"];
  const schema={type:"object",additionalProperties:false,required:keys,properties:Object.fromEntries(keys.map(k=>[k,{type:"string"}]))};
  const source={name:String(a.name||""),tagline:String(a.tagline||""),bio:String(a.bio||""),focus:String(a.focus||"")};
  const system="Translate a public author profile faithfully into target locale "+target+
   ". Use European Portuguese for pt-PT. Preserve personal facts, proper names, channel brands, and identity; do not invent credentials or experience. Preserve empty source fields. Translate names only when appropriate; avoid translating contact details and URLs. Return precisely four JSON string fields.";
  const result=await llm(system,JSON.stringify({sourceLocale:a.preferred_locale||"ru",targetLocale:target,source}),schema,"studio_author_profile_translation",2300);
  const draft:any={},limits={name:100,tagline:200,bio:4000,focus:900};
  for(const key of keys){
   const value=result.body?.[key];
   if(typeof value!=="string"||value.length>limits[key])throw Error("Translation field invalid: "+key);
   draft[key]=source[key]?value.trim():"";
  }
  return reply(200,{draft,model,input_tokens:result.usage.prompt_tokens||null,output_tokens:result.usage.completion_tokens||null,requires_human_review:true});
 }
 if(action==="translate-topic"&&req.method==="POST"){
   const b=await req.json(),pr=await project(title(b.project,48));
   await member(pr.id,caller.id,["owner","chief_editor","editor"]);
   if(!available())throw Error("AI_PROVIDER_NOT_CONFIGURED");
   const source=lang(b.locale)||"ru",textValue=title(b.title,100);
   const locales=["ru","uk","en","pt-PT","es","fr","de","it"];
   const fields=Object.fromEntries(locales.map(locale=>[locale,{type:"string"}]));
   const schema={type:"object",additionalProperties:false,required:locales,properties:fields};
   const prompt=JSON.stringify({sourceLocale:source,sourceText:textValue,targetLocales:locales});
   const system="Translate the short editorial gardening topic title into ALL eight target languages, naturally, preserving botanical meaning. Use European Portuguese for pt-PT. If the source locale equals the target, reproduce the original text unchanged. Return precisely eight JSON keys without additional data.";
   const translated=await llm(system,prompt,schema,"studio_topic_languages",850);
   for(const key of locales){
    const value=translated.body?.[key];
    if(typeof value!=="string"||!value.trim()||value.length>100)throw Error("Translation incomplete");
   }
   return reply(200,{translations:translated.body,model,input_tokens:translated.usage.prompt_tokens||null,output_tokens:translated.usage.completion_tokens||null,requires_human_review:true});
  }
  if(action==="translate"&&req.method==="POST"){
  const b=await req.json(),{p}=await post(b.post_id,caller.id,["owner","chief_editor","editor"]);
  if(!["draft","changes_requested","in_review","approved","scheduled","published"].includes(p.status))throw Error("Article is unavailable for translation");
  if(!available())throw Error("AI_PROVIDER_NOT_CONFIGURED");
  const locale=lang(b.locale);if(!locale||locale===p.locale)throw Error("Different translation language required");
  const [job]=await db("studio_ai_jobs",{method:"POST",body:JSON.stringify({
   kind:"translate",project_id:p.project_id,requested_by:caller.id,source_post_id:p.id,
   topic:"Translation "+p.locale+" → "+locale,target_locale:locale,model,status:"pending"
  })});
  const result=await runJob(job.id);
  return reply(result.error?503:200,{...result,job_id:job.id});
 }
 if(action==="translations"&&req.method==="GET"){
  const {p}=await post(title(u.searchParams.get("post_id"),50),caller.id,["owner","chief_editor","editor","reviewer","author"]);
  return reply(200,{translations:await db("studio_ai_translations?select=locale,source_revision,title,summary,blocks,status,updated_at,reviewed_at&post_id=eq."+p.id+"&order=locale.asc")});
 }
 if(action==="review-all-translations"&&req.method==="POST"){
  const b=await req.json(),{p}=await post(b.post_id,caller.id,["owner","chief_editor"]);
  const rev=["published","approved","scheduled"].includes(p.status)?(p.approved_revision||p.revision):p.revision;
  if(!Number.isInteger(b.source_revision)||b.source_revision!==rev)
    throw Error("Редакция изменилась. Обновите переводы.");
  const result=await rpc("studio_approve_all_translations_v1",{
    p_post_id:p.id,p_actor_id:caller.id,p_expected_revision:rev
  });
  if(result?.reviewed!==true||result.languages_ready!==8)throw Error("Не все переводы подтверждены");
  return reply(200,result);
 }
 if(action==="review-translation"&&req.method==="POST"){
  const b=await req.json(),{p}=await post(b.post_id,caller.id,["owner","chief_editor"]);
  if(!["draft","changes_requested","in_review","approved","scheduled","published"].includes(p.status))throw Error("Article locked");
  const locale=lang(b.locale);if(!locale)throw Error("Language not supported");
  const [trans]=await db("studio_ai_translations?select=source_revision,status&post_id=eq."+p.id+"&locale=eq."+locale+"&limit=1");
  const expectedRevision=["published","approved","scheduled"].includes(p.status)?
       (p.approved_revision||p.revision):p.revision;
   if(!trans)throw Error("Existing translation not found");
   if(locale===p.locale)throw Error("Source language cannot be approved as a translation");
   if(trans.source_revision!==expectedRevision){
     if(b.reuse_existing!==true||!Number.isInteger(b.source_revision)||
        b.source_revision!==expectedRevision||!Number.isInteger(b.previous_source_revision)||
        b.previous_source_revision!==trans.source_revision)
       throw Error("Translation is stale. Open it and explicitly approve reuse for the current revision");
     const reused=await rpc("studio_reapprove_translation_v1",{
       p_post_id:p.id,p_actor_id:caller.id,p_locale:locale,
       p_expected_revision:expectedRevision,p_translation_revision:trans.source_revision
     });
     if(reused?.reviewed!==true||reused?.reused!==true)
       throw Error("The server did not confirm reapproval");
     return reply(200,reused);
   }
  const rows=await db("studio_ai_translations?post_id=eq."+p.id+"&locale=eq."+locale,{method:"PATCH",body:JSON.stringify({status:"reviewed",reviewed_by:caller.id,reviewed_at:new Date().toISOString()})});
  if(rows.length){
    const [origin]=await db("studio_projects?select=slug&id=eq."+p.project_id+"&limit=1");
    if(origin)await db("studio_placements?on_conflict=post_id,channel,locale",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=representation"},body:JSON.stringify({post_id:p.id,channel:origin.slug,locale,status:p.status==="published"?"ready":"requested"})});
  }
  return reply(200,{reviewed:!!rows.length});
 }
 return reply(404,{error:"Unknown AI route"});
 }catch(e){
  const m=String(e instanceof Error?e.message:e);
  return reply(m==="Unauthorized"?401:m==="Forbidden"?403:m==="AI_PROVIDER_NOT_CONFIGURED"?503:400,
   {error:m==="AI_PROVIDER_NOT_CONFIGURED"?"AI provider is not yet configured. Set OPENAI_API_KEY in Supabase Edge Function Secrets.":m.slice(0,220)});
 }
});
