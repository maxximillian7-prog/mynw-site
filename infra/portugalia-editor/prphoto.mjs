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
const u=new URL(src);if(u.hostname!=="upload.wikimedia.org"||!u.pathname.startsWith("/wikipedia/commons/"))return null;
if(!i.descriptionurl?.startsWith("https://commons.wikimedia.org/wiki/File:"))return null;
const licenseUrl=plain(m.LicenseUrl?.value)||i.descriptionurl;
return {title:page.title,url:src,file_page:i.descriptionurl,license,license_url:licenseUrl,author,width:i.width,height:i.height};
}
async function commons(params){
const u=new URL("https://commons.wikimedia.org/w/api.php");
for(const[k,v]of Object.entries({action:"query",format:"json",formatversion:"2",prop:"imageinfo",iiprop:"url|size|mime|extmetadata|user",iiurlwidth:"1280",...params}))u.searchParams.set(k,v);
const response=await fetch(u,{signal:AbortSignal.timeout(17000)});if(!response.ok)throw bad("Wikimedia недоступна",503);
const json=await response.json();return(json.query?.pages||[]).map(decode).filter(Boolean);
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
if(u.pathname==="/health")return result({ok:true,service:"prphoto",version:3},200,ok?origin:"");
if(!ok)return result({error:"Forbidden origin"},403);
try{await auth(req);if(req.method==="GET"&&u.pathname==="/api/search"){const q=(u.searchParams.get("q")||"").trim();if(q.length<3||q.length>100)throw bad("Введите запрос 3–100 символов");return result({photos:await commons({generator:"search",gsrnamespace:"6",gsrlimit:"22",gsrsearch:q})},200,origin);}
if(req.method==="POST"&&u.pathname==="/api/attach"){const raw=await req.text();if(raw.length>1500)throw bad("Слишком длинный запрос");const body=JSON.parse(raw||"{}");return result(await attach(body.item_id,body.file_title),200,origin);}
return result({error:"Not found"},404,origin);
}catch(e){return result({error:String(e.message||e).slice(0,200)},e.status||500,origin);}}};