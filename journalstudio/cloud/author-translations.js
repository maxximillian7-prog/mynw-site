"use strict";
/* Editor-reviewed author profile translations: source-language detection,
   draft generation for missing locales, and atomic, explicit batch approval.
   No AI draft is published without a second editor action. */
(function(){
 const $=id=>document.getElementById(id);
 const languages={ru:"Русский",uk:"Українська",en:"English","pt-PT":"Português (PT)",es:"Español",fr:"Français",de:"Deutsch",it:"Italiano"};
 const fields={name:"authorTranslationName",tagline:"authorTranslationTagline",bio:"authorTranslationBio",focus:"authorTranslationFocus"};
 const fieldNames=Object.keys(fields);
 const contentFields=["tagline","bio","focus"];
 const canTranslate=()=>["owner","chief_editor","editor"].includes(project?.role||"");
 const originalOf=a=>Object.fromEntries(fieldNames.map(k=>[k,String(a?.[k]||"")]));
 const sourceMetaValid=a=>{
  const m=a?.translations?._source,original=originalOf(a);
  return !!m&&!!languages[m.locale]&&fieldNames.every(k=>m.source?.[k]===original[k]);
 };
 const sourceOf=a=>sourceMetaValid(a)?a.translations._source.locale:(a?.preferred_locale||"ru");
 let selectedId=null,selectedProject=null,selectedLocale=null,sourceLocale="ru";
 let dirty=false,busy=false,originalSnapshot=null,detected=false;
 let drafts=new Map(),failureNotes=[];
 const current=()=>authors?.find(a=>a.id===selectedId);
 const status=s=>$("authorTranslationStatus").textContent=s;
 const sourceStatus=s=>$("authorTranslationSourceStatus").textContent=s;
 function access(){if(!canTranslate())throw Error("Переводы доступны только редакторам.");}
 function setBusy(value){
  busy=value;
  for(const id of ["authorTranslationAi","authorTranslationSave","authorTranslationDelete",
   "authorTranslationClose","authorTranslationLocale","authorTranslationSourceLocale",
   "authorTranslationDetect","authorTranslationAutoAll","authorTranslationSaveAll"]){
   if($(id))$(id).disabled=value;
  }
  if(!value)updateBatchList();
 }
 function anyUnsaved(){return dirty||drafts.size>0}
 function canDiscard(){return !anyUnsaved()||window.confirm("Есть несохранённые переводы. Отменить черновики и перейти к другому автору?");}
 function findDefaultTarget(preferred){
  return Object.keys(languages).find(l=>l!==sourceLocale&&l!==preferred)||
   Object.keys(languages).find(l=>l!==sourceLocale);
 }
 function syncTargetOptions(){
  for(const option of $("authorTranslationLocale").options)option.disabled=option.value===sourceLocale;
  if($("authorTranslationLocale").value===sourceLocale)
   $("authorTranslationLocale").value=findDefaultTarget();
 }
 function storedComplete(a,locale){
  const t=a?.translations?.[locale],original=originalOf(a);
  if(!t)return false;
  const needed=contentFields.filter(k=>original[k].trim());
  return needed.length>0&&needed.every(k=>typeof t[k]==="string"&&!!t[k].trim()&&t.source?.[k]===original[k]);
 }
 function readForm(){
  return Object.fromEntries(Object.entries(fields).map(([k,id])=>[k,$(id).value.trim()]));
 }
 function putForm(entry){
  for(const [k,id] of Object.entries(fields))$(id).value=String(entry?.[k]||"");
 }
 function updateBatchList(){
  const panel=$("authorTranslationBatchReview"),saveAll=$("authorTranslationSaveAll");
  panel.hidden=!drafts.size&&!failureNotes.length;
  saveAll.hidden=!drafts.size;
  if(!drafts.size&&!failureNotes.length){panel.replaceChildren();return;}
  panel.replaceChildren();
  const header=document.createElement("strong");
  header.textContent="Черновики для проверки: "+drafts.size+". Нажмите язык, чтобы проверить и изменить текст до сохранения.";
  panel.appendChild(header);
  for(const [locale] of drafts){
   const row=document.createElement("div");row.className="draft-review-row";
   const name=document.createElement("span");name.textContent=languages[locale]||locale;
   const btn=document.createElement("button");btn.type="button";btn.textContent=locale===selectedLocale?"Открыт для проверки":"Просмотреть";
   btn.disabled=busy||locale===selectedLocale;btn.onclick=()=>run(()=>selectTarget(locale));
   row.append(name,btn);panel.appendChild(row);
  }
  if(failureNotes.length){
   const warnings=document.createElement("p");warnings.className="small";
   warnings.textContent="Не удалось обработать: "+failureNotes.join("; ");
   panel.appendChild(warnings);
  }
 }
 function show(a,locale){
  if(!a||!languages[locale]||locale===sourceLocale)throw Error("Выберите язык, отличный от исходного.");
  selectedId=a.id;selectedProject=project.slug;selectedLocale=locale;
  originalSnapshot=originalOf(a);
  $("authorTranslationTitle").textContent="Переводы профиля: "+a.name;
  const orig=originalSnapshot;
  $("authorTranslationOriginal").textContent="Язык написанного текста: "+(languages[sourceLocale]||sourceLocale)+
   "\nЯзык аккаунта: "+(languages[a.preferred_locale]||a.preferred_locale||"ru")+
   "\n\nИмя: "+orig.name+"\n\nКраткое представление: "+(orig.tagline||"—")+
   "\n\nО себе: "+(orig.bio||"—")+"\n\nСпециализация: "+(orig.focus||"—");
  $("authorTranslationSourceLocale").value=sourceLocale;
  const entry=drafts.get(locale)||a.translations?.[locale]||null;
  putForm(entry);
  const stale=a.translations?.[locale]&&fieldNames.filter(k=>
   !!a.translations[locale][k]&&a.translations[locale].source?.[k]!==orig[k]);
  const isDraft=drafts.has(locale);
  status(isDraft?"Несохранённый черновик: проверьте текст и сохраните перевод.":
   !entry?"Перевод для "+languages[locale]+" пока отсутствует. Читателям показывается оригинал.":
   stale.length?"Перевод устарел: исходное описание изменилось. Переведите повторно.":
   "Перевод сохранён. Он доступен читателям на "+languages[locale]+".");
  $("authorTranslationDelete").disabled=!a.translations?.[locale]||busy;
  dirty=isDraft;
  updateBatchList();
 }
 function selectTarget(locale){
  if(busy)throw Error("Дождитесь завершения перевода.");
  if(!languages[locale]||locale===sourceLocale)throw Error("Нельзя переводить текст на язык самого текста.");
  const a=current();if(!a)throw Error("Профиль автора не найден.");
  $("authorTranslationLocale").value=locale;
  show(a,locale);
 }
 async function apiAI(route,payload){
  const base="https://npsfaymjckcqhtyiafms.supabase.co/functions/v1/studio-ai/"+route;
  const request=()=>fetch(base,{method:"POST",signal:AbortSignal.timeout(95000),headers:{
   "apikey":PUBLIC_KEY,"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"
  },body:JSON.stringify(payload)});
  let resp=await request();
  if(resp.status===401&&session.refresh_token){
   session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
   sessionStorage.setItem("journal_session",JSON.stringify(session));
   resp=await request();
  }
  const data=await resp.json().catch(()=>({}));
  if(!resp.ok)throw Error(data.error||"Ошибка генерации ("+resp.status+")");
  return data;
 }
 async function runDetection(){
  const a=current(),slug=project.slug,id=selectedId;
  if(!a||!id)throw Error("Сначала выберите профиль.");
  sourceStatus("Определяем язык по содержимому биографии и слогана…");
  const result=await apiAI("detect-author-profile-language",{project:slug,author_id:id});
  if(project.slug!==slug||selectedId!==id)throw Error("Профиль изменился во время проверки.");
  const locale=result.source_locale;
  if(!languages[locale])throw Error("Язык не распознан. Выберите его вручную.");
  if(result.confidence==="low"&&!window.confirm("Язык распознан с низкой уверенностью: "+languages[locale]+". Применить этот вариант?"))
   return false;
  if(drafts.size||dirty){
   if(sourceLocale!==locale&&!window.confirm("При смене языка текста несохранённые переводы будут отменены. Продолжить?"))return false;
  }
  if(sourceLocale!==locale){drafts.clear();failureNotes=[];dirty=false;}
  sourceLocale=locale;detected=true;
  $("authorTranslationSourceLocale").value=locale;
  syncTargetOptions();
  sourceStatus("Определён язык текста: "+languages[locale]+
   (locale!==a.preferred_locale?" (в настройках автора указан "+(languages[a.preferred_locale]||a.preferred_locale)+").":"")+
   " Уверенность: "+({high:"высокая",medium:"средняя",low:"низкая"}[result.confidence]||"не указана")+
   ". Вы можете изменить язык вручную; он будет записан при сохранении переводов.");
  show(a,$("authorTranslationLocale").value);
  return true;
 }
 async function detectLanguage(){
  if(busy)return;access();setBusy(true);
  try{await runDetection()}finally{setBusy(false)}
 }
 function open(a,skipAutoDetect=false){
  access();if(busy)throw Error("Завершите предыдущую операцию.");
  if(!a)throw Error("Автор не найден.");
  if(!canDiscard())return;
  selectedId=a.id;selectedProject=project.slug;dirty=false;drafts.clear();failureNotes=[];
  sourceLocale=sourceOf(a);detected=sourceMetaValid(a);
  const panel=$("authorTranslationsCard");panel.hidden=false;
  $("authorTranslationSourceLocale").value=sourceLocale;
  const preferred=a.preferred_locale||"ru";
  const option=selectedLocale&&selectedLocale!==sourceLocale?selectedLocale:findDefaultTarget(preferred);
  $("authorTranslationLocale").value=option;
  syncTargetOptions();
  sourceStatus(detected?"Язык текста ранее подтверждён: "+languages[sourceLocale]+".":
   "Язык аккаунта: "+(languages[preferred]||preferred)+
   ". Для точного определения языка самого текста нажмите «Определить язык» или «Автоперевести». Украинский будет доступен, если оригинал написан по-русски.");
  show(a,$("authorTranslationLocale").value);
  panel.scrollIntoView({behavior:"smooth",block:"start"});
  // Automatically detect once when opening a profile that lacks reviewed
  // language metadata. This never writes or publishes anything.
  if(!skipAutoDetect&&!detected&&String(a.bio||a.tagline||"").trim().length>=18){
   void run(async()=>{if(selectedId===a.id&&project.slug===selectedProject&&!busy)await detectLanguage()});
  }
 }
 function payload(){
  access();const a=current();
  if(!a||selectedProject!==project.slug||!selectedLocale)throw Error("Выберите автора и язык.");
  if(selectedLocale===sourceLocale)throw Error("Язык перевода совпадает с языком оригинала.");
  return {locale:selectedLocale,source_locale:sourceLocale,expected_source:{...originalSnapshot},...readForm()};
 }
 async function save(){
  if(busy)return;const a=current(),data=payload();if(!a)throw Error("Автор не найден.");
  if(!fieldNames.some(k=>data[k]))throw Error("Заполните перевод либо удалите существующий.");
  setBusy(true);
  try{
   const res=await call("/authors/"+encodeURIComponent(a.id)+"/translations","PATCH",data);
   if(!res?.ok)throw Error("Сервер не подтвердил сохранение.");
   drafts.delete(data.locale);dirty=false;
   await refreshPosts();
   const updated=current();if(updated)show(updated,data.locale);
   toast("Перевод сохранён. Язык текста: "+languages[sourceLocale]+".");
  }finally{setBusy(false);updateBatchList()}
 }
 async function remove(){
  if(busy)return;const a=current(),data=payload();
  if(!a||!a.translations?.[selectedLocale])return;
  if(!window.confirm("Удалить перевод для "+languages[selectedLocale]+"? Оригинал сохранится."))return;
  setBusy(true);
  try{
   const empty={locale:data.locale,source_locale:sourceLocale,expected_source:data.expected_source,
    name:"",tagline:"",bio:"",focus:""};
   const res=await call("/authors/"+encodeURIComponent(a.id)+"/translations","PATCH",empty);
   if(!res?.ok)throw Error("Сервер не подтвердил удаление.");
   drafts.delete(selectedLocale);dirty=false;
   await refreshPosts();const updated=current();if(updated)show(updated,data.locale);
   toast("Перевод удалён.");
  }finally{setBusy(false)}
 }
 async function singleDraft(){
  if(busy)return;const a=current(),p=payload();
  if(!a)throw Error("Профиль не найден.");
  if(!window.confirm("Создать ИИ-черновик для "+languages[p.locale]+"? Используются API-токены, публикация только после проверки."))return;
  setBusy(true);
  try{
   status("Генерируем перевод "+languages[p.locale]+"…");
   const x=await apiAI("translate-author-profile",{project:project.slug,author_id:a.id,locale:p.locale,source_locale:sourceLocale});
   if(!x.requires_human_review||!x.draft)throw Error("Некорректный ответ ИИ.");
   if(selectedId!==a.id||project.slug!==selectedProject)throw Error("Открыт другой автор.");
   drafts.set(p.locale,normalizeDraft(x.draft));
   show(a,p.locale);toast("Черновик готов. Проверьте текст перед сохранением.");
  }finally{setBusy(false)}
 }
 function normalizeDraft(x){
  const output={};
  for(const k of fieldNames)output[k]=typeof x?.[k]==="string"?x[k].trim():"";
  return output;
 }
 async function autoAll(){
  if(busy)return;access();const a=current();if(!a)throw Error("Автор не выбран.");
  if(!window.confirm("Автоматически определить язык биографии и создать ИИ-переводы для всех отсутствующих языков? Запрос использует платные API-токены. Переводы не будут опубликованы до вашей проверки и сохранения."))return;
  setBusy(true);
  try{
   if(!detected){
    const found=await runDetection();
    if(!found)return;
   }
   const slug=project.slug,id=a.id;
   const targets=Object.keys(languages).filter(l=>l!==sourceLocale&&!storedComplete(a,l));
   if(!targets.length){status("Все необходимые переводы уже сохранены и актуальны.");return;}
   if(drafts.size&& !window.confirm("Черновики уже есть. Заменить их новыми переводами для отсутствующих языков?"))return;
   drafts.clear();failureNotes=[];dirty=false;
   status("Подготавливаем "+targets.length+" переводов. Не закрывайте редактор до завершения.");
   let completed=0;
   for(let start=0;start<targets.length;start+=2){
    const batch=targets.slice(start,start+2);
    const results=await Promise.allSettled(batch.map(locale=>
     apiAI("translate-author-profile",{project:slug,author_id:id,source_locale:sourceLocale,locale})));
    if(project.slug!==slug||selectedId!==id)throw Error("Автор изменился во время подготовки переводов.");
    results.forEach((res,i)=>{
     const locale=batch[i];
     if(res.status==="fulfilled"&&res.value?.requires_human_review&&res.value.draft){
      const draft=normalizeDraft(res.value.draft);
      const old=a.translations?.[locale];
      // Preserve still-valid, manually reviewed translations when filling gaps.
      if(old)for(const k of fieldNames){
       if(old[k]&&old.source?.[k]===originalSnapshot[k])draft[k]=old[k];
      }
      drafts.set(locale,draft);
     }else failureNotes.push(languages[locale]+": "+(res.status==="rejected"?String(res.reason?.message||res.reason).slice(0,95):"некорректный ответ"));
     completed++;
    });
    status("Подготовлено "+drafts.size+" из "+targets.length+" переводов ("+completed+" обработано). Результаты пока не опубликованы.");
    updateBatchList();
   }
   if(drafts.size){
    const first=drafts.keys().next().value;
    show(a,first);dirty=true;
    status("Готово: "+drafts.size+" черновиков. Просмотрите каждый язык в списке ниже, затем нажмите «Сохранить проверенные переводы».");
    toast("Автоперевод подготовлен. Требуется проверка редактором.");
   }else status("Переводы не удалось создать. Проверьте сообщения ниже.");
  }finally{setBusy(false);updateBatchList()}
 }
 async function saveAll(){
  if(busy||!drafts.size)return;access();const a=current();
  if(!a)throw Error("Автор не выбран.");
  if(drafts.has(selectedLocale))drafts.set(selectedLocale,readForm());
  const items=[...drafts].filter(([locale])=>locale!==sourceLocale).map(([locale,data])=>({locale,...normalizeDraft(data)}));
  if(!items.length)throw Error("Нет подготовленных переводов.");
  if(!window.confirm("Вы проверили "+items.length+" переводов ("+items.map(x=>languages[x.locale]).join(", ")+")? Сохранить и сделать доступными читателям NowGreen?"))return;
  setBusy(true);
  try{
   const res=await call("/authors/"+encodeURIComponent(a.id)+"/translations","PATCH",{
    source_locale:sourceLocale,expected_source:{...originalSnapshot},items,confirm_publish:true});
   if(!res?.ok)throw Error("Сервер не подтвердил публикацию.");
   drafts.clear();failureNotes=[];dirty=false;
   const keep=selectedLocale;
   await refreshPosts();const updated=current();
   if(updated&&keep!==sourceLocale)show(updated,keep);
   toast("Сохранено "+items.length+" проверенных переводов. NowGreen получает их с сервера.");
  }finally{setBusy(false);updateBatchList()}
 }
 function changeSource(locale){
  if(busy)throw Error("Перевод ещё выполняется.");
  if(!languages[locale])throw Error("Неподдерживаемый язык.");
  if(locale===sourceLocale)return;
  if(anyUnsaved()&&!window.confirm("Сменить язык текста? Несохранённые переводы будут сброшены.")){
   $("authorTranslationSourceLocale").value=sourceLocale;return;
  }
  drafts.clear();failureNotes=[];dirty=false;
  sourceLocale=locale;detected=true;
  syncTargetOptions();
  sourceStatus("Язык текста выбран вручную: "+languages[locale]+
   ". Он будет сохранён вместе с проверенными переводами, но язык аккаунта автора не изменится.");
  show(current(),$("authorTranslationLocale").value);
 }
 document.addEventListener("click",e=>{
  const btn=e.target.closest("button");
  if(!btn||btn.dataset.profileTranslate===undefined)return;
  e.preventDefault();
  const a=(authors||[]).find(x=>x.id===btn.dataset.profileTranslate);
  run(()=>open(a));
 });
 $("authorTranslationLocale").addEventListener("change",e=>run(()=>selectTarget(e.target.value)));
 $("authorTranslationSourceLocale").addEventListener("change",e=>run(()=>changeSource(e.target.value)));
 for(const id of Object.values(fields))$(id).addEventListener("input",()=>{
  if(!selectedLocale)return;drafts.set(selectedLocale,readForm());dirty=true;
  status("Черновик изменён. Проверьте его и сохраните перед публикацией.");updateBatchList();
 });
 $("authorTranslationSave").onclick=()=>run(save);
 $("authorTranslationDelete").onclick=()=>run(remove);
 $("authorTranslationAi").onclick=()=>run(singleDraft);
 $("authorTranslationDetect").onclick=()=>run(detectLanguage);
 $("authorTranslationAutoAll").onclick=()=>run(autoAll);
 $("authorTranslationSaveAll").onclick=()=>run(saveAll);
 $("authorTranslationClose").onclick=()=>{
  if(busy||!canDiscard())return;
  $("authorTranslationsCard").hidden=true;selectedId=null;selectedProject=null;selectedLocale=null;dirty=false;drafts.clear();failureNotes=[];
 };
 async function openAndTranslate(a){
  open(a,true);
  // A declined unsaved-changes prompt leaves the previous author selected.
  if(!a||selectedId!==a.id||selectedProject!==project.slug)return;
  return await autoAll();
 }
 window.StudioAuthorTranslations={open,openAndTranslate,refresh(){
  if(!selectedId)return;
  const a=current();
  if(!a||selectedProject!==project?.slug||!canTranslate()){
   $("authorTranslationsCard").hidden=true;selectedId=null;selectedLocale=null;selectedProject=null;drafts.clear();dirty=false;return;
  }
  if(!busy&&selectedLocale){
   // Source selection and unsaved AI drafts survive background author refresh.
   if(!anyUnsaved()&&sourceMetaValid(a)){sourceLocale=sourceOf(a);detected=true;}
   syncTargetOptions();show(a,$("authorTranslationLocale").value);
  }
 }};
})();