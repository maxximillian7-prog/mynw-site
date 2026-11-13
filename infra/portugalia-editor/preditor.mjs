import {neon} from "./driver.mjs";
const db=neon(process.env.DATABASE_URL),sql=(s,p=[])=>db.query(s,p);
const studio="https://npsfaymjckcqhtyiafms.supabase.co",pub="sb_publishable_-HPESNuXtfZQo-gLREwi2Q_1_aAoxee";
const hosts=new Set(["https://mynw.app","https://www.mynw.app"]);
const uuid=s=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s||"");
const cut=(s,n)=>String(s??"").trim().slice(0,n);
const json=(x,status=200,origin="")=>new Response(JSON.stringify(x),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","vary":"Origin",...(origin?{"access-control-allow-origin":origin}:{})}});
const err=(m,status=400)=>Object.assign(new Error(m),{status});
async function identity(req){
 const h=req.headers.get("authorization")||"";if(!h.startsWith("Bearer ")||h.length>3200)throw err("Войдите в Journal Studio",401);
 const headers={"apikey":pub,"authorization":h};
 const [r1,r2]=await Promise.all([fetch(studio+"/auth/v1/user",{headers,signal:AbortSignal.timeout(12000)}),fetch(studio+"/functions/v1/studio-api/projects",{headers,signal:AbortSignal.timeout(12000)})]);
 if(!r1.ok||!r2.ok)throw err("Сессия Journal Studio недействительна",401);
 const user=await r1.json(),j=await r2.json();
 const membership=(j.projects||[]).find(x=>x.slug==="nowgreen"&&["owner","chief_editor","editor","reviewer"].includes(x.role));
 if(!uuid(user.id)||!membership)throw err("Нет редакционных прав",403);
 return{id:user.id,role:membership.role,edit:["owner","chief_editor","editor"].includes(membership.role),approve:["owner","chief_editor"].includes(membership.role)};
}
function access(user,chief=false){if(chief?!user.approve:!user.edit)throw err("Недостаточно прав",403)}
async function input(req){const raw=await req.text();if(raw.length>28000)throw err("Слишком большой запрос",413);try{return JSON.parse(raw||"{}")}catch{throw err("Неверный JSON")}}
async function audit(id,u,action,note="",before={},after={}){await sql("INSERT INTO pr_editorial_revisions(item_id,actor_user_id,action,note,before_state,after_state) VALUES($1::uuid,$2::uuid,$3,$4,$5::jsonb,$6::jsonb)",[id,u.id,action,cut(note,1000),JSON.stringify(before),JSON.stringify(after)])}
async function detail(id){
 const rows=await sql("SELECT i.*,s.name AS source_name,s.code AS source_code,s.verification_status,s.rights_policy,d.id AS draft_id,d.status AS editorial_status,d.style,d.headline_ru,d.hook_ru,d.lead_ru,d.story_ru,d.why_matters_ru,d.context_verified,d.needs_more_facts,d.image_needed,d.image_choice,d.image_exception_reason,d.target_subcategory,d.editorial_note,d.updated_at AS draft_updated_at,d.source_context_used FROM pr_items i JOIN pr_sources s ON s.id=i.source_id LEFT JOIN pr_story_drafts d ON d.item_id=i.id WHERE i.id=$1::uuid",[id]);
 if(!rows.length)throw err("Статья не найдена",404);
 const [media,evidence,comments,revisions]=await Promise.all([
  sql("SELECT id,media_type,status,public_url,rights_verified,illustration_label_required,attribution,license_details,created_at FROM pr_media_assets WHERE item_id=$1::uuid ORDER BY CASE WHEN media_type='brand_generic' THEN 1 ELSE 0 END,created_at DESC",[id]),
  sql("SELECT evidence_url,evidence_type,claim_summary,verified_at FROM pr_item_evidence WHERE item_id=$1::uuid ORDER BY id DESC LIMIT 15",[id]),
  sql("SELECT id,actor_role,body,created_at FROM pr_editorial_comments WHERE item_id=$1::uuid ORDER BY id DESC LIMIT 30",[id]),
  sql("SELECT id,action,note,created_at FROM pr_editorial_revisions WHERE item_id=$1::uuid ORDER BY id DESC LIMIT 30",[id])]);
 return {article:rows[0],media,evidence,comments,revisions};
}
async function save(u,p){
 access(u);const id=p.item_id;if(!uuid(id))throw err("Неверный ID");
 const {article:i}=await detail(id);
 if(i.status==="approved"||i.status==="rejected"||i.editorial_status==="approved")throw err("Сначала верните статью в редактирование",409);
 const f=p.fields||{},style=["short","standard","rich"].includes(f.style)?f.style:"short";
 const name=cut(f.headline_ru??i.headline_ru??i.title_ru,250),hook=cut(f.hook_ru??i.hook_ru,600),lead=cut(f.lead_ru??i.lead_ru,1100),story=cut(f.story_ru??i.story_ru,7000),why=cut(f.why_matters_ru??i.why_matters_ru,1000);
 const needs=!!f.needs_more_facts,image=!!f.image_needed,choice=["no_image","licensed_original","owned_original","generated_illustration","generic_illustration"].includes(f.image_choice)?f.image_choice:"no_image",reason=cut(f.image_exception_reason,750),category=cut(f.target_subcategory,100);
 if(name.length<5)throw err("Заголовок слишком короткий");
 if(category){const valid=await sql("SELECT code FROM pr_categories WHERE code=$1 AND parent_code=$2",[category,i.primary_category]);if(!valid.length)throw err("Подрубрика не соответствует категории")}
 const prev={headline_ru:i.headline_ru,lead_ru:i.lead_ru,story_ru:i.story_ru,status:i.editorial_status};
 await sql("INSERT INTO pr_story_drafts(item_id,style,headline_ru,source_url,status,needs_more_facts) VALUES($1::uuid,$2,$3,$4,'draft',true) ON CONFLICT(item_id) DO NOTHING",[id,style,name,i.canonical_url]);
 await sql("UPDATE pr_story_drafts SET style=$2,headline_ru=$3,hook_ru=$4,lead_ru=$5,story_ru=$6,why_matters_ru=$7,target_subcategory=$8,needs_more_facts=$9,image_needed=$10,image_choice=$11,image_exception_reason=$12,status=CASE WHEN $9 THEN 'needs_facts' ELSE 'draft' END,updated_at=now() WHERE item_id=$1::uuid",[id,style,name,hook,lead,story,why,category||null,needs,image,choice,reason]);
 await audit(id,u,"save","",prev,{headline_ru:name,lead_ru:lead,story_ru:story,style,needs_more_facts:needs,image_choice:choice});
 return{ok:true,saved:true};
}
async function action(u,p){
 const id=p.item_id,a=p.action,note=cut(p.note,1500);
 if(!uuid(id))throw err("Неверный ID");
 const {article:i,media,evidence}=await detail(id);
 if(a==="comment"){
  if(note.length<2)throw err("Введите комментарий");
  await sql("INSERT INTO pr_editorial_comments(item_id,actor_user_id,actor_role,body) VALUES($1::uuid,$2::uuid,$3,$4)",[id,u.id,u.role,note]);await audit(id,u,a,note);return{ok:true};
 }
 access(u,["approve","reject","reopen","queue"].includes(a));
 if(a==="verify_facts"){
  const url=cut(p.evidence_url,1200);let valid=false;try{valid=new URL(url).protocol==="https:"}catch{}
  if(!i.draft_id||!valid||note.length<12)throw err("Нужна HTTPS-ссылка на источник и пояснение (12+ символов)");
  await sql("INSERT INTO pr_item_evidence(item_id,evidence_url,evidence_type,claim_summary,verified_at) VALUES($1::uuid,$2,'primary_official',$3,now()) ON CONFLICT(item_id,evidence_url) DO UPDATE SET claim_summary=EXCLUDED.claim_summary,verified_at=now()",[id,url,note]);
  await sql("UPDATE pr_items SET source_fact_checked=true,source_confidence='primary_verified',last_source_checked_at=now(),updated_at=now() WHERE id=$1::uuid",[id]);
  await sql("UPDATE pr_story_drafts SET context_verified=true,updated_at=now() WHERE item_id=$1::uuid",[id]);
  await audit(id,u,a,note,{}, {evidence_url:url});return{ok:true,verified:true};
 }
 if(a==="approve_media"||a==="reject_media"){
  const m=media.find(x=>x.id===p.media_id);if(!m)throw err("Изображение не найдено",404);
  if(a==="approve_media"){
   if(!m.public_url||!m.rights_verified||!["candidate","generated","approved"].includes(m.status))throw err("Нет подтверждённого изображения и прав",409);
   await sql("UPDATE pr_media_assets SET status='approved',approved_by=$2,approved_at=now() WHERE id=$1::uuid",[m.id,u.id]);
  }else{
   if(note.length<10)throw err("Укажите причину отказа");
   await sql("UPDATE pr_media_assets SET status='rejected',failure_reason=$2,approved_by=NULL,approved_at=NULL WHERE id=$1::uuid",[m.id,note]);
  }
  await audit(id,u,a,note,{}, {media_id:m.id});return{ok:true};
 }
 if(a==="request_changes"||a==="reject"||a==="reopen"){
  if(a!=="reopen"&&note.length<10)throw err("Нужно пояснение для автора");
  const ds=a==="request_changes"?"needs_facts":a==="reject"?"rejected":"draft";
  const isRejected=a==="reject";
  await sql("UPDATE pr_story_drafts SET status=$2,needs_more_facts=CASE WHEN $2='needs_facts' THEN true ELSE needs_more_facts END,editorial_note=$3,reviewer=NULL,reviewed_at=NULL,updated_at=now() WHERE item_id=$1::uuid",[id,ds,note]);
  await sql("UPDATE pr_items SET status=$2,reviewed_by=NULL,reviewed_at=NULL,updated_at=now() WHERE id=$1::uuid",[id,isRejected?"rejected":"candidate"]);
  await sql("UPDATE pr_posts SET status='cancelled' WHERE item_id=$1::uuid AND status='queued'",[id]);
  if(isRejected)await sql("INSERT INTO pr_editorial_reviews(item_id,reviewer,decision,rationale) VALUES($1::uuid,$2,'reject',$3)",[id,u.id,note]);
  await audit(id,u,a,note);return{ok:true};
 }
 if(a==="approve"){
  if(!i.draft_id||!i.lead_ru||!i.story_ru||!i.headline_ru)throw err("Нет полноценного текста",409);
  if(!i.context_verified||i.needs_more_facts||!i.source_fact_checked||!evidence.length)throw err("Сначала подтвердите факты и доработайте материал",409);
  const good=media.some(m=>m.status==="approved"&&m.rights_verified&&m.public_url);
  if(i.image_needed&&i.image_choice!=="no_image"&&!good)throw err("Утвердите изображение",409);
  if(i.image_needed&&i.image_choice==="no_image"&&String(i.image_exception_reason||"").length<12)throw err("Для выпуска без картинки нужна причина",409);
  await sql("UPDATE pr_story_drafts SET status='approved',reviewer=$2,reviewed_at=now(),updated_at=now() WHERE item_id=$1::uuid",[id,u.id]);
  await sql("UPDATE pr_items SET status='approved',reviewed_by=$2,reviewed_at=now(),updated_at=now() WHERE id=$1::uuid",[id,u.id]);
  await sql("INSERT INTO pr_editorial_reviews(item_id,reviewer,decision,rationale,claim_verified,rights_verified) VALUES($1::uuid,$2,'approve',$3,true,$4)",[id,u.id,note,good||!i.image_needed||i.image_choice==="no_image"]);
  await audit(id,u,a,note);return{ok:true,approved:true};
 }
 if(a==="queue"){
  if(i.status!=="approved"||i.editorial_status!=="approved")throw err("Сначала утвердите статью",409);
  const [gate]=await sql("SELECT allowed,reason FROM pr_item_publication_check($1::uuid)",[id]);if(!gate?.allowed)throw err("Публикация заблокирована: "+gate?.reason,409);
  const destination=p.destination==="afisha"?"afisha":"main";
  await sql("INSERT INTO pr_posts(item_id,destination_code,status) VALUES($1::uuid,$2,'queued') ON CONFLICT(item_id,destination_code) DO NOTHING",[id,destination]);
  await audit(id,u,a,note,{}, {destination});return{ok:true,queued:true,sent:false};
 }
 throw err("Неизвестная операция");
}
export default {async fetch(req){
 const origin=req.headers.get("origin")||"",allowed=hosts.has(origin),u=new URL(req.url);
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":allowed?origin:"null","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,content-type","access-control-max-age":"600","vary":"Origin"}});
 if(u.pathname==="/health")return json({ok:true,service:"portugal-editor",telegram_sending:false},200,allowed?origin:"");
 if(!allowed)return json({error:"Источник запроса не разрешён"},403);
 try{
  const user=await identity(req),route=u.pathname;
  if(req.method==="GET"&&route==="/api/me")return json({user},200,origin);
  if(req.method==="GET"&&route==="/api/categories"){
   const categories=await sql("SELECT code,parent_code,name_ru,icon,sort_order FROM pr_categories WHERE is_active=true ORDER BY sort_order,name_ru");return json({categories},200,origin);
  }
  if(req.method==="GET"&&route==="/api/summary"){
   const [summary]=await sql("SELECT (SELECT count(*) FROM pr_items i WHERE i.duplicate_of IS NULL AND i.status='candidate' AND NOT EXISTS(SELECT 1 FROM pr_story_drafts d WHERE d.item_id=i.id)) AS incoming,(SELECT count(*) FROM pr_story_drafts WHERE status='needs_facts') AS needs_facts,(SELECT count(*) FROM pr_story_drafts WHERE status='draft') AS drafts,(SELECT count(*) FROM pr_story_drafts WHERE status='approved') AS approved,(SELECT count(*) FROM pr_media_assets WHERE status='generated') AS images_to_approve,(SELECT count(*) FROM pr_posts WHERE status='queued') AS queued,(SELECT count(*) FROM pr_posts WHERE status='sent') AS sent");return json({summary},200,origin);
  }
  if(req.method==="GET"&&route==="/api/articles"){
   const status=["all","incoming","needs_facts","draft","approved","rejected","queued"].includes(u.searchParams.get("status"))?u.searchParams.get("status"):"all",cat=cut(u.searchParams.get("category")||"all",80),search=cut(u.searchParams.get("q")||"",90);
   const articles=await sql("SELECT i.id,i.title_original,i.title_ru,i.primary_category,i.location_city,i.source_published_at,i.discovered_at,s.name AS source_name,d.status AS editorial_status,d.style,d.headline_ru,d.needs_more_facts,d.image_needed,left(coalesce(nullif(d.lead_ru,''),nullif(i.summary_ru,''),nullif(i.body_original,''),''),180) AS article_excerpt,(SELECT m.status FROM pr_media_assets m WHERE m.item_id=i.id ORDER BY CASE WHEN m.public_url IS NOT NULL THEN 0 ELSE 1 END,CASE WHEN m.media_type='brand_generic' THEN 1 ELSE 0 END,m.created_at DESC LIMIT 1) AS media_status,(SELECT m.public_url FROM pr_media_assets m WHERE m.item_id=i.id AND m.public_url IS NOT NULL AND m.status IN ('generated','approved') ORDER BY CASE WHEN m.media_type='brand_generic' THEN 1 ELSE 0 END,m.created_at DESC LIMIT 1) AS media_preview_url,(SELECT count(*) FROM pr_posts p WHERE p.item_id=i.id AND p.status='queued') AS queued_count FROM pr_items i JOIN pr_sources s ON s.id=i.source_id LEFT JOIN pr_story_drafts d ON d.item_id=i.id WHERE i.duplicate_of IS NULL AND ($1='all' OR ($1='incoming' AND d.id IS NULL AND i.status='candidate') OR ($1='queued' AND EXISTS(SELECT 1 FROM pr_posts p WHERE p.item_id=i.id AND p.status='queued')) OR d.status=$1) AND ($2='all' OR i.primary_category=$2) AND ($3='' OR COALESCE(d.headline_ru,i.title_ru,i.title_original) ILIKE '%'||$3||'%' OR s.name ILIKE '%'||$3||'%') ORDER BY CASE WHEN d.status='approved' THEN 2 WHEN d.status='needs_facts' THEN 1 ELSE 0 END,i.discovered_at DESC LIMIT 80",[status,cat,search]);
   return json({articles},200,origin);
  }
  if(req.method==="GET"&&route==="/api/article"){const id=u.searchParams.get("id");if(!uuid(id))throw err("Неверный ID");return json(await detail(id),200,origin)}
  if(req.method==="POST"&&route==="/api/save")return json(await save(user,await input(req)),200,origin);
  if(req.method==="POST"&&route==="/api/action")return json(await action(user,await input(req)),200,origin);
  return json({error:"Маршрут не найден"},404,origin);
 }catch(e){return json({error:cut(e.message,250)},e.status||500,origin)}
}};