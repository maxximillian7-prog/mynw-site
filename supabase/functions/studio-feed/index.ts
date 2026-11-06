
const base=Deno.env.get("SUPABASE_URL")!,secret=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const h={"Content-Type":"application/json","Access-Control-Allow-Origin":"*","Access-Control-Allow-Methods":"GET,OPTIONS","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const send=(c:number,x:unknown)=>new Response(JSON.stringify(x),{status:c,headers:h});
async function get(path:string){const r=await fetch(base+"/rest/v1/"+path,{headers:{"apikey":secret,"Authorization":"Bearer "+secret}});if(!r.ok)throw Error("Database unavailable");return await r.json();}
async function topicPicture(path:string):Promise<string|null>{
 const response=await fetch(base+"/storage/v1/object/sign/studio-private/"+path,{
  method:"POST",headers:{apikey:secret,Authorization:"Bearer "+secret,"Content-Type":"application/json"},
  body:JSON.stringify({expiresIn:1800})
 });
 if(!response.ok)return null;
 const result=await response.json(),raw=result.signedURL||result.signedUrl;
 if(typeof raw!=="string"||!raw)return null;
 return /^https:\/\//i.test(raw)?raw:base+(raw.startsWith("/storage/v1/")?"":"/storage/v1")+(raw.startsWith("/")?raw:"/"+raw);
}
async function publicTopics(projectId:string,locale:string,defaultLocale:string){
 const rows=await get("studio_topics?select=id,slug,title,translations,revision,sort_order,updated_at,image_asset_id,focus_x,focus_y&project_id=eq."+projectId+"&is_active=eq.true&order=sort_order.asc,title.asc&limit=200");
 const mediaIds=[...new Set(rows.map((x:any)=>x.image_asset_id).filter(Boolean))];
 const assets=mediaIds.length?await get("studio_media_assets?select=id,storage_path,optimized_variants,optimization_status,original_deleted_at&project_id=eq."+projectId+"&rights_confirmed=eq.true&id=in.("+mediaIds.join(",")+")"):[];
 const byId=new Map(assets.map((a:any)=>[a.id,a]));
 return await Promise.all(rows.map(async(t:any)=>{
  const a:any=byId.get(t.image_asset_id);
  const variant=a?.optimization_status==="ready"?a.optimized_variants?.cover?.path:null;
  const path=variant||(!a?.original_deleted_at?a?.storage_path:null);
  let image_url:string|null=null;
  if(path){try{image_url=await topicPicture(path)}catch(e){console.warn("Topic picture temporarily unavailable",String(e))}}
  const translated=t.translations?.[locale];
  // Studio stores its canonical topic title in Russian. The project's
  // default_locale (pt-PT for NowGreen) is the article/project preference,
  // NOT the source locale of the canonical studio_topics.title column.
  // Requiring translations.ru used to hide all newly created Russian topics.
  if(locale!=="ru"&&(!translated||typeof translated!=="string"||!translated.trim()))return null;
  const localizedTitle=locale==="ru"?t.title:translated.trim();
  return {id:t.id,slug:t.slug,title:localizedTitle,
   revision:t.revision,updated_at:t.updated_at,sort_order:t.sort_order,focus_x:t.focus_x,focus_y:t.focus_y,image_url};
 })).then(items=>items.filter(Boolean));
}

// Return human-reviewed localized copy, otherwise preserve original author words.
// Each field has a source snapshot; editing the original invalidates only that
// field's translation rather than exposing an outdated biography or invented facts.
function localizedAuthor(a:any,locale:string){
 const row=a.translations?.[locale];
 const same=locale===(a.preferred_locale||"ru");
 const value=(field:"name"|"tagline"|"bio"|"focus")=>{
  const original=String(a[field]||"");
  if(same||!row||typeof row[field]!=="string"||!row[field].trim()||
     !row.source||row.source[field]!==original)return original;
  return row[field].trim();
 };
 return {name:value("name"),tagline:value("tagline"),bio:value("bio"),focus:value("focus")};
}

/** Only active, consenting authors with publicly released NowGreen posts.
 * Deliberately independent from page size and the requested article locale.
 * A partner with zero published, placed articles is never disclosed.
 */
async function publicAuthors(projectId:string,locale:string){
 const posts=await get("studio_posts?select=id,author_id&project_id=eq."+projectId+
  "&status=eq.published&deleted_at=is.null&is_hidden=eq.false&author_id=not.is.null&limit=500");
 if(!posts.length)return [];
 const postIds=posts.map((x:any)=>x.id);
 const placements=await get("studio_placements?select=post_id&channel=eq.nowgreen"+
  "&status=eq.ready&post_id=in.("+postIds.join(",")+")&limit=500");
 const released=new Set<string>(placements.map((x:any)=>x.post_id));
 const counts=new Map<string,number>();
 for(const post of posts)if(released.has(post.id)){
  counts.set(post.author_id,(counts.get(post.author_id)||0)+1);
 }
 const ids=[...counts.keys()];
 if(!ids.length)return [];
 const authors=await get("studio_authors?select=id,name,kind,tagline,bio,focus,preferred_locale,translations,social_links,photo_asset_id"+
  "&project_id=eq."+projectId+"&is_active=eq.true&consent_status=eq.approved"+
  "&id=in.("+ids.join(",")+")&limit=100");
 const mediaIds=[...new Set(authors.map((a:any)=>a.photo_asset_id).filter(Boolean))];
 const assets=mediaIds.length?await get("studio_media_assets?select=id,storage_path,optimized_variants,optimization_status,original_deleted_at"+
  "&project_id=eq."+projectId+"&rights_confirmed=eq.true&id=in.("+mediaIds.join(",")+")"): [];
 const byPhoto=new Map(assets.map((a:any)=>[a.id,a]));
 const sorted=authors.sort((a:any,b:any)=>
  Number(a.kind==="ai")-Number(b.kind==="ai")||
  (counts.get(b.id)||0)-(counts.get(a.id)||0)||
  String(a.name).localeCompare(String(b.name)));
 return await Promise.all(sorted.map(async(a:any)=>{
  const media:any=byPhoto.get(a.photo_asset_id);
  const variants=media?.optimization_status==="ready"?media.optimized_variants||{}:{};
  const path=variants.thumb?.path||variants.article?.path||variants.cover?.path||
    (!media?.original_deleted_at?media?.storage_path:null);
  let photo_url:string|null=null;
  if(path){try{photo_url=await topicPicture(path)}catch(e){console.warn("Author photo unavailable",String(e))}}
  // Display the author's original tagline/bio as a fallback when the reader's
  // locale differs. Author-profile translations are not stored yet.
  const links:Record<string,string>={};
  for(const [name,url] of Object.entries(a.social_links||{})){
   if(typeof url==="string" && /^https:\/\//i.test(url))links[name]=url;
  }
  const profile=localizedAuthor(a,locale);
  return {id:a.id,name:profile.name,kind:a.kind,tagline:profile.tagline,
   bio:profile.bio,photo_url,social_links:links,
   published_articles:counts.get(a.id)||0};
 }));
}

Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:h});
 if(req.method!=="GET")return send(405,{error:"Method not allowed"});
 try{
  const u=new URL(req.url),project=u.searchParams.get("project")||"",locale=u.searchParams.get("locale")||"ru",id=u.searchParams.get("id");
  if(!/^[a-z0-9_-]{2,48}$/.test(project)||!/^[a-z]{2}(?:-[A-Z]{2})?$/.test(locale))return send(400,{error:"Invalid project or language"});
  if(id&&!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))return send(400,{error:"Invalid article id"});
  const [p]=await get("studio_projects?select=id,slug,default_locale&slug=eq."+encodeURIComponent(project)+"&is_active=eq.true&limit=1");
  if(!p)return send(404,{error:"Unknown project"});
  // Small independent topic endpoint. A new topic must become visible even
  // without an assigned article, or if article/placement work is unavailable.
  if(!id&&u.searchParams.get("topics_only")==="1"){
   return send(200,{topics:await publicTopics(p.id,locale,p.default_locale||"ru")});
  }
  const tombstones=await get("studio_posts?select=id&project_id=eq."+p.id+
     "&deleted_at=not.is.null&published_at=not.is.null&limit=500");
   const deleted_ids=tombstones.map((item:any)=>item.id);
   const hiddenPosts=await get("studio_posts?select=id&project_id=eq."+p.id+
     "&is_hidden=eq.true&deleted_at=is.null&published_at=not.is.null&limit=500");
   const hidden_ids=hiddenPosts.map((item:any)=>item.id);
   const authors=!id?await publicAuthors(p.id,locale):[];
  const places=await get("studio_placements?select=post_id&channel=eq."+project+"&locale=eq."+locale+"&status=eq.ready&limit=100");
  if(!places.length)return send(200,{articles:[],authors,topics:await publicTopics(p.id,locale,p.default_locale||'ru'),deleted_ids,hidden_ids});
  const ids=[...new Set(places.map((x:{post_id:string})=>x.post_id))].slice(0,100);
  const items=await get("studio_posts?select=id,title,summary,locale,category,topic_id,published_at,author_id,approved_revision,cover_path&project_id=eq."+p.id+"&status=eq.published&deleted_at=is.null&is_hidden=eq.false&id=in.("+ids.join(",")+")&order=published_at.desc&limit=100");
  const freezes=await get("studio_post_versions?select=post_id,revision,snapshot&post_id=in.("+ids.join(",")+")&limit=500");
  const reviewedTranslations=await get("studio_ai_translations?select=post_id,locale,title,summary,blocks,source_revision,status&post_id=in.("+ids.join(",")+")&status=eq.reviewed&limit=500");
  const approvedById=new Map(items.map((x:any)=>[x.id,x.approved_revision]));
  const snapshots=new Map(freezes.filter((x:any)=>x.revision===approvedById.get(x.post_id)).map((x:any)=>[x.post_id,x.snapshot]));
  function variantFor(item:any){
   const snapshot:any=snapshots.get(item.id);
   if(!snapshot)return null;
   const v=(snapshot.channel_versions||[]).find((x:any)=>x.channel===project&&x.locale===locale);
   if(v)return {...v,category:snapshot.category,topic_id:item.topic_id,author_id:snapshot.author_id};
   if(locale===snapshot.locale)return {...snapshot,topic_id:item.topic_id};
   const t=(snapshot.translations||[]).find((x:any)=>x.locale===locale&&x.source_revision===snapshot.revision&&x.status==="reviewed")
     ||reviewedTranslations.find((x:any)=>x.post_id===item.id&&x.locale===locale&&x.source_revision===item.approved_revision&&x.status==="reviewed");
   if(t)return {...t,category:snapshot.category,topic_id:item.topic_id,author_id:snapshot.author_id,cover_path:snapshot.cover_path,template_id:snapshot.template_id};
   return null;
  }
  if(!id)return send(200,{topics:await publicTopics(p.id,locale,p.default_locale||'ru'),authors,articles:items.flatMap((item:any)=>{
   const content=variantFor(item);if(!content)return[];
   return[{id:item.id,title:content.title,summary:content.summary,locale:content.locale,category:content.category,published_at:item.published_at,author_id:item.author_id,topic_id:content.topic_id||null}];
  }),deleted_ids,hidden_ids});
  const item=items.find((x:{id:string})=>x.id===id);
  if(!item)return send(404,{error:"Article not published"});
  const snapshot:any=snapshots.get(item.id);
  if(!snapshot)return send(503,{error:"Approved version is not available"});
  const article:any=variantFor(item);
  if(!article)return send(404,{error:"No approved article in this language"});
  const idsMedia=[...new Set((article.blocks||[]).filter((x:any)=>x.type==="image").map((x:any)=>x.asset_id).concat(article.cover_path?[article.cover_path]:[]))].slice(0,20);
  const authorRows=article.author_id?await get("studio_authors?select=id,name,kind,tagline,bio,focus,preferred_locale,translations,social_links,photo_asset_id,consent_status&project_id=eq."+p.id+"&id=eq."+article.author_id+"&limit=1"):[];
  const author=authorRows[0];
  const localized=author?localizedAuthor(author,locale):null;
  if(author?.photo_asset_id)idsMedia.push(author.photo_asset_id);
  const assets=idsMedia.length?await get("studio_media_assets?select=id,storage_path,optimized_variants,optimization_status,original_deleted_at,alt_text,source_type,source_url,copyright_holder,license&project_id=eq."+p.id+"&rights_confirmed=eq.true&id=in.("+idsMedia.join(",")+")"):[];
  const meta=Object.fromEntries(assets.map((x:any)=>[x.id,{source_type:x.source_type||"upload",source_url:x.source_url||null,credit:x.copyright_holder||null,license:x.license||null}]));
  const urls:Record<string,string>={},coverUrls:Record<string,string>={},thumbUrls:Record<string,string>={};
  // A single Storage 429 must not silently turn a published photo into src:null.
  // Retry only transient sign failures, then try another existing optimized size.
  const signVariant=async(path:string):Promise<string|null>=>{
   for(let attempt=0;attempt<4;attempt++){
    try{
     const response=await fetch(base+"/storage/v1/object/sign/studio-private/"+path,{method:"POST",
      headers:{apikey:secret,Authorization:"Bearer "+secret,"Content-Type":"application/json"},
      body:JSON.stringify({expiresIn:1800})});
     if(response.ok){
      const data=await response.json(),raw=data.signedURL||data.signedUrl;
      if(typeof raw==="string"&&raw){
       return /^https:\/\//i.test(raw)?raw:base+
        (raw.startsWith("/storage/v1/")?"":"/storage/v1")+(raw.startsWith("/")?raw:"/"+raw);
      }
      console.warn("Studio feed: signed image URL absent for asset path",path);
      return null;
     }
     if(![429,500,502,503,504].includes(response.status)){
      console.warn("Studio feed: image signing rejected",response.status,path);
      return null;
     }
     if(attempt===3){
      console.warn("Studio feed: image signing attempts exhausted",response.status,path);
      return null;
     }
     const after=Number(response.headers.get("retry-after"));
     const pause=after>0&&Number.isFinite(after)?Math.min(2500,after*1000):[350,900,1600][attempt];
     await new Promise(resolve=>setTimeout(resolve,pause));
    }catch(error){
     if(attempt===3){
      console.warn("Studio feed: image signing network failure",String(error),path);
      return null;
     }
     await new Promise(resolve=>setTimeout(resolve,[350,900,1600][attempt]));
    }
   }
   return null;
  };
  const inlineIds=new Set((article.blocks||[]).filter((b:any)=>b.type==="image").map((b:any)=>b.asset_id));
  const firstSigned=async(paths:(string|null|undefined)[]):Promise<string|null>=>{
   const tried=new Set<string>();
   for(const path of paths){
    if(!path||tried.has(path))continue;
    tried.add(path);
    const signed=await signVariant(path);
    if(signed)return signed;
   }
   return null;
  };
  for(const asset of assets){
   const opts=asset.optimized_variants||{};
   const valid=asset.optimization_status==="ready";
   const original=!asset.original_deleted_at?asset.storage_path:null;
   const articlePath=valid?opts.article?.path:null;
   const coverPath=valid?opts.cover?.path:null;
   const thumbPath=valid?opts.thumb?.path:null;
   // Cover-only assets no longer need a redundant article-size signature.
   if(inlineIds.has(asset.id)){
    urls[asset.id]=await firstSigned([articlePath,coverPath,thumbPath,original])||"";
   }
   if(article.cover_path===asset.id){
    coverUrls[asset.id]=await firstSigned([coverPath,articlePath,thumbPath,original])||urls[asset.id]||"";
   }
   if(author?.photo_asset_id===asset.id){
    thumbUrls[asset.id]=await firstSigned([thumbPath,articlePath,coverPath,original])||urls[asset.id]||"";
   }
  }
  return send(200,{article:{id:item.id,title:article.title,summary:article.summary,locale:article.locale,category:snapshot.category,topic_id:article.topic_id||null,template_id:article.template_id||"editorial",published_at:item.published_at,cover_url:coverUrls[article.cover_path]||urls[article.cover_path]||null,cover_rights:meta[article.cover_path]||null,author:author?{name:localized!.name,kind:author.kind,tagline:localized!.tagline,bio:localized!.bio,social_links:author.social_links,photo_url:thumbUrls[author.photo_asset_id]||urls[author.photo_asset_id]||null}:null,blocks:(article.blocks||[]).map((x:any)=>x.type==="image"?{...x,src:urls[x.asset_id]||null,credit:meta[x.asset_id]||null}:x)}});
 }catch{return send(503,{error:"Feed temporarily unavailable"});}
});