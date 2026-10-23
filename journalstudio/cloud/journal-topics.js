"use strict";
/* Scoped editorial topics. No direct database access or privileged client credentials. */
(function(){
 const $=id=>document.getElementById(id);
 const safe=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let editing=null,media=[],loading=false,activeProject=null;
 const status=(m)=>{$("studioTopicStatus").textContent=m||""};
 const isEditor=()=>["owner","chief_editor","editor"].includes(project?.role||"");
 function mediaOption(row){return '<option value="'+safe(row.id)+'">'+safe((row.alt||row.id).slice(0,70))+'</option>'}
 function fillMediaSelect(selected){
  const el=$("topicImageSelect");if(!el)return;
  el.innerHTML='<option value="">Без изображения</option>'+media.map(mediaOption).join("");
  if(selected&&!media.some(m=>m.id===selected))el.insertAdjacentHTML("beforeend",'<option value="'+safe(selected)+'">Ранее выбранное изображение</option>');
  el.value=selected||"";
  previewMedia();
 }
 function updateCrop(){
  const x=Number($("topicFocusX").value),y=Number($("topicFocusY").value);
  $("topicFocusXValue").textContent=x+"%";$("topicFocusYValue").textContent=y+"%";
  $("topicImagePreviewImg").style.objectPosition=x+"% "+y+"%";
 }
 async function previewMedia(){
  const id=$("topicImageSelect").value,preview=$("topicImagePreview"),
    record=media.find(m=>m.id===id);
  if(!id){preview.hidden=true;return}
  preview.hidden=false;
  const img=$("topicImagePreviewImg");img.hidden=true;
  const slug=project?.slug;
  let url=record?.thumb_url||null;
  if(!url){
    try{
      const result=await call("/media/"+encodeURIComponent(id)+"?variant=cover");
      url=result.url||null;
      if(record&&url)record.thumb_url=url;
    }catch(e){status("Снимок сохранён; предпросмотр пока недоступен: "+e.message)}
  }
  if(project?.slug!==slug || $("topicImageSelect").value!==id)return;
  if(url){img.src=url;img.hidden=false}
  updateCrop();
 }
 async function loadMedia(){
  if(!project?.slug)return;
  const slug=project.slug;status("Загружаю одобренные изображения...");
  // Load all authorized media pages without silently limiting topic images
  // to the most recent 24 uploads.
  const all=[],seen=new Set();
  let offset=0,hasMore=true;
  while(hasMore && offset<=1000 && project?.slug===slug){
    const result=await call("/media/library?project="+encodeURIComponent(slug)+"&source=all&offset="+offset+"&limit=24");
    for(const item of result.items||[]){
      if(!seen.has(item.id)){seen.add(item.id);all.push(item)}
    }
    hasMore=result.has_more===true;
    offset=result.next_offset??(offset+24);
  }
  if(project?.slug!==slug)return;
  media=all;activeProject=slug;fillMediaSelect(editing?.image_asset_id||null);
  status((hasMore?"Показана часть медиатеки. ":"")+"Доступно изображений: "+media.length+".");
  render();
 }
 function render(){
  const host=$("studioTopicList");if(!host||!project)return;
  const writable=isEditor();
  $("studioTopicForm").hidden=!writable;
  $("topicsRefresh").disabled=loading;
  host.innerHTML=topics.length?topics.map(t=>{
   const image=media.find(m=>m.id===t.image_asset_id);
   return '<article class="studio-topic-card"><div class="studio-topic-image">'+
    (image?.thumb_url?'<img src="'+safe(image.thumb_url)+'" alt="'+safe(t.title)+'" style="object-position:'+Number(t.focus_x??50)+'% '+Number(t.focus_y??50)+'%">':'<span style="font-size:30px">🌿</span>')+
    '</div><div class="studio-topic-card-content"><h3>'+safe(t.title)+'</h3>'+
    '<p class="muted">'+safe(t.slug)+' · v'+Number(t.revision||1)+(t.is_active?'':' · Скрыта')+
    ' · '+(1+["en","pt-PT","uk","es","fr","de","it"].filter(k=>t.translations?.[k]?.trim()).length)+'/8 языков</p>'+
    (writable?'<div class="btns"><button type="button" data-topic-edit="'+safe(t.id)+'">Изменить</button>'+
      '<button type="button" data-topic-toggle="'+safe(t.id)+'">'+(t.is_active?'Скрыть':'Показать')+'</button></div>':'')+'</div></article>';
  }).join(""):'<p class="small muted">Тем пока нет. Создайте первую тему и выберите для неё изображение.</p>';
 }
 async function reload(){
  const slug=project?.slug;if(!slug)return;
  const result=await call("/topics?project="+encodeURIComponent(slug));
  if(project?.slug!==slug)return;
  topics=result.topics||[];render();
 }
 function reset(){
  editing=null;$("studioTopicForm").reset();$("topicSlugInput").disabled=false;
  $("topicSave").textContent="+ Создать тему";$("topicCancel").hidden=true;
  $("topicFocusX").value=50;$("topicFocusY").value=50;updateCrop();
  fillMediaSelect(null);status("");
 }
 async function edit(id){
  const t=topics.find(item=>item.id===id);if(!t)return;
  editing=t;$("topicTitleInput").value=t.title;$("topicSlugInput").value=t.slug;
  $("topicSlugInput").disabled=true;$("topicTitlePt").value=t.translations?.["pt-PT"]||"";
  for(const [lang,input] of [["en","topicTitleEn"],["uk","topicTitleUk"],["fr","topicTitleFr"],["de","topicTitleDe"],["es","topicTitleEs"],["it","topicTitleIt"]]){
    $(input).value=t.translations?.[lang]||"";
  }
  $("topicFocusX").value=Number(t.focus_x??50);$("topicFocusY").value=Number(t.focus_y??50);
  updateCrop();
  $("topicSave").textContent="Сохранить тему";$("topicCancel").hidden=false;
  if(activeProject!==project?.slug)await loadMedia();fillMediaSelect(t.image_asset_id);
  $("studioTopicForm").scrollIntoView({behavior:"smooth",block:"center"});
 }
 async function translateAllTopics(){
  if(!isEditor())throw Error("Переводы доступны редактору");
  const source=$("topicTitleInput").value.trim(),locale=$("topicSourceLocale").value;
  if(!source)throw Error("Сначала введите название темы");
  if(!confirm("Сгенерировать 8 вариантов названия с помощью ИИ? Могут применяться расходы на API. Все переводы нужно проверить перед сохранением."))return;
  const button=$("topicTranslateAll");button.disabled=true;
  status("Генерируем варианты на 8 языков. После получения проверьте каждый перевод.");
  try{
   const endpoint=API_ROOT+"/functions/v1/studio-ai/translate-topic";
   const doRequest=()=>fetch(endpoint,{method:"POST",headers:{
     apikey:PUBLIC_KEY,Authorization:"Bearer "+session.access_token,
     "Content-Type":"application/json"},body:JSON.stringify({
       project:project.slug,title:source,locale})});
   let response=await doRequest();
   if(response.status===401&&session.refresh_token){
    session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
    sessionStorage.setItem("journal_session",JSON.stringify(session));response=await doRequest();
   }
   const result=await response.json().catch(()=>({}));
   if(!response.ok)throw Error(result.error||"Сервис перевода недоступен");
   const t=result.translations||{};
   if(!["ru","en","pt-PT","uk","fr","de","es","it"].every(k=>typeof t[k]==="string"&&t[k].trim()))throw Error("Переводы неполные");
   // Fill only blank translations: previously reviewed/manual titles remain.
   if(locale!=="ru")$("topicTitleInput").value=t.ru;
   if(!$("topicTitlePt").value.trim())$("topicTitlePt").value=t["pt-PT"];
   for(const [lang,id] of [["en","topicTitleEn"],["uk","topicTitleUk"],
      ["fr","topicTitleFr"],["de","topicTitleDe"],["es","topicTitleEs"],
      ["it","topicTitleIt"]]){
     if(!$(id).value.trim())$(id).value=t[lang];
   }
   $("topicSourceLocale").value="ru";
   status("Варианты для восьми языков заполнены. Проверьте каждый текст перед сохранением.");
  } finally {button.disabled=false}
 }
 async function save(){
  if(!isEditor())throw Error("Создавать темы может только редактор");
  const title=$("topicTitleInput").value.trim(),slug=$("topicSlugInput").value.trim().toLowerCase();
  if(!title||!/^[a-z0-9-]{2,60}$/.test(slug))throw Error("Укажите название и короткий код латиницей");
  const pt=$("topicTitlePt").value.trim();
  const translations={...(editing?.translations||{})};
  if(pt)translations["pt-PT"]=pt;else delete translations["pt-PT"];
  for(const [lang,input] of [["en","topicTitleEn"],["uk","topicTitleUk"],["fr","topicTitleFr"],["de","topicTitleDe"],["es","topicTitleEs"],["it","topicTitleIt"]]){
    const value=$(input).value.trim();
    if(value)translations[lang]=value;else delete translations[lang];
  }
  const missing=["en","pt-PT","uk","es","fr","de","it"].filter(k=>!translations[k]?.trim());
  if(missing.length)throw Error("Добавьте проверенные переводы для всех 8 языков: "+missing.join(", "));
  const payload={project:project.slug,title,slug,translations,image_asset_id:$("topicImageSelect").value||null,
    focus_x:Number($("topicFocusX").value),focus_y:Number($("topicFocusY").value)};
  status("Сохраняю тему...");
  if(editing){
   await call("/topics/"+editing.id,"PATCH",{...payload,expected_revision:editing.revision});
  }else{
   await call("/topics","POST",payload);
  }
  reset();await reload();toast("Тема сохранена. Изменения появятся в журнале после обновления данных.");
 }
 async function toggle(id){
  const t=topics.find(item=>item.id===id);if(!t||!isEditor())return;
  if(t.is_active&&!confirm("Скрыть тему в приложении? Статьи останутся опубликованными."))return;
  await call("/topics/"+id,"PATCH",{project:project.slug,expected_revision:t.revision,is_active:!t.is_active});
  await reload();
 }
 async function uploadImage(){
  if(!isEditor())throw Error("Нет права загружать темы");
  const f=$("topicNewImage").files?.[0];
  if(!f||!["image/png","image/jpeg","image/webp"].includes(f.type)||f.size>8*1024*1024)throw Error("Выберите PNG, JPG или WebP до 8 МБ");
  if(!$("topicImageRights").checked)throw Error("Подтвердите права на использование изображения");
  const holder=$("topicImageCopyright").value.trim();
  if(!holder)throw Error("Укажите правообладателя");
  status("Загружаю изображение...");
  const base64=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result).split(",")[1]);r.onerror=reject;r.readAsDataURL(f)});
  const result=await call("/media","POST",{project:project.slug,mime:f.type,base64,rights_confirmed:true,copyright_holder:holder,license:"editorial-permission",alt_text:f.name});
  await loadMedia();
  let signed=null;
  try{const response=await call("/media/"+encodeURIComponent(result.asset.id)+"?variant=cover");signed=response.url||null}catch(e){}
  if(!media.some(m=>m.id===result.asset.id)){
   media.unshift({id:result.asset.id,alt:f.name,thumb_url:signed});
  }else if(signed){
   media.find(m=>m.id===result.asset.id).thumb_url=signed;
  }
  fillMediaSelect(result.asset.id);
  await previewMedia();
  status("Изображение загружено. Нажмите «Сохранить тему», чтобы привязать его к теме.");
 }
 document.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.topicEdit)return void run(()=>edit(b.dataset.topicEdit));
  if(b.dataset.topicToggle)return void run(()=>toggle(b.dataset.topicToggle));
 });
 $("studioTopicForm").addEventListener("submit",e=>{e.preventDefault();run(save)});
 $("topicsRefresh").onclick=()=>run(async()=>{await reload();await loadMedia();render()});
 $("topicMediaRefresh").onclick=()=>run(async()=>{await loadMedia();render()});
 $("topicCancel").onclick=reset;
 $("topicUploadImage").onclick=()=>run(uploadImage);
 $("topicTranslateAll").onclick=()=>run(translateAllTopics);
 $("topicImageSelect").onchange=()=>run(previewMedia);
 for(const id of ["topicFocusX","topicFocusY"]){$(id).oninput=()=>{updateCrop();if(editing)status("Кадрирование изменено. Нажмите «Сохранить тему».");}}
 $("topicImagePreviewImg").onerror=()=>{status("Изображение недоступно по временной ссылке. Обновите медиатеку.");};
 document.addEventListener("click",e=>{
  if(e.target.closest('[data-open-tab="library"],[data-tab="library"]')){
   if(project?.slug&&activeProject!==project.slug)void run(async()=>{await loadMedia();render()});
  }
 });
 window.StudioTopics={render,reload,loadMedia};
})();