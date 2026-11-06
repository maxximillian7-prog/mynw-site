
type J=Record<string,unknown>;
const base=Deno.env.get("SUPABASE_URL")!,service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!;
const headers={"Content-Type":"application/json","Cache-Control":"no-store","Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, apikey, content-type","Access-Control-Allow-Methods":"GET,POST,PATCH,DELETE,OPTIONS","X-Content-Type-Options":"nosniff"};
const reply=(status:number,obj:unknown)=>new Response(JSON.stringify(obj),{status,headers});
const idok=(s:unknown)=>typeof s==="string"&&/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s);
const txt=(v:unknown,n=300)=>{if(typeof v!=="string"||!v.trim()||v.length>n)throw Error("Некорректное поле");return v.trim()};
const isedit=(r:string)=>["owner","chief_editor","editor"].includes(r);
const can=(r:string,...allowed:string[])=>{if(!allowed.includes(r))throw Error("Forbidden");};
async function db(path:string,opt:RequestInit={}):Promise<any[]>{
 const resp=await fetch(base+"/rest/v1/"+path,{...opt,headers:{"apikey":service,"Authorization":"Bearer "+service,"Content-Type":"application/json","Prefer":"return=representation",...opt.headers}});
 if(!resp.ok)throw Error("DB_ERROR_"+resp.status);
 return await resp.json();
}
async function rpc(path:string,body:J){
 const r=await fetch(base+"/rest/v1/rpc/"+path,{method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"},body:JSON.stringify(body)});
 if(!r.ok)throw Error("RPC_ERROR");return await r.json();
}
async function user(req:Request){
 const t=req.headers.get("authorization")||"";
 if(!t.startsWith("Bearer "))throw Error("Unauthorized");
 const r=await fetch(base+"/auth/v1/user",{headers:{apikey:anon,Authorization:t}});
 if(!r.ok)throw Error("Unauthorized");
 const u=await r.json();if(!u.id)throw Error("Unauthorized");return u;
}
async function member(p:string,u:string){
 const r=await db("studio_memberships?select=role&project_id=eq."+encodeURIComponent(p)+"&user_id=eq."+encodeURIComponent(u)+"&active=eq.true&limit=1");
 return r[0]?.role||"";
}
async function proj(slug:string){
 const r=await db("studio_projects?select=id,name,slug,default_locale&slug=eq."+encodeURIComponent(slug)+"&is_active=eq.true&limit=1");if(!r.length)throw Error("Project unavailable");return r[0];
}
async function post(postid:string,userid:string){
 if(!idok(postid))throw Error("Invalid post id");
 const [p]=await db("studio_posts?select=*&id=eq."+postid+"&deleted_at=is.null&limit=1");if(!p)throw Error("Not found");
 const role=await member(p.project_id,userid);if(!role)throw Error("Forbidden");
 if(role==="author"&&p.owner_user_id!==userid)throw Error("Forbidden");return {p,role};
}
async function checkedTopic(raw:unknown,pid:string):Promise<string|null>{
 if(raw===undefined||raw===null||raw==="")return null;
 if(!idok(raw))throw Error("Invalid topic id");
 const [t]=await db("studio_topics?select=id&project_id=eq."+pid+"&id=eq."+raw+"&is_active=eq.true&limit=1");
 if(!t)throw Error("Topic not available in this project");
 return t.id;
}
async function checkedTopicMedia(raw:unknown,pid:string):Promise<string|null>{
 if(raw===undefined||raw===null||raw==="")return null;
 if(!idok(raw))throw Error("Invalid topic image id");
 const [a]=await db("studio_media_assets?select=id,rights_confirmed&project_id=eq."+pid+"&id=eq."+raw+"&limit=1");
 if(!a||!a.rights_confirmed)throw Error("Topic image rights not approved");
 return a.id;
}
function blocks(b:unknown){
 if(!Array.isArray(b)||b.length>80)throw Error("Invalid content");
 for(const x of b){
  if(!x||typeof x!=="object"||!["heading","text","quote","image","link"].includes(x.type)||JSON.stringify(x).length>30000)throw Error("Invalid content block");
  if(x.crop!==undefined){
   const c=x.crop;
   if(!c||typeof c!=="object"||!Number.isFinite(c.x)||!Number.isFinite(c.y)||!Number.isFinite(c.zoom)||c.x<0||c.x>100||c.y<0||c.y>100||c.zoom<100||c.zoom>250||!["auto","1:1","4:5","16:9"].includes(c.aspect))throw Error("Invalid image crop");
  }
  if(x.type==="link"&&x.url&&!/^https:\/\//.test(String(x.url)))throw Error("HTTPS links only");
  if(x.type==="image"&&!idok(x.asset_id))throw Error("Image asset missing");
 }return b;
}
async function validateCover(value:unknown,projectId:string,userId:string,role:string){
 if(value===null||value===""||value===undefined)return null;
 if(!idok(value))throw Error("Invalid cover asset");
 const [file]=await db("studio_media_assets?select=id,uploader_id,rights_confirmed&project_id=eq."+projectId+"&id=eq."+value+"&limit=1");
 if(!file||!file.rights_confirmed||(!isedit(role)&&file.uploader_id!==userId))throw Error("Cover image not available");
 return file.id;
}

const renditions=["thumb","article","cover"] as const;
const renditionLimit:Record<string,number>={thumb:800000,article:1600000,cover:2200000};
function decodeWebp(encoded:unknown,which:string):Uint8Array{
 if(typeof encoded!=="string"||encoded.length<40||encoded.length>3200000)throw Error("Invalid compressed image payload");
 let str:string;try{str=atob(encoded)}catch{throw Error("Invalid image encoding")}
 if(str.length<80||str.length>renditionLimit[which])throw Error("Compressed "+which+" image size is out of range");
 const data=Uint8Array.from(str,x=>x.charCodeAt(0));
 if(String.fromCharCode(...data.slice(0,4))!=="RIFF"||String.fromCharCode(...data.slice(8,12))!=="WEBP")throw Error("Only WebP variants are supported");
 const declared=data[4]+(data[5]<<8)+(data[6]<<16)+(data[7]<<24);
 if(declared!==data.length-8)throw Error("Invalid WebP container length");
 const chunk=String.fromCharCode(...data.slice(12,16));
 if(!["VP8 ","VP8L","VP8X"].includes(chunk))throw Error("WebP image data missing");
 return data;
}
async function uploadPrivate(path:string,body:Uint8Array){
 const res=await fetch(base+"/storage/v1/object/studio-private/"+path,{
  method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"image/webp","x-upsert":"true"},body
 });
 if(!res.ok)throw Error("Optimized image upload failed: "+res.status);
}
async function privatePathExists(path:string){
 const response=await fetch(base+"/storage/v1/object/studio-private/"+path,{
  method:"HEAD",headers:{apikey:service,Authorization:"Bearer "+service}
 });
 return response.ok;
}
async function deletePrivate(path:string){
 const response=await fetch(base+"/storage/v1/object/studio-private/"+path,{
  method:"DELETE",headers:{apikey:service,Authorization:"Bearer "+service}
 });
 if(!response.ok&&response.status!==404)throw Error("Unable to remove original: "+response.status);
}
async function signedMediaPath(path:string,seconds=600){
 const response=await fetch(base+"/storage/v1/object/sign/studio-private/"+path,{method:"POST",
  headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"},body:JSON.stringify({expiresIn:seconds})});
 if(!response.ok)throw Error("Unable to sign image: "+response.status);
 const signed=await response.json(),raw=signed.signedURL||signed.signedUrl;
 if(typeof raw!=="string"||!raw)throw Error("Signed image URL unavailable");
 return /^https:\/\//i.test(raw)?raw:base+(raw.startsWith("/storage/v1/")?"":"/storage/v1")+(raw.startsWith("/")?raw:"/"+raw);
}
function mediaSummary(m:any){
 const v=m.optimized_variants||{};
 const summary:any={status:m.optimization_status||"pending",original_bytes:m.original_bytes||null,original_deleted:!!m.original_deleted_at,variants:{}};
 for(const k of renditions)if(v[k])summary.variants[k]={bytes:v[k].bytes,width:v[k].width,height:v[k].height};
 return summary;
}
async function pruneOriginal(m:any):Promise<boolean>{
 const canDelete=await rpc("studio_can_prune_original",{p_asset:m.id});
 if(canDelete!==true)return false;
 const all=m.optimized_variants||{};
 for(const k of renditions){
  const v=all[k];
  if(!v?.path||!v.bytes||!await privatePathExists(v.path))return false;
 }
 try{
  await deletePrivate(m.storage_path);
  await db("studio_media_assets?id=eq."+m.id+"&original_deleted_at=is.null",{
   method:"PATCH",body:JSON.stringify({original_deleted_at:new Date().toISOString()})
  });
  return true;
 }catch(e){
  console.warn("Original retained after release: "+String(e));
  return false;
 }
}
function assetReferences(snap:any):string[]{
 const ids=new Set<string>();
 const add=(version:any)=>{
  if(!version)return;
  if(idok(version.cover_path))ids.add(version.cover_path);
  for(const b of version.blocks||[])if(b.type==="image"&&idok(b.asset_id))ids.add(b.asset_id);
 };
 add(snap);for(const v of snap.channel_versions||[])add(v);for(const v of snap.translations||[])add(v);
 return [...ids];
}
async function cleanupPublishedMedia(p:any):Promise<void>{
 try{
  const [approved]=await db("studio_post_versions?select=snapshot&post_id=eq."+p.id+"&revision=eq."+p.approved_revision+"&limit=1");
  const ids=assetReferences(approved?.snapshot||p);
  for(const id of ids){
   const [m]=await db("studio_media_assets?select=*&project_id=eq."+p.project_id+"&id=eq."+id+"&limit=1");
   if(m)await pruneOriginal(m);
  }
 }catch(e){console.warn("Media cleanup deferred: "+String(e))}
}

async function requireEightTranslations(p:any):Promise<void>{
 if(!["ru","uk","en","pt-PT","es","fr","de","it"].includes(p.locale))
   throw Error("Неподдерживаемый исходный язык");
 const missing=await rpc("studio_missing_translations_v1",{
  p_post_id:p.id,p_expected_revision:p.approved_revision,p_source_locale:p.locale
 });
 if(!Array.isArray(missing))throw Error("Не удалось проверить утверждённые переводы");
 if(missing.length)throw Error("Публикация заблокирована. Отсутствуют актуальные утверждённые переводы: "+missing.join(", "));
}

async function reviewAction(p:any,role:string,uid:string,action:string,data:any){
 let next:any={updated_at:new Date().toISOString()};
 if(["submit","approve","publish","schedule","request_changes"].includes(action) && Number(data.expected_revision)!==p.revision)throw Error("Article changed on server. Reopen the latest revision before review action.");
 if(action==="submit"){
  if(p.owner_user_id!==uid&&!isedit(role))throw Error("Forbidden");
  if(!["draft","changes_requested"].includes(p.status))throw Error("Not editable");
  const selected=String(data.submitted_channel||"base");
  if(!["base","website","instagram","nowgreen","nowcook","nowwhat","nowkids","wordpress"].includes(selected))throw Error("Invalid submitted edition");
  if(selected!=="base"){
   const variants=await db("studio_channel_versions?select=channel,locale,updated_at&post_id=eq."+p.id+"&channel=eq."+selected+"&locale=eq."+p.locale+"&limit=1");
   if(!variants.length)throw Error("Selected edition is not saved. Save it before sending for review.");
  }
  next.review_channel=selected;
  next.status="in_review";
 }else if(action==="request_changes"){
  can(role,"owner","chief_editor","editor");
  if(p.status!=="in_review")throw Error("Not in review");
  txt(data.note,1200);
  next.status="changes_requested";
 }else if(action==="approve"){
  can(role,"owner","chief_editor");if(p.status!=="in_review")throw Error("Not in review");
  const all=[...(p.blocks||[]).filter((x:any)=>x.type==="image").map((x:any)=>x.asset_id),...(p.cover_path?[p.cover_path]:[])];
  const unique=[...new Set(all)];if(unique.length){
   const m=await db("studio_media_assets?select=id,rights_confirmed&project_id=eq."+p.project_id+"&id=in.("+unique.join(",")+")");
   if(m.length!==unique.length||m.some((v:any)=>!v.rights_confirmed))throw Error("Photo rights not verified");
  }
  if(p.author_id){
   const [a]=await db("studio_authors?select=kind,consent_status&project_id=eq."+p.project_id+"&id=eq."+p.author_id);
   if(!a)throw Error("Привязанный к статье автор не найден. Проверьте профиль в разделе «Авторы».");
    if(a.kind==="partner"&&a.consent_status!=="approved")
     throw Error("Согласие приглашённого автора не подтверждено. Откройте «Авторы → Проверить права» и укажите документальное основание.");
  }
  const versions=await db("studio_channel_versions?select=channel,locale,title,summary,caption,blocks,template_id,cover_path&post_id=eq."+p.id);
  const translations=await db("studio_ai_translations?select=locale,title,summary,blocks,source_revision,status&post_id=eq."+p.id+"&source_revision=eq."+p.revision+"&status=eq.reviewed");
  const snapshot={id:p.id,project_id:p.project_id,revision:p.revision,title:p.title,summary:p.summary,blocks:p.blocks,cover_path:p.cover_path,author_id:p.author_id,locale:p.locale,category:p.category,topic_id:p.topic_id,template_id:p.template_id,channel_versions:versions,translations};
  const hash=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(JSON.stringify(snapshot)));
  const checksum=Array.from(new Uint8Array(hash)).map(x=>x.toString(16).padStart(2,"0")).join("");
  await db("studio_post_versions?on_conflict=post_id,revision",{method:"POST",headers:{"Prefer":"resolution=ignore-duplicates,return=representation"},body:JSON.stringify({post_id:p.id,revision:p.revision,snapshot,checksum,approved_by:uid})});
  next.status="approved";next.approved_revision=p.revision;
 }else if(action==="schedule"){
  can(role,"owner","chief_editor");
  if(p.status!=="approved"||p.approved_revision!==p.revision)throw Error("Unapproved article");
  await requireEightTranslations(p);
  const when=new Date(String(data.scheduled_at));if(!Number.isFinite(+when)||+when<Date.now()+60000)throw Error("Invalid schedule time");
  next.status="scheduled";next.scheduled_at=when.toISOString();
 }else if(action==="publish"){
  can(role,"owner","chief_editor");
  if(p.status!=="approved"||p.approved_revision!==p.revision)throw Error("Unapproved article");
  await requireEightTranslations(p);
  next.status="published";next.published_at=new Date().toISOString();next.is_hidden=false;
 }else throw Error("Unsupported action");
 const changed=await db("studio_posts?id=eq."+p.id+"&revision=eq."+p.revision+"&status=eq."+p.status,{method:"PATCH",body:JSON.stringify(next)});
 if(!changed.length)throw Error("Revision conflict");
 await db("studio_review_events",{method:"POST",body:JSON.stringify({post_id:p.id,actor_id:uid,action,note:String(data.note||"").slice(0,1200)})});
 if(action==="publish"){
   const placements=await db("studio_placements?select=id,channel,locale&post_id=eq."+p.id+"&status=eq.requested");
   for(const pl of placements){
    const internal=["nowgreen","nowcook","nowwhat","nowkids"].includes(pl.channel);
    if(internal)await db("studio_placements?id=eq."+pl.id,{method:"PATCH",body:JSON.stringify({status:"ready"})});
    await db("studio_deliveries?on_conflict=post_id,revision,channel,locale",{method:"POST",headers:{"Prefer":"resolution=ignore-duplicates,return=representation"},body:JSON.stringify({placement_id:pl.id,post_id:p.id,revision:p.revision,channel:pl.channel,locale:pl.locale,status:internal?"queued":"needs_connection",error:internal?"Available in studio-feed; app integration pending":"External connector not configured"})});
   }
   await cleanupPublishedMedia(changed[0]);
 }
 return changed[0];
}
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
 try{
  const u=await user(req),url=new URL(req.url),s=url.pathname.split("/").filter(Boolean),n=s.indexOf("studio-api"),a=s.slice(n+1),body= ["POST","PATCH","DELETE"].includes(req.method)?await req.json().catch(()=>({})):{};
  if(req.method==="POST"&&a[0]==="bootstrap"){
   const token=txt(body.setup_key,150),h=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token));
   const hex=Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,"0")).join("");
   const ok=await rpc("studio_claim_owner",{p_user:u.id,p_token_sha256:hex});
   return reply(ok?200:403,{ok:!!ok,error:ok?undefined:"Wrong, used or expired setup key, or email not confirmed"});
  }
  if(req.method==="GET"&&a[0]==="projects"){
   const ms=await db("studio_memberships?select=project_id,role&user_id=eq."+u.id+"&active=eq.true");
   if(!ms.length)return reply(200,{projects:[]});
   const ps=await db("studio_projects?select=id,slug,name,default_locale&is_active=eq.true&id=in.("+ms.map((x:any)=>x.project_id).join(",")+")");
   return reply(200,{projects:ps.map((p:any)=>({...p,role:ms.find((m:any)=>m.project_id===p.id)?.role}))});
  }
  // Editorial inbox and per-article discussion. Authentication and access checked on each request.
  if(a[0]==="review-queue"&&req.method==="GET"){
   const pr=await proj(txt(url.searchParams.get("project"),48));
   const role=await member(pr.id,u.id);
   can(role,"owner","chief_editor","editor","reviewer");
   const status=url.searchParams.get("status")||"in_review";
   if(!["in_review","changes_requested","approved","scheduled","published","all"].includes(status))throw Error("Invalid queue filter");
   const statusClause=status==="all"?"":"&status=eq."+status;
   const rows=await db("studio_posts?select=id,title,summary,status,revision,owner_user_id,locale,created_at,updated_at,scheduled_at&project_id=eq."+pr.id+"&deleted_at=is.null"+statusClause+"&order=updated_at.desc&limit=100");
   return reply(200,{queue:rows,project:pr.slug,filter:status});
  }
  if(a[0]==="reviews"&&req.method==="GET"){
   const {p}=await post(txt(url.searchParams.get("post_id"),50),u.id);
   const reviews=await db("studio_review_events?select=id,action,note,actor_id,created_at&post_id=eq."+p.id+"&order=created_at.asc&limit=150");
   return reply(200,{reviews});
  }
  if(a[0]==="reviews"&&req.method==="POST"){
   const {p,role}=await post(txt(body.post_id,50),u.id);
   can(role,"owner","chief_editor","editor","reviewer","author");
   const note=txt(body.note,1200);
   if(p.status==="archived")throw Error("Archived article is read-only");
   if(role==="reviewer"&&p.status!=="in_review")throw Error("Only articles in review accept reviewer comments");
   const [event]=await db("studio_review_events",{method:"POST",body:JSON.stringify({post_id:p.id,actor_id:u.id,action:"comment",note})});
   return reply(201,{review:event});
  }
  if(a[0]==="topics"){
    const pr=await proj(txt(req.method==="GET"?url.searchParams.get("project"):body.project,48));
    const role=await member(pr.id,u.id);if(!role)throw Error("Forbidden");
    if(req.method==="GET"){
      const rows=await db("studio_topics?select=id,slug,title,translations,image_asset_id,focus_x,focus_y,revision,sort_order,is_active,updated_at&project_id=eq."+pr.id+"&order=sort_order.asc,title.asc&limit=200");
      return reply(200,{topics:rows});
    }
    can(role,"owner","chief_editor","editor");
    if(req.method==="POST"&&!a[1]){
      const slug=txt(body.slug,60).toLowerCase();
      if(!/^[a-z0-9-]{2,60}$/.test(slug))throw Error("Invalid topic slug");
      const translations=body.translations??{};
      if(!translations||typeof translations!=="object"||Array.isArray(translations)||JSON.stringify(translations).length>4000)throw Error("Invalid topic translations");
      for(const code of ["en","pt-PT","uk","es","fr","de","it"]){if(typeof translations[code]!=="string"||!translations[code].trim()||translations[code].length>100)throw Error("Missing or invalid topic translation: "+code)}
      const image=await checkedTopicMedia(body.image_asset_id,pr.id);
      const rows=await db("studio_topics",{method:"POST",body:JSON.stringify({project_id:pr.id,slug,title:txt(body.title,100),translations,image_asset_id:image,focus_x:Math.max(0,Math.min(100,Number(body.focus_x??50)||0)),focus_y:Math.max(0,Math.min(100,Number(body.focus_y??50)||0)),sort_order:Number(body.sort_order)||0})});
      return reply(201,{topic:rows[0]});
    }
    if(req.method==="PATCH"&&idok(a[1])){
      const [existing]=await db("studio_topics?select=*&id=eq."+a[1]+"&project_id=eq."+pr.id+"&limit=1");
      if(!existing)throw Error("Topic not found");
      if(Number(body.expected_revision)!==existing.revision)throw Error("Topic changed; refresh");
      const upd:any={revision:existing.revision+1,updated_at:new Date().toISOString()};
      if(body.title!==undefined)upd.title=txt(body.title,100);
      if(body.translations!==undefined){
       if(!body.translations||typeof body.translations!=="object"||Array.isArray(body.translations)||JSON.stringify(body.translations).length>4000)throw Error("Invalid topic translations");
       for(const code of ["en","pt-PT","uk","es","fr","de","it"]){if(typeof body.translations[code]!=="string"||!body.translations[code].trim()||body.translations[code].length>100)throw Error("Missing or invalid topic translation: "+code)}
       upd.translations=body.translations;
      }
      if(body.image_asset_id!==undefined)upd.image_asset_id=await checkedTopicMedia(body.image_asset_id,pr.id);
      if(body.focus_x!==undefined)upd.focus_x=Math.max(0,Math.min(100,Number(body.focus_x)||0));
      if(body.focus_y!==undefined)upd.focus_y=Math.max(0,Math.min(100,Number(body.focus_y)||0));
      if(body.sort_order!==undefined)upd.sort_order=Number(body.sort_order)||0;
      if(body.is_active!==undefined){
        if(body.is_active===true){
          const available=upd.translations??existing.translations??{};
          for(const code of ["en","pt-PT","uk","es","fr","de","it"]){
            if(typeof available[code]!=="string"||!available[code].trim())
              throw Error("Complete eight-language topic translations before showing: "+code);
          }
        }
        upd.is_active=body.is_active===true;
       }
      const rows=await db("studio_topics?id=eq."+a[1]+"&project_id=eq."+pr.id+"&revision=eq."+existing.revision,{method:"PATCH",body:JSON.stringify(upd)});
      if(!rows.length)throw Error("Topic revision conflict");
      return reply(200,{topic:rows[0]});
    }
  }
  if(a[0]==="posts"){
   if(req.method==="GET"&&!a[1]){
     const p=await proj(txt(url.searchParams.get("project"),48)),role=await member(p.id,u.id);if(!role)throw Error("Forbidden");
     const only=role==="author"?"&owner_user_id=eq."+u.id:"";
     const offsetRaw=url.searchParams.get("offset")||"0";
     if(!/^(0|[1-9][0-9]{0,4})$/.test(offsetRaw)||Number(offsetRaw)>10000)throw Error("Invalid article page offset");
     const offset=Number(offsetRaw);
     return reply(200,{posts:await db("studio_posts?select=id,title,summary,status,is_hidden,revision,topic_id,category,owner_user_id,locale,updated_at,published_at,scheduled_at&project_id=eq."+p.id+"&deleted_at=is.null"+only+"&order=updated_at.desc,id.desc&limit=100&offset="+offset)});
   }
   if(req.method==="POST"&&!a[1]){
     const pr=await proj(txt(body.project,48)),role=await member(pr.id,u.id);can(role,"owner","chief_editor","editor","author");
     const name=txt(body.title,200),slug=typeof body.slug==="string"&&/^[a-zA-Z0-9-]{3,120}$/.test(body.slug)?body.slug:crypto.randomUUID();
     const template=String(body.template_id||"editorial");
     if(!["editorial","guide","story","gallery","minimal"].includes(template))throw Error("Invalid template");
     const data={project_id:pr.id,owner_user_id:u.id,title:name,slug,summary:String(body.summary||"").slice(0,400),locale:String(body.locale||"ru").slice(0,10),category:String(body.category||"").slice(0,70),topic_id:await checkedTopic(body.topic_id,pr.id),blocks:blocks(body.blocks||[]),template_id:template,cover_path:await validateCover(body.cover_path,pr.id,u.id,role)};
     return reply(201,{post:(await db("studio_posts",{method:"POST",body:JSON.stringify(data)}))[0]});
   }
   if(a[1]){
    const {p,role}=await post(a[1],u.id);
    if(req.method==="PATCH"&&a[2]==="visibility"&&a.length===3){
     can(role,"owner","chief_editor");
     if(Number(body.expected_revision)!==p.revision)throw Error("Article changed; reopen and retry");
     if(typeof body.is_hidden!=="boolean")throw Error("Visibility must be true or false");
     if(p.status==="archived")throw Error("Archived post cannot be shown");
     const changed=await db("studio_posts?id=eq."+p.id+"&project_id=eq."+p.project_id+
       "&revision=eq."+p.revision+"&status=eq."+p.status+"&deleted_at=is.null",{
       method:"PATCH",body:JSON.stringify({is_hidden:body.is_hidden,updated_at:new Date().toISOString()})
     });
     if(!changed.length)throw Error("Visibility conflict; refresh the article");
     try{await db("studio_audit_log",{method:"POST",body:JSON.stringify({
       project_id:p.project_id,user_id:u.id,action:body.is_hidden?"article_hidden":"article_unhidden",
       target_id:p.id,metadata:{previous:p.is_hidden,updated:p.status,title:p.title}
     })})}catch(e){console.warn("Visibility audit pending",String(e))}
     return reply(200,{post:changed[0],hidden:changed[0].is_hidden});
    }
    // Reopening a published/approved article unpublishes it without deleting
    // content, translations, photos, approved snapshots or previous revisions.
    if(req.method==="PATCH"&&a[2]==="reopen"&&a.length===3){
     can(role,"owner","chief_editor");
     if(!["published","scheduled","approved","in_review"].includes(p.status))
       throw Error("Only submitted or released articles can be reopened");
     if(Number(body.expected_revision)!==p.revision)throw Error("Article changed; refresh");
     const changed=await db("studio_posts?id=eq."+p.id+"&revision=eq."+p.revision+
       "&status=eq."+p.status+"&deleted_at=is.null",{
       method:"PATCH",body:JSON.stringify({status:"changes_requested",is_hidden:true,
         scheduled_at:null,updated_at:new Date().toISOString()})
     });
     if(!changed.length)throw Error("Article changed; refresh");
     try{await db("studio_audit_log",{method:"POST",body:JSON.stringify({
       project_id:p.project_id,user_id:u.id,action:"article_reopened_for_edit",
       target_id:p.id,metadata:{previous_status:p.status,revision:p.revision,
       previous_publication:p.published_at,previous_visibility:p.is_hidden}
     })})}catch(e){console.warn("Correction audit pending",String(e))}
     return reply(200,{post:changed[0],requires_review:true});
    }
    if(req.method==="GET"&&a.length===2)return reply(200,{post:p});
    // Delete is an audited archive / immediate unpublish; assets are shared.
    if(req.method==="DELETE"&&a.length===2){
     const elevated=role==="owner"||role==="chief_editor";
     const ownDraft=(role==="editor"||role==="author")&&p.owner_user_id===u.id&&
       ["draft","changes_requested"].includes(p.status);
     if(!elevated&&!ownDraft)throw Error("Forbidden");
     if(Number(body.expected_revision)!==p.revision)throw Error("Revision conflict; reopen the article");
     if(body.confirm_title!==p.title)throw Error("Confirm the exact article title before deletion");
     const now=new Date().toISOString();
     const rows=await db("studio_posts?id=eq."+p.id+"&project_id=eq."+p.project_id+
       "&revision=eq."+p.revision+"&status=eq."+p.status+"&deleted_at=is.null",{
       method:"PATCH",body:JSON.stringify({status:"archived",deleted_at:now,deleted_by:u.id,
         revision:p.revision+1,updated_at:now,scheduled_at:null})
     });
     if(!rows.length)throw Error("Article changed or already deleted");
     // Archived status makes public feed reject the post even if cleanup fails.
     try{
      await db("studio_placements?post_id=eq."+p.id+"&status=neq.disabled",{
        method:"PATCH",body:JSON.stringify({status:"disabled"})});
     }catch(e){console.warn("Placement cleanup deferred",String(e))}
     try{
      await db("studio_audit_log",{method:"POST",body:JSON.stringify({
        project_id:p.project_id,user_id:u.id,action:"article_deleted",target_id:p.id,
        metadata:{title:p.title,old_status:p.status,old_revision:p.revision,
          retained_media:true,deleted_at:now}
      })});
     }catch(e){console.warn("Deletion audit deferred",String(e))}
     return reply(200,{ok:true,deleted_id:p.id,removed_from_feed:true,archived_at:now});
    }

    if(req.method==="PATCH"&&a.length===2){
     if(p.owner_user_id!==u.id&&!isedit(role))throw Error("Forbidden");
     if(!["draft","changes_requested"].includes(p.status))throw Error("Cannot edit after submission");
     if(Number(body.expected_revision)!==p.revision)throw Error("Revision conflict");
     const upd:any={revision:p.revision+1,status:"draft",updated_at:new Date().toISOString()};
     if(body.title!==undefined)upd.title=txt(body.title,200);
     if(body.summary!==undefined)upd.summary=String(body.summary).slice(0,400);
     if(body.locale!==undefined)upd.locale=txt(body.locale,10);
     if(body.category!==undefined)upd.category=String(body.category).slice(0,70);
      if(body.topic_id!==undefined)upd.topic_id=await checkedTopic(body.topic_id,p.project_id);
     if(body.blocks!==undefined)upd.blocks=blocks(body.blocks);
     if(body.template_id!==undefined){
      if(!["editorial","guide","story","gallery","minimal"].includes(body.template_id))throw Error("Invalid template");
      upd.template_id=body.template_id;
     }
     if(body.cover_path!==undefined)upd.cover_path=await validateCover(body.cover_path,p.project_id,u.id,role);
     if(body.author_id!==undefined&&body.author_id!==null&&body.author_id!==""){
      if(!idok(body.author_id))throw Error("Invalid author");
      const [au]=await db("studio_authors?select=id,owner_user_id&project_id=eq."+p.project_id+"&id=eq."+body.author_id);
      if(!au||(role==="author"&&au.owner_user_id!==u.id))throw Error("Invalid author");
      upd.author_id=au.id;
     }
     const change=await db("studio_posts?id=eq."+p.id+"&revision=eq."+p.revision+"&status=in.(draft,changes_requested)",{method:"PATCH",body:JSON.stringify(upd)});
     if(!change.length)throw Error("Revision conflict");
     return reply(200,{post:change[0]});
    }
    // Taxonomy-only change on approved/published content. The approved body
    // and revision stay immutable; only owner/chief editor can reclassify.
    if(req.method==="PATCH"&&a[2]==="topic"){
      can(role,"owner","chief_editor");
      if(!["approved","scheduled","published"].includes(p.status))throw Error("Publish approval required");
      if(Number(body.expected_revision)!==p.revision)throw Error("Article revision conflict");
      const newTopic=await checkedTopic(body.topic_id,p.project_id);
      const changed=await db("studio_posts?id=eq."+p.id+"&revision=eq."+p.revision+"&status=eq."+p.status,{
       method:"PATCH",body:JSON.stringify({topic_id:newTopic,updated_at:new Date().toISOString()})
      });
      if(!changed.length)throw Error("Article status changed; refresh");
      try{await db("studio_audit_log",{method:"POST",body:JSON.stringify({
        project_id:p.project_id,user_id:u.id,action:"article_topic_reassigned",target_id:p.id,
        metadata:{before:p.topic_id||null,after:newTopic,approved_revision:p.approved_revision}
      })})}catch(e){console.warn("Taxonomy audit deferred",String(e))}
      return reply(200,{post:changed[0]});
    }
    if(req.method==="POST"&&a[2]==="action")return reply(200,{post:await reviewAction(p,role,u.id,txt(body.action,50),body)});
   }
  }
  if(a[0]==="authors"&&req.method==="GET"){
   const pr=await proj(txt(url.searchParams.get("project"),48)),role=await member(pr.id,u.id);if(!role)throw Error("Forbidden");
   const extra=role==="author"?"&owner_user_id=eq."+u.id:"";
   return reply(200,{authors:await db("studio_authors?select=id,name,kind,bio,tagline,focus,voice_style,preferred_locale,translations,photo_asset_id,social_links,consent_status,owner_user_id&project_id=eq."+pr.id+extra+"&is_active=eq.true&limit=100")});
  }
  if(a[0]==="authors"&&req.method==="POST"&&!a[1]){
   const pr=await proj(txt(body.project,48)),role=await member(pr.id,u.id);can(role,"owner","chief_editor","editor","author");
   const kind=body.kind==="ai"?"ai":"partner";if(kind==="ai")can(role,"owner","chief_editor");
   const urlstr=String(body.social_url||"");if(urlstr&&!/^https:\/\//i.test(urlstr))throw Error("HTTPS social URL required");
   const photo=body.photo_asset_id?await validateCover(body.photo_asset_id,pr.id,u.id,role):null;
   const socialLinks:any=urlstr?{website:urlstr}:{};
   for(const k of ["instagram","youtube","tiktok","facebook"]){const v=String(body[k]||"");if(v&&!/^https:\/\//i.test(v))throw Error("HTTPS social URL required");if(v)socialLinks[k]=v.slice(0,350);}
   const kindFields=kind==="ai"?{focus:String(body.focus||"").slice(0,450),voice_style:String(body.voice_style||"").slice(0,550)}:{};
   const result=await db("studio_authors",{method:"POST",body:JSON.stringify({project_id:pr.id,owner_user_id:kind==="partner"?u.id:null,kind,name:txt(body.name,100),tagline:String(body.tagline||"").slice(0,160),bio:String(body.bio||"").slice(0,1200),preferred_locale:String(body.preferred_locale||"ru"),photo_asset_id:photo,...kindFields,social_links:socialLinks,consent_status:kind==="ai"?"approved":"pending"})});
   return reply(201,{author:result[0]});
  }
  // Editor-reviewed localized copy; original biography and partner consent are never changed.
  if(a[0]==="authors"&&idok(a[1])&&a[2]==="translations"&&a.length===3&&req.method==="PATCH"){
   const [person]=await db("studio_authors?select=id,project_id,name,tagline,bio,focus,preferred_locale,translations&id=eq."+a[1]+"&is_active=eq.true&limit=1");
   if(!person)throw Error("Автор не найден");
   can(await member(person.project_id,u.id),"owner","chief_editor","editor");
   const locale=String(body.locale||""),locales=["ru","en","uk","pt-PT","es","fr","de","it"];
   if(!locales.includes(locale)||locale===person.preferred_locale)
    throw Error("Выберите язык перевода, отличный от языка оригинала");
   const fields=["name","tagline","bio","focus"] as const;
   const limits={name:100,tagline:200,bio:4000,focus:900};
   const translated:any={},original:any={};
   for(const field of fields){
    const value=body[field]===undefined?"":body[field];
    if(typeof value!=="string"||value.length>limits[field])throw Error("Слишком длинный или некорректный перевод: "+field);
    translated[field]=value.trim();
    original[field]=String(person[field]||"");
   }
   if(!body.expected_source||typeof body.expected_source!=="object"||fields.some(field=>body.expected_source[field]!==original[field]))
    throw Error("Оригинал профиля изменился. Обновите карточку перед сохранением перевода.");
   const saved:any={...(person.translations||{})};
   if(Object.values(translated).some(Boolean))
    saved[locale]={...translated,source:original,updated_at:new Date().toISOString()};
   else delete saved[locale];
   if(JSON.stringify(saved).length>45000)throw Error("Слишком большой объём переводов");
   const [updated]=await db("studio_authors?id=eq."+person.id,{method:"PATCH",body:JSON.stringify({translations:saved})});
   return reply(200,{ok:true,author_id:person.id,locale,translations:updated.translations||{}});
  }
  if(a[0]==="authors"&&a[1]&&a.length===2&&req.method==="PATCH"){
   if(!idok(a[1]))throw Error("Invalid author id");
   const [person]=await db("studio_authors?select=id,project_id,owner_user_id,kind,name,bio,tagline,preferred_locale,focus,voice_style,social_links,consent_status&id=eq."+a[1]+"&limit=1");
   if(!person)throw Error("Author not found");
   const role=await member(person.project_id,u.id);
   if(!["owner","chief_editor","editor","author"].includes(role)||role==="author"&&person.owner_user_id!==u.id)throw Error("Forbidden");
   if(person.kind==="ai"&&!["owner","chief_editor"].includes(role))throw Error("Only chief editor manages AI authors");
   const name=body.name===undefined?person.name:txt(body.name,100),bio=String(body.bio===undefined?person.bio||"":body.bio||"").slice(0,1200);
   const social=String(body.social_url===undefined?person.social_links?.website||"":body.social_url||"");
   if(social&&!/^https:\/\//i.test(social))throw Error("HTTPS social URL required");
   const socialLinks:any=social?{website:social.slice(0,350)}:{};
   for(const k of ["instagram","youtube","tiktok","facebook"]){
    const val=body[k]===undefined?String(person.social_links?.[k]||""):String(body[k]||"");
    if(val&&!/^https:\/\//i.test(val))throw Error("HTTPS social URL required");
    if(val)socialLinks[k]=val.slice(0,350);
   }
   const changed=JSON.stringify(socialLinks)!==JSON.stringify(Object.fromEntries(Object.entries(person.social_links||{}).sort()))&&
    Object.keys({...socialLinks,...person.social_links}).some(k=>String(socialLinks[k]||"")!==String(person.social_links?.[k]||""));
   const data:any={name,bio,tagline:String(body.tagline===undefined?person.tagline||"":body.tagline||"").slice(0,160),preferred_locale:String(body.preferred_locale===undefined?person.preferred_locale||"ru":body.preferred_locale||"ru"),social_links:socialLinks};
   if(body.photo_asset_id!==undefined)data.photo_asset_id=body.photo_asset_id?await validateCover(body.photo_asset_id,person.project_id,u.id,role):null;
   if(person.kind==="ai"){
    data.focus=String(body.focus===undefined?person.focus||"":body.focus||"").slice(0,450);
    data.voice_style=String(body.voice_style===undefined?person.voice_style||"":body.voice_style||"").slice(0,550);
   }
   if(changed&&person.kind==="partner"){data.consent_status="pending";data.consent_ref="";}
   const updated=await db("studio_authors?id=eq."+person.id,{method:"PATCH",body:JSON.stringify(data)});
   return reply(200,{author:updated[0],consent_requires_review:changed&&person.kind==="partner"});
  }
  if(a[0]==="authors"&&a[1]&&a[2]==="approve"&&req.method==="POST"){
   if(!idok(a[1]))throw Error("Invalid author");
   const [author]=await db("studio_authors?select=*&id=eq."+a[1]+"&limit=1");if(!author)throw Error("Not found");
   can(await member(author.project_id,u.id),"owner","chief_editor");
   const ref=author.kind==="partner"?txt(body.consent_ref,350):"editorial";
   return reply(200,{author:(await db("studio_authors?id=eq."+a[1],{method:"PATCH",body:JSON.stringify({consent_status:"approved",consent_ref:ref})}))[0]});
  }
  if(a[0]==="variants"&&req.method==="GET"){
   const {p}=await post(txt(url.searchParams.get("post_id"),50),u.id);
   return reply(200,{variants:await db("studio_channel_versions?select=channel,locale,title,summary,caption,blocks,template_id,cover_path,updated_at&post_id=eq."+p.id)});
  }
  if(a[0]==="variants"&&req.method==="POST"){
   const {p,role}=await post(txt(body.post_id,50),u.id);
   if(p.owner_user_id!==u.id&&!isedit(role))throw Error("Forbidden");
   if(!["draft","changes_requested"].includes(p.status))throw Error("Cannot change approved content");
   if(Number(body.expected_revision)!==p.revision)throw Error("Revision conflict");
   const channel=txt(body.channel,32);
   if(!["nowgreen","nowcook","nowwhat","nowkids","website","wordpress","instagram"].includes(channel))throw Error("Unsupported channel");
   if(["nowgreen","nowcook","nowwhat","nowkids"].includes(channel)){
     const [origin]=await db("studio_projects?select=slug&id=eq."+p.project_id);
     if(origin?.slug!==channel)throw Error("Cannot publish a variant into another app");
   }
   const locale=txt(body.locale||p.locale,10),title=txt(body.title,200),summary=String(body.summary||"").slice(0,400),caption=String(body.caption||"").slice(0,2200);
   const b=blocks(body.blocks||[]),template=String(body.template_id||"editorial");
   if(!["editorial","guide","story","gallery","minimal"].includes(template))throw Error("Invalid template");
   const cover=await validateCover(body.cover_path,p.project_id,u.id,role);
   const imageIds=[...new Set(b.filter((x:any)=>x.type==="image").map((x:any)=>x.asset_id))];
   if(imageIds.length){
     const found=await db("studio_media_assets?select=id,uploader_id,rights_confirmed&project_id=eq."+p.project_id+"&id=in.("+imageIds.join(",")+")");
     if(found.length!==imageIds.length||found.some((x:any)=>!x.rights_confirmed||role==="author"&&x.uploader_id!==u.id))throw Error("Image not available for variant");
   }
   const newRev=await rpc("studio_save_channel_version",{p_post:p.id,p_expected_revision:p.revision,p_channel:channel,p_locale:locale,p_title:title,p_summary:summary,p_caption:caption,p_blocks:b,p_template:template,p_cover:cover,p_user:u.id});
   return reply(200,{ok:true,revision:newRev});
  }
  if(a[0]==="placements"&&req.method==="GET"){
   const {p}=await post(txt(url.searchParams.get("post_id"),50),u.id);
   return reply(200,{placements:await db("studio_placements?select=id,channel,locale,status,settings&post_id=eq."+p.id)});
  }
  if(a[0]==="placements"&&a[1]==="settings"&&req.method==="POST"){
   const {p,role}=await post(txt(body.post_id,50),u.id);
   if(p.owner_user_id!==u.id&&!isedit(role))throw Error("Forbidden");
   if(!["draft","changes_requested"].includes(p.status))throw Error("Article is locked");
   const channel=txt(body.channel,25);
   if(!["website","wordpress","instagram"].includes(channel))throw Error("Not a configurable channel");
   const caption=body.caption==null?"":String(body.caption);
   if(caption.length>2200)throw Error("Caption exceeds 2200 characters");
   const description=body.description==null?"":String(body.description);
   if(description.length>400)throw Error("Description exceeds 400 characters");
   const settings={caption,description};
   const locale=String(p.locale).slice(0,10);
   const [existing]=await db("studio_placements?select=id&post_id=eq."+p.id+"&channel=eq."+channel+"&locale=eq."+locale+"&limit=1");
   if(!existing)await db("studio_placements",{method:"POST",body:JSON.stringify({post_id:p.id,channel,locale,settings})});
   else await db("studio_placements?id=eq."+existing.id,{method:"PATCH",body:JSON.stringify({settings})});
   return reply(200,{ok:true,settings,channel});
  }
  if(a[0]==="placements"&&req.method==="POST"){
   const {p,role}=await post(txt(body.post_id,50),u.id);
   if(p.owner_user_id!==u.id&&!isedit(role))throw Error("Forbidden");
   if(!["draft","changes_requested"].includes(p.status))throw Error("Cannot change channels");
   const channel=txt(body.channel,24),locale=String(body.locale||p.locale).slice(0,10);
   if(!["nowgreen","nowcook","nowwhat","nowkids","website","wordpress","instagram"].includes(channel))throw Error("Channel unsupported");
   if(["nowgreen","nowcook","nowwhat","nowkids"].includes(channel)){
    const [pr]=await db("studio_projects?select=slug&id=eq."+p.project_id);
    if(pr?.slug!==channel)throw Error("Cross-project publication not yet available");
   }
   const rows=await db("studio_placements?on_conflict=post_id,channel,locale",{method:"POST",headers:{"Prefer":"resolution=ignore-duplicates,return=representation"},body:JSON.stringify({post_id:p.id,channel,locale})});
   return reply(201,{placement:rows[0]||null});
  }
  if(a[0]==="deliveries"&&req.method==="GET"){
   const {p}=await post(txt(url.searchParams.get("post_id"),50),u.id);
   return reply(200,{deliveries:await db("studio_deliveries?select=channel,locale,status,published_at,error,remote_url&post_id=eq."+p.id)});
  }

  // Project-scoped list of invited writers. Only chiefs see their email and access.
  if(a[0]==="team-authors"&&req.method==="GET"&&a.length===1){
   const pr=await proj(txt(url.searchParams.get("project"),48));
   can(await member(pr.id,u.id),"owner","chief_editor");
   const rows=await db("studio_memberships?select=user_id,created_at&project_id=eq."+pr.id+"&role=eq.author&active=eq.true&order=created_at.desc&limit=100");
   const profiles=await db("studio_authors?select=id,name,owner_user_id&project_id=eq."+pr.id+"&kind=eq.partner&is_active=eq.true&limit=200");
   const members=await Promise.all(rows.map(async(row:any)=>{
    let email="";
    try{
     const response=await fetch(base+"/auth/v1/admin/users/"+row.user_id,{
      headers:{apikey:service,Authorization:"Bearer "+service}});
     if(response.ok){const payload=await response.json();const person=payload.user||payload;email=String(person.email||"");}
    }catch(e){console.warn("Member email lookup unavailable",String(e))}
    const owned=profiles.filter((p:any)=>p.owner_user_id===row.user_id);
    return {user_id:row.user_id,email,created_at:row.created_at,
     name:owned[0]?.name||"",profile_id:owned[0]?.id||null};
   }));
   return reply(200,{members});
  }
  // Revoking membership immediately denies API operations, even with an existing JWT.
  if(a[0]==="team-authors"&&req.method==="DELETE"&&a.length===2){
   const pr=await proj(txt(body.project,48));
   can(await member(pr.id,u.id),"owner","chief_editor");
   const target=txt(a[1],50);
   if(!idok(target)||target===u.id)throw Error("Invalid author");
   const found=await db("studio_memberships?select=user_id&project_id=eq."+pr.id+
    "&user_id=eq."+target+"&role=eq.author&active=eq.true&limit=1");
   if(found.length!==1)throw Error("Active author access not found");
   const removed=await db("studio_memberships?project_id=eq."+pr.id+
    "&user_id=eq."+target+"&role=eq.author&active=eq.true",{
     method:"PATCH",body:JSON.stringify({active:false})});
   if(removed.length!==1)throw Error("Access revocation was not confirmed");
   const inactive=await db("studio_authors?project_id=eq."+pr.id+
    "&owner_user_id=eq."+target+"&kind=eq.partner&is_active=eq.true",{
     method:"PATCH",body:JSON.stringify({is_active:false})});
   try{await db("studio_audit_log",{method:"POST",body:JSON.stringify({
    project_id:pr.id,user_id:u.id,action:"author_access_revoked",target_id:target,
    metadata:{profiles_deactivated:inactive.length,auth_account_preserved:true}
   })})}catch(e){console.warn("Author revocation audit unavailable",String(e))}
   return reply(200,{removed:true,access_revoked:true,profiles_deactivated:inactive.length});
  }
  // Remove a partner profile and author-only access, preserving published posts.
  if(a[0]==="authors"&&req.method==="DELETE"&&a.length===2){
   const target=txt(a[1],50);
   if(!idok(target))throw Error("Invalid author profile");
   const pr=await proj(txt(body.project,48));
   can(await member(pr.id,u.id),"owner","chief_editor");
   const found=await db("studio_authors?select=id,kind,name,owner_user_id&project_id=eq."+pr.id+
    "&id=eq."+target+"&is_active=eq.true&limit=1");
   if(found.length!==1||found[0].kind!=="partner")
    throw Error("Only partner author profiles can be removed here");
   const owner=found[0].owner_user_id;
   let revoked=false;
   if(owner&&owner!==u.id){
    const membership=await db("studio_memberships?select=user_id&project_id=eq."+pr.id+
     "&user_id=eq."+owner+"&role=eq.author&active=eq.true&limit=1");
    if(membership.length===1){
     const updated=await db("studio_memberships?project_id=eq."+pr.id+
      "&user_id=eq."+owner+"&role=eq.author&active=eq.true",{
       method:"PATCH",body:JSON.stringify({active:false})});
     if(updated.length!==1)throw Error("Author access was not revoked");
     revoked=true;
    }
   }
   const inactive=await db("studio_authors?id=eq."+target+
    "&project_id=eq."+pr.id+"&kind=eq.partner&is_active=eq.true",{
     method:"PATCH",body:JSON.stringify({is_active:false})});
   if(inactive.length!==1)throw Error("Profile removal was not confirmed");
   try{await db("studio_audit_log",{method:"POST",body:JSON.stringify({
    project_id:pr.id,user_id:u.id,action:"partner_author_removed",target_id:target,
    metadata:{name:found[0].name,access_revoked:revoked,auth_account_preserved:true}
   })})}catch(e){console.warn("Author profile audit unavailable",String(e))}
   return reply(200,{removed:true,access_revoked:revoked});
  }
  if(a[0]==="invite"&&req.method==="POST"){
   const pr=await proj(txt(body.project,48));
   can(await member(pr.id,u.id),"owner","chief_editor");
   const email=txt(body.email,250).toLowerCase();
   if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw Error("Invalid email");
   const role=body.role==="editor"?"editor":"author";
   const redirect="https://mynw.app/journalstudio/cloud/";
   const r=await fetch(base+"/auth/v1/invite?redirect_to="+encodeURIComponent(redirect),{
    method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":"application/json"},
    body:JSON.stringify({email})
   });
   if(r.ok){
    const person=await r.json();
    if(!idok(person.id))throw Error("Invitation did not return a valid account");
    await db("studio_memberships?on_conflict=project_id,user_id",{method:"POST",
     headers:{"Prefer":"resolution=merge-duplicates,return=representation"},
     body:JSON.stringify({project_id:pr.id,user_id:person.id,role,active:true})});
    return reply(200,{invited:true,mode:"invitation"});
   }
   const error=await r.json().catch(()=>({}));
   const message=String(error.msg||error.message||error.error_description||error.error||"");
   const alreadyRegistered=(r.status===422||r.status===400)&&
    /already|registered|exists|email_exists/i.test(message+" "+String(error.code||""));
   if(!alreadyRegistered||role!=="author")
    throw Error("Invite failed: "+(message||"SMTP or Auth error"));
   // A removed author keeps their independent Auth account. Re-invite by sending
   // a secure password-set email and reactivating ONLY this project's prior author role.
   const inactive=await db("studio_memberships?select=user_id&project_id=eq."+pr.id+
    "&role=eq.author&active=eq.false&limit=200");
   let matched:any=null;
   for(const entry of inactive){
    const check=await fetch(base+"/auth/v1/admin/users/"+entry.user_id,{
     headers:{apikey:service,Authorization:"Bearer "+service}});
    if(!check.ok)continue;
    const payload=await check.json();
    const account=payload.user||payload;
    if(String(account.email||"").trim().toLowerCase()===email){matched=account;break}
   }
   if(!matched||!idok(matched.id))
    throw Error("This email already has an Auth account. Use account recovery to regain access.");
   const link=await fetch(base+"/auth/v1/recover?redirect_to="+encodeURIComponent(redirect),{
    method:"POST",headers:{apikey:anon,"Content-Type":"application/json"},
    body:JSON.stringify({email})
   });
   if(!link.ok){
    const detail=await link.json().catch(()=>({}));
    throw Error("Could not send a new access link: "+String(detail.msg||detail.message||link.status));
   }
   await db("studio_memberships?on_conflict=project_id,user_id",{method:"POST",
    headers:{"Prefer":"resolution=merge-duplicates,return=representation"},
    body:JSON.stringify({project_id:pr.id,user_id:matched.id,role:"author",active:true})});
   return reply(200,{invited:true,mode:"existing_account",email_sent:true});
  }
  if(a[0]==="ai"&&a[1]==="drafts"&&req.method==="POST"){
   const pr=await proj(txt(body.project,48)),role=await member(pr.id,u.id);can(role,"owner","chief_editor","editor");
   return reply(503,{error:"AI generation is not connected; manual editorial workflow is available"});
  }
  // Reusable project media library. Removing a block does NOT remove its asset.
  // Editors can browse project imagery; partners see only uploads they own.
  if(a[0]==="media"&&a[1]==="library"&&req.method==="GET"){
   const pr=await proj(txt(url.searchParams.get("project"),48));
   const role=await member(pr.id,u.id);
   can(role,"owner","chief_editor","editor","author");
   const source=String(url.searchParams.get("source")||"ai");
   if(!["ai","stock","upload","all"].includes(source))throw Error("Invalid media source");
   const limit=Math.min(24,Math.max(1,Number.parseInt(url.searchParams.get("limit")||"18",10)||18));
   const offset=Math.max(0,Number.parseInt(url.searchParams.get("offset")||"0",10)||0);
   if(offset>1000)throw Error("Too many images requested");
   let query="studio_media_assets?select=id,storage_path,alt_text,source_type,source_url,copyright_holder,license,generation_prompt,generator_model,optimized_variants,optimization_status,original_deleted_at,created_at,uploader_id&project_id=eq."+pr.id+"&rights_confirmed=eq.true";
   if(source!=="all")query+="&source_type=eq."+source;
   if(role==="author")query+="&uploader_id=eq."+u.id;
   query+="&order=created_at.desc&limit="+(limit+1)+"&offset="+offset;
   const all=await db(query);
   const has_more=all.length>limit;
   const items=await Promise.all(all.slice(0,limit).map(async(m:any)=>{
    const variant=m.optimization_status==="ready"?m.optimized_variants?.thumb?.path:null;
    const path=variant||(!m.original_deleted_at?m.storage_path:null);
    let urlSigned:string|null=null;
    if(path){try{urlSigned=await signedMediaPath(path,900)}catch{}}
    return {id:m.id,alt:m.alt_text||"",source_type:m.source_type,mine:m.uploader_id===u.id,
     source_url:m.source_url||null,copyright_holder:m.copyright_holder||"",
     license:m.license||"",prompt:m.generation_prompt||"",
     model:m.generator_model||null,created_at:m.created_at,
     optimized:m.optimization_status==="ready",available:!!path&&!!urlSigned,thumb_url:urlSigned};
   }));
   return reply(200,{items,has_more,next_offset:has_more?offset+limit:null});
  }
   // Safely delete only an OWN unused image, never anything referenced in article history.
   if(a[0]==="media"&&idok(a[1])&&a.length===2&&req.method==="DELETE"){
    if(body.confirm!==true)throw Error("Deletion requires explicit confirmation");
    const [m]=await db("studio_media_assets?select=id,project_id,uploader_id,storage_path,optimized_variants,source_type&id=eq."+a[1]+"&limit=1");
    if(!m)return reply(404,{error:"Image not found"});
    const role=await member(m.project_id,u.id);
    can(role,"owner","chief_editor","editor","author");
    if(m.uploader_id!==u.id)throw Error("Forbidden");
    if(await rpc("studio_media_in_use_v1",{p_asset:m.id})!==false)
     throw Error("Файл используется в статье, переводе, истории редакций, теме или профиле. Удаление заблокировано.");
    const safePrefix=m.project_id+"/"+m.uploader_id+"/";
    const paths=[m.storage_path,...renditions.map(k=>m.optimized_variants?.[k]?.path).filter(Boolean)];
    if(paths.some(p=>typeof p!=="string"||!p.startsWith(safePrefix)||p.includes("..")))
     throw Error("Invalid image storage path");
    for(const path of new Set(paths))await deletePrivate(path);
    const removed=await db("studio_media_assets?id=eq."+m.id+"&project_id=eq."+m.project_id+
     "&uploader_id=eq."+u.id,{method:"DELETE"});
    if(!removed.length)throw Error("Image metadata was not removed");
    try{await db("studio_audit_log",{method:"POST",body:JSON.stringify({
     project_id:m.project_id,user_id:u.id,action:"personal_media_deleted",
     target_id:m.id,metadata:{source_type:m.source_type,files_removed:paths.length}
    })})}catch(e){console.warn("Personal media deletion audit deferred",String(e))}
    return reply(200,{ok:true,deleted_id:m.id});
   }
  if(a[0]==="media"&&req.method==="POST"&&!a[1]){
   const pr=await proj(txt(body.project,48));can(await member(pr.id,u.id),"owner","chief_editor","editor","author");
   if(body.rights_confirmed!==true)throw Error("Image rights must be confirmed");
   const mime=txt(body.mime,24),ext:any={"image/png":"png","image/jpeg":"jpg","image/webp":"webp"};
   if(!ext[mime]||typeof body.base64!=="string"||body.base64.length>11200000)throw Error("Unsupported media");
   const raw=atob(body.base64),bytes=Uint8Array.from(raw,x=>x.charCodeAt(0));
   if(bytes.length>8388608)throw Error("Image too large");
   const valid=mime==="image/png"&&bytes[0]===137&&bytes[1]===80&&bytes[2]===78||mime==="image/jpeg"&&bytes[0]===255&&bytes[1]===216||mime==="image/webp"&&String.fromCharCode(...bytes.slice(0,4))==="RIFF";
   if(!valid)throw Error("Invalid file content");
   const path=pr.id+"/"+u.id+"/"+crypto.randomUUID()+"."+ext[mime];
   const sourceUrl=String(body.source_url||"").trim();
   if(sourceUrl&&(!/^https:\/\//i.test(sourceUrl)||sourceUrl.length>850))throw Error("Use a valid HTTPS source URL");
   const store=await fetch(base+"/storage/v1/object/studio-private/"+path,{method:"POST",headers:{apikey:service,Authorization:"Bearer "+service,"Content-Type":mime},body:bytes});
   if(!store.ok)throw Error("Storage error");
   const rows=await db("studio_media_assets",{method:"POST",body:JSON.stringify({
    project_id:pr.id,uploader_id:u.id,storage_path:path,mime_type:mime,original_bytes:bytes.length,
    alt_text:String(body.alt_text||"").slice(0,350),copyright_holder:String(body.copyright_holder||"").slice(0,200),
    license:String(body.license||"").slice(0,120),rights_confirmed:true,source_type:sourceUrl?"stock":"upload",source_url:sourceUrl||null
   })});
   return reply(201,{asset:rows[0],optimization:mediaSummary(rows[0])});
  }
  if(a[0]==="media"&&idok(a[1])&&a[2]==="source"&&req.method==="GET"){
   const [m]=await db("studio_media_assets?select=*&id=eq."+a[1]+"&limit=1");
   if(!m)throw Error("Media not found");
   const role=await member(m.project_id,u.id);
   can(role,"owner","chief_editor","editor","author");
   if(role==="author"&&m.uploader_id!==u.id)throw Error("Forbidden");
   if(m.original_deleted_at)throw Error("Original image has already been removed");
   const file=await fetch(base+"/storage/v1/object/studio-private/"+m.storage_path,{
    headers:{apikey:service,Authorization:"Bearer "+service}
   });
   if(!file.ok||!file.body)throw Error("Unable to read source image");
   return new Response(file.body,{status:200,headers:{...headers,"Content-Type":m.mime_type,
    "Cache-Control":"no-store","X-Original-Bytes":String(m.original_bytes||0)}});
  }
  if(a[0]==="media"&&idok(a[1])&&a[2]==="optimize"&&req.method==="POST"){
   const [m]=await db("studio_media_assets?select=*&id=eq."+a[1]+"&limit=1");
   if(!m)throw Error("Image not found");
   const role=await member(m.project_id,u.id);
   can(role,"owner","chief_editor","editor","author");
   if(role==="author"&&m.uploader_id!==u.id)throw Error("Forbidden");
   if(m.optimization_status==="ready")return reply(200,{ok:true,optimization:mediaSummary(m),already_ready:true});
   if(m.original_deleted_at)throw Error("Original already cleaned up");
   const uploads:any={};const written:any[]=[];
   for(const key of renditions){
    const part=body.variants?.[key];
    const bytes=decodeWebp(part?.base64,key);
    const width=Number(part?.width),height=Number(part?.height);
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||width>2500||height<1||height>2500)
     throw Error("Invalid image dimensions");
    const path=m.project_id+"/"+m.uploader_id+"/"+m.id+"/optimized-"+key+".webp";
    uploads[key]={path,bytes:bytes.length,width,height,mime:"image/webp"};
    written.push({path,bytes});
   }
   for(const key of renditions)await uploadPrivate(uploads[key].path,(written.find((x:any)=>x.path===uploads[key].path) as any).bytes);
   const updated=await db("studio_media_assets?id=eq."+m.id+"&optimization_status=neq.ready",{
    method:"PATCH",body:JSON.stringify({optimized_variants:uploads,optimization_status:"ready",
     original_bytes:m.original_bytes||Number(body.original_bytes)||null,optimized_at:new Date().toISOString()})
   });
   const final=updated[0]||m;
   const removed=await pruneOriginal(final);
   return reply(200,{ok:true,optimization:mediaSummary(final),original_deleted:removed});
  }
  if(a[0]==="media"&&idok(a[1])&&req.method==="GET"&&a.length===2){
   const [m]=await db("studio_media_assets?select=*&id=eq."+a[1]+"&limit=1");if(!m)throw Error("Not found");
   const role=await member(m.project_id,u.id);if(!role||role==="author"&&m.uploader_id!==u.id)throw Error("Forbidden");
   const choice=url.searchParams.get("variant")||"article";
   if(!["thumb","article","cover","original"].includes(choice))throw Error("Invalid requested image variant");
   const variant=m.optimized_variants?.[choice];
   let path=choice==="original"&&!m.original_deleted_at?m.storage_path:variant?.path;
   if(!path)path=m.optimized_variants?.article?.path||(!m.original_deleted_at?m.storage_path:null);
   if(!path)throw Error("No available optimized image");
   const resolved=await signedMediaPath(path);
   return reply(200,{url:resolved,alt:m.alt_text,expires_in:600,optimization:mediaSummary(m)});
  }
  return reply(404,{error:"Unknown route"});
 }catch(e){
  const msg=String(e instanceof Error?e.message:e);
  if(msg.startsWith("DB_ERROR")||msg.startsWith("RPC_ERROR"))return reply(503,{error:"Backend unavailable"});
  return reply(msg==="Unauthorized"?401:msg==="Forbidden"?403:400,{error:msg.slice(0,180)});
 }
});
