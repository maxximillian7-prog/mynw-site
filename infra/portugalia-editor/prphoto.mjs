import {createHash,createHmac,randomUUID} from "node:crypto";
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

async function selectApproved(id,mediaId){
 await checkItem(id);
 if(!uuid(mediaId))throw bad("Неверное изображение");
 const rows=await db("SELECT a.public_url,a.media_type,a.attribution,a.license_details,a.generation_model FROM pr_media_assets a JOIN pr_items i ON i.id=a.item_id JOIN pr_sources s ON s.id=i.source_id WHERE a.item_id=$1::uuid AND a.id=$2::uuid AND a.status='approved' AND a.generation_model IS DISTINCT FROM 'pt_ryadom_instagram_typography_v1' AND a.public_url ~ '^https://' AND ((a.rights_verified=true AND a.media_type IN ('licensed_original','owned_original','generated_illustration') AND (a.media_type<>'generated_illustration' OR (a.illustration_label_required AND a.storage_bucket='pr-editorial-media' AND a.storage_key IS NOT NULL))) OR (a.media_type='brand_generic' AND a.generation_model='trailyo_existing_image_reference' AND a.approved_by IS NOT NULL AND i.primary_category='events' AND s.code='trailyo_events')) LIMIT 1",[id,mediaId]);
 const a=rows[0];if(!a)throw bad("Сначала утвердите фотографию в редакции",409);
 const details=String(a.license_details||"").split(";").map(x=>x.trim());
 const isTrailyo=a.media_type==="brand_generic"&&a.generation_model==="trailyo_existing_image_reference";
 const rights=isTrailyo?"unverified":(["owned_original","generated_illustration"].includes(a.media_type)?"owned":"cc_licensed");
 await db("UPDATE pr_items SET photo_url=$2,photo_rights=$3,photo_attribution=$4,photo_license=$5,photo_licence_url=$6,updated_at=now() WHERE id=$1::uuid",[id,a.public_url,rights,a.attribution,isTrailyo?"Изображение из Trailyo; лицензия не проверялась":a.media_type==="generated_illustration"?"AI-generated photorealistic image; not documentary":details[0]||null,isTrailyo?a.public_url:a.media_type==="generated_illustration"?null:details[1]||null]);
 return {selected:true,media_id:mediaId,photo_url:a.public_url};
}

