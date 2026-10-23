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
 function previewMedia(){
  const preview=$("topicImagePreview");if(!preview)return;
  const id=$("topicImageSelect").value,record=media.find(m=>m.id===id);
  preview.hidden=!record?.thumb_url;
  preview.innerHTML=record?.thumb_url?'<img alt="Обложка темы" src="'+safe(record.thumb_url)+'">':"";
 }
 async function loadMedia(){
  if(!project?.slug)return;
  const slug=project.slug;status("Загружаю одобренные изображения...");
  const result=await call("/media/library?project="+encodeURIComponent(slug)+"&source=all&offset=0&limit=24");
  if(project?.slug!==slug)return;
  media=result.items||[];activeProject=slug;fillMediaSelect(editing?.image_asset_id||null);
  status(result.has_more?"Показаны последние 24 изображения. Для старых изображений можно использовать его ID в теме.":"Медиатека готова: "+media.length+" изображений.");
 }
 function render(){
  const host=$("studioTopicList");if(!host||!project)return;
  const writable=isEditor();
  $("studioTopicForm").hidden=!writable;
  $("topicsRefresh").disabled=loading;
  host.innerHTML=topics.length?topics.map(t=>{
   const image=media.find(m=>m.id===t.image_asset_id);
   return '<article class="studio-topic-card"><div class="studio-topic-image">'+
    (image?.thumb_url?'<img src="'+safe(image.thumb_url)+'" alt="'+safe(t.title)+'">':'<span style="font-size:30px">🌿</span>')+
    '</div><div class="studio-topic-card-content"><h3>'+safe(t.title)+'</h3>'+
    '<p class="muted">'+safe(t.slug)+' · v'+Number(t.revision||1)+(t.is_active?'':' · Скрыта')+'</p>'+
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
  fillMediaSelect(null);status("");
 }
 async function edit(id){
  const t=topics.find(item=>item.id===id);if(!t)return;
  editing=t;$("topicTitleInput").value=t.title;$("topicSlugInput").value=t.slug;
  $("topicSlugInput").disabled=true;$("topicTitlePt").value=t.translations?.["pt-PT"]||"";
  for(const [lang,input] of [["en","topicTitleEn"],["uk","topicTitleUk"],["fr","topicTitleFr"],["de","topicTitleDe"],["es","topicTitleEs"],["it","topicTitleIt"]]){
    $(input).value=t.translations?.[lang]||"";
  }
  $("topicSave").textContent="Сохранить тему";$("topicCancel").hidden=false;
  if(activeProject!==project?.slug)await loadMedia();fillMediaSelect(t.image_asset_id);
  $("studioTopicForm").scrollIntoView({behavior:"smooth",block:"center"});
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
  const payload={project:project.slug,title,slug,translations,image_asset_id:$("topicImageSelect").value||null};
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
  if(!media.some(m=>m.id===result.asset.id)){
   media.unshift({id:result.asset.id,alt:f.name,thumb_url:null});
  }
  fillMediaSelect(result.asset.id);
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
 $("topicImageSelect").onchange=previewMedia;
 document.addEventListener("click",e=>{
  if(e.target.closest('[data-open-tab="library"],[data-tab="library"]')){
   if(project?.slug&&activeProject!==project.slug)void run(async()=>{await loadMedia();render()});
  }
 });
 window.StudioTopics={render,reload,loadMedia};
})();