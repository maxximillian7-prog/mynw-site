// Authenticated Wikimedia Commons photo chooser for Portugal Ryadom editorial.
const STUDIO="https://npsfaymjckcqhtyiafms.supabase.co", KEY="sb_publishable_-HPESNuXtfZQo-gLREwi2Q_1_aAoxee";
const allowed=new Set(["https://mynw.app","https://www.mynw.app"]);
const uuid=s=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s||"");
const failure=(msg,status=400)=>Object.assign(new Error(msg),{status});
const reply=(data,status=200,origin="")=>Response.json(data,{status,headers:{"cache-control":"no-store","vary":"Origin",...(origin?{"access-control-allow-origin":origin}:{})}});
async function query(q,params=[]){
 const c=process.env.DATABASE_URL;if(!c)throw failure("DB connection missing",503);
 const response=await fetch("https://"+new URL(c).hostname+"/sql",{method:"POST",headers:{"content-type":"application/json","Neon-Connection-String":c},body:JSON.stringify({query:q,params}),signal:AbortSignal.timeout(15000)});
 const payload=await response.json();if(!response.ok)throw failure("Database query failed",503);
 return payload.rows??payload;
}
async function auth(request){
 const bearer=request.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer ")||bearer.length>3200)throw failure("Войдите в Journal Studio",401);
 const headers={apikey:KEY,authorization:bearer};
 const [a,b]=await Promise.all([fetch(STUDIO+"/auth/v1/user",{headers,signal:AbortSignal.timeout(12000)}),fetch(STUDIO+"/functions/v1/studio-api/projects",{headers,signal:AbortSignal.timeout(12000)})]);
 if(!a.ok||!b.ok)throw failure("Сессия редакции недействительна",401);
 const user=await a.json(),list=await b.json();
 if(!uuid(user.id)||!(list.projects||[]).some(p=>p.slug==="nowgreen"&&["owner","chief_editor","editor"].includes(p.role)))throw failure("Нет прав на редактирование",403);
}
const plain=s=>String(s??"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g," ").trim();
function photo(page){
 const info=page?.imageinfo?.[0],meta=info?.extmetadata||{},license=plain(meta.LicenseShortName?.value),src=info?.thumburl||info?.url,author=plain(meta.Artist?.value||info?.user).slice(0,170);
 if(!/^File:/.test(page?.title||"")||!info||!src||!author)return null;
 if(!/^(CC BY(?:-SA)? (?:2\.0|3\.0|4\.0)|CC0 1\.0|Public domain|PDM)$/i.test(license))return null;
 try{const url=new URL(src);if(url.protocol!=="https:"||url.hostname!=="upload.wikimedia.org"||!url.pathname.startsWith("/wikipedia/commons/"))return null;}catch{return null;}
 if(!/^image\/(jpeg|png|webp)$/i.test(info.mime||"")||Number(info.width)<800)return null;
 if(!/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/i.test(info.descriptionurl||""))return null;
 const licUrl=plain(meta.LicenseUrl?.value||"")||info.descriptionurl;
 if(!/^https:\/\/(creativecommons\.org|commons\.wikimedia\.org)\//.test(licUrl))return null;
 return {title:page.title,url:src,file_page:info.descriptionurl,author,license,license_url:licUrl,width:info.width,height:info.height};
}
async function commons(parameters){
 const url=new URL("https://commons.wikimedia.org/w/api.php");
 for(const [k,v] of Object.entries({action:"query",format:"json",formatversion:"2",prop:"imageinfo",iiprop:"url|size|mime|extmetadata|user",iiurlwidth:"1280",...parameters}))url.searchParams.set(k,v);
 const res=await fetch(url,{headers:{"user-agent":"PortugalRyadomEditorial/1.0 (photo source verification)"},signal:AbortSignal.timeout(18000)});
 if(!res.ok)throw failure("Wikimedia Commons временно недоступен",503);
 const j=await res.json();if(j.error)throw failure("Ошибка поиска изображения",502);
 return(j.query?.pages||[]).map(photo).filter(Boolean);
}
async function item(id){
 if(!uuid(id))throw failure("Некорректная статья");
 const rows=await query("SELECT i.id,i.status,d.id AS draft_id,d.status draft_status FROM pr_items i LEFT JOIN pr_story_drafts d ON d.item_id=i.id WHERE i.id=$1::uuid",[id]);
 const i=rows[0];if(!i)throw failure("Статья не найдена",404);
 if(i.status!=="candidate"||!["draft","needs_facts","ready_for_review"].includes(i.draft_status))throw failure("Статья недоступна для замены фото",409);
 return i;
}
async function attach(id,title){
 const i=await item(id);
 if(typeof title!=="string"||!title.startsWith("File:")||title.length>260)throw failure("Укажите файл из Wikimedia Commons");
 const photos=await commons({titles:title}),p=photos.find(x=>x.title===title);if(!p)throw failure("У фотографии нет подходящей подтверждённой лицензии",422);
 const reused=await query("SELECT id FROM pr_media_assets WHERE public_url=$1 AND item_id<>$2::uuid AND status IN ('candidate','approved') LIMIT 1",[p.url,id]);
 if(reused.length)throw failure("Это фото уже используется в другой статье",409);
 const attribution="Фото: "+p.author+" / Wikimedia Commons ("+p.license+"). Файл: "+p.file_page,lic=p.license+"; "+p.license_url+"; file page "+p.file_page;
 const existing=await query("SELECT id FROM pr_media_assets WHERE item_id=$1::uuid AND public_url=$2 AND media_type='licensed_original' LIMIT 1",[id,p.url]);
 let mediaId=existing[0]?.id;
 if(!mediaId){const created=await query("INSERT INTO pr_media_assets(item_id,story_id,media_type,public_url,attribution,license_details,rights_verified,illustration_label_required,status) VALUES($1::uuid,$2::uuid,'licensed_original',$3,$4,$5,true,false,'candidate') RETURNING id",[id,i.draft_id,p.url,attribution,lic]);mediaId=created[0].id;}
 await query("UPDATE pr_items SET photo_url=$2,photo_rights='cc_licensed',photo_attribution=$3,photo_license=$4,photo_licence_url=$5,updated_at=now() WHERE id=$1::uuid",[id,p.url,attribution,p.license,p.license_url]);
 return {attached:true,media_id:mediaId,photo:p,needs_approval:true};
}
async function select(id,mediaId){
 await item(id);if(!uuid(mediaId))throw failure("Неверное фото");
 const rows=await query("SELECT public_url,media_type,attribution,license_details,status FROM pr_media_assets WHERE item_id=$1::uuid AND id=$2::uuid AND rights_verified=true AND status IN ('candidate','approved') AND media_type IN ('licensed_original','owned_original')",[id,mediaId]);
 const m=rows[0];if(!m)throw failure("Фото нельзя выбрать",422);
 const license=m.license_details?.split(";")[0]||"",licenseUrl=m.license_details?.split(";")[1]?.trim()||null;
 await query("UPDATE pr_items SET photo_url=$2,photo_rights=$3,photo_attribution=$4,photo_license=$5,photo_licence_url=$6,updated_at=now() WHERE id=$1::uuid",[id,m.public_url,m.media_type==="owned_original"?"owned":"cc_licensed",m.attribution,license,licenseUrl]);
 return {selected:true,media_id:mediaId,needs_approval:m.status!=="approved"};
}
export default {async fetch(request){
 const origin=request.headers.get("origin")||"",ok=allowed.has(origin),url=new URL(request.url);
 if(request.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":ok?origin:"null","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,content-type","access-control-max-age":"600"}});
 if(url.pathname==="/health")return reply({ok:true,service:"prphoto",version:2},200,ok?origin:"");
 if(!ok)return reply({error:"Доступ запрещён"},403);
 try{await auth(request);
  if(request.method==="GET"&&url.pathname==="/api/search"){
   const q=(url.searchParams.get("q")||"").trim();if(q.length<3||q.length>100)throw failure("Введите запрос из 3–100 символов");
   return reply({photos:await commons({generator:"search",gsrnamespace:"6",gsrlimit:"22",gsrsearch:q})},200,origin);
  }
  if(request.method==="POST"&&["/api/attach","/api/select"].includes(url.pathname)){
   const body=await request.text();if(body.length>2400)throw failure("Слишком большой запрос",413);const b=JSON.parse(body||"{}");
   return reply(url.pathname==="/api/attach"?await attach(b.item_id,b.file_title):await select(b.item_id,b.media_id),200,origin);
  }
  return reply({error:"Маршрут не найден"},404,origin);
 }catch(e){return reply({error:String(e.message||e).slice(0,220)},e.status||500,origin);}
}};