const BKT="pr-editorial-media",AI_COVER_MODEL="gpt-image-2.5-flare",GENERATOR_NAME="openai-gpt-image-2.5-flare-medium";
const hashHex=x=>createHash("sha256").update(x).digest("hex");
const hmac=(key,input)=>createHmac("sha256",key).update(input).digest();
async function putCover(key,image){
 const access=process.env.AWS_ACCESS_KEY_ID,secret=process.env.AWS_SECRET_ACCESS_KEY,region=process.env.AWS_REGION||"eu-central-1",endpoint=process.env.AWS_ENDPOINT_URL_S3;
 if(!access||!secret||!endpoint)throw bad("Хранилище Neon недоступно",503);
 const base=new URL(endpoint),path="/"+BKT+"/"+key.split("/").map(encodeURIComponent).join("/");
 const uploadURL=base.origin+path,now=new Date(),iso=now.toISOString().replace(/[:-]|\.\d{3}/g,""),date=iso.slice(0,8);
 const payloadHash=hashHex(image),contentType="image/jpeg";
 const headers={"content-type":contentType,"host":base.host,"x-amz-content-sha256":payloadHash,"x-amz-date":iso};
 const signed="content-type;host;x-amz-content-sha256;x-amz-date";
 const canonical="PUT\n"+path+"\n\n"+Object.entries(headers).sort(([a],[b])=>a.localeCompare(b)).map(([k,v])=>k+":"+v+"\n").join("")+"\n"+signed+"\n"+payloadHash;
 const scope=date+"/"+region+"/s3/aws4_request";
 const toSign="AWS4-HMAC-SHA256\n"+iso+"\n"+scope+"\n"+hashHex(canonical);
 const signing=hmac(hmac(hmac(hmac("AWS4"+secret,date),region),"s3"),"aws4_request");
 const signature=createHmac("sha256",signing).update(toSign).digest("hex");
 const authorization="AWS4-HMAC-SHA256 Credential="+access+"/"+scope+", SignedHeaders="+signed+", Signature="+signature;
 const res=await fetch(uploadURL,{method:"PUT",headers:{...headers,Authorization:authorization},body:image,signal:AbortSignal.timeout(40000)});
 if(!res.ok)throw bad("Не удалось сохранить изображение в Neon Storage ("+res.status+")",503);
 return uploadURL;
}
// PT_VISUAL_RULE_V2: editorial-specific image, no generic city-and-model stock scene.
// The image direction is selected by topic, with recent compositions discouraged.
const VISUAL_TOPICS=[
 ["credit",/кредит|ипотек|банк|r[aá]ce|долг|финанс|пенси|зарплат|бюджет|налог|irs|fatura/i,[
  ["budget_objects","object","a calculator, euro coins and a plain notebook on a real Portuguese kitchen table"],
  ["bank_consultation","environment","an empty consultation desk with folders, a pen and a small calculator"],
  ["household_finances","hands","adult hands arranging coins and a blank paper budget, no face"]]],
 ["shopping",/магазин|покупк|товар|возврат|продавц|арбитраж|потребител|доставк|посылк|почт|ctt/i,[
  ["retail_return","object","an opened parcel, an ordinary purchased object and a plain blank receipt"],
  ["counter_details","environment","a Portuguese shop counter with a bag and an everyday household item, no brand"],
  ["package_hands","hands","adult hands checking the contents of a cardboard parcel, no face"]]],
 ["reading",/книг|библиотек|biblioled|чтен|литератур|писател/i,[
  ["books_headphones","object","an open book and simple headphones near a ceramic mug"],
  ["shelves","environment","a close angled view through authentic library shelves and a reading lamp"],
  ["book_details","object","a macro view of paper pages and a closed book, no legible writing"]]],
 ["school",/школ|учител|ученик|ребёнк|ребенк|детск|ясл|creche|образован|буллинг|травл|родител/i,[
  ["school_supplies","object","school notebooks, pencils and a backpack on a classroom table"],
  ["classroom","environment","a quiet empty Portuguese classroom with everyday school furniture"],
  ["learning_action","hands","only hands arranging simple learning materials on a desk, no student faces"]]],
 ["pets",/питомц|кошк|собак|siac|ветеринар|животн|приют/i,[
  ["candid_pet","animal","a candid dog or cat at home, its natural expression and posture in focus"],
  ["vet_details","animal","an animal resting beside a plain collar in a generic veterinary setting"],
  ["animal_paw","animal","a close-up of an animal's paw and simple pet accessories, no person"]]],
 ["official",/документ|aima|полици|psp|gnr|жалоб|регистрац|паспорт|консуль|госуслуг|заявлен|правов|справк/i,[
  ["unmarked_folders","object","unmarked paper folders and a pen on a neutral public-service counter"],
  ["service_area","environment","an empty ordinary public-service waiting area without government logos"],
  ["paperwork","hands","only adult hands sorting blank pages into a folder beside a keyboard"]]],
 ["housing",/аренд|жиль|жилищ|квартир|недвиж|сосед|домовлад|стен|окн|утеплен|ремонт/i,[
  ["home_keys","object","plain house keys and a folder in an apartment interior"],
  ["apartment_details","environment","a realistic Portuguese apartment corner with textured wall and window light"],
  ["home_materials","object","an architectural close-up of walls, frame and insulation material"]]],
 ["health",/медицин|аптек|здоров|врач|больниц|лекарств|травм|болезн|страховк/i,[
  ["first_aid","object","a simple home first-aid kit and thermometer with no readable labels"],
  ["consultation_room","environment","a neutral empty consultation room with a stethoscope and chair"],
  ["care_detail","hands","only adult hands arranging an unbranded first-aid kit on a table"]]],
 ["mobility",/дтп|автомоб|автобус|транспорт|метро|трамва|поезд|дорог|водител|парковк/i,[
  ["safety_triangle","environment","an ordinary quiet Portuguese roadside with a reflective safety triangle, no crash"],
  ["vehicle_closeup","object","a detailed close-up of a car wheel and a reflective vest, no plates"],
  ["public_transport","environment","a clean unbranded public bus interior with geometric seating"]]],
 ["utilities",/электрич|энерг|водопровод|тариф|водоснабж|счёт за воду|газ|erse|эрсе|солнечн/i,[
  ["utility_detail","object","a generic household meter and realistic wiring without readable serial numbers"],
  ["water_tap","object","a glass beneath a home water tap with detailed droplets"],
  ["home_window","environment","a radiator and window shutters in an ordinary modest Portuguese home"]]],
 ["nature",/океан|пляж|атлантик|природ|путешеств|туризм|деревн|скал|горы|лес|корк|парк|растен|маршрут/i,[
  ["shore_material","nature","textured Atlantic rocks and waves at shoreline level"],
  ["countryside","nature","a layered Portuguese countryside landscape with detailed foreground terrain"],
  ["local_stone","environment","authentic Portuguese stonework integrated with regional natural surroundings"]]],
 ["culture",/концерт|театр|выставк|музе|музык|кино|фестивал|танц|событ|искусств/i,[
  ["rehearsal_props","object","musical instruments and cables in a quiet rehearsal room, no logos"],
  ["empty_stage","environment","a generic empty performance venue with practical lights, no real performers"],
  ["theatre_seats","object","a close view of velvet theatre seats and curtains, no reproduced artwork"]]],
 ["technology",/онлайн|интернет|приложен|электронн|цифров|смартфон|телефон|портал/i,[
  ["device_detail","object","an unbranded smartphone with a blank screen beside a relevant daily-life object"],
  ["workspace","environment","a natural modest home workspace with an unbranded laptop and desk lamp"],
  ["tablet_use","hands","only adult hands using a tablet with a blank neutral screen, no face"]]]
];
const VISUAL_DEFAULTS={
 work:[["work_table","object","everyday work tools and an unmarked notebook"],["workshop","environment","an authentic modest work environment"],["working_hands","hands","hands performing a meaningful work activity"]],
 family:[["family_stilllife","object","subject-relevant household and learning objects"],["home_context","environment","a natural ordinary family home interior"],["home_action","hands","hands doing an everyday family activity"]],
 places:[["place_detail","environment","a location-relevant Portuguese architectural material detail"],["landscape","nature","a locally accurate natural landscape with interesting foreground"],["local_texture","object","authentic region-specific textures, stone and materials"]],
 events:[["event_object","object","physical props related to the event activity"],["venue","environment","an empty neutral event venue, not the actual named event"],["event_detail","object","a detailed still life of activity-related equipment"]],
 documents:[["documents_table","object","neutral paper folders without readable text"],["service_room","environment","a realistic empty service area without official insignia"],["organising_papers","hands","hands organising blank documents"]],
 news:[["news_object","object","a meaningful real object connected to the news topic"],["news_setting","environment","a generic physical setting illustrating the subject without staging the event"],["news_detail","object","a close tactile detail relevant to the reported situation"]],
 tips:[["daily_objects","object","everyday objects directly illustrating the practical tip"],["local_context","environment","a related natural Portuguese daily-life environment"],["practical_hands","hands","hands demonstrating the useful activity"]],
 life:[["household_object","object","a household object directly related to the story"],["daily_interior","environment","an ordinary realistic Portuguese everyday interior"],["daily_action","hands","hands using subject-relevant domestic items"]]
};
const VISUAL_VIEWS={
 object:[["overhead","top-down flat-lay, tasteful asymmetric placement"],["macro","close-up macro with tactile surfaces"],["side","low tabletop eye-level perspective"],["oblique","35-degree diagonal perspective with foreground depth"]],
 environment:[["low","low architectural viewpoint emphasizing geometry"],["framed","view through doorway or another foreground object"],["side","eye-level side perspective with natural layered depth"],["detail","tightly framed environmental detail, no skyline"]],
 nature:[["ground","ground-level perspective with clear foreground"],["telephoto","compressed telephoto layers with rich natural textures"],["macro","close nature detail with shallow natural depth"],["wide","wide landscape with a clear relevant subject"]],
 animal:[["animal_eye","candid animal-eye-level camera"],["paw","low view at paw height"],["side","natural unposed side view of the animal"]],
 hands:[["above","overhead view of hands acting on objects"],["side","side-lit close action detail, no face"],["shoulder","over-shoulder crop without any visible face"]]
};
const VISUAL_LIGHTS=[
 ["morning","gentle natural morning light"],["overcast","soft overcast daylight"],
 ["side_window","believable window side-light"],["open_shade","open shade with neutral colors"],
 ["late_day","restrained late-afternoon daylight"],["interior","natural indoor practical lighting"]
];
const visualTags=p=>{
 const m=String(p||"").match(/PT_VISUAL_RULE_V2 topic=([\w-]+) scene=([\w-]+) angle=([\w-]+) light=([\w-]+)/);
 return m?{topic:m[1],scene:m[2],angle:m[3],light:m[4]}:null;
};
export function chooseCoverDirection(info,itemId,recent=[]){
 const title=plain(info.headline_ru||info.title_ru||info.title_original);
 const text=title+" "+plain(info.story_ru||info.summary_ru).slice(0,450);
 const topic=VISUAL_TOPICS.find(x=>x[1].test(title))||
             VISUAL_TOPICS.find(x=>x[1].test(text));
 const topicId=topic?.[0]||("category_"+String(info.primary_category||"life"));
 const scenes=topic?.[2]||VISUAL_DEFAULTS[info.primary_category]||VISUAL_DEFAULTS.life;
 const history=recent.map(x=>({...visualTags(x.generation_prompt),item_id:x.item_id})).filter(x=>x.scene);
 const seed=Number.parseInt(hashHex(String(itemId)+"|"+topicId).slice(0,8),16);
 const options=[];
 for(const [sceneId,kind,scene] of scenes)
  for(const [angleId,view] of VISUAL_VIEWS[kind]||VISUAL_VIEWS.object)
   for(const [lightId,lighting] of VISUAL_LIGHTS){
    let penalty=0;
    history.forEach((h,i)=>{
      const importance=i<5?5:i<16?2:1;
      if(h.scene===sceneId)penalty+=25*importance;
      if(h.angle===angleId)penalty+=5*importance;
      if(h.light===lightId)penalty+=3*importance;
      if(h.item_id===itemId&&h.scene===sceneId)penalty+=500;
      if(h.item_id===itemId&&h.angle===angleId)penalty+=80;
    });
    const noise=parseInt(hashHex(itemId+"|"+sceneId+"|"+angleId+"|"+lightId).slice(0,6),16)%37;
    options.push({score:penalty*10+noise,topic:topicId,sceneId,kind,scene,angleId,view,lightId,lighting});
   }
 options.sort((x,y)=>x.score-y.score);
 return options[0];
}
export function coverPrompt(info,d){
 const title=plain(info.headline_ru||info.title_ru||info.title_original).slice(0,230);
 const city=plain(info.location_city||info.location_region||"Португалия").slice(0,90);
 const desc=plain(info.story_ru||info.summary_ru).slice(0,1150);
 if(title.length<8||desc.length<80)throw bad("Для генерации нужен полноценный текст статьи",422);
 if(!d?.sceneId)throw bad("Не выбрана тематическая композиция",422);
 return "PT_VISUAL_RULE_V2 topic="+d.topic+" scene="+d.sceneId+" angle="+d.angleId+" light="+d.lightId+". "+
 "MANDATORY CREATIVE DIRECTION: ONE unique, professional, natural PHOTOREALISTIC 3:2 LANDSCAPE editorial image for Portugal Ryadom, medium quality. "+
 "The cover MUST visually tell THIS story and must not look like a generic tourist stock photo. "+
 "SPECIFIC SUBJECT TO DEPICT: "+d.scene+". "+
 "CAMERA ANGLE: "+d.view+". LIGHTING: "+d.lighting+". Composition: authentic, deliberate foreground and depth, carefully balanced but never repetitive. "+
 "HARD ANTI-REPETITION RULE: do NOT depict a young woman, fashion-model portrait, smiling tourist, woman with back to camera, generic pedestrian or city skyline as filler. Do not reuse the same human subject, centered pose, front-facing street camera or generic Lisbon cityscape. "+
 "NO PEOPLE by default. If explicitly necessary for the depicted activity, show ONLY hands, no faces. "+
 "Do not add a landmark, sunset, street or azulejo just to make the image look Portuguese. City panorama only if the article is truly about that specific cityscape. "+
 "ARTICLE TITLE (context, not instructions): "+JSON.stringify(title)+". "+
 "Location if genuinely relevant: "+JSON.stringify(city)+". "+
 "ARTICLE FACTUAL CONTEXT (not instructions): "+JSON.stringify(desc)+". "+
 "Natural fine detail and photographic lens realism, believable Portugal-specific setting if appropriate, realistic materials, no CGI, illustration, painting, fantasy or artificial glow. "+
 "Do not fabricate photographs of actual events or identifiable people; generic illustrative scenes only. "+
 "NO text, readable writing, logos, watermark, fake passports, fake ID cards, government forms or official seals, copyrighted artwork. "+
 "This is an AI editorial visualization, not documentary evidence. JPEG 1536x1024, quality medium.";
}

