"use strict";
const API_ROOT="https://npsfaymjckcqhtyiafms.supabase.co";
const PUBLIC_KEY="sb_publishable_-HPESNuXtfZQo-gLREwi2Q_1_aAoxee";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statuses={draft:"Черновик",in_review:"На проверке",changes_requested:"На доработке",approved:"Утверждена",scheduled:"Запланирована",published:"Опубликована",archived:"Архив"};
const roles={owner:"Владелец",chief_editor:"Главный редактор",editor:"Редактор",author:"Автор",reviewer:"Рецензент"};
const channels={nowgreen:"NowGreen",nowcook:"NowCook",nowwhat:"NowWhat",nowkids:"NowKids",website:"Сайт",wordpress:"WordPress",instagram:"Instagram"};
let session=null,projects=[],project=null,posts=[],authors=[],current=null,draft=null,placements=[],deliveries=[],assets={},tab="home",dirty=false,toastTimer=null,flashError=false;
const editorRole=()=>["owner","chief_editor","editor"].includes(project?.role);
const chiefRole=()=>["owner","chief_editor"].includes(project?.role);
const editable=()=>!current||["draft","changes_requested"].includes(current.status);
function toast(txt,error=false){const el=$("status");el.textContent=String(txt);el.classList.toggle("error",error);clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.textContent="",5500)}
function signout(){session=null;sessionStorage.removeItem("journal_session");$("gate").hidden=false;$("workspace").hidden=true}
async function auth(path,method="POST",payload){
 const r=await fetch(API_ROOT+"/auth/v1/"+path,{method,headers:{"apikey":PUBLIC_KEY,"Content-Type":"application/json"},body:payload?JSON.stringify(payload):undefined});
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.msg||j.error_description||j.message||j.error||"Ошибка авторизации");return j
}
async function call(path,method="GET",payload){
 if(!session?.access_token)throw Error("Пожалуйста, войдите в редакцию");
 const request=()=>fetch(API_ROOT+"/functions/v1/studio-api"+path,{method,headers:{"apikey":PUBLIC_KEY,"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},body:payload?JSON.stringify(payload):undefined});
 let r=await request();
 if(r.status===401&&session.refresh_token){session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});sessionStorage.setItem("journal_session",JSON.stringify(session));r=await request()}
 const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Ошибка сервера");return j
}
async function login(){
 const email=$("email").value.trim(),password=$("password").value;
 session=await auth("token?grant_type=password","POST",{email,password});
 sessionStorage.setItem("journal_session",JSON.stringify(session));
 await initialize();
}
async function signup(){
 const password=$("password").value,email=$("email").value.trim();
 if(password.length<12)throw Error("Пароль должен содержать не меньше 12 символов");
 const redirect="https://mynw.app/journalstudio/cloud/";
 const d=await auth("signup?redirect_to="+encodeURIComponent(redirect),"POST",{email,password});
 if(d.access_token){session=d;sessionStorage.setItem("journal_session",JSON.stringify(session));await initialize()}
 else toast("Проверьте почту. После подтверждения вернитесь на эту страницу и войдите с паролем.");
}
async function initialize(){
 const data=await call("/projects");projects=data.projects||[];
 if(!projects.length){$("gate").hidden=false;$("workspace").hidden=true;$("setupZone").hidden=false;toast("Аккаунт подтверждён. Доступ выдаётся главным редактором; при первом запуске нужен одноразовый ключ.");return}
 $("gate").hidden=true;$("workspace").hidden=false;$("setupZone").hidden=true;
 const currentProject=project?.slug, savedProject=sessionStorage.getItem('journal_active_project');
 project=projects.find(p=>p.slug===currentProject)||projects.find(p=>p.slug===savedProject)||projects[0];
 window.StudioTheme?.apply(project.slug);
 $("project").innerHTML=projects.map(p=>'<option value="'+esc(p.slug)+'">'+esc(p.name)+" · "+esc(roles[p.role]||p.role)+"</option>").join("");
 $("project").value=project.slug;
 $("avatar").textContent=(session.user?.email||"JS").slice(0,2).toUpperCase();
 $("userDisplay").textContent=session.user?.email||roles[project.role]||"Редактор";
 $("invite").hidden=!chiefRole();
 $("authorsInvite").hidden=!chiefRole();
 await loadData();showTab("home",true);
}
async function claimOwner(){
 const key=$("setup").value;if(!key)throw Error("Введите ключ активации");
 await call("/bootstrap","POST",{setup_key:key});$("setup").value="";await initialize();toast("Главный редактор активирован");
}
async function loadData(){
 const result=await Promise.all([call("/posts?project="+encodeURIComponent(project.slug)),call("/authors?project="+encodeURIComponent(project.slug))]);
 posts=result[0].posts||[];authors=result[1].authors||[];
}
function statusTag(s){return '<span class="chip '+(["in_review","scheduled"].includes(s)?"amber":s==="published"?"":"gray")+'">'+esc(statuses[s]||s)+'</span>'}
function listEntry(p){
 return '<div class="listItem"><div><strong>'+esc(p.title||"Без названия")+'</strong><div class="muted">'+esc(p.locale)+" · "+esc(p.updated_at?.slice(0,10)||"")+' · версия '+Number(p.revision||1)+'</div></div><div class="btns">'+statusTag(p.status)+'<button data-open-post="'+esc(p.id)+'">Открыть ↗</button></div></div>'
}
function authorMini(a){
 return '<div class="authorCard"><span class="authorAvatar">'+esc((a.name||"A").slice(0,1))+'</span><div style="min-width:0;flex:1"><strong>'+esc(a.name)+'</strong><div class="muted small">'+(a.kind==="ai"?"ИИ-персонаж":"Приглашённый автор")+(a.kind==="partner"?" · "+esc(a.consent_status):"")+'</div></div><span class="chip">'+(a.kind==="ai"?"AI":"Автор")+'</span></div>';
}
function renderDashboard(){
 const n=s=>posts.filter(x=>x.status===s).length;
 $("statAll").textContent=posts.length;$("statDraft").textContent=n("draft")+n("changes_requested");
 $("statReview").textContent=n("in_review");$("statPublished").textContent=n("published");
 $("pipeDraft").textContent=n("draft")+n("changes_requested");$("pipeReview").textContent=n("in_review");
 $("pipeReady").textContent=n("approved")+n("scheduled")+n("published");
 $("recentPosts").innerHTML=posts.length?posts.slice(0,6).map(listEntry).join(""):'<div class="empty"><span class="emptyIcon">▤</span><h3>Пока нет публикаций</h3><p>Создай первый материал для журнала '+esc(project.name)+'</p><button class="primary" data-create>+ Первая статья</button></div>';
 $("recentAuthors").innerHTML=authors.length?authors.slice(0,4).map(authorMini).join(""):'<div class="empty"><span class="emptyIcon">♙</span><b>Авторов ещё нет</b><p>Добавьте ИИ-персонажей или пригласите настоящих блогеров.</p><button data-open-tab="authors">Управлять авторами</button></div>';
 $("channelSummary").innerHTML='<div class="channelCard"><span>❧ &nbsp;'+esc(project.name)+' Journal</span><span class="chip">Feed активен</span></div><div class="channelCard"><span>◈ &nbsp; Сайт / блог</span><span class="chip amber">Адаптер ожидает</span></div><div class="channelCard"><span>◎ &nbsp; Instagram</span><span class="chip amber">Подключить</span></div>';
}
function renderLibrary(){
 $("library").innerHTML=posts.length?posts.map(listEntry).join(""):'<div class="empty"><span class="emptyIcon">▤</span><h3>Статей пока нет</h3><p>Добавьте первый материал для журнала</p><button class="primary" data-create>+ Написать статью</button></div>'
}
function renderAuthors(){
 $("authorsList").innerHTML=authors.length?authors.map(a=>{
 const canApprove=chiefRole()&&a.kind==="partner"&&a.consent_status!=="approved";
 return '<div class="authorCard"><span class="authorAvatar">'+esc(a.name.slice(0,1))+'</span><div style="flex:1"><b>'+esc(a.name)+'</b><div class="small muted">'+esc(a.bio||"Без описания")+'</div><span class="chip '+(a.consent_status==="approved"?"":"amber")+'">'+(a.kind==="ai"?"ИИ-автор":a.consent_status==="approved"?"Права подтверждены":"Согласие ожидается")+'</span></div>'+(canApprove?'<button data-author-approve="'+esc(a.id)+'">Проверить права</button>':"")+'</div>';
 }).join(""):'<div class="empty"><span class="emptyIcon">♙</span><h3>Создайте профиль автора</h3><p>Например, Ivy, Nora или Leo для NowGreen, либо настоящего партнёра.</p></div>';
 $("authorKind").querySelector('option[value="ai"]').disabled=!chiefRole();
}
async function refreshPosts(){
 const [ps,au]=await Promise.all([call("/posts?project="+encodeURIComponent(project.slug)),call("/authors?project="+encodeURIComponent(project.slug))]);
 posts=ps.posts||[];authors=au.authors||[];renderDashboard();renderLibrary();renderAuthors();
}
function paintPublication(){
 const ready=posts.filter(p=>["approved","scheduled","published"].includes(p.status));
 $("readyPosts").innerHTML=ready.length?ready.map(p=>'<div class="listItem"><div><b>'+esc(p.title)+'</b><div class="muted">'+esc(statuses[p.status])+'</div></div><button data-delivery="'+esc(p.id)+'">Проверить</button></div>').join(""):'<div class="empty"><span class="emptyIcon">↗</span><b>Готовых материалов пока нет</b><p>Утверждённые статьи появятся здесь.</p></div>';
}
async function viewDelivery(id){
 const data=await call("/deliveries?post_id="+encodeURIComponent(id));
 $("deliveryDetails").innerHTML='<h3 style="margin-top:20px">Результаты отправки</h3>'+(data.deliveries||[]).map(x=>'<div class="channelCard"><div><b>'+esc(channels[x.channel]||x.channel)+'</b><div class="small muted">'+esc(x.error||"")+'</div></div>'+statusTag(x.status)+'</div>').join("")||'<div class="tip">Каналы публикации пока не выбраны.</div>';
}
async function showTab(target,force=false){
 if(!force&&target!==tab&&dirty&&!confirm("Есть несохранённые изменения. Покинуть конструктор?"))return;
 if(target!==tab){dirty=false}
 tab=target;
 document.querySelectorAll("[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===target));
 document.querySelectorAll("[data-tab]").forEach(el=>el.classList.toggle("selected",el.dataset.tab===target));
 const labels={home:["Обзор редакции","Сегодня в Journal Studio"],library:["Материалы","Черновики, проверка и опубликованные статьи"],editor:["Конструктор статей","Подготовка и предпросмотр"],authors:["Авторы","ИИ-персонажи и приглашённые блогеры"],publish:["Публикации","Каналы и результаты отправки"],settings:["Настройки","Аккаунт и подключение редакции"],"ai-studio":["ИИ-редакция","Генерация статей, изображений и управление ИИ-авторами"],"review-queue":["Согласование","Очередь материалов и редакционные комментарии"]};
 const viewInfo=labels[target]||[target.replace(/-/g," "),"Редакционное рабочее пространство"];
 $("headline").textContent=viewInfo[0];$("subtitle").textContent=project.name+" · "+viewInfo[1];
 $("crumb").textContent="Journal Studio / "+viewInfo[0];
 if(target==="home")renderDashboard();
 if(target==="library")renderLibrary();
 if(target==="authors")renderAuthors();
 if(target==="publish")paintPublication();
 if(target==="editor")renderEditor();
 if(target==="settings"){$("settingsProject").textContent=project.name;$("settingsRole").textContent=roles[project.role]||project.role}
 window.scrollTo({top:0,behavior:"instant"});
}
function resetDraft(){
 current=null;draft={title:"",summary:"",locale:project.default_locale||"ru",category:"",blocks:[],author_id:null,cover_path:null,template_id:"editorial"};
 blocks=draft.blocks;assets={};placements=[];dirty=false;
}
async function createPost(){resetDraft();await showTab("editor",true);}
async function openPost(id){
 const x=(await call("/posts/"+encodeURIComponent(id))).post;
 current=x;draft=structuredClone(x);blocks=draft.blocks||[];assets={};dirty=false;
 placements=(await call("/placements?post_id="+encodeURIComponent(id))).placements||[];
 await showTab("editor",true);
 await fetchMedia();
}
function blockHtml(b,i,edit){
 let inner="";
 if(b.type==="link"){inner='<label>Текст ссылки</label><input data-block="'+i+'" data-prop="label" value="'+esc(b.label||"")+'"><label>URL</label><input data-block="'+i+'" data-prop="url" value="'+esc(b.url||"")+'" placeholder="https://...">';}
 else if(b.type==="image"){const url=assets[b.asset_id]||"";inner=url?'<img data-media-id="'+esc(b.asset_id)+'" alt="'+esc(b.alt||"")+'" src="'+esc(url)+'" style="max-width:100%;max-height:200px;border-radius:10px;margin-bottom:10px">':'<p class="muted small">Загруженное изображение</p>';inner+='<div class="studio-media-size" data-optimized-id="'+esc(b.asset_id)+'">'+esc(window.StudioOptimizer?.label?.(b.asset_id)||"Оптимизация изображений") +'</div>';
 inner+='<label>Подпись к фото</label><input data-block="'+i+'" data-prop="caption" value="'+esc(b.caption||"")+'"><label>Альтернативный текст (для доступности)</label><input data-block="'+i+'" data-prop="alt" value="'+esc(b.alt||"")+'">'+(edit?'<button type="button" class="jp-cover-select '+(draft?.cover_path===b.asset_id?'active':'')+'" data-block-cover="'+i+'">'+(draft?.cover_path===b.asset_id?'✓ Выбрана обложкой':'○ Сделать обложкой')+'</button>':'');}
 else inner='<textarea data-block="'+i+'" data-prop="text" rows="'+(b.type==="text"?5:2)+'" placeholder="Введите текст">'+esc(b.text||"")+'</textarea>';
 return '<div class="block"><div class="row"><strong>'+({text:"Текст",heading:"Заголовок",quote:"Цитата",image:"Фотография",link:"Ссылка"}[b.type]||"Блок")+'</strong>'+(edit?'<div class="btns"><button data-block-up="'+i+'">↑</button><button data-block-down="'+i+'">↓</button><button data-block-remove="'+i+'">Удалить</button></div>':"")+'</div>'+inner+'</div>';
}
function capture(){
 if(!draft)return;
 for(const key of ["title","summary","locale","category"]){const el=$(key);if(el)draft[key]=el.value}
 draft.author_id=$("authorSelect").value||null;
 document.querySelectorAll("[data-block]").forEach(el=>{const b=blocks[+el.dataset.block];if(b)b[el.dataset.prop]=el.value});
}
function renderEditor(){
 $("editor").hidden=!draft;$("emptyEditor").hidden=!!draft;if(!draft)return;
 const edit=editable();$("workTitle").textContent=current?.title||"Новый материал";
 $("statusLine").innerHTML=statusTag(current?.status||"draft")+" · "+(current?"Версия "+current.revision:"Материал ещё не сохранён");
 for(const k of ["title","summary","locale","category"]){$(k).value=draft[k]||"";$(k).disabled=!edit}
 $("authorSelect").innerHTML='<option value="">Редакция</option>'+authors.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+(a.kind==="ai"?" · ИИ":"")+'</option>').join("");
 $("authorSelect").value=draft.author_id||"";$("authorSelect").disabled=!edit;
 $("blocks").innerHTML=blocks.map((b,i)=>blockHtml(b,i,edit)).join("")||'<div class="empty">Добавьте первый текстовый блок, заголовок или фотографию.</div>';
 $("editTools").hidden=!edit;
 const s=current?.status||"draft";
 $("save").hidden=!edit;$("submit").hidden=!current||!edit;
 $("return").hidden=!current||s!=="in_review"||!editorRole();
 $("approve").hidden=!current||s!=="in_review"||!chiefRole();
 $("publish").hidden=!current||s!=="approved"||!chiefRole();
 $("schedule").hidden=!current||s!=="approved"||!chiefRole();
 renderPreview();renderEditorChannels();
}
function renderPreview(){
 if(!draft)return;
 if(window.JournalPreview && typeof window.JournalPreview.render==="function"){
   window.JournalPreview.render({draft,blocks,assets,authors,projectName:project?.name||"NowGreen",postId:current?.id||null,postKey:current?.id||draft,canEdit:editable(),instagramCaption:draft?.caption||placements.find(p=>p.channel==="instagram"&&p.locale===draft.locale)?.settings?.caption||""});
   return;
 }
 $("preview").textContent="Предпросмотр загружается…";
}
function renderEditorChannels(){
 const html=placements.map(p=>'<div class="channelCard"><span>'+esc(channels[p.channel]||p.channel)+' · '+esc(p.locale)+'</span>'+statusTag(p.status)+'</div>').join("");
 $("editorChannels").innerHTML=(html||'<p class="muted small">Сначала сохраните статью. Для журнала выбранного приложения будет создан канал по умолчанию.</p>')+
 (current&&editable()?'<div style="display:flex;gap:8px"><select id="addChannel"><option value="website">Сайт</option><option value="wordpress">WordPress</option><option value="instagram">Instagram</option></select><button id="addChannelBtn">+ Добавить</button></div>':'');
}
async function addChannel(){
 const ch=$("addChannel").value;if(!current)throw Error("Сначала сохраните материал");
 await call("/placements","POST",{post_id:current.id,channel:ch,locale:current.locale});
 placements=(await call("/placements?post_id="+current.id)).placements||[];renderEditorChannels();toast("Канал добавлен. Для внешней публикации потребуется авторизация.");
}
async function fetchMedia(){
 const ids=[...new Set(blocks.filter(b=>b.type==="image").map(b=>b.asset_id))];
 if(draft?.cover_path&&!ids.includes(draft.cover_path))ids.push(draft.cover_path);
 let failed=0,needOptimization=[];
 for(const id of ids){
  try{
   const r=await call("/media/"+encodeURIComponent(id));
   if(typeof r.url!=="string"||!r.url.startsWith("https://")||!r.url.includes("/storage/v1/object/sign/"))throw Error("Invalid signed photo URL");
   assets[id]=r.url;
   window.StudioOptimizer?.track?.(id,r.optimization);
   if(r.optimization?.status!=="ready"&&!r.optimization?.original_deleted)needOptimization.push(id);
  }catch{failed++}
 }
 if(tab==="editor")renderEditor();
 if(failed)toast("Не удалось открыть "+failed+" изображений. Попробуйте ещё раз открыть статью.",true);
 if(needOptimization.length&&window.StudioOptimizer){
  const originPost=current?.id;
  void (async()=>{
   let finished=0;
   for(const id of needOptimization)if(await window.StudioOptimizer.optimizeExisting(id))finished++;
   if(finished&&tab==="editor"&&current?.id===originPost&&!dirty){
    renderEditor();toast("Оптимизировано изображений: "+finished+". Вместо оригиналов используются WebP.");
   }
  })();
 }
}
async function savePost(){
 if(!draft)throw Error("Откройте конструктор");
 capture();if(!draft.title?.trim())throw Error("Укажите заголовок");
 const data={title:draft.title.trim(),summary:draft.summary,locale:draft.locale,category:draft.category,blocks,cover_path:draft.cover_path||null,template_id:draft.template_id||"editorial"};
 let r;
 if(current){r=await call("/posts/"+current.id,"PATCH",{...data,expected_revision:current.revision,author_id:draft.author_id||undefined})}
 else {
 r=await call("/posts","POST",{...data,project:project.slug});
 if(draft.author_id){r=await call("/posts/"+r.post.id,"PATCH",{expected_revision:r.post.revision,author_id:draft.author_id})}
 }
 current=r.post;draft=structuredClone(current);blocks=draft.blocks||[];dirty=false;
 try{await call("/placements","POST",{post_id:current.id,channel:project.slug,locale:current.locale})}catch(e){toast("Статья сохранена, но канал: "+e.message,true)}
 placements=(await call("/placements?post_id="+current.id)).placements||[];
 await refreshPosts();renderEditor();toast("Материал сохранён на сервере");
}
async function workflow(action){
 if(!current)throw Error("Сохраните материал");
 if(action==="submit"){
  await window.StudioFeatures?.waitForSave?.();
  capture();
  if(dirty||window.StudioFeatures?.hasUnsavedChanges?.()){
   await savePost();
  }
  await window.StudioFeatures?.waitForSave?.();
  if(dirty)throw Error("Изменения не сохранены. Отправка на согласование отменена.");
 }
 const payload={action,expected_revision:current.revision};
 if(action==="submit")payload.submitted_channel=window.StudioFeatures?.activeVersion?.()||"base";
 if(action==="request_changes"){const note=prompt("Что автору нужно исправить? Комментарий обязателен:");if(note===null)return;if(!note.trim())throw Error("Укажите причину возврата на доработку");payload.note=note.trim()}
 if(action==="schedule"){
 const value=prompt("Время выпуска в ISO 8601 (включая часовой пояс)",new Date(Date.now()+86400000).toISOString());if(!value)return;payload.scheduled_at=value;
 }
 const expectedPostId=current.id,expectedRevision=current.revision;
 const remote=(await call("/posts/"+encodeURIComponent(expectedPostId))).post;
 if(remote.revision!==expectedRevision||remote.id!==expectedPostId)throw Error("Статья изменилась на сервере. Откройте актуальную версию перед согласованием.");
 const r=await call("/posts/"+expectedPostId+"/action","POST",payload);
 current=r.post;draft=structuredClone(current);blocks=draft.blocks||[];dirty=false;
 await refreshPosts();renderEditor();toast("Статус изменён: "+(statuses[current.status]||current.status));
}
function addBlock(t){
 if(!draft||!editable())return;capture();
 blocks.push(t==="link"?{type:"link",label:"",url:""}:{type:t,text:""});draft.blocks=blocks;dirty=true;renderEditor();
}
function modifyBlock(index,operation){
 if(!editable())return;capture();
 if(operation==="remove"){const item=blocks[index];blocks.splice(index,1);if(item?.asset_id===draft.cover_path){draft.cover_path=blocks.find(x=>x.type==="image")?.asset_id||null}}
 else{const to=index+(operation==="up"?-1:1);if(to<0||to>=blocks.length)return;[blocks[index],blocks[to]]=[blocks[to],blocks[index]]}
 dirty=true;renderEditor();
}
async function upload(){
 const f=$("file").files?.[0];
 if(!f)throw Error("Выберите фотографию");
 if(!draft||!editable())throw Error("Материал не открыт для редактирования");
 if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>8*1024*1024)throw Error("Нужен JPG, PNG или WebP до 8 МБ");
 if(!$("imageRights").checked)throw Error("Подтвердите право публикации фото");
 const copyright=$("imageCopyright").value.trim();
 if(!copyright)throw Error("Введите имя фотографа или правообладателя");
 const license=$("imageLicense").value;
 const alt=$("imageAlt").value.trim()||f.name;
 if(!window.StudioOptimizer)throw Error("Обновите страницу: модуль оптимизации изображений не загружен");
 const renditions=await window.StudioOptimizer.renderVersions(f);
 const base64=await new Promise((ok,no)=>{const reader=new FileReader();reader.onload=()=>ok(String(reader.result).split(",")[1]);reader.onerror=no;reader.readAsDataURL(f)});
 const sourceUrl=$("imageSourceUrl").value.trim();
 if(sourceUrl&&!/^https:\/\//i.test(sourceUrl))throw Error("Источник должен начинаться с https://");
 const r=await call("/media","POST",{project:project.slug,mime:f.type,base64,alt_text:alt,copyright_holder:copyright,license,source_url:sourceUrl,rights_confirmed:true});
 let photoStatus=null;
 try{photoStatus=await window.StudioOptimizer.fromPrepared(r.asset.id,renditions,f.size)}
 catch(e){toast("Оригинал загружен, но WebP-оптимизация не завершена: "+e.message,true)}
 capture();const b={type:"image",asset_id:r.asset.id,caption:"",alt};
 blocks.push(b);draft.blocks=blocks;
 if(!draft.cover_path)draft.cover_path=b.asset_id;
 dirty=true;
 try{const media=await call("/media/"+r.asset.id);assets[r.asset.id]=media.url}catch{}
 $("file").value="";$("imageAlt").value="";$("imageSourceUrl").value="";$("imageRights").checked=false;
 renderEditor();toast("Фото добавлено. При необходимости выберите другое фото в качестве обложки, затем сохраните статью.");
}
async function saveInstagramCaption(){
 if(!draft||!current)throw Error("Сначала сохраните статью");
 if(!editable())throw Error("Подпись нельзя менять после согласования");
 const caption=window.JournalPreview?.getCaption?.()||"";
 if(window.StudioFeatures?.saveCaptionForActiveVersion && await window.StudioFeatures.saveCaptionForActiveVersion(caption))return;
 if(dirty)throw Error("Сначала сохраните изменения статьи");
 await call("/placements/settings","POST",{post_id:current.id,channel:"instagram",caption,description:""});
 placements=(await call("/placements?post_id="+current.id)).placements||[];
 window.JournalPreview?.setSavedCaption?.(caption);
 renderEditorChannels();toast("Подпись Instagram сохранена отдельно от статьи");
}
async function invite(){
 if(!chiefRole())throw Error("Приглашать авторов может только главный редактор");
 const email=prompt("Email автора:");if(!email)return;
 await call("/invite","POST",{project:project.slug,email,role:"author"});toast("Приглашение отправлено на "+email);
}
async function saveAuthor(){
 const name=$("authorName").value.trim();if(!name)throw Error("Введите имя");
 const kind=$("authorKind").value;
 await call("/authors","POST",{project:project.slug,name,bio:$("authorBio").value,kind,social_url:$("authorSocial").value.trim()});
 $("authorName").value="";$("authorBio").value="";$("authorSocial").value="";
 await refreshPosts();toast("Профиль автора создан");
}
async function approveAuthor(id){
 const ref=prompt("Ссылка на согласие автора или номер договора:");
 if(!ref)return;
 await call("/authors/"+id+"/approve","POST",{consent_ref:ref});await refreshPosts();toast("Согласие автора подтверждено");
}
async function changeProject(slug){
 if(dirty&&!confirm("Несохранённые изменения будут потеряны. Продолжить?")){$("project").value=project.slug;return}
 const target=projects.find(p=>p.slug===slug);if(!target)return;
 project=target;window.StudioTheme?.apply(project.slug);sessionStorage.setItem('journal_active_project',project.slug);
 current=null;draft=null;placements=[];assets={};dirty=false;
 $("invite").hidden=!chiefRole();$("authorsInvite").hidden=!chiefRole();
 await loadData();await showTab("home",true);
}
async function run(f){
 try{await f()}catch(e){toast("Ошибка: "+e.message,true)}
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.tab) return void run(()=>showTab(b.dataset.tab));
 if(b.dataset.openTab)return void run(()=>showTab(b.dataset.openTab));
 if(b.dataset.create!==undefined)return void run(createPost);
 if(b.dataset.openPost)return void run(()=>openPost(b.dataset.openPost));
 if(b.dataset.delivery)return void run(()=>viewDelivery(b.dataset.delivery));
 if(b.dataset.authorApprove)return void run(()=>approveAuthor(b.dataset.authorApprove));
 if(b.dataset.add)return void run(async()=>addBlock(b.dataset.add));
 if(b.dataset.blockCover!==undefined)return void run(async()=>{const item=blocks[+b.dataset.blockCover];if(!item||item.type!=="image")return;capture();draft.cover_path=item.asset_id;dirty=true;renderEditor();toast("Обложка выбрана. Сохраните изменения.");});
 if(b.dataset.blockRemove!==undefined)return void run(async()=>modifyBlock(+b.dataset.blockRemove,"remove"));
 if(b.dataset.blockUp!==undefined)return void run(async()=>modifyBlock(+b.dataset.blockUp,"up"));
 if(b.dataset.blockDown!==undefined)return void run(async()=>modifyBlock(+b.dataset.blockDown,"down"));
});
for(const id of ["create","heroCreate","libraryCreate","editorCreate"])$(id).onclick=()=>run(createPost);
for(const id of ["invite","authorsInvite"])$(id).onclick=()=>run(invite);
$("saveAuthor").onclick=()=>run(saveAuthor);
$("project").onchange=e=>run(()=>changeProject(e.target.value));
$("login").onclick=()=>run(login);$("register").onclick=()=>run(signup);$("activate").onclick=()=>run(claimOwner);
$("logout").onclick=signout;
$("backLibrary").onclick=()=>run(()=>showTab("library"));
$("save").onclick=()=>run(savePost);
for(const x of ["submit","return","approve","publish","schedule"]){const action={submit:"submit",return:"request_changes",approve:"approve",publish:"publish",schedule:"schedule"}[x];$(x).onclick=()=>run(()=>workflow(action))}
$("uploadImage").onclick=()=>run(upload);
$("jpSaveCaption").onclick=()=>run(saveInstagramCaption);
document.addEventListener("click",e=>{if(e.target?.id==="addChannelBtn")run(addChannel)});
document.addEventListener("input",e=>{
 if(!draft||tab!=="editor"||!editable())return;
 const t=e.target;
 if(["title","summary","category"].includes(t.id)){draft[t.id]=t.value;dirty=true;renderPreview()}
 else if(t.dataset.block!==undefined){
 const b=blocks[+t.dataset.block];if(b){b[t.dataset.prop]=t.value;dirty=true;renderPreview()}
 }
});
document.addEventListener("change",e=>{
 if(!draft||tab!=="editor"||!editable())return;
 const t=e.target;if(t.id==="authorSelect"){draft.author_id=t.value||null;dirty=true;renderPreview()}
 else if(t.id==="locale"){draft.locale=t.value;dirty=true;renderPreview()}
});
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});
(async()=>{
 const params=new URLSearchParams(location.hash.slice(1));
 if(params.has("access_token")){session={access_token:params.get("access_token"),refresh_token:params.get("refresh_token")};sessionStorage.setItem("journal_session",JSON.stringify(session));history.replaceState(null,"",location.pathname)}
 else{try{session=JSON.parse(sessionStorage.getItem("journal_session")||"null")}catch{}}
 if(session)run(initialize);
})();
