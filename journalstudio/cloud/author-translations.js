"use strict";
/* Editor-reviewed author-profile translations. Nothing is auto-published. */
(function(){
 const $=id=>document.getElementById(id);
 const canTranslate=()=>["owner","chief_editor","editor"].includes(project?.role||"");
 const languages={ru:"Русский",uk:"Українська",en:"English","pt-PT":"Português (PT)",es:"Español",fr:"Français",de:"Deutsch",it:"Italiano"};
 const fields={name:"authorTranslationName",tagline:"authorTranslationTagline",bio:"authorTranslationBio",focus:"authorTranslationFocus"};
 let selectedId=null,selectedProject=null,selectedLocale=null,dirty=false,busy=false,originalSnapshot=null;
 const current=()=>authors?.find(a=>a.id===selectedId);
 const getOriginal=a=>Object.fromEntries(Object.keys(fields).map(k=>[k,String(a?.[k]||"")]));
 function assertAccess(){if(!canTranslate())throw Error("Переводы авторов доступны только редакторам.");}
 function status(text){$("authorTranslationStatus").textContent=text;}
 function setBusy(flag){
  busy=flag;
  for(const id of ["authorTranslationAi","authorTranslationSave","authorTranslationDelete","authorTranslationClose","authorTranslationLocale"]){const el=$(id);if(el)el.disabled=flag;}
 }
 function discardPermission(){
  return !dirty||window.confirm("Перевод содержит несохранённые изменения. Отменить их?");
 }
 function show(a,locale){
  if(!a||!languages[locale]||locale===(a.preferred_locale||"ru"))throw Error("Выберите другой язык перевода.");
  selectedId=a.id;selectedLocale=locale;selectedProject=project.slug;
  originalSnapshot=getOriginal(a);
  const original=originalSnapshot;
  $("authorTranslationTitle").textContent="Переводы профиля: "+a.name;
  $("authorTranslationOriginal").textContent=
    "Язык оригинала: "+(languages[a.preferred_locale]||a.preferred_locale||"ru")+
    "\n\nИмя: "+original.name+
    "\n\nКраткое представление: "+(original.tagline||"—")+
    "\n\nО себе: "+(original.bio||"—")+
    "\n\nСпециализация: "+(original.focus||"—");
  const existing=a.translations?.[locale]||null;
  for(const [field,id] of Object.entries(fields))$(id).value=String(existing?.[field]||"");
  const stale=existing&&Object.keys(fields).filter(k=>existing[k]&&existing.source?.[k]!==original[k]);
  status(!existing?"Перевод ещё не создан. Пустые поля будут показывать оригинал.":
    stale.length?"Нужна повторная проверка: оригинал изменился ("+stale.map(k=>({name:"имя",tagline:"представление",bio:"биография",focus:"специализация"}[k])).join(", ")+"). До сохранения перевода приложение покажет оригинальный текст.":
    "Проверенный перевод сохранён. Читатели увидят его в приложении на этом языке.");
  $("authorTranslationDelete").disabled=!existing;
  dirty=false;
 }
 function open(a){
  assertAccess();
  if(busy)throw Error("Сначала завершите текущую операцию.");
  if(!a)throw Error("Автор не найден. Обновите список.");
  if(!discardPermission())return;
  const panel=$("authorTranslationsCard");
  panel.hidden=false;
  for(const option of $("authorTranslationLocale").options)option.disabled=option.value===(a.preferred_locale||"ru");
  const from=selectedLocale,first=Object.keys(languages).find(l=>l!==a.preferred_locale);
  const chosen=from&&from!==a.preferred_locale?from:(a.preferred_locale==="uk"?"ru":"en");
  $("authorTranslationLocale").value=chosen||first;
  show(a,$("authorTranslationLocale").value);
  panel.scrollIntoView({behavior:"smooth",block:"start"});
 }
 function payload(){
  assertAccess();
  const a=current();
  if(!a||selectedProject!==project.slug||!selectedLocale)throw Error("Выберите автора и язык.");
  return {locale:selectedLocale,expected_source:{...originalSnapshot},
    ...Object.fromEntries(Object.entries(fields).map(([field,id])=>[field,$(id).value.trim()]))};
 }
 async function save(){
  if(busy)return;const a=current(),data=payload();
  if(!a)throw Error("Автор не найден.");
  setBusy(true);
  try{
   const res=await call("/authors/"+encodeURIComponent(a.id)+"/translations","PATCH",data);
   if(res?.ok!==true)throw Error("Сервер не подтвердил сохранение.");
   const savedLocale=selectedLocale;
   await refreshPosts();
   const updated=current();
   if(updated&&selectedProject===project.slug)show(updated,savedLocale);
   toast("Перевод автора сохранён и доступен на выбранном языке.");
  }finally{setBusy(false)}
 }
 async function remove(){
  if(busy)return;
  const a=current(),data=payload();
  if(!a||!a.translations?.[selectedLocale])return;
  if(!window.confirm("Удалить перевод для "+languages[selectedLocale]+"? Оригинал останется, действие нельзя отменить."))return;
  setBusy(true);
  try{
   const empty={locale:data.locale,expected_source:data.expected_source,name:"",tagline:"",bio:"",focus:""};
   const res=await call("/authors/"+encodeURIComponent(a.id)+"/translations","PATCH",empty);
   if(res?.ok!==true)throw Error("Сервер не подтвердил удаление.");
   const locale=selectedLocale;
   await refreshPosts();
   const updated=current();
   if(updated&&selectedProject===project.slug)show(updated,locale);
   toast("Перевод удалён. Приложение покажет оригинальные тексты.");
  }finally{setBusy(false)}
 }
 async function aiDraft(){
  if(busy)return;assertAccess();
  const a=current(),p=payload();
  if(!a)throw Error("Автор не найден.");
  if(dirty&&!window.confirm("ИИ-черновик заменит несохранённые поля. Продолжить?"))return;
  if(!window.confirm("Создать ИИ-черновик для "+languages[p.locale]+"? Запрос использует платные API-токены. Результат не будет опубликован до вашей проверки и сохранения."))return;
  const id=a.id,slug=project.slug,locale=p.locale;
  setBusy(true);status("ИИ создаёт черновик. После генерации внимательно проверьте факты и авторское имя.");
  try{
   const base="https://npsfaymjckcqhtyiafms.supabase.co/functions/v1/studio-ai/translate-author-profile";
   const request=()=>fetch(base,{method:"POST",signal:AbortSignal.timeout(95000),headers:{
    "apikey":PUBLIC_KEY,"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"
   },body:JSON.stringify({project:slug,author_id:id,locale})});
   let resp=await request();
   if(resp.status===401&&session.refresh_token){
    session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
    sessionStorage.setItem("journal_session",JSON.stringify(session));
    resp=await request();
   }
   const result=await resp.json().catch(()=>({}));
   if(!resp.ok)throw Error(result.error||"Ошибка ИИ-перевода ("+resp.status+")");
   if(!result.draft||!result.requires_human_review)throw Error("Получен некорректный черновик.");
   if(project.slug!==slug||selectedId!==id||selectedLocale!==locale)throw Error("Профиль изменился во время генерации.");
   for(const [field,elId] of Object.entries(fields))$(elId).value=String(result.draft[field]||"").slice(0,$(elId).maxLength);
   dirty=true;
   status("ИИ-черновик готов. Проверьте перевод, особенно имя, названия каналов и личные факты, затем нажмите «Сохранить проверенный перевод».");
   toast("ИИ-черновик создан. Перевод ещё не опубликован.");
  }finally{setBusy(false)}
 }
 document.addEventListener("click",e=>{
  const btn=e.target.closest("button");
  if(!btn||btn.dataset.profileTranslate===undefined)return;
  e.preventDefault();
  const a=(authors||[]).find(x=>x.id===btn.dataset.profileTranslate);
  run(()=>open(a));
 });
 $("authorTranslationLocale").addEventListener("change",e=>{
  const target=e.target.value,old=selectedLocale,a=current();
  if(!discardPermission()){e.target.value=old||"";return;}
  run(()=>show(a,target));
 });
 for(const id of Object.values(fields))$(id).addEventListener("input",()=>{dirty=true;status("Есть несохранённые изменения. Для публикации нажмите «Сохранить проверенный перевод».");});
 $("authorTranslationSave").onclick=()=>run(save);
 $("authorTranslationDelete").onclick=()=>run(remove);
 $("authorTranslationAi").onclick=()=>run(aiDraft);
 $("authorTranslationClose").onclick=()=>{
  if(busy||!discardPermission())return;
  $("authorTranslationsCard").hidden=true;selectedId=null;selectedLocale=null;selectedProject=null;dirty=false;
 };
 window.StudioAuthorTranslations={refresh(){
  if(!selectedId)return;
  const a=current();
  if(!a||selectedProject!==project?.slug||!canTranslate()){
   $("authorTranslationsCard").hidden=true;selectedId=null;selectedLocale=null;selectedProject=null;dirty=false;
   return;
  }
  if(!dirty&&!busy&&selectedLocale)show(a,selectedLocale);
 }};
})();