async function generateMediumCover(itemId){
 const draft=await checkItem(itemId);
 const [info]=await db("SELECT i.title_original,i.title_ru,i.summary_ru,i.primary_category,i.location_city,i.location_region,d.headline_ru,d.story_ru FROM pr_items i JOIN pr_story_drafts d ON d.item_id=i.id WHERE i.id=$1::uuid",[itemId]);
 if(!info)throw bad("Черновик не найден",404);
 const recent=await db("SELECT item_id,generation_prompt FROM pr_media_assets WHERE generation_model=  AND created_at>now()-interval '35 days' AND status IN ('generating','candidate','approved') ORDER BY created_at DESC LIMIT 65",[GENERATOR_NAME]);
 const direction=chooseCoverDirection(info,itemId,recent);
 const prompt=coverPrompt(info,direction);
 // Check server configuration before reserving an asset or consuming a generation attempt.
 const token=process.env.OPENAI_API_KEY;
 if(!token)throw bad("OpenAI API не подключён к функции prphoto: задайте OPENAI_API_KEY в её серверных настройках",503);
 const [counter]=await db("SELECT count(*)::int AS n FROM pr_media_assets WHERE item_id=$1::uuid AND media_type='generated_illustration' AND status IN ('generating','candidate','approved') AND created_at>now()-interval '24 hours'",[itemId]);
 if(Number(counter?.n||0)>=3)throw bad("Лимит: максимум 3 AI-варианта на статью за 24 часа",429);
 const reserved=await db("INSERT INTO pr_media_assets(item_id,story_id,media_type,generation_model,generation_prompt,status,rights_verified,illustration_label_required) VALUES($1::uuid,$2::uuid,'generated_illustration',$3,$4,'generating',false,true) ON CONFLICT DO NOTHING RETURNING id",[itemId,draft.draft_id,GENERATOR_NAME,prompt]);
 const mid=reserved[0]?.id;if(!mid)throw bad("Генерация для этой статьи уже выполняется",409);
 try{
  // The OpenAI API key belongs to the server, never to the Journal Studio browser.
  // This endpoint intentionally bypasses Neon AI Gateway; Neon is only the database and media store.
  const request={model:AI_COVER_MODEL,prompt,n:1,size:"1536x1024",quality:"medium",output_format:"jpeg",output_compression:90};
  const response=await fetch("https://api.openai.com/v1/images/generations",{
    method:"POST",headers:{"authorization":"Bearer "+token,"content-type":"application/json"},
    body:JSON.stringify(request),signal:AbortSignal.timeout(160000)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw bad("OpenAI Images API: "+response.status+" — "+plain(data.error?.message||"ошибка провайдера").slice(0,120),response.status===429?429:503);
  const encoded=data.data?.[0]?.b64_json;
  if(typeof encoded!=="string"||encoded.length<20000||encoded.length>5500000)throw bad("Некорректный размер созданной фотографии",502);
  const bytes=Buffer.from(encoded,"base64");
  if(bytes.byteLength<12000||bytes.byteLength>3500000||bytes[0]!==0xff||bytes[1]!==0xd8)throw bad("OpenAI не вернул корректное JPEG-изображение",502);
  const key="ai-covers/"+itemId+"/"+mid+".jpg";
  const publicURL=await putCover(key,bytes);
  const caption="AI-изображение · фотореалистичная визуализация для журнала «Португалия рядом»";
  const details="AI-generated photorealistic editorial visualization (Medium); OpenAI Images API; JPEG; not documentary; manual approval required";
  await db("UPDATE pr_media_assets SET storage_bucket=$2,storage_key=$3,public_url=$4,attribution=$5,license_details=$6,rights_verified=true,status='candidate',failure_reason=NULL WHERE id=$1::uuid AND status='generating'",[mid,BKT,key,publicURL,caption,details]);
  return {media_id:mid,photo_url:publicURL,quality:"medium",media_type:"generated_illustration",ai_label:caption,needs_approval:true};
 }catch(e){
  try{await db("UPDATE pr_media_assets SET status='failed',failure_reason=$2 WHERE id=$1::uuid AND status='generating'",[mid,String(e.message||e).slice(0,200)])}catch{}
  throw e;
 }
}


const IG_TYPO="pt_ryadom_instagram_typography_v1";
async function instagramSource(itemId){
  if(!uuid(itemId))throw bad("Неверная статья",400);
  const [row]=await db("SELECT i.photo_url,i.photo_rights,m.media_type,m.rights_verified,m.status,m.license_details,m.attribution FROM public.pr_items i JOIN public.pr_media_assets m ON m.item_id=i.id AND m.public_url=i.photo_url WHERE i.id=$1::uuid AND m.rights_verified=true AND m.status IN ('candidate','approved') AND m.media_type IN ('licensed_original','owned_original','generated_illustration') ORDER BY m.status='approved' DESC,m.created_at DESC LIMIT 1",[itemId]);
  if(!row||!row.photo_url||!["cc_licensed","owned","permission_confirmed"].includes(row.photo_rights))throw bad("Сначала выберите фото с подтверждёнными правами",409);
  const url=new URL(row.photo_url),store=process.env.AWS_ENDPOINT_URL_S3?new URL(process.env.AWS_ENDPOINT_URL_S3).hostname:"";
  if(url.protocol!=="https:"||url.username||url.password||
    !["upload.wikimedia.org","thumb.wikimedia.org","images.unsplash.com","images.pexels.com","cdn.pixabay.com",store].includes(url.hostname))
    throw bad("Недопустимый источник фотографии",422);
  const response=await fetch(url,{redirect:"error",signal:AbortSignal.timeout(22000)});
  if(!response.ok)throw bad("Исходная фотография не загрузилась. Замените её в галерее.",422);
  const mime=(response.headers.get("content-type")||"").split(";")[0];
  if(!["image/jpeg","image/png","image/webp"].includes(mime))throw bad("Исходная фотография не JPEG/PNG/WebP",422);
  const bytes=new Uint8Array(await response.arrayBuffer());
  if(bytes.byteLength>9_000_000||bytes.byteLength<500)throw bad("Фото слишком большое или повреждено",413);
  return {bytes,mime,source:row};
}
function jpegDimensions(bytes){
  let p=2;
  while(p<bytes.length-12){
    if(bytes[p]!==255){p++;continue}
    const marker=bytes[p+1];
    if(marker===0xD9||marker===0xDA)break;
    const length=(bytes[p+2]<<8)|bytes[p+3];
    if(length<2||p+2+length>bytes.length)break;
    if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7].includes(marker))
      return {h:(bytes[p+5]<<8)|bytes[p+6],w:(bytes[p+7]<<8)|bytes[p+8]};
    p+=2+length;
  }
  return null;
}
async function uploadInstagramCover(itemId,raw,headline,variant,designVersion){
  if(!uuid(itemId)||typeof raw!=="string"||raw.length>3_200_000||
     !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(raw))
     throw bad("Нужна JPEG-обложка 1080×1350 до 2 МБ",422);
  const encoded=raw.slice("data:image/jpeg;base64,".length);
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  const size=jpegDimensions(bytes);
  if(bytes.length>2_000_000||bytes.length<10_000||
     bytes[0]!==255||bytes[1]!==216||size?.w!==1080||size?.h!==1350)
     throw bad("Неверные размеры или формат Instagram-обложки",422);
  const [i]=await db("SELECT i.status,i.photo_url,i.photo_rights,d.id draft_id,d.headline_ru FROM pr_items i JOIN pr_story_drafts d ON d.item_id=i.id WHERE i.id=$1::uuid",[itemId]);
  if(!i||!["candidate","approved"].includes(i.status))throw bad("Редактирование недоступно",409);
  if(Number(designVersion)!==3||String(headline||"").trim()!==String(i.headline_ru||"").trim()||!["editorial","noir","sunset"].includes(variant))throw bad("Заголовок или стиль изменились — обновите обложку",409);
  const [source]=await db("SELECT m.id,m.media_type,m.rights_verified,m.attribution,m.license_details FROM pr_media_assets m WHERE m.item_id=$1::uuid AND m.public_url=$2 AND m.rights_verified=true AND m.status IN ('candidate','approved') ORDER BY m.status='approved' DESC LIMIT 1",[itemId,i.photo_url]);
  if(!source||!["cc_licensed","owned","permission_confirmed"].includes(i.photo_rights))throw bad("Нужно фото с подтверждёнными правами",409);
  const uploaded=await db("SELECT count(*)::int n FROM pr_media_assets WHERE item_id=$1::uuid AND generation_model=$2 AND created_at>now()-interval '24 hours'",[itemId,IG_TYPO]);
  if(Number(uploaded[0]?.n||0)>=10)throw bad("Не больше 10 оформлений за сутки",429);
  const key="instagram-covers/"+itemId+"/"+randomUUID()+".jpg";
  const url=await putCover(key,bytes);
  const kind=source.media_type;
  const credit="Instagram typography overlay (1080x1350), source: "+String(source.attribution||"").slice(0,250);
  const origin=JSON.stringify({headline:String(i.headline_ru||"").trim(),source_photo_url:i.photo_url,variant,design_version:3});
  const [asset]=await db("INSERT INTO pr_media_assets(item_id,story_id,media_type,generation_model,generation_prompt,storage_bucket,storage_key,public_url,attribution,license_details,rights_verified,illustration_label_required,status) VALUES($1::uuid,$2::uuid,$3,$4,$5,$6,$7,$8,$9,$10,true,$11,'candidate') RETURNING id",[itemId,i.draft_id,kind,IG_TYPO,origin,BKT,key,url,credit,String(source.license_details||"")+"\nDerived with exact title typography; original rights preserved.",kind==="generated_illustration"]);
  return {media_id:asset.id,image_url:url,needs_approval:true,instagram_only:true};
}

