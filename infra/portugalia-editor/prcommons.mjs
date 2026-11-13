import {neon} from "./driver.mjs";
const sql=neon(process.env.DATABASE_URL),q=(query,params=[])=>sql.query(query,params);
const ok=(data,status=200)=>Response.json(data,{status});
const strip=s=>String(s||"").replace(/<[^>]*>/g," ").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim().slice(0,340);
const safe=(v,host)=>{try{const u=new URL(v);return u.protocol==="https:"&&(u.hostname===host||u.hostname.endsWith("."+host))}catch{return false}};
const LIC=/^(?:CC BY(?: 2\.0| 3\.0| 4\.0)|CC BY-SA(?: 2\.0| 3\.0| 4\.0)|CC0(?: 1\.0)?|Public domain|PD-old|PD)$/i;

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
 {id:"heritage",check:/patrim[oó]nio|monument|history|hist[oó]ric|истори|памятник|достопримеч/i,terms:/heritage|patrim[oó]nio|monument|historic|hist[oó]ric|old town/i,query:"historic heritage monument"},
 {id:"concert",check:/concert|concerto|m[úu]sica|music|dj|gig|live band|концерт|музык|дидже|вечерин/i,terms:/concert|concerto|music|m[úu]sica|stage|palco|music hall|sala de concerto|perform/i,query:"music concert hall stage"},
 {id:"theatre",check:/teatro|theatre|drama|спектакл|театр|акт[её]р/i,terms:/teatro|theatre|theater|stage|auditorium|performance|palco/i,query:"theatre auditorium interior"},
 {id:"festival",check:/festival|фестивал|feira|ярмар|fair|market|mercado/i,terms:/festival|feira|fair|market|mercado|festiv/i,query:"cultural street festival"},
 {id:"workshop",check:/workshop|oficina|masterclass|master class|мастер.класс|заняти|ремесл/i,terms:/workshop|oficina|art class|craft|handmade|studio/i,query:"creative workshop art studio"}
];
function chooseQuery(item){
 const title=(item.title_original||"")+" "+(item.title_ru||"");
 const location=(item.location_city||"")+" "+title;
 const place=/cascais|кашка[йи]ш/i.test(location)?"Cascais":/sintra|синтр/i.test(location)?"Sintra":/porto|порт[оу]/i.test(location)?"Porto":/algarve|алгарве/i.test(location)?"Algarve":/madeira|мадейр/i.test(location)?"Madeira":/lisboa|lisbon|лиссабон/i.test(location)?"Lisbon":null;
 const selected=themes.find(x=>x.check.test(title));
 if(!selected)return null;
 if(item.primary_category==="news"&&/polic|crime|assassin|acident|protest|detid|задерж|убийств|полици|катастроф|расследован|пожар|трагед/i.test(title))return null;
 if(item.primary_category==="news"&&!place&&selected.id==="heritage")return null;
 return {search:(place?place+" Portugal ":"Portugal ")+selected.query,place,theme:selected};
}
function relevantImage(file,titleMatch){
 const lower=String(file.title||"").replace(/^File:/i,"");
 if(bannedTitle.test(lower))return false;
 if(!titleMatch.theme.terms.test(lower))return false;
 if(titleMatch.place){
  const place=titleMatch.place.toLowerCase();
  const alternate=place==="lisbon"?/lisbon|lisboa/i:place==="porto"?/porto/i:place==="cascais"?/cascais/i:place==="sintra"?/sintra/i:place==="algarve"?/algarve/i:/madeira/i;
  if(!alternate.test(lower))return false;
 }else if(!/portugal|portugu|lisboa|lisbon|porto|cascais|sintra|braga|coimbra|faro|algarve|madeira|set[úu]bal|aveiro/i.test(lower))return false;
 return true;
}
export default {async fetch(req){
 const path=new URL(req.url).pathname;
 if(path==="/health")return ok({ok:true,service:"prcommons",license_policy:"CC0 CC-BY CC-BY-SA PD only",final_approval_required:true});
 if(req.method!=="POST"||!req.headers.get("x-neon-trigger-invocation-id"))return ok({error:"schedule_only"},403);
 let article;
 try{
 const [state]=await q("SELECT count(*)::integer AS attempted_today FROM pr_commons_media_jobs WHERE attempted_at>now()-interval '24 hours'");
 if(state&&Number(state.attempted_today)>=24)return ok({ok:true,skipped:"daily_photo_search_limit"});
 const selected=await q("SELECT i.id,i.title_original,i.title_ru,i.location_city,i.primary_category FROM pr_items i JOIN pr_editorial_value_reviews v ON v.item_id=i.id JOIN pr_story_drafts d ON d.item_id=i.id WHERE i.status='candidate' AND i.duplicate_of IS NULL AND (i.primary_category<>'events' OR i.starts_at>now()) AND v.value_score>=55 AND d.status='draft' AND d.needs_more_facts=false AND length(d.story_ru)>=180 AND d.story_ru ~ '[.!?…»)]$' AND length(d.source_context_used)>=160 AND NOT EXISTS(SELECT 1 FROM pr_media_assets a WHERE a.item_id=i.id AND a.media_type IN ('licensed_original','owned_original') AND a.rights_verified AND a.public_url IS NOT NULL AND a.status IN ('candidate','approved','generated')) AND NOT EXISTS(SELECT 1 FROM pr_commons_media_jobs j WHERE j.item_id=i.id) ORDER BY (SELECT count(*) FROM pr_editorial_intake_dashboard q2 JOIN pr_items i2 ON i2.id=q2.item_id WHERE q2.ready AND i2.primary_category=i.primary_category), CASE WHEN i.primary_category='events' THEN 1 ELSE 0 END,v.value_score DESC,i.discovered_at DESC LIMIT 1");
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
 // Fallback to an exact Wikimedia Commons category instead of fuzzy full-text search.
 const alternatives={
  "Porto:housing":"Category:Houses in Porto",
  "Cascais:housing":"Category:Buildings in Cascais",
  "Lisbon:housing":"Category:Residential buildings in Lisbon",
  "Lisbon:museum":"Category:Exterior of Museu de Arte, Arquitetura e Tecnologia"
 };
 const key=(match.place||"")+":"+match.theme.id;
 const category=alternatives[key];
 if(category){
  const categoryURL=new URL("https://commons.wikimedia.org/w/api.php");
  for(const [k,v] of Object.entries({action:"query",generator:"categorymembers",gcmtitle:category,gcmtype:"file",gcmlimit:"35",prop:"imageinfo",iiprop:"url|extmetadata",iiurlwidth:"960",format:"json"}))categoryURL.searchParams.set(k,v);
  const categoryResp=await fetch(categoryURL,{headers:{"user-agent":"PortugaliaRyadomEditor/1.0 (licensed photos)","accept":"application/json"},redirect:"error",signal:AbortSignal.timeout(18000)});
  if(categoryResp.ok){const data=await categoryResp.json();results.push(...Object.values(data.query?.pages||{}));}
 }
 for(const r of results){
  if(!/^File:/i.test(r.title||"")||!relevantImage(r,match))continue;
  const info=r.imageinfo?.[0],meta=info?.extmetadata||{},license=strip(meta.LicenseShortName?.value),
  licenseUrl=strip(meta.LicenseUrl?.value),artist=strip(meta.Attribution?.value||meta.Artist?.value||meta.Credit?.value);
  const thumb=info?.thumburl,filePage=info?.descriptionurl,nonFree=meta.NonFree?.value,restrict=meta.Restrictions?.value;
  if(!LIC.test(license)||nonFree==="True"||restrict||!safe(thumb,"wikimedia.org")||!safe(filePage,"wikimedia.org"))continue;
  if((info?.thumbwidth||0)<880||(info?.thumbheight||0)<450||info.thumbwidth/info.thumbheight<1.35)continue;
  if(!artist&&!/^(CC0|Public domain|PD)/i.test(license))continue;
  if(licenseUrl&&!/^https?:\/\/creativecommons\.org\/(licenses|publicdomain)\//.test(licenseUrl)&&!/^(Public domain|PD)/.test(license))continue;
  approved.push({url:thumb,filePage,title:r.title,artist,license,licenseUrl});
 }
 if(!approved.length){
  await q("UPDATE pr_commons_media_jobs SET status='none',reason='no_sufficiently_relevant_verified_licensed_landscape' WHERE item_id=$1::uuid",[article.id]);
  return ok({ok:true,matched:0,search_query:search,image_ready:false});
 }
 const ranking=approved.slice(0,3);
 let added=0;
 for(const chosen of ranking){
  const credit=(chosen.artist||"Public domain")+" · "+chosen.license;
  const duplicate=await q("SELECT id FROM pr_media_assets WHERE (public_url=$1 OR split_part(license_details,' | ',3)=$2) AND status IN ('candidate','approved') LIMIT 1",[chosen.url,chosen.filePage]);
  if(duplicate.length)continue;
  const inserted=await q("INSERT INTO pr_media_assets(item_id,media_type,generation_model,generation_prompt,public_url,attribution,license_details,rights_verified,illustration_label_required,status) VALUES($1::uuid,'licensed_original','wikimedia_commons_license_lookup',$2,$3,$4,$5,true,true,'candidate') ON CONFLICT DO NOTHING RETURNING id",[article.id,"Тематическое фото (не кадр конкретной новости или мероприятия): "+search,chosen.url,credit,chosen.license+" | "+chosen.licenseUrl+" | "+chosen.filePage]);
  added+=inserted.length;
 }
 await q("UPDATE pr_commons_media_jobs SET status='found',reason=$2 WHERE item_id=$1::uuid",[article.id,ranking[0].filePage]);
 await q("UPDATE pr_commons_media_scan SET licensed_matches=licensed_matches+$1,last_error=NULL WHERE code='commons'",[added]);
 return ok({ok:true,license_checked_photo_options:added,article_id:article.id,approved:false,telegram_sent:0});
 }catch(e){const why=String(e.message||e).slice(0,120);if(article?.id)await q("UPDATE pr_commons_media_jobs SET status='failed',reason=$2 WHERE item_id=$1::uuid",[article.id,why]).catch(()=>{});await q("UPDATE pr_commons_media_scan SET last_error=$1 WHERE code='commons'",[why]).catch(()=>{});return ok({ok:false,error:why},500)}
}};
