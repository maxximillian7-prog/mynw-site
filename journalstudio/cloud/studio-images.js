"use strict";
/* Journal Studio media source chooser and explicit-cost image generation.
   Image API secrets and usage budgets live on the server, never in this browser script. */
(function(){
 const $=id=>document.getElementById(id);
 const esc=t=>String(t??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
 let result=null,busy=false,startedPost=null,startedProject=null;
 let library=[],libraryOffset=0,libraryMore=false,libraryBusy=false,libraryProject=null,libraryRequest=0;
 const url="https://npsfaymjckcqhtyiafms.supabase.co/functions/v1/studio-image";
 const status=(message,error=false)=>{const el=$("imageGenerateStatus");if(!el)return;el.textContent=message;el.style.color=error?"#9d453b":""};
 const editablePost=()=>Boolean(current?.id&&draft&&editable()&&project?.slug);
 function clear(){
  result=null;
  $("imageGeneratedPreview").hidden=true;
  $("imageGeneratedImg").removeAttribute("src");
  $("imageGeneratedAlt").textContent="";
 }
 function refreshControls(){
  const allowed=editablePost();
  $("imageGenerate").disabled=!allowed||busy;
  if(!allowed)status("Сначала сохраните черновик статьи. Генерация доступна только для редактируемых материалов.");
  else if(!busy&&result===null)status("Изображение будет генерироваться только после подтверждения платного запроса.");
 }
 function setSource(id){
  document.querySelectorAll("[data-image-source]").forEach(b=>b.classList.toggle("active",b.dataset.imageSource===id));
  $("studioImageAi").hidden=id!=="ai";
  $("studioImageStock").hidden=id!=="stock";
  $("studioImageLibrary").hidden=id!=="library";
  if(id==="library")void loadLibrary({reset:libraryProject!==project?.slug});
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
  setSource("library");
  await loadLibrary({reset:true});
 }
 async function api(method,payload){
  if(!session?.access_token)throw Error("Сначала войдите в редакцию");
  const callOne=()=>fetch(url,{method,headers:{apikey:PUBLIC_KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:payload?JSON.stringify(payload):undefined});
  let response=await callOne();
  if(response.status===401&&session.refresh_token){
   session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
   sessionStorage.setItem("journal_session",JSON.stringify(session));response=await callOne();
  }
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||"Ошибка генерации изображения");
  return body;
 }
 async function generate(){
  if(busy)return;
  if(!editablePost())throw Error("Сначала сохраните редактируемую статью");
  const prompt=$("imagePrompt").value.trim(),style=$("imageStyle").value,size=$("imageSize").value,quality=$("imageQuality").value;
  if(prompt.length<8||prompt.length>650)throw Error("Опишите изображение подробнее (от 8 до 650 символов)");
  const ratio={ "1024x1024":"квадрат","1536x1024":"горизонтальный","1024x1536":"вертикальный"}[size]||size;
  const confirmText="Создать одно платное изображение?\n\nФормат: "+ratio+"\nКачество: "+(quality==="low"?"экономичное":"среднее")+
    "\nМодель: GPT Image 2.5 Flare\n\nЦена зависит от числа токенов и размера. Запрос спишет средства с OpenAI API. Результат останется черновиком, без публикации.";
  if(!confirm(confirmText))return;
  clear();startedPost=current.id;startedProject=project.slug;
  busy=true;$("imageGenerate").disabled=true;$("imageGenerate").textContent="⌛ Изображение создаётся…";
  status("Запрос отправлен. Генерация может потребовать времени; не нажимайте повторно.");
  try{
   const data=await api("POST",{project:startedProject,post_id:startedPost,prompt,style,size,quality});
   if(current?.id!==startedPost||project.slug!==startedProject){status("Изображение создано, но текущая статья изменилась. Вернитесь к прежнему черновику.");return}
   result={...data,postId:startedPost,project:startedProject};
   if(!result.asset_id)throw Error("Не получено сохранённое изображение");
   if(!result.url){
    const media=await call("/media/"+result.asset_id);
    result.url=media.url;
   }
   $("imageGeneratedImg").src=result.url;
   $("imageGeneratedAlt").textContent=prompt+" · Создано ИИ, необходимо проверить перед публикацией.";
   $("imageGeneratedPreview").hidden=false;
   status("Изображение сохранено в медиатеке. Можно использовать позже без повторной генерации.");
   void loadLibrary({reset:true});
   toast("Готово! Проверь результат и нажми «Добавить в статью» или «Сделать обложкой».");
  }catch(error){
   status("Ошибка: "+error.message,true);throw error;
  }finally{busy=false;$("imageGenerate").disabled=!editablePost();$("imageGenerate").textContent="✦ Сгенерировать изображение"}
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
 renderEditor=function(...args){originalRender(...args);refreshControls();if(library.length&&$("studioImageLibrary")&&!$("studioImageLibrary").hidden)renderLibrary()};
 const originalChange=changeProject;
 changeProject=async function(...args){clear();library=[];libraryOffset=0;libraryProject=null;libraryRequest++;const r=await originalChange(...args);refreshControls();if(project?.slug&&tab==="editor")void loadLibrary({reset:true});return r};
 const originalOpen=openPost;
 openPost=async function(...args){clear();const r=await originalOpen(...args);refreshControls();if(project?.slug&&tab==="editor")void loadLibrary({reset:true});return r};
 $("imageGenerate").onclick=()=>run(generate);
 $("imageAccept").onclick=()=>run(()=>accept(false));
 $("imageAcceptCover").onclick=()=>run(()=>accept(true));
 $("imageDiscard").onclick=()=>{clear();status("Изображение осталось в медиатеке — можно использовать позже без затрат.");void showLibrary("ai")};
 $("mediaLibraryRefresh").onclick=()=>run(()=>loadLibrary({reset:true}));
 $("mediaLibraryMore").onclick=()=>run(()=>loadLibrary());
 $("mediaLibraryFilter").onchange=()=>run(()=>loadLibrary({reset:true}));
 const oldShow=showTab;
 showTab=async function(target,...args){const data=await oldShow(target,...args);if(target==="editor"&&project?.slug)void loadLibrary({reset:true});return data};
 setSource("ai");refreshControls();
 window.StudioImages={refreshControls,showLibrary,loadLibrary};
})();