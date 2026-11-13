// Portugal editorial: signed in photo choice using real Wikimedia Commons files.
const studio="https://npsfaymjckcqhtyiafms.supabase.co",key="sb_publishable_-HPESNuXtfZQo-gLREwi2Q_1_aAoxee";
const uuid=x=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(x||"");
const hosts=new Set(["https://mynw.app","https://www.mynw.app"]);
const bad=(message,status=400)=>Object.assign(new Error(message),{status});
const result=(x,status=200,origin="")=>Response.json(x,{status,headers:{"cache-control":"no-store",...(origin?{"access-control-allow-origin":origin}:{})}});
async function db(q,p=[]){
const c=process.env.DATABASE_URL,r=await fetch("https://"+new URL(c).hostname+"/sql",{method:"POST",headers:{"content-type":"application/json","Neon-Connection-String":c},body:JSON.stringify({query:q,params:p}),signal:AbortSignal.timeout(15000)});
if(!r.ok)throw bad("Database unavailable",503);const x=await r.json();return x.rows??x;
}
async function auth(req){
const token=req.headers.get("authorization")||"";if(!token.startsWith("Bearer ")||token.length>3200)throw bad("Войдите в редакцию",401);
const headers={"apikey":key,"authorization":token};const [a,b]=await Promise.all([fetch(studio+"/auth/v1/user",{headers}),fetch(studio+"/functions/v1/studio-api/projects",{headers})]);
if(!a.ok||!b.ok)throw bad("Сессия устарела",401);const user=await a.json(),p=await b.json();
if(!uuid(user.id)||!(p.projects||[]).some(x=>x.slug==="nowgreen"&&["owner","chief_editor","editor"].includes(x.role)))throw bad("Нет прав редактора",403);
}
const plain=v=>String(v||"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
function decode(page){
const i=page?.imageinfo?.[0],m=i?.extmetadata||{},license=plain(m.LicenseShortName?.value),author=plain(m.Artist?.value||i?.user).slice(0,150),src=i?.thumburl||i?.url;
if(!i||!/^File:/.test(page.title)||!author||!src||!/^image\/(jpeg|png|webp)$/.test(i.mime)||i.width<800)return null;
if(!/^(CC BY(?:-SA)? (?:2\.0|3\.0|4\.0)|CC0 1\.0|Public domain|PDM)$/i.test(license))return null;
const u=new URL(src);if(!["upload.wikimedia.org","thumb.wikimedia.org"].includes(u.hostname)||u.protocol!=="https:"||!u.pathname.startsWith("/wikipedia/commons/"))return null;u.search="";
if(!i.descriptionurl?.startsWith("https://commons.wikimedia.org/wiki/File:"))return null;
const licenseUrl=plain(m.LicenseUrl?.value)||i.descriptionurl;
return {title:page.title,url:u.href,file_page:i.descriptionurl,license,license_url:licenseUrl,author,width:i.width,height:i.height};
}
async function commons(params){
const u=new URL("https://commons.wikimedia.org/w/api.php");
for(const[k,v]of Object.entries({action:"query",format:"json",formatversion:"2",prop:"imageinfo",iiprop:"url|size|mime|extmetadata|user",iiurlwidth:"1280",...params}))u.searchParams.set(k,v);
const response=await fetch(u,{signal:AbortSignal.timeout(17000)});if(!response.ok)throw bad("Wikimedia недоступна",503);
const json=await response.json();return(json.query?.pages||[]).map(decode).filter(Boolean);
}

function httpsLink(v,hostnames,pathRegExp){
 try{
  const u=new URL(String(v||""));if(u.protocol!=="https:"||u.username||u.password||!hostnames.includes(u.hostname)||!pathRegExp.test(u.pathname))throw Error("bad url");
  u.hash="";return u;
 }catch{throw bad("Укажите HTTPS-ссылку с официального сайта выбранного фотобанка",422);}
}
function licInfo(provider){
 const a={
  pexels:{name:"Pexels",landing:["pexels.com","www.pexels.com"],path:/^\/photo\/[^/?#]+\/?$/,images:["images.pexels.com"],file:/^\/photos\/\d+\//,license:"Pexels License",licurl:"https://www.pexels.com/license/"},
  unsplash:{name:"Unsplash",landing:["unsplash.com","www.unsplash.com"],path:/^\/photos\/[^/?#]+\/?$/,images:["images.unsplash.com"],file:/^\/photo-/,license:"Unsplash License",licurl:"https://unsplash.com/license"},
  pixabay:{name:"Pixabay",landing:["pixabay.com","www.pixabay.com"],path:/^\/photos\/[^/?#]+\/?$/,images:["cdn.pixabay.com"],file:/^\/photo\//,license:"Pixabay Content License",licurl:"https://pixabay.com/service/license-summary/"}
 };
 return a[provider]||null;
}
async function importFromStock(body){
 const draft=await checkItem(body.item_id),source=licInfo(body.provider);if(!source)throw bad("Источник не поддерживается");
 if(body.confirmed!==true)throw bad("Сначала подтвердите, что фото действительно свободное, не AI и подходит статье",422);
 const landing=httpsLink(body.page_url,source.landing,source.path),image=httpsLink(body.image_url,source.images,source.file);
 const author=plain(body.author).slice(0,140);
 if(author.length<3)throw bad("Укажите настоящего автора фото",422);
 if(body.provider==="pexels"){
  const pid=landing.pathname.match(/-(\d+)\/?$/)?.[1],iid=image.pathname.match(/^\/photos\/(\d+)\//)?.[1];
  if(!pid||pid!==iid)throw bad("ID фотографии Pexels в двух ссылках не совпадает",422);
 }
 image.search="";const photoUrl=image.href;
 const dup=await db("SELECT id FROM pr_media_assets WHERE item_id<>$1::uuid AND public_url=$2 AND status IN ('candidate','approved') LIMIT 1",[body.item_id,photoUrl]);
 if(dup.length)throw bad("Фотография уже используется в другой статье",409);
 const attribution="Фото: "+author+" / "+source.name+" ("+source.license+"). Оригинал: "+landing.href;
 const details=source.license+"; "+source.licurl+"; photo page "+landing.href+"; source & licence visually checked by editor";
 const prior=await db("SELECT id FROM pr_media_assets WHERE item_id=$1::uuid AND public_url=$2 LIMIT 1",[body.item_id,photoUrl]);
 let mediaId=prior[0]?.id;
 if(!mediaId){const rows=await db("INSERT INTO pr_media_assets(item_id,story_id,media_type,public_url,attribution,license_details,rights_verified,illustration_label_required,status,generation_model) VALUES($1::uuid,$2::uuid,'licensed_original',$3,$4,$5,true,false,'candidate',$6) RETURNING id",[body.item_id,draft.draft_id,photoUrl,attribution,details,"editor_verified_"+body.provider+"_licence"]);mediaId=rows[0]?.id;}
 await db("UPDATE pr_items SET photo_url=$2,photo_rights='cc_licensed',photo_attribution=$3,photo_license=$4,photo_licence_url=$5,updated_at=now() WHERE id=$1::uuid",[body.item_id,photoUrl,attribution,source.license,source.licurl]);
 return {media_id:mediaId,needs_approval:true,provider:body.provider,photo_url:photoUrl};
}
function openverseEntry(p){
 if(!p||!uuid(p.id)||p.mature===true||!["by","by-sa","cc0","pdm"].includes(p.license))return null;
 const creator=plain(p.creator).slice(0,150),page=p.foreign_landing_url||p.detail_url,src=p.url,thumb=p.thumbnail||src;
 if(!creator||!src||!page)return null;
 let image,site,preview;
 try{image=new URL(src);site=new URL(page);preview=new URL(thumb)}catch{return null}
 if(image.protocol!=="https:"||site.protocol!=="https:"||preview.protocol!=="https:"||image.username||image.password||site.username||site.password)return null;
 if(!/^\.(jpe?g|png|webp)(?:$|\?)/i.test(image.pathname.match(/\.[^.]+$/)?.[0]||"")&&p.filetype&&!["jpg","jpeg","png","webp"].includes(p.filetype.toLowerCase()))return null;
 if(Number(p.width)<800||!p.license_url||!/^https:\/\/(creativecommons\.org|commons\.wikimedia\.org)\//.test(p.license_url))return null;
 return {provider:"openverse",title:plain(p.title).slice(0,140)||"Photo",image_id:p.id,url:image.href,preview_url:preview.href,file_page:site.href,license:p.license.toUpperCase()+" "+(p.license_version||""),license_url:p.license_url,author:creator,source:plain(p.source||"Openverse")};
}
async function openverse(q){
 const url=new URL("https://api.openverse.org/v1/images/");
 for(const[k,v]of Object.entries({q,page_size:"20",license:"by,by-sa,cc0,pdm",license_type:"commercial",extension:"jpg,jpeg,png,webp",mature:"false"}))url.searchParams.set(k,v);
 const res=await fetch(url,{headers:{"accept":"application/json"},signal:AbortSignal.timeout(16000)});
 if(!res.ok)throw bad("Openverse временно недоступен",503);
 const j=await res.json();return(j.results||[]).map(openverseEntry).filter(Boolean);
}
async function attachOpenverse(itemId,imageId){
 const draft=await checkItem(itemId);if(!uuid(imageId))throw bad("Некорректное фото Openverse");
 const response=await fetch("https://api.openverse.org/v1/images/"+imageId+"/",{headers:{"accept":"application/json"},signal:AbortSignal.timeout(16000)});
 if(!response.ok)throw bad("Не удалось подтвердить лицензию Openverse",503);
 const image=openverseEntry(await response.json());if(!image)throw bad("Не подтверждены разрешённая лицензия или автор",422);
 const duplicate=await db("SELECT id FROM pr_media_assets WHERE item_id<>$1::uuid AND public_url=$2 AND status IN ('candidate','approved') LIMIT 1",[itemId,image.url]);
 if(duplicate.length)throw bad("Это фото уже используется в другой статье",409);
 const attribution="Фото: "+image.author+" / "+image.source+" (Openverse, "+image.license+"). Файл: "+image.file_page;
 const details=image.license+"; "+image.license_url+"; source "+image.file_page+"; Openverse ID "+image.image_id;
 const old=await db("SELECT id FROM pr_media_assets WHERE item_id=$1::uuid AND public_url=$2 LIMIT 1",[itemId,image.url]);let mid=old[0]?.id;
 if(!mid){const rows=await db("INSERT INTO pr_media_assets(item_id,story_id,media_type,public_url,attribution,license_details,rights_verified,illustration_label_required,status,generation_model) VALUES($1::uuid,$2::uuid,'licensed_original',$3,$4,$5,true,false,'candidate','openverse_api_license_lookup') RETURNING id",[itemId,draft.draft_id,image.url,attribution,details]);mid=rows[0]?.id;}
 await db("UPDATE pr_items SET photo_url=$2,photo_rights='cc_licensed',photo_attribution=$3,photo_license=$4,photo_licence_url=$5,updated_at=now() WHERE id=$1::uuid",[itemId,image.url,attribution,image.license,image.license_url]);
 return {media_id:mid,photo:image,needs_approval:true,provider:"openverse"};
}

async function searchAll(q){
 const names=["commons","openverse"];
 const tasks=await Promise.allSettled([
  commons({generator:"search",gsrnamespace:"6",gsrlimit:"22",gsrsearch:q}),
  openverse(q)
 ]);
 const warnings=[],photos=[],seen=new Set();
 tasks.forEach((r,i)=>{
  if(r.status!=="fulfilled"){warnings.push((names[i]==="commons"?"Wikimedia Commons":"Openverse")+" временно недоступен");return}
  for(const img of r.value||[]){
   const normalized=String(img.url||"").replace(/^https:\/\/(?:thumb|upload)\.wikimedia\.org/,"https://wikimedia.org").replace(/\?.*$/,"").replace(/\/thumb\//,"/");
   const dedupe=String(img.file_page||img.url||normalized).toLowerCase().replace(/^https:\/\/commons\.wikimedia\.org\/wiki\/file:/,"https://commons.wikimedia.org/wiki/file:");
   if(!img.url||seen.has(dedupe))continue;
   seen.add(dedupe);photos.push({...img,provider:img.provider||names[i]});
  }
 });
 return{photos,warnings};
}
async function checkItem(id){
if(!uuid(id))throw bad("Неверная статья");const rows=await db("SELECT i.status,d.id draft_id,d.status draft_status FROM pr_items i JOIN pr_story_drafts d ON d.item_id=i.id WHERE i.id=$1::uuid",[id]);const v=rows[0];
if(!v||v.status!=="candidate"||!["draft","ready_for_review","needs_facts"].includes(v.draft_status))throw bad("Статья недоступна для смены фото",409);return v;
}
async function attach(id,title){
const draft=await checkItem(id);if(!/^File:.{4,250}$/.test(title||""))throw bad("Неверное имя файла");
const found=(await commons({titles:title})).find(x=>x.title===title);if(!found)throw bad("Нет проверенной лицензии",422);
const another=await db("SELECT id FROM pr_media_assets WHERE item_id<>$1::uuid AND public_url=$2 AND status IN ('candidate','approved') LIMIT 1",[id,found.url]);if(another.length)throw bad("Фото уже используется в другой статье",409);
const attribution="Фото: "+found.author+" / Wikimedia Commons ("+found.license+"). Файл: "+found.file_page,details=found.license+"; "+found.license_url+"; file page "+found.file_page;
const old=await db("SELECT id FROM pr_media_assets WHERE item_id=$1::uuid AND public_url=$2 LIMIT 1",[id,found.url]);let media=old[0]?.id;
if(!media){const rows=await db("INSERT INTO pr_media_assets(item_id,story_id,media_type,public_url,attribution,license_details,rights_verified,illustration_label_required,status) VALUES($1::uuid,$2::uuid,'licensed_original',$3,$4,$5,true,false,'candidate') RETURNING id",[id,draft.draft_id,found.url,attribution,details]);media=rows[0].id;}
await db("UPDATE pr_items SET photo_url=$2,photo_rights='cc_licensed',photo_attribution=$3,photo_license=$4,photo_licence_url=$5,updated_at=now() WHERE id=$1::uuid",[id,found.url,attribution,found.license,found.license_url]);
return {media_id:media,photo:found,needs_approval:true};
}
export default {async fetch(req){const origin=req.headers.get("origin")||"",ok=hosts.has(origin),u=new URL(req.url);
if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":ok?origin:"null","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,content-type"}});
if(u.pathname==="/health")return result({ok:true,service:"prphoto",version:5},200,ok?origin:"");
if(!ok)return result({error:"Forbidden origin"},403);
try{await auth(req);if(req.method==="GET"&&u.pathname==="/api/search"){const q=(u.searchParams.get("q")||"").trim();if(q.length<3||q.length>100)throw bad("Введите запрос 3–100 символов");return result(await searchAll(q),200,origin);}
if(req.method==="POST"&&u.pathname==="/api/attach"){const raw=await req.text();if(raw.length>1500)throw bad("Слишком длинный запрос");const body=JSON.parse(raw||"{}");return result(body.provider==="openverse"?await attachOpenverse(body.item_id,body.image_id):await attach(body.item_id,body.file_title),200,origin);}
if(req.method==="POST"&&u.pathname==="/api/import"){const raw=await req.text();if(raw.length>2500)throw bad("Слишком длинный запрос");return result(await importFromStock(JSON.parse(raw||"{}")),200,origin);}
return result({error:"Not found"},404,origin);
}catch(e){return result({error:String(e.message||e).slice(0,200)},e.status||500,origin);}}};