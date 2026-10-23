"use strict";
/* AI editorial frontend: generation, schedules and protected human-reviewed translations. */
(function(){
 const $=id=>document.getElementById(id);
 const E=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 const aiRole=()=>["owner","chief_editor","editor"].includes(project?.role||"");
 const chiefRoleAi=()=>["owner","chief_editor"].includes(project?.role||"");
 const locales={ru:"Русский","pt-PT":"Português (PT)",en:"English",uk:"Українська",es:"Español",fr:"Français",de:"Deutsch",it:"Italiano"};
 let selected=null,schedules=[],jobs=[],translations=[],busy=false,providerReady=false,lastPhotoCache=new Map();
 async function request(path,method="GET",body){
  if(!session?.access_token)throw Error("Войдите в редакцию");
  const callOnce=()=>fetch("https://npsfaymjckcqhtyiafms.supabase.co/functions/v1/studio-ai"+path,{method,headers:{"apikey":PUBLIC_KEY,"Authorization":"Bearer "+session.access_token,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
  let r=await callOnce();
  if(r.status===401&&session.refresh_token){session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});sessionStorage.setItem("journal_session",JSON.stringify(session));r=await callOnce()}
  const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Ошибка ИИ-сервера");return j;
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
  $("aiSaveSchedule").disabled=!providerReady||!selected||busy;
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
  personas();jobsList();
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
 async function translationsForCurrent(){
  const host=$("translationList"),notice=$("translationStatus"),button=$("translateArticle");
  if(!current?.id){translations=[];host.innerHTML="";notice.textContent="Сначала сохраните статью.";button.disabled=true;return}
  button.disabled=!providerReady||busy||!editable()||dirty;
  $("translateAll").disabled=!providerReady||busy||!editable()||dirty;
  const r=await request("/translations?post_id="+encodeURIComponent(current.id));
  translations=r.translations||[];
  const rows=translations.map(x=>{
   const stale=x.source_revision!==current.revision;
   return '<div class="ai-translation-item"><div><b>'+E(locales[x.locale]||x.locale)+'</b> <span class="chip '+(stale?"amber":x.status==="reviewed"?"":"gray")+'">'+(stale?"Устарел":x.status==="reviewed"?"Проверен":"Ожидает редактора")+'</span><div class="small muted">'+E(x.title)+'</div></div><div class="btns"><button type="button" data-ai-translation-view="'+E(x.locale)+'">Просмотр</button>'+
   (chiefRoleAi()&&!stale&&x.status!=="reviewed"?'<button type="button" data-ai-translation-approve="'+E(x.locale)+'">✓ Проверить</button>':"")+'</div></div>'
  }).join("");
  host.innerHTML=rows||'<p class="small muted">Переводов пока нет. Выберите язык и нажмите «Перевести статью».</p>';
  notice.textContent=providerReady?"Модель переводит только текст. Переводы нужно проверить перед утверждением статьи.":"Для запуска перевода нужен API-ключ сервера.";
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
  const todo=all.filter(locale=>!translations.some(t=>t.locale===locale&&t.source_revision===current.revision));
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
function showTranslation(locale){
  const t=translations.find(x=>x.locale===locale);if(!t)return;
  const area=$("translationPreview");area.hidden=false;
  area.innerHTML='<div class="eyebrow">'+E(locales[locale]||locale)+' · '+(t.status==="reviewed"?"Проверено редакцией":"Черновик перевода")+'</div><h3>'+E(t.title)+'</h3><p>'+E(t.summary)+'</p>'+
   (t.blocks||[]).map(b=>b.type==="heading"?'<h3>'+E(b.text)+'</h3>':b.type==="text"||b.type==="quote"?'<p>'+E(b.text)+'</p>':b.type==="image"?'<p class="muted small">📷 '+E(b.caption||b.alt||"Фото сохранено")+'</p>':b.type==="link"?'<p class="muted small">↗ '+E(b.label||"Ссылка")+'</p>':"").join("");
 }
 async function reviewTranslation(locale){
  if(!chiefRoleAi())throw Error("Проверку выполняет главный редактор");
  if(!confirm("Вы проверили текст и подтверждаете перевод на "+(locales[locale]||locale)+"?"))return;
  await request("/review-translation","POST",{post_id:current.id,locale});
  await translationsForCurrent();toast("Перевод отмечен проверенным и будет включён в утверждённую версию.");
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
  if(b.dataset.aiTranslationView!==undefined)showTranslation(b.dataset.aiTranslationView);
  if(b.dataset.aiTranslationApprove!==undefined)run(()=>reviewTranslation(b.dataset.aiTranslationApprove));
 });
 $("aiGenerate").onclick=()=>run(generate);
 $("aiRefresh").onclick=()=>run(refreshAI);
 $("aiSaveSchedule").onclick=()=>run(saveSchedule);
 $("translateArticle").onclick=()=>run(translate);
 $("translateAll").onclick=()=>run(translateAll);
 $("aiScheduleEnabled").onchange=()=>{$("aiScheduleInfo").textContent=$("aiScheduleEnabled").checked?"Новые материалы будут создаваться по расписанию, только если сохраните настройки.":"Автогенерация выключена. Сохраните настройки."};
 window.StudioAI={refresh:refreshAI,translations:translationsForCurrent,health};
})();