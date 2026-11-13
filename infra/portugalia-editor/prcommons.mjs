import {neon} from "./driver.mjs";
const sql=neon(process.env.DATABASE_URL),q=(query,params=[])=>sql.query(query,params);
const ok=(data,status=200)=>Response.json(data,{status});
const strip=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim().slice(0,340);
const safe=(v,host)=>{try{const u=new URL(v);return u.protocol==="https:"&&(u.hostname===host||u.hostname.endsWith("."+host))}catch{return false}};
const LIC=/^(?:CC BY 4\.0|CC BY-SA 4\.0|CC0 1\.0|Public domain|PD-old|PD)$/i;

const bannedTitle=/satellit|space|earth from|iss0|from space|aerial view of portugal|map of|mapa de|diagram|infographic|logo|brand|screenshot|poster|cartaz|politician|politico|demonstration|protest|conflict|police|military|riot|fireworks|emergency|accident|ambulance|news photo|watermark|stock photography/i;
const themes=[
 {id:"housing",check:/habita[cç]|arrendamento|renda|housing|casa|apartamento|alojamento|жиль|аренд|кооператив|строител|доступного жилья/i,terms:/house|housing|residen|apartment|apartamento|habita|edif[ií]cio|building|rooftop|condominium|bairro|arquitet|urban|rua|street|casas/i,query:"residential apartments architecture"},
 {id:"transport",check:/comboio|metro|autocarro|transport|train|bus|поезд|метро|автобус|транспорт|железнодорож/i,terms:/train|rail|metro|bus|comboio|tram|transport|el[eé]ctrico|estac[ãa]o|station/i,query:"public rail transport"},
 {id:"museum",check:/museu|museum|galeri|exposi[cç]|музе|выставк|галере/i,terms:/museum|museu|gallery|galeria|exhibit|exposi[cç]|art museum/i,query:"museum gallery architecture"},
 {id:"beach",check:/praia|beach|coast|sea|litoral|пляж|побереж|океан/i,terms:/beach|praia|coast|sea|ocean|costa|litoral|shore/i,query:"ocean beach coastal landscape"},
 {id:"nature",check:/parque|forest|nature|trilho|hiking|парк|прогул|природ|маршрут|лесной/i,terms:/park|parque|forest|jardim|trail|nature|natureza|serra|green|botanical/i,query:"green park nature trail"},
 {id:"castle",check:/castelo|castle|pal[aá]cio|крепост|дворец|замок/i,terms:/castle|castelo|pal[aá]cio|palace|fortress|forte/i,query:"historic castle"},
 {id:"school",check:/escola|educa[cç]|school|школ|университет|образован|ученик|college/i,terms:/escola|school|campus|college|universidade|university/i,query:"school university campus building"},
 {id:"health",check:/hospital|sa[uú]de|clinic|больниц|здоровь|поликлиник|медицин|врач/i,terms:/hospital|clinic|cl[ií]nica|sa[uú]de|medical centre/i,query:"hospital medical center exterior"},
 {id:"heritage",check:/patrim[oó]nio|monument|history|hist[oó]ric|истори|памятник|достопримеч/i,terms:/heritage|patrim[oó]nio|monument|historic|hist[oó]ric|old town/i,query:"historic heritage monument"}
];
function chooseQuery(item){
 const title=(item.title_original||"")+" "+(item.title_ru||"");
 const location=(item.location_city||"")+" "+title;
 const place=/cascais|кашка[йи]ш/i.test(location)?"Cascais":/sintra|синтр/i.test(location)?"Sintra":/porto|порт[оу]/i.test(location)?"Porto":/algarve|алгарве/i.test(location)?"Algarve":/madeira|мадейр/i.test(location)?"Madeira":/lisboa|lisbon|лиссабон/i.test(location)?"Lisbon":null;
 const selected=themes.find(x=>x.check.test(title));
 if(!selected)return null;
 if(item.primary_category==="news"&&/polic|crime|assassin|acident|protest|detid|задерж|убийств|полици|катастроф|расследован|пожар|трагед/i.test(title))return null;
 if(item.primary_category==="news"&&!place&&selected.id==="heritage")return null;
 return {search:(place||"Portugal")+" Portugal "+selected.query,place,theme:selected};
}
function relevantImage(file,titleMatch){
 const lower=String(file.title||"").replace(/^File:/i,"");
 if(bannedTitle.test(lower))return false;
 if(!titleMatch.theme.terms.test(lower))return false;
 if(titleMatch.place){
  const place=titleMatch.place.toLowerCase();
  const alternate=place==="lisbon"?/lisbon|lisboa/i:place==="porto"?/porto/i:place==="cascais"?/cascais/i:place==="sintra"?/sintra/i:place==="algarve"?/algarve/i:/madeira/i;
  if(!alternate.test(lower))return false;
 }else if(!/portugal|portugu/i.test(lower))return false;
 return true;
}
export default {async fetch(req){
 const path=new URL(req.url).pathname;
 if(path==="/health")return ok({ok:true,service:"prcommons",license_policy:"CC0 CC-BY CC-BY-SA PD only",final_approval_required:true});
 if(req.method!=="POST"||!req.headers.get("x-neon-trigger-invocation-id"))return ok({error:"schedule_only"},403);
 let article;
 try{
 const [state]=await q("SELECT count(*)::integer AS attempted_today FROM pr_commons_media_jobs WHERE attempted_at>now()-interval '24 hours'");
 if(state&&Number(state.attempted_today)>=12)return ok({ok:true,skipped:"daily_photo_search_limit"});
 const selected=await q("SELECT i.id,i.title_original,i.title_ru,i.location_city,i.primary_category FROM pr_items i JOIN pr_editorial_value_reviews v ON v.item_id=i.id JOIN pr_story_drafts d ON d.item_id=i.id WHERE i.status='candidate' AND i.duplicate_of IS NULL AND i.primary_category NOT IN ('events') AND v.value_score>=55 AND d.status IN ('draft','needs_facts') AND length(d.source_context_used)>=160 AND NOT EXISTS(SELECT 1 FROM pr_media_assets a WHERE a.item_id=i.id AND a.rights_verified AND a.public_url IS NOT NULL) AND NOT EXISTS(SELECT 1 FROM pr_commons_media_jobs j WHERE j.item_id=i.id) ORDER BY v.value_score DESC,i.discovered_at DESC LIMIT 1");
 if(!selected.length)return ok({ok:true,skipped:"no_matching_article"});
 article=selected[0];
 const match=chooseQuery(article);
 if(!match){
   await q("INSERT INTO pr_commons_media_jobs(item_id,query_text,status,reason) VALUES($1::uuid,'no_clear_visual_subject','none','Article has no specific visually verifiable topic; manual photo selection needed') ON CONFLICT(item_id) DO NOTHING",[article.id]);
   return ok({ok:true,skipped:"no_specific_photo_subject",article_id:article.id});
 }
 const search=match.search;
 await q("INSERT INTO pr_commons_media_jobs(item_id,query_text,status) VALUES($1::uuid,$2,'attempted') ON CONFLICT(item_id) DO NOTHING",[article.id,search]);
 await q("UPDATE pr_commons_media_scan SET searched=searched+1,last_run=now(),last_item_id=$1::uuid WHERE code='commons'",[article.id]);
 const endpoint=new URL("https://commons.wikimedia.org/w/api.php");
 for(const [key,value] of Object.entries({action:"query",generator:"search",gsrsearch:search,gsrnamespace:"6",gsrlimit:"8",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"960",format:"json"}))endpoint.searchParams.set(key,value);
 const resp=await fetch(endpoint,{headers:{"user-agent":"PortugaliaRyadomEditor/1.0 (editorial image licensing)","accept":"application/json"},redirect:"error",signal:AbortSignal.timeout(20000)});
 if(!resp.ok)throw Error("commons_http_"+resp.status);
 const doc=await resp.json(),results=Object.values(doc.query?.pages||{});let approved=[];
 for(const r of results){
  if(!/^File:/i.test(r.title||"")||!relevantImage(r,match))continue;
  const info=r.imageinfo?.[0],meta=info?.extmetadata||{},license=strip(meta.LicenseShortName?.value),
  licenseUrl=strip(meta.LicenseUrl?.value),artist=strip(meta.Attribution?.value||meta.Artist?.value||meta.Credit?.value);
  const thumb=info?.thumburl,filePage=info?.descriptionurl,nonFree=meta.NonFree?.value,restrict=meta.Restrictions?.value;
  if(!LIC.test(license)||nonFree==="True"||restrict||!safe(thumb,"wikimedia.org")||!safe(filePage,"wikimedia.org"))continue;
  if((info?.thumbwidth||0)<880||(info?.thumbheight||0)<450||info.thumbwidth/info.thumbheight<1.35)continue;
  if(!artist&&!/^(CC0|Public domain|PD)/i.test(license))continue;
  if(licenseUrl&&!/^https:\/\/creativecommons\.org\/(licenses|publicdomain)\//.test(licenseUrl)&&!/^(Public domain|PD)/.test(license))continue;
  approved.push({url:thumb,filePage,title:r.title,artist,license,licenseUrl});
 }
 if(!approved.length){
  await q("UPDATE pr_commons_media_jobs SET status='none',reason='no_sufficiently_relevant_verified_licensed_landscape' WHERE item_id=$1::uuid",[article.id]);
  return ok({ok:true,matched:0,search_query:search,image_ready:false});
 }
 const chosen=approved[0],credit=(chosen.artist||"Public domain")+" · "+chosen.license;
 await q("INSERT INTO pr_media_assets(item_id,media_type,generation_model,generation_prompt,public_url,attribution,license_details,rights_verified,illustration_label_required,status) VALUES($1::uuid,'licensed_original','wikimedia_commons_license_lookup',$2,$3,$4,$5,true,true,'candidate')",[article.id,"Тематическое фото (НЕ фото конкретного события/новости): "+search,chosen.url,credit,chosen.license+" | "+chosen.licenseUrl+" | "+chosen.filePage]);
 await q("UPDATE pr_commons_media_jobs SET status='found',reason=$2 WHERE item_id=$1::uuid",[article.id,chosen.filePage]);
 await q("UPDATE pr_commons_media_scan SET licensed_matches=licensed_matches+1,last_error=NULL WHERE code='commons'");
 return ok({ok:true,image_ready_for_review:true,rights_metadata_present:true,article_id:article.id,file_page:chosen.filePage,approved:false,telegram_sent:0});
 }catch(e){const why=String(e.message||e).slice(0,120);if(article?.id)await q("UPDATE pr_commons_media_jobs SET status='failed',reason=$2 WHERE item_id=$1::uuid",[article.id,why]).catch(()=>{});await q("UPDATE pr_commons_media_scan SET last_error=$1 WHERE code='commons'",[why]).catch(()=>{});return ok({ok:false,error:why},500)}
}};
