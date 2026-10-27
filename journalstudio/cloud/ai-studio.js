"use strict";
/* AI editorial frontend: generation, schedules and protected human-reviewed translations. */
(function(){
 const $=id=>document.getElementById(id);
 const E=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const aiRole=()=>["owner","chief_editor","editor"].includes(project?.role||"");
 const chiefRoleAi=()=>["owner","chief_editor"].includes(project?.role||"");
 const locales={ru:"Русский","pt-PT":"Português (PT)",en:"English",uk:"Українська",es:"Español",fr:"Français",de:"Deutsch",it:"Italiano"};
 let selected=null,schedules=[],jobs=[],translations=[],busy=false,providerReady=false,lastPhotoCache=new Map();
 let pendingReviewLocale=null,pendingReviewRevision=null,approvingLocale=null,translationRefreshSeq=0,pendingBulkPlan=null,bulkStarting=false,bulkApproving=false;
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
  const author=a.find(p=>p.id===selected),box=$("aiPersonaEditor");
  if(box){
   box.hidden=!chiefRoleAi()||!author;
   if(author&&chiefRoleAi()){
    $("aiPersonaFocus").value=author.focus||"";
    $("aiPersonaVoice").value=author.voice_style||"";
   }
  }
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
  window.StudioFullArticle?.restore?.();
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
  if(!Number.isInteger(data.monthly_limit)||data.monthly_limit<1||data.monthly_limit>31)
   throw Error("Укажите месячный лимит от 1 до 31 черновика.");
  const r=await request("/schedule","POST",data);
  schedules=schedules.filter(x=>x.author_id!==p.id).concat([r.schedule]);
  personas();toast(data.enabled?"Авторское расписание включено. Первый черновик — не раньше чем через сутки.":"Автогенерация для автора отключена.");
 }
 async function savePersonaWritingSettings(){
  if(!chiefRoleAi())throw Error("Настройки ИИ-автора доступны только главному редактору.");
  const a=aiAuthors().find(p=>p.id===selected);
  if(!a)throw Error("Выберите ИИ-автора.");
  const btn=$("aiPersonaSave"),notice=$("aiPersonaSaveStatus");btn.disabled=true;
  notice.textContent="Сохраняем стиль ИИ-автора…";
  try{
   const changes={
    name:a.name,bio:a.bio||"",tagline:a.tagline||"",preferred_locale:a.preferred_locale||"ru",
    focus:$("aiPersonaFocus").value.slice(0,450),
    voice_style:$("aiPersonaVoice").value.slice(0,550),
    social_url:a.social_links?.website||"",
    instagram:a.social_links?.instagram||"",
    youtube:a.social_links?.youtube||""
   };
   const result=await call("/authors/"+encodeURIComponent(a.id),"PATCH",changes);
   if(result.author?.id!==a.id)throw Error("Сервер не подтвердил сохранение.");
   Object.assign(a,result.author);
   notice.textContent="Настройки сохранены. Следующий черновик использует новый стиль.";
   toast("Настройки ИИ-автора сохранены.");
  }catch(error){notice.textContent="Ошибка: "+error.message;throw error}
  finally{btn.disabled=false}
 }
 function currentSourceRevision(){
  return ["published","approved","scheduled"].includes(current?.status)
   ? (current.approved_revision||current.revision) : current.revision;
 }

 function approvalReadiness(){
  if(!current?.id)return {missing:[],pending:[],count:0};
  const rev=currentSourceRevision();
  const needed=Object.keys(locales).filter(k=>k!==current?.locale);
  const valid=k=>translations.find(t=>t.locale===k&&t.source_revision===rev&&
    ["draft","reviewed"].includes(t.status)&&String(t.title||"").trim()&&
    Array.isArray(t.blocks)&&t.blocks.length>0);
  return {missing:needed.filter(k=>!valid(k)),pending:needed.filter(k=>valid(k)?.status==="draft"),
    count:needed.length};
 }
 function updateApprovalUI(){
  const status=approvalReadiness();
  const b=$("translationApproveAll"),hint=$("translationApproveAllHint");
  if(b){
   b.disabled=!chiefRoleAi()||!current?.id||busy||bulkApproving||dirty||
     status.count!==7||status.missing.length>0||status.pending.length===0;
   b.title=status.missing.length?
      "Нет актуальных переводов: "+status.missing.map(k=>locales[k]).join(", ")+". Устаревшие переводы можно повторно утвердить после проверки без ИИ.":
      "Подтвердить переводы, которые вы проверили";
  }
  if(hint)hint.textContent=!current?.id?"Сначала сохраните статью.":status.missing.length?
    "Нет актуальных переводов: "+status.missing.map(k=>locales[k]).join(", ")+". Устаревшие переводы можно повторно утвердить после проверки без ИИ.":
    status.pending.length?"Можно проверить языки по отдельности или утвердить "+
      status.pending.length+" переводов одной кнопкой.":"Все 8 языков утверждены.";
  for(const id of ["publish","schedule"]){
   const button=$(id);
   if(button&&!button.hidden){
    button.disabled=status.count!==7||status.missing.length>0||status.pending.length>0||dirty;
    button.title=button.disabled?"Для публикации необходимы все 7 актуальных утверждённых переводов.":"";
   }
  }
 }
 async function approveAllTranslations(){
  if(bulkApproving||busy)return;
  if(!chiefRoleAi())throw Error("Только главный редактор может подтверждать переводы.");
  if(!current?.id||dirty)throw Error("Сохраните статью перед подтверждением.");
  bulkApproving=true;
  const article=current.id,slug=project.slug,rev=currentSourceRevision(),b=$("translationApproveAll");
  try{
   await translationsForCurrent();
   if(current?.id!==article||project?.slug!==slug||currentSourceRevision()!==rev)
     throw Error("Статья изменилась. Обновите статусы.");
   const check=approvalReadiness();
   if(check.count!==7||check.missing.length)
     throw Error("Отсутствуют актуальные переводы: "+check.missing.map(k=>locales[k]).join(", "));
   if(!check.pending.length){toast("Все переводы уже утверждены.");return}
   const ok=await editorialDecision({
    title:"Утвердить все переводы",
    message:"Подтвердите, что проверили перевод каждого языка.\n\nДля утверждения: "+
     check.pending.map(k=>locales[k]).join(", ")+
     ".\n\nНовых запросов ИИ не будет; ранее утверждённые переводы сохранятся.",
    confirmLabel:"✓ Утвердить "+check.pending.length+" переводов"
   });
   if(!ok)return;
   if(current?.id!==article||project?.slug!==slug||currentSourceRevision()!==rev||dirty)
     throw Error("Статья изменилась до подтверждения.");
   b.disabled=true;b.textContent="⌛ Утверждаем…";
   const result=await request("/review-all-translations","POST",{post_id:article,source_revision:rev},{timeoutMs:30000});
   if(result.reviewed!==true||result.languages_ready!==8)
     throw Error("Сервер не подтвердил все языки.");
   await translationsForCurrent();
   toast("Утверждено переводов: "+result.newly_approved+". Все 8 языков готовы к публикации.");
  }catch(error){
   try{if(current?.id===article)await translationsForCurrent()}catch(_){}
   throw error;
  }finally{
   bulkApproving=false;b.textContent="✓ Утвердить все переводы";updateApprovalUI();
  }
 }
 async function translationsForCurrent(){
   const sequence=++translationRefreshSeq,sourceId=current?.id;
  const host=$("translationList"),notice=$("translationStatus"),button=$("translateArticle");
  if(!aiRole()){translations=[];host.innerHTML="";notice.textContent="Переводы создаёт и проверяет редакция.";button.disabled=true;$("translateAll").disabled=true;updateApprovalUI();return}
  if(!current?.id){translations=[];host.innerHTML="";notice.textContent="Сначала сохраните статью.";button.disabled=true;$("translateAll").disabled=true;updateApprovalUI();return}
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
   (chiefRoleAi()&&(stale?x.source_revision<currentSourceRevision():x.status!=="reviewed")?'<button type="button" data-ai-translation-approve="'+E(x.locale)+'">'+(stale?"↻ Повторно утвердить":"✓ Проверить")+'</button>':"")+'</div></div>'
  }).join("");
  host.innerHTML=rows||'<p class="small muted">Переводов пока нет. Выберите язык и нажмите «Перевести статью».</p>';
  const verified=translations.filter(x=>x.status==="reviewed"&&x.source_revision===currentSourceRevision()).map(x=>x.locale);
  const missing=Object.keys(locales).filter(k=>k!==current.locale&&!verified.includes(k));
  notice.textContent="Проверено языков: "+(1+verified.length)+" / 8. "+
    (missing.length?"Нужно проверить: "+missing.map(x=>locales[x]||x).join(", ")+". ":"Все языки проверены. ")+
    (providerReady?"Недостающие переводы можно создать здесь.":"Для автоперевода нужен AI-провайдер.");
  updateApprovalUI();
 }
 async function translate(){
  if(!aiRole())throw Error("Перевод доступен только редакции");
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
  }finally{busy=false;$("translateArticle").textContent="✦ Перевести статью";$("translateArticle").disabled=!providerReady;updateApprovalUI();}
 }
 function validBulkStatus(){
  return !!current?.id && ["draft","changes_requested","in_review","approved","scheduled","published"].includes(current.status)
    && !dirty && providerReady;
 }
 function clearBulk(){
  pendingBulkPlan=null;
  $("translateAllConfirm").hidden=true;
 }
 function bulkMessage(message,error=false){
  const el=$("translationStatus");
  el.textContent=message;el.dataset.error=error?"true":"false";
 }
 function missingBulk(){
  const revision=currentSourceRevision();
  return Object.keys(locales).filter(locale=>locale!==current.locale &&
    !translations.some(t=>t.locale===locale&&t.source_revision===revision));
 }
 async function prepareTranslateAll(){
  if(!aiRole())throw Error("Перевод доступен только редакции");
  if(busy||bulkStarting)return;
  clearBulk();
  if(!current?.id){bulkMessage("Сначала сохраните исходную статью.",true);return}
  if(dirty){bulkMessage("Сначала сохраните несохранённые изменения статьи.",true);return}
  if(!providerReady){bulkMessage("ИИ-провайдер не подключён. Проверьте статус в ИИ-редакции.",true);return}
  if(!validBulkStatus()){bulkMessage("Для статьи с таким статусом перевод недоступен.",true);return}
  const postId=current.id,projectSlug=project.slug;
  try{await translationsForCurrent()}
  catch(error){bulkMessage("Не удалось проверить готовые переводы: "+error.message,true);return}
  if(current?.id!==postId||project?.slug!==projectSlug)return;
  const todo=missingBulk();
  if(!todo.length){
   bulkMessage("Все остальные языки уже переведены для этой версии статьи. Проверяйте готовые переводы, повторно платить не нужно.");
   return;
  }
  pendingBulkPlan={postId,projectSlug,revision:currentSourceRevision(),languages:todo};
  $("translateAllConfirmDetails").textContent=
   "Нужно перевести ("+todo.length+"): "+todo.map(key=>locales[key]).join(", ")+
   ". Каждый язык — отдельный платный запрос ИИ. Уже созданные переводы сохранятся, новые потребуют проверки редактором.";
  $("translateAllConfirm").hidden=false;
  bulkMessage("Проверьте языки и подтвердите платную генерацию ниже. Запросы ещё не отправлены.");
  $("translateAllConfirm").scrollIntoView({behavior:"smooth",block:"nearest"});
 }
 function bulkError(error){
  const message=String(error?.message||error||"Неизвестная ошибка");
  if(/ожидания ответа|AbortError|TimeoutError|Failed to fetch/i.test(message))
    return "Не получено подтверждение результата. Проверьте статусы переводов до повторной генерации.";
  if(/AI_PROVIDER_NOT_CONFIGURED|AI provider is not yet configured/i.test(message))
    return "На сервере не настроен AI-провайдер.";
  if(/429|rate limit|quota/i.test(message))return "Достигнут лимит ИИ.";
  return message;
 }
 async function translateAll(){
  if(busy||!pendingBulkPlan)return;
  const plan=pendingBulkPlan;
  if(!validBulkStatus()||current?.id!==plan.postId||project?.slug!==plan.projectSlug||
      currentSourceRevision()!==plan.revision){
    clearBulk();bulkMessage("Статья изменилась. Повторно проверьте список языков.",true);return;
  }
  // A second browser tab might have translated some languages while this
  // confirmation was open. Never duplicate a paid translation blindly.
  try{await translationsForCurrent()}
  catch(error){clearBulk();bulkMessage("Не удалось проверить сервер: "+error.message,true);return}
  if(JSON.stringify(missingBulk())!==JSON.stringify(plan.languages)){
    clearBulk();bulkMessage("Список языков изменился. Подтвердите перевод заново.",true);return;
  }
  clearBulk();
  busy=true;
  $("translateAll").disabled=true;$("translateArticle").disabled=true;
  $("translateAllConfirmYes").disabled=true;
  $("translateAll").textContent="⌛ Создаём переводы…";
  let done=0;
  const errors=[];
  try{
    for(let i=0;i<plan.languages.length;i++){
      const locale=plan.languages[i];
      if(current?.id!==plan.postId||project?.slug!==plan.projectSlug||
          currentSourceRevision()!==plan.revision||dirty){
        errors.push("Статья изменилась во время перевода. Оставшиеся запросы отменены.");
        break;
      }
      bulkMessage("Перевод "+(i+1)+" / "+plan.languages.length+" — "+locales[locale]+". Готово: "+done+".");
      try{
        const response=await request("/translate","POST",{post_id:plan.postId,locale},{timeoutMs:120000});
        if(!response.translated)throw Error(response.error||"Перевод не завершён");
        done++;
      }catch(error){
        errors.push(locales[locale]+": "+bulkError(error));
        // An unknown timeout may still complete and bill on the server.
        // Do not automatically retry or continue after uncertain failures.
        if(/ожидания|соединение|Failed to fetch|AbortError|provider|key|ключ|401|403|429|quota/i.test(String(error.message||error)))break;
      }
    }
    try{await translationsForCurrent()}catch(error){
      errors.push("Не удалось обновить итоговый список: "+error.message);
    }
    const message="Новых переводов: "+done+" из "+plan.languages.length+". "+
      (errors.length?"Проблемы: "+errors.join("; "):"Откройте каждый перевод для редакторской проверки.");
    bulkMessage(message,errors.length>0);
    toast(message,errors.length>0);
  }finally{
    busy=false;
    $("translateAllConfirmYes").disabled=false;
    $("translateAll").textContent="Перевести на все остальные языки";
    $("translateAll").disabled=!validBulkStatus();
    $("translateArticle").disabled=!validBulkStatus();
    updateApprovalUI();
  }
 }
 function showTranslation(locale,offerApproval=false){
  const t=translations.find(x=>x.locale===locale);if(!t)return;
  const area=$("translationPreview");area.hidden=false;
  const stale=t.source_revision!==currentSourceRevision();
  const canApprove=offerApproval&&chiefRoleAi()&&!dirty&&(stale?t.source_revision<currentSourceRevision():t.status!=="reviewed");
  pendingReviewLocale=canApprove?locale:null;pendingReviewRevision=canApprove?currentSourceRevision():null;
  area.innerHTML='<div class="studio-translation-preview-content"><div class="eyebrow">'+E(locales[locale]||locale)+' · '+
   (stale?"Перевод предыдущей редакции "+t.source_revision:t.status==="reviewed"?"Проверено редакцией":"Черновик перевода")+
   '</div><h3>'+E(t.title)+'</h3><p>'+E(t.summary)+'</p>'+
   (t.blocks||[]).map(b=>b.type==="heading"?'<h3>'+E(b.text)+'</h3>':
    b.type==="text"||b.type==="quote"?'<p>'+E(b.text)+'</p>':
    b.type==="image"?'<p class="muted small">📷 '+E(b.caption||b.alt||"Фото сохранено")+'</p>':
    b.type==="link"?'<p class="muted small">↗ '+E(b.label||"Ссылка")+'</p>':"").join("")+'</div>'+
   (canApprove?'<div class="studio-translation-approval">'+
    (stale?'<p><b>Перевод редакции '+Number(t.source_revision)+' → '+Number(currentSourceRevision())+'.</b> Сравните его с актуальным оригиналом. Повторное утверждение сохранит текст без генерации ИИ. Если смысл статьи изменился, вместо этого создайте новый перевод.</p>':'<p><b>Проверьте весь перевод.</b> Подтверждение сделает языковую версию доступной читателям опубликованной статьи.</p>')+
    '<div class="btns"><button type="button" class="primary" data-ai-translation-confirm="'+E(locale)+'">'+(stale?"↻ Повторно утвердить без ИИ":"✓ Подтвердить проверку")+'</button>'+
    '<button type="button" data-ai-translation-cancel>Отмена</button></div></div>':"");
  if(offerApproval)area.scrollIntoView({behavior:"smooth",block:"center"});
 }
 async function reviewTranslation(locale){
  if(!chiefRoleAi())throw Error("Только главный редактор подтверждает переводы");
  if(locale!==pendingReviewLocale)throw Error("Откройте перевод и проверьте его перед подтверждением");
  if(approvingLocale)return;
  const t=translations.find(x=>x.locale===locale);
  if(!t||!Number.isInteger(t.source_revision))throw Error("Перевод отсутствует. Обновите список.");
  const targetRevision=currentSourceRevision(),stale=t.source_revision!==targetRevision;
  if(dirty||pendingReviewRevision!==targetRevision)throw Error("Исходная статья изменилась. Сохраните её и проверьте перевод снова.");
  if(stale&&t.source_revision>=targetRevision)throw Error("Некорректная версия перевода. Обновите список.");
  if(!stale&&t.status==="reviewed"){pendingReviewLocale=null;pendingReviewRevision=null;await translationsForCurrent();return}
  const postId=current.id;
  approvingLocale=locale;
  const approveButton=$("translationPreview").querySelector("[data-ai-translation-confirm]");
  if(approveButton){approveButton.disabled=true;approveButton.textContent="⌛ Подтверждаю…"}
  $("translationStatus").textContent="Подтверждаю перевод "+(locales[locale]||locale)+"…";
  try{
    const result=await request("/review-translation","POST",{post_id:postId,locale,...(stale?{reuse_existing:true,source_revision:targetRevision,previous_source_revision:t.source_revision}:{})},{timeoutMs:20000});
    if(stale&&result.reused!==true)throw Error("Сервер не подтвердил повторное утверждение.");
    if(result.reviewed!==true)throw Error("Сервер не подтвердил перевод");
    await translationsForCurrent();
    pendingReviewLocale=null;pendingReviewRevision=null;
    $("translationPreview").hidden=true;
    toast("Перевод на "+(locales[locale]||locale)+(stale?" повторно утверждён без генерации ИИ.":" подтверждён редакцией."));
  }catch(e){
    // The connection may fail after the server has already committed approval.
    // Re-read the authoritative status rather than doing an unsafe blind retry.
    try{await translationsForCurrent()}catch(_){}
    const updated=translations.find(x=>x.locale===locale);
    if(current?.id===postId && updated?.status==="reviewed" &&
       updated.source_revision===currentSourceRevision()){
      pendingReviewLocale=null;pendingReviewRevision=null;
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
 openPost=async function(id){clearBulk();await prevOpen(id);await translationsForCurrent()};
 const prevCreate=createPost;
 createPost=async function(...args){clearBulk();await prevCreate(...args);translations=[];$("translationList").innerHTML="";$("translationPreview").hidden=true;await translationsForCurrent()};
 const prevSave=savePost;
 savePost=async function(...args){clearBulk();await prevSave(...args);await translationsForCurrent()};
 const prevShow=showTab;
 showTab=async function(target,...args){
  if(target==="ai-studio"&&!aiRole()){toast("ИИ-редакция доступна только редакторам.",true);return}
  await prevShow(target,...args);
  if(target==="ai-studio")await refreshAI();
  if(target==="editor")await translationsForCurrent();
 };
 const prevChange=changeProject;
 changeProject=async function(...args){clearBulk();selected=null;jobs=[];schedules=[];translations=[];await prevChange(...args);if(aiRole())await refreshAI()};
 document.addEventListener("click",event=>{
  const b=event.target.closest("button");if(!b)return;
  if(b.dataset.aiPersona!==undefined){selected=b.dataset.aiPersona;personas()}
  if(b.dataset.aiOpen!==undefined)run(()=>openPost(b.dataset.aiOpen));

 });
 $("aiGenerate").onclick=()=>run(generate);
 $("aiRefresh").onclick=()=>run(refreshAI);
 $("aiSaveSchedule").onclick=()=>run(saveSchedule);
 $("aiPersonaSave").onclick=()=>run(savePersonaWritingSettings);
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
    pendingReviewLocale=null;pendingReviewRevision=null;$("translationPreview").hidden=true;
  }
 });
 $("translationApproveAll").onclick=()=>run(approveAllTranslations);
 $("translationRefresh").onclick=()=>run(async()=>{
   await translationsForCurrent();
   toast("Статусы переводов обновлены с сервера.");
 });
 $("translateArticle").onclick=()=>run(translate);
 $("translateAll").onclick=()=>run(prepareTranslateAll);
 $("translateAllConfirmYes").onclick=()=>{
   // Lock synchronously; otherwise two quick taps could both pass the
   // server preflight and incur duplicate paid translations.
   if(bulkStarting||busy)return;
   bulkStarting=true;
   $("translateAllConfirmYes").disabled=true;
   void run(translateAll).finally(()=>{
     bulkStarting=false;
     $("translateAllConfirmYes").disabled=false;
   });
 };
 $("translateAllConfirmNo").onclick=()=>{
   clearBulk();
   bulkMessage("Перевод отменён до отправки платных запросов.");
 };
 $("aiScheduleEnabled").onchange=()=>{$("aiScheduleInfo").textContent=$("aiScheduleEnabled").checked?"Новые материалы будут создаваться по расписанию, только если сохраните настройки.":"Автогенерация выключена. Сохраните настройки.";$("aiSaveSchedule").disabled=!selected||busy||(!providerReady&&$("aiScheduleEnabled").checked);};
 window.StudioAI={refresh:refreshAI,translations:translationsForCurrent,health};
})();