export default {async fetch(req){const origin=req.headers.get("origin")||"",ok=hosts.has(origin),u=new URL(req.url);
if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":ok?origin:"null","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,content-type"}});
if(u.pathname==="/health")return result({ok:true,service:"prphoto",version:10,image_provider:"openai",image_model:AI_COVER_MODEL,openai_key_configured:Boolean(process.env.OPENAI_API_KEY),storage_configured:Boolean(process.env.AWS_ACCESS_KEY_ID&&process.env.AWS_SECRET_ACCESS_KEY&&process.env.AWS_ENDPOINT_URL_S3),medium_generation_configured:Boolean(process.env.OPENAI_API_KEY&&process.env.AWS_ACCESS_KEY_ID&&process.env.AWS_SECRET_ACCESS_KEY&&process.env.AWS_ENDPOINT_URL_S3)},200,ok?origin:"");
if(!ok)return result({error:"Forbidden origin"},403);
try{await auth(req);if(req.method==="GET"&&u.pathname==="/api/search"){const q=(u.searchParams.get("q")||"").trim();if(q.length<3||q.length>100)throw bad("Введите запрос 3–100 символов");return result(await searchAll(q),200,origin);}
if(req.method==="POST"&&u.pathname==="/api/attach"){const raw=await req.text();if(raw.length>1500)throw bad("Слишком длинный запрос");const body=JSON.parse(raw||"{}");return result(body.provider==="openverse"?await attachOpenverse(body.item_id,body.image_id):await attach(body.item_id,body.file_title),200,origin);}
if(req.method==="POST"&&u.pathname==="/api/import"){const raw=await req.text();if(raw.length>2500)throw bad("Слишком длинный запрос");return result(await importFromStock(JSON.parse(raw||"{}")),200,origin);}
if(req.method==="POST"&&u.pathname==="/api/select"){const raw=await req.text();if(raw.length>1200)throw bad("Слишком длинный запрос");const b=JSON.parse(raw||"{}");return result(await selectApproved(b.item_id,b.media_id),200,origin);}
if(req.method==="GET"&&u.pathname==="/api/instagram/source"){
 const media=await instagramSource(u.searchParams.get("item_id"));
 return new Response(media.bytes,{status:200,headers:{"content-type":media.mime,
 "cache-control":"private, max-age=180","access-control-allow-origin":origin,
 "x-content-type-options":"nosniff"}});
}
if(req.method==="POST"&&u.pathname==="/api/instagram/cover"){
 const raw=await req.text();if(raw.length>3_300_000)throw bad("Слишком большой JPEG",413);
 const body=JSON.parse(raw||"{}");
 return result(await uploadInstagramCover(body.item_id,body.data_url,body.headline,body.variant,body.design_version),200,origin);
}
if(req.method==="POST"&&u.pathname==="/api/generate"){const raw=await req.text();if(raw.length>1500)throw bad("Слишком большой запрос");const b=JSON.parse(raw||"{}");if(b.quality&&b.quality!=="medium")throw bad("Сейчас поддерживается качество Medium");return result(await generateMediumCover(b.item_id),200,origin);}
return result({error:"Not found"},404,origin);
}catch(e){return result({error:String(e.message||e).slice(0,200)},e.status||500,origin);}}};