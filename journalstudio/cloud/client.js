"use strict";
const API_ROOT="https://npsfaymjckcqhtyiafms.supabase.co";
const PUBLIC_KEY="sb_publishable_-HPESNuXtfZQo-gLREwi2Q_1_aAoxee";
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const statuses={draft:"Черновик",in_review:"На проверке",changes_requested:"На доработке",approved:"Утверждена",scheduled:"Запланирована",published:"Опубликована",archived:"Архив"};
const roles={owner:"Владелец",chief_editor:"Главный редактор",editor:"Редактор",author:"Автор",reviewer:"Рецензент"};
const channels={nowgreen:"NowGreen",nowcook:"NowCook",nowwhat:"NowWhat",nowkids:"NowKids",website:"Сайт",wordpress:"WordPress",instagram:"Instagram"};
let session=null,projects=[],project=null,posts=[],authors=[],topics=[],current=null,draft=null,blocks=[],placements=[],deliveries=[],assets={},tab="home",dirty=false,toastTimer=null,flashError=false;
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
async function recoverPassword(){
 const email=$("email").value.trim();
 if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))throw Error("Введите email аккаунта, чтобы получить ссылку для установки пароля.");
 const redirect="https://mynw.app/journalstudio/cloud/";
 await auth("recover?redirect_to="+encodeURIComponent(redirect),"POST",{email});
 toast("Если аккаунт существует, на "+email+" придёт письмо для установки нового пароля.");
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
 // A Supabase email callback can provide valid tokens without a user object.
 // Author identity must be loaded before selecting their own profile.
 if(!session?.user?.id&&session?.access_token){
  try{
   const response=await fetch(API_ROOT+"/auth/v1/user",{
    headers:{"apikey":PUBLIC_KEY,"Authorization":"Bearer "+session.access_token},
    cache:"no-store"
   });
   if(response.ok){
    const user=await response.json();
    if(user?.id){
     session.user=user;
     sessionStorage.setItem("journal_session",JSON.stringify(session));
    }
   }
  }catch(error){console.warn("Journal Studio: user profile could not be loaded",String(error))}
 }
 if(!projects.length){$("gate").hidden=false;$("workspace").hidden=true;$("setupZone").hidden=false;toast("Аккаунт подтверждён. Доступ выдаётся главным редактором; при первом запуске нужен одноразовый ключ.");return}
 $("gate").hidden=true;$("workspace").hidden=false;$("setupZone").hidden=true;
 const currentProject=project?.slug, savedProject=sessionStorage.getItem('journal_active_project');
 project=projects.find(p=>p.slug===currentProject)||projects.find(p=>p.slug===savedProject)||projects[0];
 window.StudioTheme?.apply(project.slug);
 $("project").innerHTML=projects.map(p=>'<option value="'+esc(p.slug)+'">'+esc(p.name)+" · "+esc(roles[p.role]||p.role)+"</option>").join("");
 $("project").value=project.slug;
 $("avatar").textContent=(session.user?.email||"JS").slice(0,2).toUpperCase();
 $("userDisplay").textContent=session.user?.email||roles[project.role]||"Редактор";
 $("invite").hidden=!editorRole();
 $("authorsInvite").hidden=!chiefRole();
 await loadData();showTab("home",true);
}
async function claimOwner(){
 const key=$("setup").value;if(!key)throw Error("Введите ключ активации");
 await call("/bootstrap","POST",{setup_key:key});$("setup").value="";await initialize();toast("Главный редактор активирован");
}
async function fetchAllPosts(slug){
 // The API returns at most 100 records per page. Keep the entire catalog
 // available as the journal grows, without relying on a single truncated page.
 const all=[];
 for(let offset=0;offset<=10000;offset+=100){
  const result=await call("/posts?project="+encodeURIComponent(slug)+"&offset="+offset);
  const batch=Array.isArray(result.posts)?result.posts:[];
  all.push(...batch);
  if(batch.length<100)return all;
 }
 throw Error("Слишком много материалов для одной загрузки. Свяжитесь с редактором.");
}
async function loadData(){
 const slug=project.slug;
 const result=await Promise.all([fetchAllPosts(slug),call("/authors?project="+encodeURIComponent(slug)),call("/topics?project="+encodeURIComponent(slug))]);
 if(project?.slug!==slug)return;
 posts=result[0];authors=result[1].authors||[];topics=result[2].topics||[];
 window.StudioTopics?.render?.();
}
// Native confirm()/prompt() dialogs can be suppressed by mobile browsers,
// extensions and embedded WebViews. Editorial actions use this visible,
// accessible, single-use confirmation with explicit human approval instead.
let editorialDialogActive=false;
function editorialDecision({title,message,confirmLabel="Подтвердить",kind="confirm",exactTitle=null,initialValue=""}){
 if(editorialDialogActive)throw Error("Завершите предыдущее подтверждение редакционного действия.");
 const overlay=$("studioEditorActionOverlay");
 if(!overlay)throw Error("Панель подтверждения не загружена. Обновите страницу Ctrl+F5.");
 const yes=$("studioEditorActionYes"),no=$("studioEditorActionNo"),close=$("studioEditorActionClose");
 const input=$("studioEditorActionInput"),note=$("studioEditorActionNote"),label=$("studioEditorActionInputLabel");
 const error=$("studioEditorActionError");
 $("studioEditorActionTitle").textContent=title;
 $("studioEditorActionText").textContent=message;
 yes.textContent=confirmLabel;
 input.hidden=!["title","datetime","email","consent"].includes(kind);
 note.hidden=kind!=="note";
 label.hidden=input.hidden;
 input.type=kind==="datetime"?"datetime-local":kind==="email"?"email":"text";
 input.maxLength=kind==="consent"?350:kind==="email"?250:524288;
 input.placeholder=kind==="consent"?"Ссылка на согласие или номер договора":"";
 label.textContent=kind==="consent"?"Документальное основание согласия автора":kind==="datetime"?"Дата и время публикации":kind==="email"?"Email нового автора":"Для подтверждения введите полное название статьи";
 input.value=kind==="title"?"":initialValue;
 note.value="";
 note.placeholder="Обязательный комментарий автору";
 error.hidden=true;error.textContent="";
 const validate=()=>{
  const valid=kind==="title"?input.value===exactTitle:
    kind==="note"?!!note.value.trim():
    kind==="email"?/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.value.trim())&&input.value.trim().length<=250:
    kind==="consent"?!!input.value.trim()&&input.value.trim().length<=350:
    kind==="datetime"?!!input.value&&Number.isFinite(+new Date(input.value)):true;
  yes.disabled=!valid;
  return valid;
 };
 validate();
 const focusBefore=document.activeElement;
 overlay.hidden=false;
 editorialDialogActive=true;
 return new Promise(resolve=>{
  let settled=false;
  const finish=value=>{
   if(settled)return;
   settled=true;
   overlay.hidden=true;editorialDialogActive=false;
   yes.onclick=null;no.onclick=null;close.onclick=null;
   input.oninput=null;note.oninput=null;
   overlay.onclick=null;
   document.removeEventListener("keydown",onKey);
   try{focusBefore?.focus?.({preventScroll:true})}catch{}
   resolve(value);
  };
  const onKey=e=>{
   if(e.key==="Escape"){e.preventDefault();finish(null)}
   if(e.key==="Enter"&&["title","email"].includes(kind)&&document.activeElement===input&&validate()){
    e.preventDefault();finish(input.value);
   }
  };
  yes.onclick=()=>{
   if(!validate())return;
   if(kind==="title")finish(input.value);
   else if(kind==="email"||kind==="consent")finish(input.value.trim());
   else if(kind==="note")finish(note.value.trim());
   else if(kind==="datetime")finish(new Date(input.value).toISOString());
   else finish(true);
  };
  no.onclick=close.onclick=()=>finish(null);
  input.oninput=note.oninput=validate;
  overlay.onclick=e=>{if(e.target===overlay)finish(null)};
  document.addEventListener("keydown",onKey);
  if(!input.hidden)input.focus({preventScroll:true});
  else if(!note.hidden)note.focus({preventScroll:true});
  else yes.focus({preventScroll:true});
 });
}
function statusTag(s){return '<span class="chip '+(["in_review","scheduled"].includes(s)?"amber":s==="published"?"":"gray")+'">'+esc(statuses[s]||s)+'</span>'}
function canManagePost(p){return !!p&&chiefRole()&&p.status!=='archived'}
function canEditSubmittedPhotos(p){return !!p&&p.status==='in_review'&&editorRole()}
function canDeletePost(p){
 if(!p||!project)return false;
 if(chiefRole())return true;
 return ["author","editor"].includes(project.role) &&
   ["draft","changes_requested"].includes(p.status) &&
   p.owner_user_id===session?.user?.id;
}
function listEntry(p){
 const id=esc(p.id),man=canManagePost(p);
 return '<div class="listItem"><div><strong>'+esc(p.title||"Без названия")+'</strong><div class="muted">'+
 esc(p.locale)+' · '+esc(p.updated_at?.slice(0,10)||'')+' · версия '+Number(p.revision||1)+
 '</div></div><div class="btns">'+statusTag(p.status)+
 (p.is_hidden?'<span class="chip amber">Скрыта</span>':'')+
 '<button type="button" data-open-post="'+id+'">Открыть ↗</button>'+
 (man?'<button type="button" data-article-topic="'+id+'">Тема журнала</button><button type="button" data-edit-post="'+id+'">Изменить</button><button type="button" data-article-translations="'+id+'">Переводы (8)</button>'+
 '<button type="button" data-toggle-post-hidden="'+id+'">'+(p.is_hidden?'Показать':'Скрыть')+'</button>':'')+
 (canEditSubmittedPhotos(p)&&!man?'<button type="button" data-edit-post="'+id+'">Редактировать фото</button>':'')+
 (canDeletePost(p)?'<button type="button" data-delete-post="'+id+'">Удалить</button>':'')+'</div></div>'
}

