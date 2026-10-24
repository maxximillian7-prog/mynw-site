"use strict";
/* Journal Studio media source chooser and explicit-cost image generation.
   Image API secrets and usage budgets live on the server, never in this browser script. */
(function(){
 const $=id=>document.getElementById(id);
 const esc=t=>String(t??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
 let result=null,busy=false,startedPost=null,startedProject=null,pendingRequest=null;
 let library=[],libraryOffset=0,libraryMore=false,libraryBusy=false,libraryProject=null,libraryRequest=0;
 const url="https://npsfaymjckcqhtyiafms.supabase.co/functions/v1/studio-image";
 const status=(message,error=false)=>{const el=$("imageGenerateStatus");if(!el)return;el.textContent=message;el.style.color=error?"#9d453b":""};
 const editablePost=()=>Boolean(current?.id&&draft&&editable()&&project?.slug);
 const imageEditor=()=>["owner","chief_editor","editor"].includes(project?.role||"");
 function clear(){
  result=null;pendingRequest=null;
  $("imageGenerateConfirm").hidden=true;
  $("imageGeneratedPreview").hidden=true;
  $("imageGeneratedImg").removeAttribute("src");
  $("imageGeneratedAlt").textContent="";
 }
 function refreshControls(){
  const allowed=editablePost()&&imageEditor();
  $("imageGenerate").disabled=!allowed||busy;
  if(!allowed&&!current?.id)status("Сначала создайте и сохраните черновик статьи: после сохранения генератор станет доступен.");
  else if(!allowed&&!editable())status("Статья сейчас недоступна для изменений (статус: "+({published:"Опубликована",approved:"Утверждена",scheduled:"Запланирована",in_review:"На проверке"}[current.status]||"Не редактируется")+"). Изображения можно генерировать для сохранённого черновика или материала на доработке. Возврат опубликованной статьи на доработку временно скрывает её в приложении.");
  else if(!allowed)status("Откройте сохранённую статью с правом редактирования, чтобы создать изображение.");
  else if(!busy&&result===null&&pendingRequest===null)status("Введите описание, выберите формат и нажмите «Сгенерировать изображение». Перед платным запросом будет отдельное подтверждение.");
 }
 function setSource(id,autoload=true){
  if(id==="ai"&&!imageEditor())id="library";
  document.querySelectorAll("[data-image-source]").forEach(b=>b.classList.toggle("active",b.dataset.imageSource===id));
  $("studioImageAi").hidden=id!=="ai";
  $("studioImageStock").hidden=id!=="stock";
  $("studioImageLibrary").hidden=id!=="library";
  if(id==="library"&&autoload)void loadLibrary({reset:libraryProject!==project?.slug});
  if(id==="own"){document.querySelector(".jp-upload-area")?.scrollIntoView({behavior:"smooth",block:"center"});}
 }
 const isEditor=()=>["owner","chief_editor","editor"].includes(project?.role||"");
 function mediaState(){
  const cover=draft?.cover_path;
  document.querySelectorAll(".studio-media-card").forEach(card=>{
   const id=card.dataset.mediaId;
   const label=card.querySelector(".studio-media-status");
   if(label)label.textContent=cover===id?"Обложка":blocks?.some(b=>b.type==="image"&&b.asset_id===id)?"В тексте":"В медиатеке";
  });
 }
 function renderLibrary(){
  const container=$("mediaLibraryGrid");
  if(!container)return;
  if(!library.length){
   container.innerHTML='<div class="empty">'+(libraryBusy?"Загрузка изображений…":"Пока нет изображений. Сгенерируйте или загрузите первое.")+'</div>';
  }else{
   container.innerHTML=library.map(item=>{
    const buttons=editablePost()&&item.available?
     '<div class="studio-media-actions"><button type="button" data-library-cover="'+esc(item.id)+'"'+(draft.cover_path===item.id?' disabled':'')+'>Обложка</button>'+
     '<button type="button" data-library-insert="'+esc(item.id)+'"'+(blocks.some(b=>b.type==="image"&&b.asset_id===item.id)?' disabled':'')+'>В текст</button></div>':
     '<p class="small muted">'+(item.available?"Для использования откройте редактируемый черновик":"Изображение временно недоступно")+'</p>';
    const label=item.source_type==="ai"?"ИИ":item.source_type==="stock"?"Фотобанк":"Загружено";
    return '<article class="studio-media-card" data-media-id="'+esc(item.id)+'">'+
     '<div class="studio-media-visual">'+
       (item.thumb_url?'<img src="'+esc(item.thumb_url)+'" alt="'+esc(item.alt||"Изображение")+'" loading="lazy">':'<span class="muted">Изображение</span>')+
       '<span class="studio-media-status">'+(draft?.cover_path===item.id?"Обложка":blocks?.some(b=>b.type==="image"&&b.asset_id===item.id)?"В тексте":"В медиатеке")+'</span></div>'+
     '<div class="studio-media-caption" title="'+esc(item.alt||item.prompt||"")+'">'+esc((item.alt||item.prompt||"Без названия").slice(0,84))+'</div>'+
     '<div class="studio-media-meta">'+label+' · '+(item.optimized?"WebP":"Оригинал")+'</div>'+
     buttons+'</article>';
   }).join("");
  }
  $("mediaLibraryMore").hidden=!libraryMore;
  $("mediaLibraryMore").disabled=libraryBusy;
  $("mediaLibraryRefresh").disabled=libraryBusy;
  const tail=blocks?.[blocks.length-1];
  $("mediaRemoveCoverDuplicate").hidden=!(editablePost()&&tail?.type==="image"&&tail.asset_id===draft?.cover_path);
 }
 async function loadLibrary({reset=false}={}){
  if(!project?.slug)return;
  const slug=project.slug;
  if(!reset&&libraryBusy)return;
  const source=$("mediaLibraryFilter").value;
  if(reset){library=[];libraryOffset=0;libraryMore=false;}
  libraryBusy=true;const token=++libraryRequest;libraryProject=slug;
  renderLibrary();$("mediaLibraryStatus").textContent="Получаем сохранённые изображения…";
  try{
   const data=await call("/media/library?project="+encodeURIComponent(slug)+"&source="+encodeURIComponent(source)+"&offset="+libraryOffset+"&limit=18");
   if(token!==libraryRequest||project?.slug!==slug||source!==$("mediaLibraryFilter").value)return;
   const items=data.items||[];
   const used=new Set(library.map(a=>a.id));
   library=[...library,...items.filter(a=>!used.has(a.id))];
   libraryMore=!!data.has_more;libraryOffset=data.next_offset??libraryOffset+items.length;
   $("mediaLibraryStatus").textContent=library.length+" изображений. Удаление из статьи не удаляет их из медиатеки. Повторное использование не тратит ИИ-кредиты.";
  }catch(e){
   if(token===libraryRequest)$("mediaLibraryStatus").textContent="Не удалось загрузить медиатеку: "+e.message;
  }finally{if(token===libraryRequest){libraryBusy=false;renderLibrary();}}
 }
 function removeLegacyDuplicate(){
  if(!editablePost())throw Error("Нужен редактируемый черновик");
  capture();
  const last=blocks[blocks.length-1];
  if(!last||last.type!=="image"||last.asset_id!==draft.cover_path)return;
  blocks.pop();
  draft.blocks=blocks;
  dirty=true;
  renderEditor();renderLibrary();
  toast("Повтор убран только из конца текста. Обложка и изображение в медиатеке сохранены. Сохраните статью.");
 }
 async function useLibraryItem(id,asCover){
  if(!editablePost())throw Error("Откройте редактируемую статью");
  const item=library.find(a=>a.id===id);
  if(!item?.available)throw Error("Изображение отсутствует или недоступно");
  const media=await call("/media/"+encodeURIComponent(id)+(asCover?"?variant=cover":"?variant=article"));
  if(!media?.url)throw Error("Не удалось получить ссылку на изображение");
  capture();
  assets[id]=media.url;
  if(asCover){draft.cover_path=id;}
  else if(!blocks.some(b=>b.type==="image"&&b.asset_id===id)){
   blocks.push({type:"image",asset_id:id,caption:"",alt:item.alt||item.prompt||"",
    crop:{x:50,y:50,zoom:100,aspect:"auto"}});
   draft.blocks=blocks;
  }
  dirty=true;
  renderEditor();renderLibrary();
  if(!item.optimized&&window.StudioOptimizer){
   void window.StudioOptimizer.optimizeExisting(id,{status:"pending"}).then(ok=>{
    if(ok){item.optimized=true;renderLibrary()}
   });
  }
  toast(asCover?"Изображение установлено только обложкой, без дублирования. Нажмите «Сохранить».":"Изображение добавлено в текст статьи. Нажмите «Сохранить».");
 }
 async function showLibrary(source){
  if(source&&["ai","all","stock","upload"].includes(source))$("mediaLibraryFilter").value=source;
  setSource("library",false);
  await loadLibrary({reset:true});
 }
 async function api(method,payload){
  if(!session?.access_token)throw Error("Сначала войдите в редакцию");
  const callOne=()=>fetch(url,{method,signal:AbortSignal.timeout(165000),headers:{apikey:PUBLIC_KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:payload?JSON.stringify(payload):undefined});
  let response=await callOne();
  if(response.status===401&&session.refresh_token){
   session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
   sessionStorage.setItem("journal_session",JSON.stringify(session));response=await callOne();
  }
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||"Ошибка генерации изображения");
  return body;
 }
 function generationOptions(){
  return {project:project?.slug,post_id:current?.id,
   prompt:$("imagePrompt").value.trim(),style:$("imageStyle").value,
   size:$("imageSize").value,quality:$("imageQuality").value};
 }
 function prepareGeneration(){
  if(busy)return;
  if(!editablePost()||!imageEditor()){
   refreshControls();
   return;
  }
  if(!session?.access_token){
   status("Для генерации необходимо войти в Journal Studio заново.",true);return;
  }
  const request=generationOptions();
  if(request.prompt.length<8||request.prompt.length>650){
   status("Опишите изображение подробнее (от 8 до 650 символов).",true);
   $("imagePrompt").focus();
   return;
  }
  if(!["editorial","photorealistic","botanical","illustration"].includes(request.style)
   ||!["1024x1024","1536x1024","1024x1536"].includes(request.size)
   ||!["low","medium"].includes(request.quality)){
   status("Неверный стиль, размер или качество. Выберите параметры заново.",true);
   return;
  }
  const ratio={"1024x1024":"квадратный","1536x1024":"горизонтальный",
   "1024x1536":"вертикальный"}[request.size];
  const costQuality=request.quality==="low"?"экономичное":"среднее";
  $("imageGenerateConfirmDetails").textContent=
   "Одно платное изображение · "+ratio+" · качество: "+costQuality+
   " · GPT Image 2.5 Flare. Стоимость зависит от размера и количества токенов. "+
   "При подтверждении будет отправлен один запрос к OpenAI API. "+
   "Изображение сохранится в медиатеке, но не будет автоматически опубликовано.";
  pendingRequest=request;
  $("imageGenerateConfirm").hidden=false;
  status("Проверьте условия генерации ниже и нажмите «✓ Создать одно изображение». Денежные средства пока не списывались.");
  $("imageGenerateConfirm").scrollIntoView({behavior:"smooth",block:"nearest"});
 }
 function friendlyImageError(error){
  const message=String(error?.message||error||"Неизвестная ошибка");
  if(error?.name==="TimeoutError"||error?.name==="AbortError"||message==="Failed to fetch")
   return "Не удалось подтвердить завершение запроса. Перед повтором проверьте вкладку «Медиатека»: изображение могло сохраниться, и повторная генерация может стоить денег.";
  if(message.includes("OpenAI API key missing"))
   return "На сервере отсутствует ключ OpenAI для генерации изображений.";
  if(message.includes("Image API quota")||message.includes("429"))
   return "Достигнут лимит генерации изображений или лимит средств OpenAI.";
  if(message.includes("A saved editable article is required"))
   return "Эта статья не является редактируемым черновиком. Откройте черновик или материал на доработке.";
  if(message.includes("Authentication required"))return "Сессия завершилась. Войдите в редакцию снова.";
  return message;
 }
 async function generate(){
  if(busy||!pendingRequest)return;
  if(!editablePost()||!imageEditor())throw Error("Создание AI-изображений доступно только редакции.");
  const input={...pendingRequest};
  if(JSON.stringify(generationOptions())!==JSON.stringify(input)){
   pendingRequest=null;
   $("imageGenerateConfirm").hidden=true;
   status("Параметры изменились. Проверьте и подтвердите запрос ещё раз.",true);
   return;
  }
  clear();startedPost=input.post_id;startedProject=input.project;
  busy=true;$("imageGenerate").disabled=true;$("imageGenerateConfirmYes").disabled=true;
  $("imageGenerate").textContent="⌛ Изображение создаётся…";
  status("Генерация запущена. Не нажимайте повторно и не закрывайте страницу.");
  try{
   const data=await api("POST",input);
   if(current?.id!==startedPost||project?.slug!==startedProject){
    status("Изображение создано и сохранено в медиатеке. Вернитесь к исходному черновику.");return;
   }
   result={...data,postId:startedPost,project:startedProject};
   if(!result.asset_id)throw Error("Сервер не подтвердил сохранение изображения. Проверьте медиатеку.");
   if(!result.url){
    const media=await call("/media/"+encodeURIComponent(result.asset_id));
    result.url=media.url;
   }
   if(!result.url){
    status("Изображение создано и сохранено, но просмотр недоступен. Откройте «Медиатека» и обновите.",true);
    void loadLibrary({reset:true});return;
   }
   $("imageGeneratedImg").src=result.url;
   $("imageGeneratedAlt").textContent=input.prompt+" · Создано ИИ, необходимо проверить перед публикацией.";
   $("imageGeneratedPreview").hidden=false;
   status("Изображение готово и сохранено в медиатеке. Можно использовать позже без повторной генерации.");
   void loadLibrary({reset:true});
   toast("Готово! Проверьте результат и выберите «Добавить в статью» или «Сделать обложкой».");
  }catch(error){
   status("Ошибка генерации: "+friendlyImageError(error),true);
   throw error;
  }finally{
   busy=false;
   $("imageGenerate").disabled=!editablePost();
   $("imageGenerateConfirmYes").disabled=false;
   $("imageGenerate").textContent="✦ Сгенерировать изображение";
  }
 }
 async function accept(asCover){
  if(!result?.asset_id)throw Error("Сначала сгенерируйте изображение");
  if(!editablePost()||current.id!==result.postId||project.slug!==result.project)throw Error("Откройте исходную статью");
  const saved=result;
  const id=saved.asset_id;
  capture();
  assets[id]=saved.url;
  if(asCover)draft.cover_path=id;
  else if(!blocks.some(b=>b.type==="image"&&b.asset_id===id)){
   blocks.push({type:"image",asset_id:id,caption:"Иллюстрация создана ИИ",
    alt:saved.alt||$("imagePrompt").value.trim(),crop:{x:50,y:50,zoom:100,aspect:"auto"}});
   draft.blocks=blocks;
  }
  dirty=true;
  clear();renderEditor();
  status("Изображение сохранено в медиатеке и "+(asCover?"выбрано только для обложки.":"добавлено только в текст.")+" Сохраните статью.");
  if(window.StudioOptimizer){
   void window.StudioOptimizer.optimizeExisting(id,{status:"pending"}).then(ok=>{
    if(ok)status("Оптимизированные WebP готовы. Оригинал будет безопасно удалён после публикации, медиатека останется доступной.");
   });
  }
  toast(asCover?"Обложка выбрана без повторного изображения в конце статьи.":"Изображение добавлено в текст. Оно сохранено и в медиатеке.");
  void loadLibrary({reset:true});
 }
 document.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.imageSource){setSource(b.dataset.imageSource);}
  if(b.dataset.libraryCover)run(()=>useLibraryItem(b.dataset.libraryCover,true));
  if(b.dataset.libraryInsert)run(()=>useLibraryItem(b.dataset.libraryInsert,false));
 });
 const originalRender=renderEditor;
 renderEditor=function(...args){originalRender(...args);if(!imageEditor()&&!$("studioImageAi").hidden)setSource("library");refreshControls();if(library.length&&$("studioImageLibrary")&&!$("studioImageLibrary").hidden)renderLibrary()};
 const originalChange=changeProject;
 changeProject=async function(...args){clear();library=[];libraryOffset=0;libraryProject=null;libraryRequest++;const r=await originalChange(...args);refreshControls();if(project?.slug&&tab==="editor")void loadLibrary({reset:true});return r};
 const originalOpen=openPost;
 openPost=async function(...args){clear();const r=await originalOpen(...args);refreshControls();if(project?.slug&&tab==="editor")void loadLibrary({reset:true});return r};
 $("imageGenerate").onclick=()=>run(prepareGeneration);
 $("imageGenerateConfirmYes").onclick=()=>run(generate);
 $("imageGenerateConfirmNo").onclick=()=>{
  pendingRequest=null;
  $("imageGenerateConfirm").hidden=true;
  status("Генерация отменена до отправки платного запроса.");
 };
 $("imageAccept").onclick=()=>run(()=>accept(false));
 $("imageAcceptCover").onclick=()=>run(()=>accept(true));
 $("imageDiscard").onclick=()=>{clear();status("Изображение осталось в медиатеке — можно использовать позже без затрат.");void showLibrary("ai")};
 $("mediaLibraryRefresh").onclick=()=>run(()=>loadLibrary({reset:true}));
 $("mediaLibraryMore").onclick=()=>run(()=>loadLibrary());
 $("mediaLibraryFilter").onchange=()=>run(()=>loadLibrary({reset:true}));
 $("mediaRemoveCoverDuplicate").onclick=()=>run(removeLegacyDuplicate);
 const oldShow=showTab;
 showTab=async function(target,...args){const data=await oldShow(target,...args);if(target==="editor"&&project?.slug)void loadLibrary({reset:true});return data};
 setSource(imageEditor()?"ai":"library");refreshControls();
 window.StudioImages={refreshControls,showLibrary,loadLibrary};
})();