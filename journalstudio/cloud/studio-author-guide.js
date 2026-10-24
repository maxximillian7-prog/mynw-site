"use strict";
/* Author-only onboarding. Works on top of Studio's authenticated, role-aware modules.
   Does not grant permissions; server ownership checks remain authoritative. */
(function(){
 const byId=id=>document.getElementById(id);
 const E=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 const isAuthor=()=>project?.role==="author";
 const mine=()=>authors.find(a=>a.kind==="partner"&&a.owner_user_id===session?.user?.id);
 const steps=[
  {title:"Мой профиль",short:"Профиль",description:"Добавьте имя, короткое представление, специализацию и фотографию. Эти данные будут связаны с вашими статьями.",action:"profile",label:"Открыть мой профиль"},
  {title:"Первая статья",short:"Статья",description:"Придумайте заголовок, добавьте краткое описание и основные текстовые блоки. При необходимости приложите свои фотографии.",action:"create",label:"Написать статью"},
  {title:"Сохранение и проверка",short:"Проверка",description:"Сохраните черновик и нажмите «На проверку». Редактор проверит содержание и при необходимости оставит комментарии.",action:"draft",label:"Открыть черновик"},
  {title:"Решение редактора",short:"Результат",description:"Следите за статусом статьи. Если редактор попросил изменения, исправьте черновик и отправьте его повторно.",action:"status",label:"Проверить статус"}
 ];
 function progress(){
  const own=mine(),myPosts=posts.filter(p=>p.owner_user_id===session?.user?.id);
  if(!own)return 0;
  if(!myPosts.length)return 1;
  if(myPosts.some(p=>["in_review","approved","scheduled","published"].includes(p.status)))return 3;
  return 2;
 }
 function description(page,stage){
  if(page==="authors")return {title:mine()?"Ваш личный профиль":"Начните со своего профиля",body:mine()?"Здесь отображаются только ваши данные. Проверьте имя, описание и ссылки. При необходимости обновите профиль.":"Заполните имя, специализацию и, по желанию, добавьте фото. После сохранения можно переходить к первой статье."};
  if(page==="editor")return {title:"Создаём статью по шагам",body:mine()?"1. Заголовок и краткое описание. 2. Добавьте текст, разделы и фото. 3. Нажмите «Сохранить статью». 4. Когда закончите — «На проверку».":"Сначала сохраните профиль автора. Затем здесь появится возможность создать статью."};
  if(page==="publish")return {title:"Что происходит после отправки?",body:"«На проверке» — статью читает редактор. «На доработке» — нужно внести правки. «Утверждена» — решение принято, публикацией управляет редакция."};
  return {title:stage===0?"Добро пожаловать в Journal Studio":stage===1?"Теперь можно написать первую статью":stage===2?"Завершите и отправьте статью":"Следите за редакционным решением",body:steps[stage].description};
 }
 function actionButton(step,stage,page){
  if(page==="authors"&&mine())return "";
  if(page==="editor"&&step.action==="create"&&draft)return "";
  return '<button type="button" class="author-guide-action" data-author-guide-action="'+step.action+'">'+E(step.label)+' ↗</button>';
 }
 function guide(page){
  const stage=progress(),help=description(page,stage),step=steps[stage];
  return '<section class="author-guide" aria-label="Пошаговое руководство автора">'+
   '<div class="author-guide-top"><div class="author-guide-label">ВАШ ПУТЬ В ЖУРНАЛЕ · ШАГ '+(stage+1)+' ИЗ 4</div><h2>'+E(help.title)+'</h2><p>'+E(help.body)+'</p>'+actionButton(step,stage,page)+'</div>'+
   '<ol class="author-guide-steps">'+steps.map((x,i)=>'<li class="'+(i<stage?"is-done":i===stage?"is-current":"is-upcoming")+'">'+
     '<span class="author-step-dot">'+(i<stage?"✓":String(i+1))+'</span><span>'+E(x.short)+'</span></li>').join("")+'</ol></section>';
 }
 function ownSummary(){
  const host=byId("authorOwnSummary");if(!host)return;
  const p=mine();
  if(!p){host.hidden=true;host.innerHTML="";return}
  host.hidden=false;
  const url=window.StudioProfiles?.photo?.(p.photo_asset_id);
  const portrait=url?'<img alt="" src="'+E(url)+'">':E(p.name.slice(0,1).toUpperCase());
  host.innerHTML='<div class="author-self-avatar">'+portrait+'</div><div class="author-self-info">'+
   '<div class="author-guide-label">ВАШ АВТОРСКИЙ ПРОФИЛЬ</div><h3>'+E(p.name)+'</h3>'+
   '<p>'+E(p.tagline||p.bio||"Вы можете дополнить информацию о себе в форме ниже.")+'</p>'+
   '<div class="author-self-chip">Имя в ваших статьях: <strong>'+E(p.name)+'</strong></div>'+
   '</div>';
 }
 function renderGuide(){
  if(!isAuthor())return;
  for(const page of ["home","authors","editor","publish"]){
   const section=document.querySelector('[data-view="'+page+'"]');
   if(!section)continue;
   let host=section.querySelector('[data-author-guide="'+page+'"]');
   if(!host){
    host=document.createElement("div");host.dataset.authorGuide=page;
    section.insertBefore(host,section.firstChild);
   }
   // Replacing just the hint never touches the user's profile/article form.
   host.innerHTML=guide(page);
  }
  ownSummary();
  const intro=byId("authorHomeHint");if(intro)intro.hidden=true;
  const directory=byId("authorsDirectoryCard");if(directory)directory.hidden=true;
  const ownPanel=byId("authorEditorCard");if(ownPanel)ownPanel.hidden=false;
  const authorName=byId("authorSelect");if(authorName&&draft){
   authorName.setAttribute("aria-label","Ваше имя автора");
   const lbl=document.querySelector('label[for="authorSelect"]');if(lbl)lbl.textContent="Автор статьи — ваше имя";
  }
  const heading=document.querySelector('[data-view="authors"] .sectionHeading h2');
  if(heading)heading.textContent="Мой профиль";
 }
 document.addEventListener("click",event=>{
  const button=event.target.closest("[data-author-guide-action]");
  if(!button||!isAuthor())return;
  event.preventDefault();
  const action=button.dataset.authorGuideAction;
  run(async()=>{
   if(action==="profile"){await showTab("authors",true);byId("authorName")?.focus({preventScroll:true})}
   else if(action==="create")await createPost();
   else if(action==="draft"){
    const p=posts.find(p=>["draft","changes_requested"].includes(p.status));
    if(p)await openPost(p.id);else await showTab("publish",true);
   }else await showTab("publish",true);
  });
 });
 const originalShow=showTab;
 showTab=async function(...args){await originalShow(...args);renderGuide()};
 const originalRefresh=refreshPosts;
 refreshPosts=async function(...args){const result=await originalRefresh(...args);renderGuide();return result};
 const originalCreate=createPost;
 createPost=async function(...args){const result=await originalCreate(...args);renderGuide();return result};
 const originalSave=savePost;
 savePost=async function(...args){const result=await originalSave(...args);renderGuide();return result};
 const originalWorkflow=workflow;
 workflow=async function(...args){const result=await originalWorkflow(...args);renderGuide();return result};
 window.StudioAuthorGuide={render:renderGuide,progress};
})();