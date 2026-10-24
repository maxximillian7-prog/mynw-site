"use strict";
/* Editor-only project author access: all mutations checked again by studio-api. */
(function(){
 const root=()=>document.getElementById("teamAuthorsList");
 const card=()=>document.getElementById("teamAuthorsCard");
 const esc=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const chief=()=>!!project&&["owner","chief_editor"].includes(project.role);
 let members=[],knownProject=null,loading=false,busy=false,requestId=0;

 function render(){
  const pane=root(),wrap=card();
  if(!pane||!wrap)return;
  wrap.hidden=!chief();
  if(!chief())return;
  if(loading){pane.innerHTML='<div class="empty">Загрузка приглашённых авторов…</div>';return;}
  if(knownProject!==project.slug){pane.innerHTML='<div class="empty">Откройте этот раздел, чтобы загрузить список доступов.</div>';return;}
  pane.innerHTML=members.length?members.map(m=>{
   const display=m.name||m.email||"Приглашённый автор";
   const contact=m.email||"Email недоступен";
   return '<article class="studio-team-author">'+
    '<div class="studio-team-icon">'+esc(display.slice(0,1).toUpperCase())+'</div>'+
    '<div class="studio-team-info"><strong>'+esc(display)+'</strong>'+
      '<div class="muted small studio-team-email">'+esc(contact)+'</div>'+
      '<div class="studio-team-meta">'+(m.profile_id?'<span class="chip">Профиль создан</span>':'<span class="chip amber">Профиль ещё не создан</span>')+
      '<span class="chip">Доступ автора активен</span></div></div>'+
    '<button class="studio-team-delete" type="button" data-team-remove="'+esc(m.user_id)+'" '+(busy?'disabled':'')+' aria-label="Удалить доступ автора '+esc(display)+'">Удалить доступ</button>'+
   '</article>';
  }).join(""):'<div class="empty"><h3>Приглашённых авторов пока нет</h3><p>Нажмите «Пригласить автора» вверху страницы. После отправки приглашения адрес появится здесь.</p></div>';
 }
 async function refresh(){
  if(!chief()){knownProject=null;members=[];render();return;}
  const slug=project.slug,id=++requestId;
  loading=true;render();
  try{
   const result=await call("/team-authors?project="+encodeURIComponent(slug));
   if(id!==requestId||project?.slug!==slug)return;
   members=result.members||[];knownProject=slug;
  }catch(error){
   if(id!==requestId)return;
   knownProject=null;
   const pane=root();if(pane)pane.innerHTML='<div class="empty">Не удалось загрузить доступы авторов: '+esc(error.message)+'. <button type="button" data-team-refresh>Повторить</button></div>';
   throw error;
  }finally{
   if(id===requestId){
    loading=false;
    if(knownProject===slug)render();
   }
  }
 }
 async function removeAccess(userId){
  if(!chief()||busy)throw Error("Удаление доступно только главному редактору");
  const entry=members.find(m=>m.user_id===userId);
  if(!entry)throw Error("Обновите список приглашённых авторов");
  const slug=project.slug;
  const who=entry.name||entry.email||"приглашённого автора";
  const ok=await editorialDecision({
   title:"Удалить автора и отозвать доступ?",
   message:"Автор: "+who+(entry.email&&entry.name?"\nEmail: "+entry.email:"")+
    "\n\nАвтор исчезнет из списка приглашённых и больше не сможет открывать редакцию «"+project.name+"» — даже из уже открытой сессии. Его активный профиль будет скрыт.\n\nОпубликованные статьи, материалы и фотографии сохранятся. Аккаунт в других журналах не изменится.",
   confirmLabel:"Удалить автора и доступ"
  });
  if(!ok)return;
  if(project?.slug!==slug)throw Error("Проект изменился. Повторите действие.");
  busy=true;render();
  try{
   const result=await call("/team-authors/"+encodeURIComponent(userId),"DELETE",{project:slug});
   if(!result?.removed||!result?.access_revoked)throw Error("Сервер не подтвердил отзыв доступа");
   await refreshPosts();
   await refresh();
   toast("Автор удалён из журнала, серверный доступ отозван.");
  }finally{busy=false;render();}
 }
 async function removeProfile(id){
  if(!chief()||busy)throw Error("Удаление доступно только главному редактору");
  const author=authors.find(a=>a.id===id);
  if(!author||author.kind!=="partner")throw Error("Выберите профиль приглашённого автора");
  const slug=project.slug;
  const ok=await editorialDecision({
   title:"Удалить профиль автора?",
   message:"Профиль: "+author.name+
    "\n\nПрофиль будет удалён из активного списка авторов. Если ему соответствует действующий доступ с ролью «Автор», этот доступ также будет отозван.\n\nОпубликованные статьи и медиатека сохранятся. ИИ-авторы и другие редакторы не затрагиваются.",
   confirmLabel:"Удалить профиль и доступ"
  });
  if(!ok)return;
  if(project?.slug!==slug)throw Error("Проект изменился. Повторите действие.");
  busy=true;render();
  try{
   const result=await call("/authors/"+encodeURIComponent(id),"DELETE",{project:slug});
   if(!result?.removed)throw Error("Сервер не подтвердил удаление профиля");
   window.StudioProfiles?.reset?.();
   await refreshPosts();
   await refresh();
   toast(result.access_revoked?"Профиль автора удалён. Доступ к журналу отозван.":"Профиль удалён. Действующего доступа автора для него не было.");
  }finally{busy=false;render();}
 }
 document.addEventListener("click",event=>{
  const b=event.target.closest("button");if(!b)return;
  if(b.dataset.teamRemove)return void run(()=>removeAccess(b.dataset.teamRemove));
  if(b.dataset.editorRemoveProfile)return void run(()=>removeProfile(b.dataset.editorRemoveProfile));
  if(b.dataset.teamRefresh!==undefined)return void run(refresh);
 });
 const oldTab=showTab;
 showTab=async function(name,...rest){
  const ret=await oldTab(name,...rest);
  if(name==="authors"&&chief())await refresh();
  else render();
  return ret;
 };
 const oldRefresh=refreshPosts;
 refreshPosts=async function(...args){const r=await oldRefresh(...args);render();return r};
 const oldProject=changeProject;
 changeProject=async function(...args){
  requestId++;knownProject=null;members=[];
  const r=await oldProject(...args);
  render();
  return r;
 };
 window.StudioMemberAdmin={refresh,render};
})();