function authorMini(a){
 const portrait=window.StudioProfiles?.photo?.(a.photo_asset_id);
 const face=portrait?'<img src="'+esc(portrait)+'" alt="Фото '+esc(a.name||"Автора")+'">':esc((a.name||"A").slice(0,1));
 return '<div class="authorCard"><span class="authorAvatar" data-author-face="'+esc(a.id)+'">'+face+'</span><div style="min-width:0;flex:1"><strong>'+esc(a.name)+'</strong><div class="muted small">'+(a.kind==="ai"?"ИИ-персонаж":"Приглашённый автор")+(a.kind==="partner"?" · "+esc(a.consent_status):"")+'</div></div><span class="chip">'+(a.kind==="ai"?"AI":"Автор")+'</span></div>';
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
 const slug=project.slug;
 const [ps,au,t]=await Promise.all([fetchAllPosts(slug),call("/authors?project="+encodeURIComponent(slug)),call("/topics?project="+encodeURIComponent(slug))]);
 if(project?.slug!==slug)return;
 posts=ps;authors=au.authors||[];topics=t.topics||[];renderDashboard();renderLibrary();renderAuthors();window.StudioTopics?.render?.();
}
function paintPublication(){
 const ready=posts.filter(p=>["approved","scheduled","published"].includes(p.status));
 $("readyPosts").innerHTML=ready.length?ready.map(p=>'<div class="listItem"><div><b>'+esc(p.title)+'</b><div class="muted">'+esc(statuses[p.status])+(p.is_hidden?' · Скрыта':'')+'</div></div><div class="btns"><button type="button" data-delivery="'+esc(p.id)+'">Проверить</button>'+
 (canManagePost(p)?'<button type="button" data-article-topic="'+esc(p.id)+'">Тема журнала</button><button type="button" data-edit-post="'+esc(p.id)+'">Изменить</button><button type="button" data-article-translations="'+esc(p.id)+'">Переводы (8)</button><button type="button" data-toggle-post-hidden="'+esc(p.id)+'">'+(p.is_hidden?'Показать':'Скрыть')+'</button>':'')+
 (canDeletePost(p)?'<button type="button" data-delete-post="'+esc(p.id)+'">Удалить</button>':'')+'</div></div>').join(""):'<div class="empty"><span class="emptyIcon">↗</span><b>Готовых материалов пока нет</b><p>Утверждённые статьи появятся здесь.</p></div>';
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
 current=null;draft={title:"",summary:"",locale:project.default_locale||"ru",category:"",topic_id:null,blocks:[],author_id:project?.role==="author"?(authors.find(a=>a.kind==="partner"&&a.owner_user_id===session?.user?.id)?.id||null):null,cover_path:null,template_id:"editorial"};
 blocks=draft.blocks;assets={};placements=[];dirty=false;
}
async function createPost(){
 if(project?.role==="author"&&!authors.some(a=>a.kind==="partner"&&a.owner_user_id===session?.user?.id)){
  await showTab("authors",true);
  toast("Сначала создайте свой профиль автора, а затем первую статью.");
  return;
 }
 resetDraft();await showTab("editor",true);
}
async function toggleArticleHidden(id){
 const p=posts.find(item=>item.id===id);
 if(!canManagePost(p))throw Error("Только главный редактор может скрывать материалы.");
 const hide=!p.is_hidden;
 if(hide){
   const ok=await editorialDecision({
    title:"Скрыть статью",
    message:"«"+p.title+"»\n\nСтатья перестанет отображаться в приложении на всех языках. Текст, переводы и фотографии сохранятся; её можно будет показать снова.",
    confirmLabel:"Скрыть во всех языках"
   });
   if(!ok)return;
  }
 const result=await call("/posts/"+encodeURIComponent(id)+"/visibility","PATCH",{
   expected_revision:p.revision,is_hidden:hide
 });
 if(result.post?.id!==id)throw Error("Сервер не подтвердил изменение.");
 if(current?.id===id){current=result.post;draft=structuredClone(current);blocks=draft.blocks||[];dirty=false;}
 await refreshPosts();
 if(tab==="editor")renderEditor();
 if(tab==="publish")paintPublication();
 toast(hide?"Статья скрыта в журнале.":"Статья снова отображается, если опубликована.");
}
async function editArticle(id){
 const p=posts.find(item=>item.id===id);
 if(!p)throw Error("Обновите список статей.");
 if(p.status==="in_review"&&editorRole()){
   const ok=await editorialDecision({
     title:"Редактировать фотографии присланной статьи",
     message:"«"+p.title+"»\n\nМатериал будет переведён в режим редакторской правки. Оригинальные фотографии останутся в медиатеке. После сохранения необходимо повторное согласование.",
     confirmLabel:"Редактировать фотографии"
   });
   if(!ok)return;
   const result=await call("/posts/"+encodeURIComponent(id)+"/action","POST",{
     action:"request_changes",expected_revision:p.revision,
     note:"Редакторская корректировка фотографий и расположения иллюстраций."
   });
   if(result.post?.id!==id||result.post.status!=="changes_requested")
     throw Error("Не удалось открыть статью для редакторской правки.");
   await refreshPosts();
 }else if(["published","approved","scheduled"].includes(p.status)){
   if(!canManagePost(p))throw Error("Изменение опубликованного текста доступно главному редактору.");
   const ok=await editorialDecision({
     title:"Открыть для редактирования",
     message:"«"+p.title+"»\n\nМатериал будет снят с публикации и возвращён на доработку. Все фотографии, переводы и предыдущие редакции сохранятся. Для публикации изменённой статьи потребуется повторное согласование.",
     confirmLabel:"Вернуть на доработку"
    });
    if(!ok)return;
   const result=await call("/posts/"+encodeURIComponent(id)+"/reopen","PATCH",{
     expected_revision:p.revision
   });
   if(result.post?.id!==id)throw Error("Не удалось открыть статью для редактирования.");
   await refreshPosts();
 }
 await openPost(id);
 toast("Внесите изменения, сохраните статью и отправьте её на повторное согласование.");
}
async function openArticleTopic(id){
 const post=posts.find(x=>x.id===id);
 if(!post)throw Error("Обновите список статей");
 await openPost(id);
 $("topicSelect").scrollIntoView({behavior:"smooth",block:"center"});
 toast(["approved","scheduled","published"].includes(post.status)
  ?"Выберите тему и нажмите «Перенести в выбранную тему». Публикация и переводы сохранятся."
  :"Выберите тему и нажмите «Сохранить».");
}
async function openArticleTranslations(id){
 await openPost(id);
 document.getElementById("translationList")?.scrollIntoView({behavior:"smooth",block:"center"});
 toast("Переводы можно дополнить без изменения оригинала и снятия статьи с публикации.");
}
async function deletePost(id){
 const article=posts.find(p=>p.id===id);
 if(!article)throw Error("Статья не найдена в текущем проекте. Обновите материалы.");
 if(!canDeletePost(article))throw Error("Недостаточно прав на удаление статьи.");
 const warning=article.status==="published"?
   "Опубликованная статья будет снята с публикации и перестанет открываться в приложении. Сохранённые фотографии останутся в медиатеке.":
   "Статья будет отправлена в архив и убрана из списка. Общие фотографии и медиатека сохранятся.";
 const pendingDirty=dirty&&current?.id===id?
   "\n\nЕсть несохранённые изменения: они не попадут в архив.":"";
 const confirmation=await editorialDecision({
   title:"Удалить статью",
   message:"«"+article.title+"»\n\n"+warning+pendingDirty+"\n\nПодтвердите удаление. Материал будет архивирован и скрыт из журнала.",
   confirmLabel:"Да, удалить"
 });
 if(!confirmation)return;
 const result=await call("/posts/"+encodeURIComponent(id),"DELETE",{
   expected_revision:article.revision,confirm_title:article.title
 });
 if(!result.ok||result.deleted_id!==id)throw Error("Сервер не подтвердил удаление.");
 if(current?.id===id){resetDraft();await showTab("library",true);}
 await refreshPosts();
 if(tab==="publish")paintPublication();
 toast("Статья удалена из редакции и снята с публикации в приложении.");
}
async function openPost(id){
 const x=(await call("/posts/"+encodeURIComponent(id))).post;
 current=x;draft=structuredClone(x);blocks=draft.blocks||[];assets={};dirty=false;
 placements=(await call("/placements?post_id="+encodeURIComponent(id))).placements||[];
 await showTab("editor",true);
 await fetchMedia();
}
function groupNumberAt(index){
 let number=0,hasHeading=false;
 for(let k=0;k<=index;k++){
  const t=blocks[k]?.type;
  if(t==="heading"){number++;hasHeading=true}
  else if(t==="text"&&!hasHeading){number++}
 }
 return Math.max(1,number);
}
function blockHtml(b,i,edit){
 let inner="";
 if(b.type==="link"){inner='<label>Текст ссылки</label><input data-block="'+i+'" data-prop="label" value="'+esc(b.label||"")+'"><label>URL</label><input data-block="'+i+'" data-prop="url" value="'+esc(b.url||"")+'" placeholder="https://...">';}
 else if(b.type==="image"){const url=assets[b.asset_id]||"";inner=url?'<img data-media-id="'+esc(b.asset_id)+'" alt="'+esc(b.alt||"")+'" src="'+esc(url)+'" style="max-width:100%;max-height:200px;border-radius:10px;margin-bottom:10px">':'<p class="muted small">Загруженное изображение</p>';inner+='<div class="studio-media-size" data-optimized-id="'+esc(b.asset_id)+'">'+esc(window.StudioOptimizer?.label?.(b.asset_id)||"Оптимизация изображений") +'</div>';
 inner+='<label>Подпись к фото</label><input data-block="'+i+'" data-prop="caption" value="'+esc(b.caption||"")+'"><label>Альтернативный текст (для доступности)</label><input data-block="'+i+'" data-prop="alt" value="'+esc(b.alt||"")+'">'+(edit?'<button type="button" class="jp-cover-select '+(draft?.cover_path===b.asset_id?'active':'')+'" data-block-cover="'+i+'">'+(draft?.cover_path===b.asset_id?'✓ Выбрана обложкой':'○ Сделать обложкой')+'</button>':'');}
 else inner='<textarea data-block="'+i+'" data-prop="text" rows="'+(b.type==="text"?5:2)+'" placeholder="Введите текст">'+esc(b.text||"")+'</textarea>';
 return '<div class="block"><div class="row"><strong>'+(["heading","text"].includes(b.type)?'<span class="studio-group-index">'+esc(window.StudioI18n?.t?.("Группа")||"Группа")+' '+groupNumberAt(i)+' · </span>':'')+esc(window.StudioI18n?.t?.(({text:"Текст",heading:"Заголовок",quote:"Цитата",image:"Фотография",link:"Ссылка"}[b.type]||"Блок"))||({text:"Текст",heading:"Заголовок",quote:"Цитата",image:"Фотография",link:"Ссылка"}[b.type]||"Блок"))+'</strong>'+(edit?'<div class="btns"><button data-block-up="'+i+'">↑</button><button data-block-down="'+i+'">↓</button><button data-block-remove="'+i+'">Удалить</button></div>':"")+'</div>'+inner+'</div>';
}
function capture(){
 if(!draft)return;
 for(const key of ["title","summary","locale","category"]){const el=$(key);if(el)draft[key]=el.value}
 draft.topic_id=$("topicSelect")?.value||null;
 draft.author_id=$("authorSelect").value||null;
 document.querySelectorAll("[data-block]").forEach(el=>{const b=blocks[+el.dataset.block];if(b)b[el.dataset.prop]=el.value});
}
function renderCoverIndicator(edit){
 const el=$("studioCoverIndicator");if(!el)return;
 const coverId=draft?.cover_path||null;
 const label=window.StudioI18n?.t?.("Обложка")||"Обложка";
 if(!coverId){el.innerHTML='<span class="studio-cover-title">'+esc(label)+'</span><span class="studio-cover-note"> · —</span>';return}
 const src=assets[coverId]||"";
 const image=src?'<img data-media-id="'+esc(coverId)+'" src="'+esc(src)+'" alt="'+esc(label)+'">':'<span class="studio-cover-note">'+esc(window.StudioI18n?.t?.("Изображение загружается…")||"Изображение загружается…")+'</span>';
 el.innerHTML='<div class="row" style="gap:10px;align-items:center">'+image+
 '<div style="flex:1"><div class="studio-cover-title">'+esc(label)+'</div>'+
 '<div class="studio-cover-note">'+esc(window.StudioI18n?.t?.("В медиатеке")||"В медиатеке")+'</div></div>'+
 (edit?'<button type="button" data-cover-clear="1">'+esc(window.StudioI18n?.t?.("Удалить")||"Удалить")+' '+esc(label)+'</button>':'')+
 '</div>';
}
function renderEditor(){
 $("editor").hidden=!draft;$("emptyEditor").hidden=!!draft;if(!draft)return;
 const edit=editable();$("workTitle").textContent=current?.title||"Новый материал";
 $("statusLine").innerHTML=statusTag(current?.status||"draft")+" · "+(current?"Версия "+current.revision:"Материал ещё не сохранён");
 for(const k of ["title","summary","locale","category"]){$(k).value=draft[k]||"";$(k).disabled=!edit}
 const topicChoices=topics.filter(t=>t.is_active||t.id===draft.topic_id);
 $("topicSelect").innerHTML='<option value="">Без темы</option>'+topicChoices.map(t=>'<option value="'+esc(t.id)+'">'+esc(t.title)+(t.is_active?"":" · скрыта")+'</option>').join("");
 $("topicSelect").value=draft.topic_id||"";
 const canReassign=!!current&&["approved","scheduled","published"].includes(current.status)&&chiefRole();
 $("topicSelect").disabled=!(edit||canReassign);
 $("publishedTopicSave").hidden=!canReassign;
 $("publishedTopicSave").disabled=canReassign&&((draft.topic_id||null)===(current.topic_id||null));
 $("topicHelp").textContent=canReassign
  ?"Выберите тему и нажмите «Перенести в выбранную тему». Опубликованная статья и все переводы сохранятся."
  :edit?"Выберите тему и нажмите «Сохранить». Создать новую тему можно в разделе «Материалы»."
  :"Назначение темы опубликованной статье доступно главному редактору.";
 const ownAuthor=project?.role==="author"?authors.find(a=>a.kind==="partner"&&a.owner_user_id===session?.user?.id):null;
 if(project?.role==="author"){
  $("authorSelect").innerHTML=ownAuthor?'<option value="'+esc(ownAuthor.id)+'">'+esc(ownAuthor.name)+'</option>':'<option value="">Сначала создайте профиль</option>';
  if(ownAuthor&&draft.author_id!==ownAuthor.id)draft.author_id=ownAuthor.id;
  $("authorSelect").value=ownAuthor?.id||"";
  $("authorSelect").disabled=true;
 }else{
  $("authorSelect").innerHTML='<option value="">Редакция</option>'+authors.map(a=>'<option value="'+esc(a.id)+'">'+esc(a.name)+(a.kind==="ai"?" · ИИ":"")+'</option>').join("");
  $("authorSelect").value=draft.author_id||"";$("authorSelect").disabled=!edit;
 }
 $("blocks").innerHTML=blocks.map((b,i)=>blockHtml(b,i,edit)).join("")||'<div class="empty">Добавьте первый текстовый блок, заголовок или фотографию.</div>';
 renderCoverIndicator(edit);
 $("editTools").hidden=!edit;
 const s=current?.status||"draft";
 $("save").hidden=!edit;$("submit").hidden=!current||!edit;
 $("deletePost").hidden=!current||!canDeletePost(current);
 $("hidePost").hidden=!current||!canManagePost(current);
 $("hidePost").textContent=current?.is_hidden?"Показать статью":"Скрыть статью";
 $("editPublishedPost").hidden=!current||!(
  canEditSubmittedPhotos(current)||
  (canManagePost(current)&&["published","approved","scheduled"].includes(current.status)));
 $("editPublishedPost").textContent=current?.status==="in_review"?"✎ Редактировать фотографии":"Изменить содержание";
 $("return").hidden=!current||s!=="in_review"||!editorRole();
 $("approve").hidden=!current||s!=="in_review"||!chiefRole();
 $("publish").hidden=!current||s!=="approved"||!chiefRole();
 $("schedule").hidden=!current||s!=="approved"||!chiefRole();
 renderPreview();renderEditorChannels();
}
function renderPreview(){
 if(!draft)return;
 if(window.JournalPreview && typeof window.JournalPreview.render==="function"){
   window.JournalPreview.render({draft,blocks,assets,authors,viewerRole:project?.role||"",projectName:project?.name||"NowGreen",postId:current?.id||null,postKey:current?.id||draft,canEdit:editable(),instagramCaption:draft?.caption||placements.find(p=>p.channel==="instagram"&&p.locale===draft.locale)?.settings?.caption||""});
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
 if(project?.role==="author"){
  const own=authors.find(a=>a.kind==="partner"&&a.owner_user_id===session?.user?.id);
  if(!own)throw Error("Сначала создайте свой профиль автора.");
  draft.author_id=own.id;
 }
 const data={title:draft.title.trim(),summary:draft.summary,locale:draft.locale,category:draft.category,topic_id:draft.topic_id||null,blocks,cover_path:draft.cover_path||null,template_id:draft.template_id||"editorial"};
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
 if(action==="request_changes"){
  const note=await editorialDecision({
   title:"Вернуть статью на доработку",
   message:"Укажите, что автор должен исправить. Комментарий сохранится в истории редакционного процесса.",
   confirmLabel:"Вернуть с комментарием",kind:"note"
  });
  if(note===null)return;
  if(!note)throw Error("Укажите причину возврата на доработку");
  payload.note=note;
 }
 if(action==="schedule"){
  const tomorrow=new Date(Date.now()+86400000);
  const local=new Date(tomorrow.getTime()-tomorrow.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const value=await editorialDecision({
   title:"Запланировать публикацию",
   message:"Выберите дату и время в часовом поясе вашего устройства. Материал будет опубликован только при соблюдении условий редакционного процесса.",
   confirmLabel:"Запланировать",kind:"datetime",initialValue:local
  });
  if(value===null)return;
  payload.scheduled_at=value;
 }
 if(action==="publish"){
  const ok=await editorialDecision({
   title:"Опубликовать статью",
   message:"«"+current.title+"»\n\nСтатья станет доступна читателям в выбранных каналах. Проверьте, что текст, фотографии, права и переводы утверждены.",
   confirmLabel:"Опубликовать"
  });
  if(!ok)return;
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
 if(operation==="remove"){blocks.splice(index,1);/* Text blocks are independent of the cover. Never alter draft.cover_path here. */}
 else{const to=index+(operation==="up"?-1:1);if(to<0||to>=blocks.length)return;[blocks[index],blocks[to]]=[blocks[to],blocks[index]]}
 dirty=true;renderEditor();
}
let imageUploadPending=false;
const imageUploadMessage=(message,error=false)=>{
 const area=$("imageUploadStatus");
 if(area){area.textContent=message;area.dataset.error=error?"true":"false";}
};
async function upload(){
 if(imageUploadPending)return;
 const input=$("file"),f=input.files?.[0];
 if(!f){
  imageUploadMessage("Сначала выберите фотографию в открывшемся окне. Затем подтвердите права и нажмите «Загрузить фото».");
  input.scrollIntoView({behavior:"smooth",block:"center"});input.click();return;
 }
 const fail=message=>{imageUploadMessage(message,true);throw Error(message)};
 if(!draft||!editable())fail("Статья недоступна для изменений. Для присланного материала выберите «Редактировать фотографии» и подтвердите переход к правке.");
 if(!["image/jpeg","image/png","image/webp"].includes(f.type)||f.size>8*1024*1024)
  fail("Нужен JPG, PNG или WebP размером до 8 МБ.");
 if(!$("imageRights").checked)
  fail("Подтвердите права на использование фото, поставив галочку под формой.");
 const copyright=$("imageCopyright").value.trim();
 if(!copyright)fail("Введите имя фотографа или правообладателя.");
 const license=$("imageLicense").value;
 const alt=$("imageAlt").value.trim()||f.name;
 if(!window.StudioOptimizer)fail("Не загрузился модуль подготовки фото. Обновите страницу Ctrl+F5.");
 const destination=$("uploadPlacement").value;
 if(!["library","cover","inline"].includes(destination))fail("Укажите место размещения фото.");
 const sourceUrl=$("imageSourceUrl").value.trim();
 if(sourceUrl&&!/^https:\/\//i.test(sourceUrl))fail("Ссылка на источник должна начинаться с https://");
 const sourceProject=project.slug,sourcePost=current?.id||null;
 const sourceRevision=current?.revision??null;
 imageUploadPending=true;$("uploadImage").disabled=true;
 $("uploadImage").textContent="⌛ Загрузка фотографии…";
 imageUploadMessage("Подготавливаем изображение и загружаем его в медиатеку. Не нажимайте повторно.");
 try{
  const renditions=await window.StudioOptimizer.renderVersions(f);
  const base64=await new Promise((ok,no)=>{
   const reader=new FileReader();
   reader.onload=()=>ok(String(reader.result).split(",")[1]);
   reader.onerror=()=>no(Error("Не удалось прочитать выбранный файл."));
   reader.readAsDataURL(f);
  });
  const r=await call("/media","POST",{
   project:sourceProject,mime:f.type,base64,alt_text:alt,
   copyright_holder:copyright,license,source_url:sourceUrl,rights_confirmed:true
  });
  if(!r?.asset?.id)throw Error("Сервер не подтвердил сохранение фотографии.");
  try{await window.StudioOptimizer.fromPrepared(r.asset.id,renditions,f.size)}
  catch(e){imageUploadMessage("Фото загружено, но оптимизация WebP требует повторной проверки: "+e.message,true)}
  if(project?.slug!==sourceProject||current?.id!==sourcePost||
    (sourcePost&&current?.revision!==sourceRevision)||!editable())
   throw Error("Фото сохранено в медиатеке, но статья изменилась. Откройте статью заново и выберите фото в медиатеке.");
  let inserted=false;
  const replacementIndex=window.StudioPhotoTools?.activeReplacementIndex?.();
  if(replacementIndex!==null&&replacementIndex!==undefined){
   await window.StudioPhotoTools.applyReplacement(r.asset.id,{id:r.asset.id,available:true,alt});
   inserted=true;
  }else{
   capture();
   if(destination==="cover"){draft.cover_path=r.asset.id;inserted=true;}
   if(destination==="inline"){
    blocks.push({type:"image",asset_id:r.asset.id,caption:"",alt,crop:{x:50,y:50,zoom:100,aspect:"auto"}});
    draft.blocks=blocks;inserted=true;
   }
   if(inserted)dirty=true;
   try{const media=await call("/media/"+encodeURIComponent(r.asset.id));assets[r.asset.id]=media.url}catch{}
   renderEditor();
  }
  input.value="";$("imageAlt").value="";$("imageSourceUrl").value="";$("imageRights").checked=false;
  imageUploadMessage(inserted?"Фото добавлено в редактируемую статью. Нажмите «Сохранить».":"Фото сохранено в медиатеке. Его можно вставить в текст или установить обложкой.");
  try{if(window.StudioImages?.showLibrary)await window.StudioImages.showLibrary("all")}
  catch(e){console.warn("Journal Studio media refresh deferred",String(e))}
  toast(inserted?"Фото готово. Проверьте положение и сохраните статью.":"Фотография загружена в медиатеку.");
 }catch(e){
  imageUploadMessage("Не удалось завершить загрузку: "+e.message,true);throw e;
 }finally{
  imageUploadPending=false;
  $("uploadImage").disabled=false;
  $("uploadImage").textContent="↑ Загрузить фото";
 }
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
// Profile creation and email invitation are two independent workflows.
async function newAuthorProfile(){
 if(!editorRole())throw Error("Создание профиля доступно редакции");
 if(dirty){
  const ok=await editorialDecision({
   title:"Открыть создание автора",
   message:"В текущей статье есть несохранённые изменения. Перейти в раздел авторов без их сохранения?",
   confirmLabel:"Открыть авторов"
  });
  if(!ok)return;
 }
 await showTab("authors",true);
 window.StudioProfiles?.reset?.();
 $("authorKind").value="partner";
 $("authorFormTitle").scrollIntoView({behavior:"smooth",block:"center"});
 $("authorName").focus();
 toast("Заполните профиль и нажмите «Добавить автора». Email-приглашение оформляется отдельно.");
}
let invitationPending=false;
async function invite(){
 if(!chiefRole())throw Error("Приглашать авторов может только главный редактор");
 if(invitationPending)return;
 const sourceProject=project.slug;
 const email=await editorialDecision({
  title:"Пригласить автора",
  message:"Введите email нового автора Journal Studio для проекта «"+project.name+"». Подтверждение отправит приглашение и предоставит доступ автора к выбранному проекту.",
  confirmLabel:"Отправить приглашение",kind:"email"
 });
 if(email===null)return;
 if(project?.slug!==sourceProject)throw Error("Проект изменился. Откройте приглашение заново.");
 invitationPending=true;
 $("authorsInvite").disabled=true;$("invite").disabled=true;
 try{
  const result=await call("/invite","POST",{project:sourceProject,email,role:"author"});
  if(result?.invited!==true)throw Error("Сервер не подтвердил отправку приглашения.");
  try{await window.StudioMemberAdmin?.refresh?.()}catch(error){console.warn("Не удалось обновить список приглашений:",error)}
  toast(result.mode==="existing_account"
   ?"На "+email+" отправлена новая ссылка для установки пароля и возвращения доступа к журналу."
   :"Приглашение отправлено на "+email+". Автор получит доступ после принятия приглашения.");
 }finally{
  invitationPending=false;
  $("authorsInvite").disabled=false;$("invite").disabled=false;
 }
}
async function saveAuthor(){
 const name=$("authorName").value.trim();if(!name)throw Error("Введите имя");
 const kind=$("authorKind").value;
 await call("/authors","POST",{project:project.slug,name,bio:$("authorBio").value,kind,social_url:$("authorSocial").value.trim()});
 $("authorName").value="";$("authorBio").value="";$("authorSocial").value="";
 await refreshPosts();toast("Профиль автора создан");
}
let authorApprovalPending=false;
async function approveAuthor(id){
 if(authorApprovalPending)return;
 if(!chiefRole())throw Error("Подтверждение согласия доступно только главному редактору");
 const author=authors.find(a=>a.id===id&&a.kind==="partner");
 if(!author)throw Error("Автор не найден. Обновите список авторов.");
 if(author.consent_status==="approved"){toast("Согласие этого автора уже подтверждено.");return}
 const sourceProject=project.slug;
 authorApprovalPending=true;
 try{
  const ref=await editorialDecision({
   title:"Подтвердить согласие автора",
   message:"Автор: "+author.name+"\n\nУкажите ссылку на документальное согласие автора или номер договора, подтверждающий право редакции публиковать его материалы. Без основания подтвердить согласие нельзя.",
   confirmLabel:"✓ Подтвердить согласие",
   kind:"consent"
  });
  if(ref===null)return;
  if(project?.slug!==sourceProject)throw Error("Проект изменился. Откройте автора заново.");
  const result=await call("/authors/"+encodeURIComponent(id)+"/approve","POST",{consent_ref:ref});
  if(result?.author?.consent_status!=="approved")throw Error("Сервер не подтвердил согласие автора.");
  await refreshPosts();
  toast("Согласие автора подтверждено. Публикация его материалов разрешена.");
 }finally{authorApprovalPending=false}
}
async function changeProject(slug){
 if(dirty&&!confirm("Несохранённые изменения будут потеряны. Продолжить?")){$("project").value=project.slug;return}
 const target=projects.find(p=>p.slug===slug);if(!target)return;
 project=target;window.StudioTheme?.apply(project.slug);sessionStorage.setItem('journal_active_project',project.slug);
 current=null;draft=null;placements=[];assets={};dirty=false;
 $("invite").hidden=!editorRole();$("authorsInvite").hidden=!chiefRole();
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
 if(b.dataset.editPost)return void run(()=>editArticle(b.dataset.editPost));
 if(b.dataset.articleTopic)return void run(()=>openArticleTopic(b.dataset.articleTopic));
 if(b.dataset.articleTranslations)return void run(()=>openArticleTranslations(b.dataset.articleTranslations));
 if(b.dataset.togglePostHidden)return void run(()=>toggleArticleHidden(b.dataset.togglePostHidden));
 if(b.dataset.deletePost)return void run(()=>deletePost(b.dataset.deletePost));
 if(b.dataset.delivery)return void run(()=>viewDelivery(b.dataset.delivery));
 if(b.dataset.authorApprove)return void run(()=>approveAuthor(b.dataset.authorApprove));
 if(b.dataset.add)return void run(async()=>addBlock(b.dataset.add));
 if(b.dataset.coverClear!==undefined)return void run(async()=>{if(!editable())return;capture();draft.cover_path=null;dirty=true;renderEditor();toast("Обложка снята. Фото внутри статьи и в медиатеке сохранено.");});
 if(b.dataset.blockCover!==undefined)return void run(async()=>{const item=blocks[+b.dataset.blockCover];if(!item||item.type!=="image")return;capture();draft.cover_path=item.asset_id;dirty=true;renderEditor();toast("Обложка выбрана. Сохраните изменения.");});
 if(b.dataset.blockRemove!==undefined)return void run(async()=>modifyBlock(+b.dataset.blockRemove,"remove"));
 if(b.dataset.blockUp!==undefined)return void run(async()=>modifyBlock(+b.dataset.blockUp,"up"));
 if(b.dataset.blockDown!==undefined)return void run(async()=>modifyBlock(+b.dataset.blockDown,"down"));
});
for(const id of ["create","heroCreate","libraryCreate","editorCreate"])$(id).onclick=()=>run(createPost);
$("invite").onclick=()=>run(newAuthorProfile);
$("authorsInvite").onclick=()=>run(invite);
$("saveAuthor").onclick=()=>run(saveAuthor);
$("project").onchange=e=>run(()=>changeProject(e.target.value));
$("login").onclick=()=>run(login);$("register").onclick=()=>run(signup);$("recoverPassword").onclick=()=>run(recoverPassword);$("activate").onclick=()=>run(claimOwner);
$("logout").onclick=signout;
$("backLibrary").onclick=()=>run(()=>showTab("library"));
$("save").onclick=()=>run(savePost);
$("deletePost").onclick=()=>run(()=>current&&deletePost(current.id));
$("hidePost").onclick=()=>run(()=>current&&toggleArticleHidden(current.id));
$("editPublishedPost").onclick=()=>run(()=>current&&editArticle(current.id));
$("publishedTopicSave").onclick=()=>run(async()=>{
 if(!current||!chiefRole()||!["approved","scheduled","published"].includes(current.status))throw Error("Недоступно для данной статьи");
 const id=$("topicSelect").value||null;
 if(id===(current.topic_id||null)){toast("Статья уже в выбранной теме.");return}
 $("publishedTopicSave").disabled=true;
 try{
  const result=await call("/posts/"+encodeURIComponent(current.id)+"/topic","PATCH",{
   topic_id:id,expected_revision:current.revision
  });
  if(!result.post||result.post.topic_id!==id)throw Error("Сервер не подтвердил смену темы");
  current=result.post;draft.topic_id=id;
  await refreshPosts();renderEditor();
  toast("Статья перенесена в тему: "+(topics.find(t=>t.id===id)?.title||"Без темы")+". Текст и переводы сохранены.");
 }catch(e){$("publishedTopicSave").disabled=false;throw e}
});
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
 if(!draft||tab!=="editor")return;
 const t=e.target;
 // A published story's topic may be reclassified without reopening or
 // editing its approved text; the normal editable() guard must not block it.
 if(t.id==="topicSelect"&&!editable()){
  draft.topic_id=t.value||null;
  if(current)$("publishedTopicSave").disabled=(draft.topic_id||null)===(current.topic_id||null);
  return;
 }
 if(!editable())return;if(t.id==="authorSelect"){draft.author_id=t.value||null;dirty=true;renderPreview()}
 else if(t.id==="locale"){draft.locale=t.value;dirty=true;renderPreview()}
 else if(t.id==="topicSelect"){
  draft.topic_id=t.value||null;
  if(editable()){dirty=true;renderPreview()}
  else if(current)$("publishedTopicSave").disabled=(draft.topic_id||null)===(current.topic_id||null);
}
});
window.addEventListener("beforeunload",e=>{if(dirty){e.preventDefault();e.returnValue=""}});
(async()=>{
 const params=new URLSearchParams(location.hash.slice(1));
 if(params.has("access_token")){session={access_token:params.get("access_token"),refresh_token:params.get("refresh_token")};sessionStorage.setItem("journal_session",JSON.stringify(session));history.replaceState(null,"",location.pathname)}
 else{try{session=JSON.parse(sessionStorage.getItem("journal_session")||"null")}catch{}}
 if(session)run(initialize);
})();
