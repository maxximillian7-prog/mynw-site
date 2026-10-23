"use strict";
/* AI editorial frontend: generation, schedules and protected human-reviewed translations. */
(function(){
 const $=id=>document.getElementById(id);
 const E=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const aiRole=()=>["owner","chief_editor","editor"].includes(project?.role||"");
 const chiefRoleAi=()=>["owner","chief_editor"].includes(project?.role||"");
 const locales={ru:"Русский","pt-PT":"Português (PT)",en:"English",uk:"Українська",es:"Español",fr:"Français",de:"Deutsch",it:"Italiano"};
 let selected=null,schedules=[],jobs=[],translations=[],busy=false,providerReady=false,lastPhotoCache=new Map();
 let pendingReviewLocale=null,approvingLocale=null,translationRefreshSeq=0;
 async function request(path,method="GET",body,options={}){
  if(!session?.access_token)throw Error("Войдите в редакцию");
  const signal=options.timeoutMs?{signal:AbortSignal.timeout(options.timeoutMs)}:{};
  const callOnce=()=>fetch("https://npsfaymjckcqhtyiafms.supabase.co/functions/v1/studio-ai"+path,{
   method,...signal,
   headers:{"apikey":PUBLIC_KEY,"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},
   body:body?JSON.stringify(body):undefined
  });
  let r;
  try{
   r=await callOnce();
   if(r.status===401&&session.refresh_token){
    session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
    sessionStorage.setItem("journal_session",JSON.stringify(session));
    r=await callOnce();
   }
  }catch(e){
   if(["TimeoutError","AbortError"].includes(e.name))
    throw Error("Превышено время ожидания ответа. Обновите статус и повторите.");
   throw e;
  }
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw Error(j.error||"Ошибка ИИ-сервера ("+r.status+")");
  return j;
 }
 function aiAuthors(){return (authors||[]).filter(x=>x.kind==="ai")}
 function avatar(author){
  const photo=window.StudioProfiles?.photo(author?.photo_asset_id);
  return photo?'<img src="'+E(photo)+'" alt="Аватар '+E(author.name)+'">':E((author?.name||"✦").slice(0,1));
 }
 function personas(){
  const a=aiAuthors();
  if(selected&&!a.some(x=>x.id===selected))selected=null;
  if(!selected&&a.length)selected=a[0].id;
  $("aiPersonaCards").innerHTML=a.length?a.map(p=>'<button type="button" class="ai-persona '+(p.id===selected?"selected":"")+'" data-ai-persona="'+E(p.id)+'"><span class="ai-face">'+avatar(p)+'</span><b>'+E(p.name)+'</b><p>'+E(p.tagline||p.focus||"")+'</p></button>').join(""):'<div class="empty">В этом приложении пока нет ИИ-авторов. Создайте профиль во вкладке «Авторы».</div>';
  $("aiGenerate").disabled=!providerReady||!selected||busy;
  $("aiSaveSchedule").disabled=!selected||busy||(!providerReady&&$("aiScheduleEnabled").checked);
  scheduleControls();
 }
 function scheduleControls(){
  const value=schedules.find(x=>x.author_id===selected);
  $("aiScheduleEnabled").checked=!!value?.enabled;
  $("aiScheduleCadence").value=String(value?.cadence_days||7);
  $("aiScheduleMax").value=String(value?.monthly_limit||4);
  $("aiScheduleHint").value=value?.topic_hint||"";
  $("aiScheduleInfo").textContent=value?.enabled?"Следующая генерация: "+new Date(value.next_run_at).toLocaleString("ru-RU")+"; публикация только после утверждения.":"Автогенерация для этого автора выключена. Материалы не создаются по расписанию.";
 }
 async function health(){
  const r=await request("/health");providerReady=r.provider_configured===true;
  $("aiProviderStatus").textContent=providerReady?"ИИ-провайдер подключён":"Нужно подключить API-ключ";
  $("aiProviderStatus").className="chip "+(providerReady?"":"amber");
  $("aiGenerateResult").textContent=providerReady?"Выберите автора и тему. Пустая тема означает самостоятельный выбор идеи. Статьи создаются только как черновики.":"Генерация и переводы подготовлены, но ещё не активированы. Добавьте OPENAI_API_KEY в Supabase → Edge Functions → Secrets. Ключ нельзя вводить в браузер.";
  personas();
 }
 function imageArticleChoices(){
  const picker=$("aiImagePost"),go=$("aiOpenImage");
  if(!picker||!go)return;
  const previous=picker.value;
  const available=(posts||[]).filter(p=>["draft","changes_requested"].includes(p.status));
  picker.innerHTML=available.length?'<option value="">Выберите черновик для изображения</option>'+available.map(p=>'<option value="'+E(p.id)+'">'+E(p.title||"Без названия")+'</option>').join(""):'<option value="">Нет редактируемых статей — сначала создайте и сохраните новую</option>';
  if(available.some(x=>x.id===previous))picker.value=previous;
  else if(available.length===1)picker.value=available[0].id;
  go.disabled=!picker.value;
 }
 async function openImageForDraft(){
  const postId=$("aiImagePost")?.value;
  if(!postId)throw Error("Выберите сохранённый черновик или создайте статью");
  if(dirty&&!confirm("Есть несохранённые изменения. Перейти к другой статье?"))return;
  await openPost(postId);
  const panel=document.querySelector(".studio-images-menu");
  if(!panel)throw Error("Панель изображений не найдена. Обновите страницу.");
  const aiButton=panel.querySelector('[data-image-source="ai"]');
  if(aiButton)aiButton.click();
  panel.scrollIntoView({behavior:"smooth",block:"start"});
  $("imagePrompt")?.focus({preventScroll:true});
  toast("Введите описание фотографии и выберите формат. Генерация начнётся только после подтверждения.");
 }
 async function newArticleForImage(){
  await createPost();
  $("title")?.focus();
  toast("Создайте статью и нажмите «Сохранить». После этого откройте раздел «Фото для статьи» и задайте запрос.");
 }
 function jobsList(){
  $("aiJobs").innerHTML=jobs.length?jobs.slice(0,12).map(j=>'<div class="ai-job"><div class="row"><b>'+E(j.kind==="translate"?"Перевод":"Статья")+'</b><span class="chip '+(j.status==="failed"||j.status==="blocked"?"amber":"")+'">'+E(({completed:"Готово",processing:"В работе",pending:"В очереди",blocked:"Нужен API-ключ",failed:"Ошибка"})[j.status]||j.status)+'</span></div><div class="muted small">'+E(j.topic||"Самостоятельная тема")+'</div><small>'+E(j.created_at?.slice(0,16))+(j.error?" · "+E(j.error):"")+'</small>'+((j.post_id&&j.status==="completed")?'<button data-ai-open="'+E(j.post_id)+'" type="button">Открыть статью ↗</button>':"")+'</div>').join(""):'<div class="empty">Заданий пока нет.</div>';
 }
 async function refreshAI(){
  if(!project||!aiRole())return;
  const all=await Promise.allSettled([request("/jobs?project="+encodeURIComponent(project.slug)),request("/schedules?project="+encodeURIComponent(project.slug)),request("/health")]);
  if(all[0].status==="fulfilled")jobs=all[0].value.jobs||[];
  if(all[1].status==="fulfilled")schedules=all[1].value.schedules||[];
  if(all[2].status==="fulfilled")providerReady=all[2].value.provider_configured===true;
  $("aiProviderStatus").textContent=providerReady?"ИИ-провайдер подключён":"Нужен API-ключ";
  $("aiProviderStatus").className="chip"+(providerReady?"":" amber");
  personas();jobsList();imageArticleChoices();
  if(!providerReady)$("aiGenerateResult").textContent="Для генерации нужен OPENAI_API_KEY в Supabase → Edge Functions → Secrets. Никаких ключей в браузере хранить не нужно.";
 }
 async function generate(){
  if(!aiRole())throw Error("Генерация доступна редакции");
  if(!providerReady)throw Error("Сначала подключите OPENAI_API_KEY к Journal Studio");
  if(busy)return;
  const p=aiAuthors().find(x=>x.id===selected);if(!p)throw Error("Выберите ИИ-автора");
  busy=true;$("aiGenerate").disabled=true;$("aiGenerate").textContent="⌛ Автор готовит материал…";
  const note=$("aiGenerateResult");note.textContent="Запрос отправлен. Генерируется новый черновик; публикации без редактора не будет.";
  try{
   const r=await request("/generate","POST",{project:project.slug,author_id:p.id,topic:$("aiTopic").value.trim(),locale:$("aiLanguage").value});
   if(r.post_id){note.textContent="Черновик создан: "+r.title;await refreshPosts();await refreshAI();await openPost(r.post_id);toast(p.name+" подготовил новый черновик. Проверьте факты, фото и перевод перед публикацией.");}
   else throw Error(r.error||"Не удалось создать статью");
  }catch(e){note.textContent="Ошибка: "+e.message;throw e}
  finally{busy=false;$("aiGenerate").disabled=!providerReady;$("aiGenerate").textContent="✦ Создать черновик"}
 }
 async function saveSchedule(){
  if(!chiefRoleAi())throw Error("Расписанием управляет главный редактор");
  const p=aiAuthors().find(a=>a.id===selected);if(!p)throw Error("Выберите автора");
  const data={project:project.slug,author_id:p.id,enabled:$("aiScheduleEnabled").checked,
   topic_hint:$("aiScheduleHint").value.trim(),cadence_days:Number($("aiScheduleCadence").value),
   monthly_limit:Number($("aiScheduleMax").value),locale:$("aiLanguage").value};
  const r=await request("/schedule","POST",data);
  schedules=schedules.filter(x=>x.author_id!==p.id).concat([r.schedule]);
  personas();toast(data.enabled?"Авторское расписание включено. Первый черновик — не раньше чем через сутки.":"Автогенерация для автора отключена.");
 }
 function currentSourceRevision(){
  return ["published","approved","scheduled"].includes(current?.status)
   ? (current.approved_revision||current.revision) : current.revision;
 }
 async function translationsForCurrent(){
   const sequence=++translationRefreshSeq,sourceId=current?.id;
  const host=$("translationList"),notice=$("translationStatus"),button=$("translateArticle");
  if(!current?.id){translations=[];host.innerHTML="";notice.textContent="Сначала сохраните статью.";button.disabled=true;return}
  // Approved/published articles may receive new reviewed translations without
  // editing or mutating their frozen original content.
  const translateAllowed=["draft","changes_requested","in_review","approved","scheduled","published"].includes(current.status);
  button.disabled=!providerReady||busy||!translateAllowed||dirty;
  $("translateAll").disabled=!providerReady||busy||!translateAllowed||dirty;
  const r=await request("/translations?post_id="+encodeURIComponent(sourceId),"GET",undefined,{timeoutMs:20000});
  if(sequence!==translationRefreshSeq||sourceId!==current?.id)return;
  translations=r.translations||[];
  const rows=translations.map(x=>{
   const stale=x.source_revision!==currentSourceRevision();
   return '<div class="ai-translation-item"><div><b>'+E(locales[x.locale]||x.locale)+'</b> <span class="chip '+(stale?"amber":x.status==="reviewed"?"":"gray")+'">'+(stale?"Устарел":x.status==="reviewed"?"Проверен":"Ожидает редактора")+'</span><div class="small muted">'+E(x.title)+'</div></div><div class="btns"><button type="button" data-ai-translation-view="'+E(x.locale)+'">Просмотр</button>'+
   (chiefRoleAi()&&!stale&&x.status!=="reviewed"?'<button type="button" data-ai-translation-approve="'+E(x.locale)+'">✓ Проверить</button>':"")+'</div></div>'
  }).join("");
  host.innerHTML=rows||'<p class="small muted">Переводов пока нет. Выберите язык и нажмите «Перевести статью».</p>';
  const verified=translations.filter(x=>x.status==="reviewed"&&x.source_revision===currentSourceRevision()).map(x=>x.locale);
  const missing=Object.keys(locales).filter(k=>k!==current.locale&&!verified.includes(k));
  notice.textContent="Проверено языков: "+(1+verified.length)+" / 8. "+
    (missing.length?"Нужно проверить: "+missing.map(x=>locales[x]||x).join(", ")+". ":"Все языки проверены. ")+
    (providerReady?"Недостающие переводы можно создать здесь.":"Для автоперевода нужен AI-провайдер.");
 }
 async function translate(){
  if(!current?.id)throw Error("Сначала сохраните статью");
  if(dirty)throw Error("Сохраните изменения исходной статьи");
  if(!providerReady)throw Error("Сначала подключите API-ключ");
  if(busy)return;
  const locale=$("translationLanguage").value;
  if(locale===current.locale)throw Error("Выберите другой язык");
  busy=true;$("translateArticle").disabled=true;$("translateArticle").textContent="⌛ Переводим…";
  try{
   const res=await request("/translate","POST",{post_id:current.id,locale});
   if(!res.translated)throw Error(res.error||"Перевод не завершён");
   await translationsForCurrent();
   toast("Перевод на "+(locales[locale]||locale)+" сохранён как черновик.");
  }finally{busy=false;$("translateArticle").textContent="✦ Перевести статью";$("translateArticle").disabled=!providerReady}
 }
 async function translateAll(){
  if(!current?.id)throw Error("Сначала сохраните оригинал статьи");
  if(dirty)throw Error("Сохраните изменения перед переводом");
  if(!providerReady)throw Error("Подключите AI-провайдера");
  if(busy)return;
  const all=Object.keys(locales).filter(lang=>lang!==current.locale);
  const expectedRevision=currentSourceRevision();
  const todo=all.filter(locale=>!translations.some(t=>t.locale===locale&&t.source_revision===expectedRevision));
  if(!todo.length){toast("Все доступные языки уже переведены для текущей версии статьи.");return}
  if(!confirm("Создать "+todo.length+" переводов? Каждый язык — отдельный платный запрос ИИ. Результаты останутся черновиками для проверки."))return;
  busy=true;$("translateAll").disabled=true;$("translateArticle").disabled=true;
  const errors=[];let done=0;
  try{
   for(let i=0;i<todo.length;i++){
    const locale=todo[i];
    $("translationStatus").textContent="Перевод "+(i+1)+" / "+todo.length+": "+locales[locale]+"…";
    try{const x=await request("/translate","POST",{post_id:current.id,locale});if(!x.translated)throw Error(x.error||"Перевод не завершён");done++}
    catch(e){errors.push(locales[locale]+": "+e.message);if(/key|provider|401|403/i.test(e.message))break}
   }
   await translationsForCurrent();
   toast("Готово переводов: "+done+". "+(errors.length?"Ошибки: "+errors.join("; "):"Откройте переводы для проверки."),errors.length>0);
  }finally{busy=false;$("translateAll").disabled=!providerReady;$("translateArticle").disabled=!providerReady}
}
function showTranslation(locale,offerApproval=false){
  const t=translations.find(x=>x.locale===locale);if(!t)return;
  const area=$("translationPreview");area.hidden=false;
  const stale=t.source_revision!==currentSourceRevision();
  const canApprove=offerApproval&&chiefRoleAi()&&!stale&&t.status!=="reviewed";
  pendingReviewLocale=canApprove?locale:null;
  area.innerHTML='<div class="studio-translation-preview-content"><div class="eyebrow">'+E(locales[locale]||locale)+' · '+
   (t.status==="reviewed"?"Проверено редакцией":"Черновик перевода")+
   '</div><h3>'+E(t.title)+'</h3><p>'+E(t.summary)+'</p>'+
   (t.blocks||[]).map(b=>b.type==="heading"?'<h3>'+E(b.text)+'</h3>':
    b.type==="text"||b.type==="quote"?'<p>'+E(b.text)+'</p>':
    b.type==="image"?'<p class="muted small">📷 '+E(b.caption||b.alt||"Фото сохранено")+'</p>':
    b.type==="link"?'<p class="muted small">↗ '+E(b.label||"Ссылка")+'</p>':"").join("")+'</div>'+
   (canApprove?'<div class="studio-translation-approval">'+
    '<p><b>Проверьте весь перевод.</b> Подтверждение сделает языковую версию доступной читателям опубликованной статьи.</p>'+
    '<div class="btns"><button type="button" class="primary" data-ai-translation-confirm="'+E(locale)+'">✓ Подтвердить проверку</button>'+
    '<button type="button" data-ai-translation-cancel>Отмена</button></div></div>':"");
  if(offerApproval)area.scrollIntoView({behavior:"smooth",block:"center"});
 }
 async function reviewTranslation(locale){
  if(!chiefRoleAi())throw Error("Только главный редактор подтверждает переводы");
  if(locale!==pendingReviewLocale)throw Error("Откройте перевод и проверьте его перед подтверждением");
  if(approvingLocale)return;
  const t=translations.find(x=>x.locale===locale);
  if(!t||t.source_revision!==currentSourceRevision())throw Error("Перевод устарел. Обновите список.");
  if(t.status==="reviewed"){pendingReviewLocale=null;await translationsForCurrent();return}
  const postId=current.id;
  approvingLocale=locale;
  const approveButton=$("translationPreview").querySelector("[data-ai-translation-confirm]");
  if(approveButton){approveButton.disabled=true;approveButton.textContent="⌛ Подтверждаю…"}
  $("translationStatus").textContent="Подтверждаю перевод "+(locales[locale]||locale)+"…";
  try{
    const result=await request("/review-translation","POST",{post_id:postId,locale},{timeoutMs:20000});
    if(result.reviewed!==true)throw Error("Сервер не подтвердил перевод");
    await translationsForCurrent();
    pendingReviewLocale=null;
    $("translationPreview").hidden=true;
    toast("Перевод на "+(locales[locale]||locale)+" подтверждён редакцией.");
  }catch(e){
    // The connection may fail after the server has already committed approval.
    // Re-read the authoritative status rather than doing an unsafe blind retry.
    try{await translationsForCurrent()}catch(_){}
    const updated=translations.find(x=>x.locale===locale);
    if(current?.id===postId && updated?.status==="reviewed" &&
       updated.source_revision===currentSourceRevision()){
      pendingReviewLocale=null;
      $("translationPreview").hidden=true;
      toast("Проверка на "+(locales[locale]||locale)+" подтверждена сервером.");
      return;
    }
    const button=$("translationPreview").querySelector("[data-ai-translation-confirm]");
    if(button){button.disabled=false;button.textContent="✓ Повторить подтверждение"}
    $("translationStatus").textContent="Не удалось подтвердить "+(locales[locale]||locale)+": "+e.message+
      ". Ранее одобренные переводы сохранены.";
    throw e;
  }finally{approvingLocale=null}
 }
 const originalRenderAuthors=renderAuthors;
 renderAuthors=function(...args){originalRenderAuthors(...args);if(tab==="ai-studio")personas()};
 const prevLoad=loadData;
 loadData=async function(...args){await prevLoad(...args);if(aiRole())await refreshAI()};
 const prevRefresh=refreshPosts;
 refreshPosts=async function(...args){const result=await prevRefresh(...args);if(tab==="ai-studio"&&aiRole())await refreshAI();return result};
 const prevOpen=openPost;
 openPost=async function(id){await prevOpen(id);await translationsForCurrent()};
 const prevCreate=createPost;
 createPost=async function(...args){await prevCreate(...args);translations=[];$("translationList").innerHTML="";$("translationPreview").hidden=true;await translationsForCurrent()};
 const prevSave=savePost;
 savePost=async function(...args){await prevSave(...args);await translationsForCurrent()};
 const prevShow=showTab;
 showTab=async function(target,...args){
  if(target==="ai-studio"&&!aiRole()){toast("ИИ-редакция доступна только редакторам.",true);return}
  await prevShow(target,...args);
  if(target==="ai-studio")await refreshAI();
  if(target==="editor")await translationsForCurrent();
 };
 const prevChange=changeProject;
 changeProject=async function(...args){selected=null;jobs=[];schedules=[];translations=[];await prevChange(...args);if(aiRole())await refreshAI()};
 document.addEventListener("click",event=>{
  const b=event.target.closest("button");if(!b)return;
  if(b.dataset.aiPersona!==undefined){selected=b.dataset.aiPersona;personas()}
  if(b.dataset.aiOpen!==undefined)run(()=>openPost(b.dataset.aiOpen));

 });
 $("aiGenerate").onclick=()=>run(generate);
 $("aiRefresh").onclick=()=>run(refreshAI);
 $("aiSaveSchedule").onclick=()=>run(saveSchedule);
 $("aiOpenImage").onclick=()=>run(openImageForDraft);
 $("aiNewForImage").onclick=()=>run(newArticleForImage);
 $("aiImagePost").onchange=()=>{$("aiOpenImage").disabled=!$("aiImagePost").value};
 $("translationPanel").addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.aiTranslationView!==undefined){
    e.preventDefault();e.stopPropagation();
    showTranslation(b.dataset.aiTranslationView);
  }else if(b.dataset.aiTranslationApprove!==undefined){
    e.preventDefault();e.stopPropagation();
    showTranslation(b.dataset.aiTranslationApprove,true);
  }else if(b.dataset.aiTranslationConfirm!==undefined){
    e.preventDefault();e.stopPropagation();
    run(()=>reviewTranslation(b.dataset.aiTranslationConfirm));
  }else if(b.dataset.aiTranslationCancel!==undefined){
    e.preventDefault();e.stopPropagation();
    pendingReviewLocale=null;$("translationPreview").hidden=true;
  }
 });
 $("translateArticle").onclick=()=>run(translate);
 $("translateAll").onclick=()=>run(translateAll);
 $("aiScheduleEnabled").onchange=()=>{$("aiScheduleInfo").textContent=$("aiScheduleEnabled").checked?"Новые материалы будут создаваться по расписанию, только если сохраните настройки.":"Автогенерация выключена. Сохраните настройки.";$("aiSaveSchedule").disabled=!selected||busy||(!providerReady&&$("aiScheduleEnabled").checked);};
 window.StudioAI={refresh:refreshAI,translations:translationsForCurrent,health};
})();