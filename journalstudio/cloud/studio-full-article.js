"use strict";
/* One explicit editor-approved paid run: 1 article, 4 images, 7 translations.
   All source articles and completed assets are persisted as ordinary Studio
   drafts, and every retry first reads the authoritative server state. */
(function(){
 const $=id=>document.getElementById(id);
 const LANGS=["ru","pt-PT","en","uk","es","fr","de","it"];
 const LABELS={ru:"Русский","pt-PT":"Português (PT)",en:"English",uk:"Українська",
  es:"Español",fr:"Français",de:"Deutsch",it:"Italiano"};
 const root="https://npsfaymjckcqhtyiafms.supabase.co/functions/v1";
 const permitted=()=>["owner","chief_editor","editor"].includes(project?.role||"");
 let active=false,pendingPlan=null;
 const stageKey=()=>session?.user?.id&&project?.slug?
  "studio-full-article-v1:"+session.user.id+":"+project.slug:null;
 const postIdValid=id=>typeof id==="string"&&/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id);
 const selectedAuthor=()=>document.querySelector("#aiPersonaCards [data-ai-persona].selected")?.dataset.aiPersona||null;
 function getSaved(){
  const key=stageKey();if(!key)return null;
  try{
   const state=JSON.parse(sessionStorage.getItem(key)||localStorage.getItem(key)||"null");
   if(state?.startedAt&&Date.now()-new Date(state.startedAt).getTime()>14*86400000)return null;
   return state?.project===project.slug && state.userId===session.user.id &&
    (state.postId===null||postIdValid(state.postId))?state:null;
  }catch{return null}
 }
 function remember(state){
  const key=stageKey();
  if(key){
   const saved=JSON.stringify(state);
   sessionStorage.setItem(key,saved);
   try{localStorage.setItem(key,saved)}catch{}
  }
  $("aiFullOpenDraft").hidden=!postIdValid(state?.postId);
  $("aiFullReset").hidden=!state;
 }
 function clearSaved(){
  const key=stageKey();
  if(key){
   sessionStorage.removeItem(key);
   try{localStorage.removeItem(key)}catch{}
  }
  $("aiFullReset").hidden=true;
 }
 function notice(message,done=0,error=false){
  const el=$("aiFullStatus");
  if(!el)return;
  el.textContent=message;
  el.style.color=error?"#ad4937":"";
  $("aiFullProgress").hidden=false;
  $("aiFullProgressFill").style.width=Math.max(0,Math.min(done,12))/12*100+"%";
 }
 function safe(text,max=360){return String(text||"").replace(/\s+/g," ").trim().slice(0,max)}
 async function api(path,method="GET",payload,timeout=160000){
  if(!session?.access_token)throw Error("Войдите в редакцию заново.");
  const fetchOnce=()=>fetch(root+path,{
   method,signal:AbortSignal.timeout(timeout),
   headers:{"apikey":PUBLIC_KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},
   body:payload?JSON.stringify(payload):undefined
  });
  let response=await fetchOnce();
  if(response.status===401&&session.refresh_token){
   session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
   sessionStorage.setItem("journal_session",JSON.stringify(session));
   response=await fetchOnce();
  }
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||"Ошибка сервера "+response.status);
  return data;
 }
 async function postInfo(id){
  const data=await call("/posts/"+encodeURIComponent(id));
  if(!data.post||data.post.id!==id)throw Error("Не удалось открыть сохранённый черновик");
  if(!["draft","changes_requested"].includes(data.post.status))
   throw Error("Материал уже отправлен на проверку или опубликован. Сначала откройте его для редактирования.");
  return data.post;
 }
 function paragraphTexts(post){
  return (post.blocks||[]).filter(b=>b.type==="text"&&safe(b.text).length>0).map(b=>safe(b.text,350));
 }
 function imagePrompt(post,slot){
  const paragraphs=paragraphTexts(post);
  const excerpt=slot===0?safe(post.summary,210):
   (paragraphs[Math.min(paragraphs.length-1,
      Math.max(0,Math.round((paragraphs.length-1)*slot/4)))]||safe(post.summary,210));
  return safe("Botanical editorial image "+(slot+1)+" of 4 for article: "+
   safe(post.title,135)+". "+(slot===0?"Cover scene showing the main subject. ":
   "Illustrate this specific section of the article: ")+excerpt+
   ". Natural realistic plants and credible horticulture, horizontal composition, original photo without text or watermark.",625);
 }
 function hasSlot(post,slot){
  if(slot===0)return !!post.cover_path;
  return (post.blocks||[]).some(b=>b.type==="image"&&b.studio_full_slot===slot&&postIdValid(b.asset_id));
 }
 function attachImage(post,slot,assetId){
  if(hasSlot(post,slot))return null;
  if(!postIdValid(assetId))throw Error("Сервер не подтвердил сохранение изображения");
  if(slot===0)return {cover_path:assetId,expected_revision:post.revision};
  const contents=[...(post.blocks||[])];
  const paragraphs=paragraphTexts(post);
  const near=paragraphs[Math.min(paragraphs.length-1,
   Math.max(0,Math.round((paragraphs.length-1)*slot/4)))]||safe(post.summary,220);
  const count=contents.filter(b=>b.type==="text"&&safe(b.text).length>0).length;
  const destination=Math.max(1,Math.ceil(count*slot/4));
  let at=contents.length,seen=0;
  for(let i=0;i<contents.length;i++){
   if(contents[i].type==="text"&&safe(contents[i].text))seen++;
   if(seen>=destination){at=i+1;break}
  }
  contents.splice(at,0,{type:"image",asset_id:assetId,
   alt:safe("Иллюстрация к статье «"+post.title+"»: "+near,280),
   caption:safe("Иллюстрация: "+near,190),studio_full_slot:slot});
  return {blocks:contents,expected_revision:post.revision};
 }
 async function imageFromExistingJob(state,post,slot,prompt){
  // The image function records each completed image job before returning.
  // Recover a result lost to a browser timeout rather than paying again.
  const saved=state.assetBySlot?.[slot];
  if(postIdValid(saved))return saved;
  const history=await api("/studio-image?project="+encodeURIComponent(state.project)+
   "&post_id="+encodeURIComponent(post.id),"GET",undefined,20000);
  const finished=(history.items||[]).find(j=>
   j.prompt===prompt&&j.status==="completed"&&postIdValid(j.asset_id));
  if(finished){
   state.assetBySlot[slot]=finished.asset_id;
   remember(state);
   return finished.asset_id;
  }
  // Pending processing means a request may still bill. Never double-send.
  if((history.items||[]).some(j=>j.prompt===prompt&&
    ["pending","processing","running"].includes(j.status)))
   throw Error("Изображение ещё обрабатывается на сервере. Продолжайте после проверки его статуса.");
  return null;
 }
 async function recoverText(state){
  if(postIdValid(state.postId))return;
  if(!state.textRequestedAt)return;
  const jobs=await api("/studio-ai/jobs?project="+encodeURIComponent(state.project),"GET",undefined,20000);
  const since=new Date(state.textRequestedAt).getTime()-1500;
  const found=(jobs.jobs||[]).find(j=>j.kind==="generate" &&
   j.author_id===state.authorId && j.topic===state.topic &&
   new Date(j.created_at).getTime()>=since && j.status==="completed" &&postIdValid(j.post_id));
  if(found){state.postId=found.post_id;remember(state);return}
  const unfinished=(jobs.jobs||[]).some(j=>j.kind==="generate"&&j.author_id===state.authorId&&
    j.topic===state.topic&&new Date(j.created_at).getTime()>=since&&
    ["pending","processing"].includes(j.status));
  if(unfinished)throw Error("Текст ещё создаётся на сервере. Не отправляйте повторный запрос.");
 }
 async function translations(post){
  const data=await api("/studio-ai/translations?post_id="+encodeURIComponent(post.id),"GET",undefined,25000);
  return data.translations||[];
 }
 async function perform(state){
  if(active)return;
  if(!permitted())throw Error("Полная генерация доступна только редакторам.");
  active=true;
  $("aiFullGenerate").disabled=true;$("aiFullConfirmYes").disabled=true;
  $("aiFullGenerate").textContent="⌛ Создаём статью…";
  $("aiFullConfirm").hidden=true;
  try{
   let completed=0;
   if(!state.postId){
    notice("Создание текста статьи. Первый платный запрос…",0);
    await recoverText(state);
    if(!state.postId){
     // Persist the intent before the network call so a reload can consult
     // job history rather than create a duplicate draft.
     if(state.textRequestedAt)throw Error("Результат предыдущего запроса не подтверждён. Проверьте раздел «Недавние задания» перед повтором.");
     state.textRequestedAt=new Date().toISOString();remember(state);
     const text=await api("/studio-ai/generate","POST",{
      project:state.project,author_id:state.authorId,locale:state.locale,topic:state.topic
     },120000);
     if(!postIdValid(text.post_id))throw Error("ИИ не подтвердил создание текстового черновика.");
     state.postId=text.post_id;remember(state);
    }
   }
   completed=1;
   let post=await postInfo(state.postId);
   notice("Текст сохранён как черновик «"+post.title+"». Подготавливаем 4 фотографии…",completed);
   for(let slot=0;slot<4;slot++){
    post=await postInfo(state.postId);
    if(hasSlot(post,slot)){completed++;continue}
    const prompt=imagePrompt(post,slot);
    notice("Фотография "+(slot+1)+" / 4. "+(slot===0?"Обложка":"Иллюстрация к абзацам")+
      " — подготовка…",completed);
    let asset=await imageFromExistingJob(state,post,slot,prompt);
    if(!asset){
     const result=await api("/studio-image","POST",{
      project:state.project,post_id:post.id,prompt,style:"editorial",
      size:"1536x1024",quality:"low"
     },165000);
     asset=result.asset_id;
     if(!postIdValid(asset))throw Error("Изображение могло сохраниться, но его ID не подтверждён. Откройте медиатеку перед повтором.");
     state.assetBySlot[slot]=asset;remember(state);
    }
    const body=attachImage(post,slot,asset);
    if(body){
     const saved=await call("/posts/"+encodeURIComponent(post.id),"PATCH",body);
     if(!saved.post||saved.post.id!==post.id)throw Error("Не удалось прикрепить фото к черновику. Его файл остаётся в медиатеке.");
    }
    completed++;
    notice("Сохранено фотографий: "+(slot+1)+" / 4.",completed);
   }
   post=await postInfo(state.postId);
   const expectedRevision=post.revision;
   for(const language of LANGS.filter(l=>l!==state.locale)){
    // Re-read authoritative translations every time, including after errors.
    const ready=(await translations(post)).some(t=>
      t.locale===language&&t.source_revision===expectedRevision);
    if(ready){completed++;continue}
    notice("Перевод "+LABELS[language]+". "+(completed-4)+" / 7 языков…",completed);
    const reply=await api("/studio-ai/translate","POST",{post_id:post.id,locale:language},120000);
    if(reply.translated!==true)throw Error("Перевод на "+LABELS[language]+" не подтверждён");
    completed++;
   }
   clearSaved();
   notice("Готово: 1 текст, 4 фотографии и 7 переводов. Открываю редактируемый черновик. Переводы ожидают проверки редактором.",12);
   await refreshPosts();
   await openPost(state.postId);
   toast("Полный черновик сохранён. Редактируйте как обычную статью; публикация только после утверждения.");
  }catch(error){
   notice("Приостановлено: "+(error?.message||error)+
    ". Уже созданные текст, изображения и переводы остаются на сервере. Нажмите «Продолжить» после проверки, чтобы не повторять оплаченные этапы.",
    progressEstimate(),true);
   $("aiFullOpenDraft").hidden=!postIdValid(state.postId);
   throw error;
  }finally{
   active=false;
   $("aiFullGenerate").disabled=false;$("aiFullConfirmYes").disabled=false;
   $("aiFullGenerate").textContent=getSaved()?"↻ Продолжить полную генерацию":"✦ Полная генерация статьи";
  }
 }
 function progressEstimate(){
  const state=getSaved();
  return state?.postId?1+Object.values(state.assetBySlot||{}).filter(postIdValid).length:0;
 }
 function restore(){
  if(!$("aiFullGenerate"))return;
  const state=getSaved();
  $("aiFullGenerate").textContent=state?"↻ Продолжить полную генерацию":"✦ Полная генерация статьи";
  $("aiFullOpenDraft").hidden=!postIdValid(state?.postId);
  $("aiFullReset").hidden=!state;
  if(state)notice("Незавершённая генерация: "+(state.postId?"черновик уже сохранён. ":"проверим создание текста. ")+
   "Нажмите «Продолжить» и подтвердите оставшиеся платные этапы.",progressEstimate());
 }
 function prepare(){
  if(active)return;
  if(!permitted()){notice("Функция доступна только редактору.",0,true);return}
  const stored=getSaved(),authorId=selectedAuthor();
  if(!stored&&!postIdValid(authorId)){
   notice("Сначала выберите ИИ-автора в блоке ниже.",0,true);return;
  }
  const topic=$("aiTopic").value.trim(),locale=$("aiLanguage").value;
  if(!stored&&!LANGS.includes(locale)){notice("Выберите язык статьи.",0,true);return}
  const plan=stored||{
   project:project.slug,userId:session.user.id,postId:null,
   authorId,topic:topic.slice(0,450),locale,assetBySlot:{},textRequestedAt:null,startedAt:new Date().toISOString()
  };
  pendingPlan=plan;
  $("aiFullConfirmDetails").textContent=(stored?
   "Продолжить сохранённый черновик с его темой и автором. Готовые этапы будут пропущены. ":
   "Новая статья по теме: "+(plan.topic||"авторская идея")+". ")+
   "Процесс может выполнить до 12 платных AI-запросов: 1 текст, 4 изображения и 7 переводов. "+
   "Фотографии: 1536×1024, экономичное качество. На сервере действует лимит 5 фото в сутки на пользователя и 40 в месяц на проект. "+
   "Каждый результат сохраняется в медиатеке/черновике. Переводы не публикуются без редакторской проверки. "+
   "Закрытие вкладки остановит последующие этапы, но сохранённый черновик можно продолжить позже.";
  $("aiFullConfirm").hidden=false;
  $("aiFullConfirm").scrollIntoView({behavior:"smooth",block:"nearest"});
  notice("Проверьте стоимость и ограничения и подтвердите запуск. Пока запросов к ИИ не было.",progressEstimate());
 }
 $("aiFullGenerate").onclick=prepare;
 $("aiFullConfirmNo").onclick=()=>{
  pendingPlan=null;$("aiFullConfirm").hidden=true;
  notice("Отменено до запуска новых платных запросов.",progressEstimate());
 };
 $("aiFullConfirmYes").onclick=()=>{
  if(active||!pendingPlan)return;
  const plan=pendingPlan;pendingPlan=null;
  // Single synchronous lock prevents duplicate AI requests on double taps.
  $("aiFullConfirmYes").disabled=true;
  void perform(plan).catch(error=>{
   console.warn("Journal Studio full draft interrupted",String(error));
  });
 };
 $("aiFullReset").onclick=()=>{
  if(active)return;
  // No server data is deleted; only the local resume pointer is cleared.
  clearSaved();pendingPlan=null;
  $("aiFullConfirm").hidden=true;
  $("aiFullGenerate").textContent="✦ Полная генерация статьи";
  $("aiFullOpenDraft").hidden=true;
  notice("Режим новой статьи. Предыдущий черновик и его фотографии сохранены в редакции и медиатеке.",0);
 };
 $("aiFullOpenDraft").onclick=()=>run(async()=>{
  const state=getSaved();if(!postIdValid(state?.postId))return;
  await openPost(state.postId);
 });
 window.StudioFullArticle={restore};
 restore();
})();
