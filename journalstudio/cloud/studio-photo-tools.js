"use strict";
/* Editorial photo workspace: use existing author assets, not generated substitutes.
   Source uploads remain in the private project media library after replacement/removal. */
(function(){
 const host=document.getElementById("studioPhotoPanel");
 if(!host)return;
 let replacement=null;
 let notice="";
 // Track the selected photo by its actual block object, never by its old index.
 // This keeps repeated arrow clicks on one and the same image after every rerender.
 let selectedBlock=null;
 const items=()=>blocks.map((block,index)=>({block,index})).filter(x=>x.block?.type==="image");
 function selectedPhoto(photos=items()){
  if(selectedBlock&&!photos.some(x=>x.block===selectedBlock))selectedBlock=null;
  if(!selectedBlock&&photos.length)selectedBlock=photos[0].block;
  return photos.find(x=>x.block===selectedBlock)||null;
 }
 const allowed=()=>Boolean(draft&&editable());
 const validTarget=()=>replacement&&allowed()&&current?.id===replacement.postId&&
  project?.slug===replacement.project&&
  (window.StudioFeatures?.activeVersion?.()||"base")===replacement.channel&&
  blocks[replacement.index]?.type==="image"&&
  blocks[replacement.index].asset_id===replacement.assetId;
 const activeReplacementIndex=()=>validTarget()?replacement.index:null;
 function render(){
  if(!draft){replacement=null;host.hidden=true;return;}
  if(replacement&&!validTarget())replacement=null;
  const photos=items(),canEdit=allowed(),selected=selectedPhoto(photos);
  host.hidden=false;
  const count=photos.length;
  let html='<div class="row studio-photo-heading"><div><strong>📷 Фотографии в статье · '+count+'</strong>'+
   '<p class="small muted">Порядок снимков, кадрирование, подписи и обложка. Изменения вступят в силу после сохранения и согласования.</p></div></div>';
  if(canEdit){
   html+='<div class="studio-photo-toolbar">'+
    '<button type="button" class="primary" data-photo-tool="library">▦ Выбрать из медиатеки</button>'+
    '<button type="button" data-photo-tool="upload">↑ Загрузить фотографию</button>'+
    '<button type="button" data-photo-tool="add">+ Вставить фото в текст</button></div>';
  }else if(current?.status==="in_review"&&editorRole()){
   html+='<div class="studio-photo-replacement">Материал отправлен на проверку. Для замены или загрузки фото сначала откройте редакторскую правку. '+
    '<button type="button" class="primary" data-photo-tool="unlock">✎ Редактировать фотографии</button></div>';
  }else if(current?.status==="in_review"){
   html+='<p class="small muted">Материал уже отправлен на проверку. Изменения фотографий доступны после возвращения редакцией на доработку.</p>';
  }
  if(canEdit&&selected){
   const idx=photos.findIndex(x=>x.block===selected.block);
   const index=selected.index;
   const selectedTitle=String(selected.block.caption||selected.block.alt||"Фото "+(idx+1)).slice(0,80);
   const button=(label,move,disabled=false)=>'<button type="button" data-photo-move="'+move+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
   html+='<div class="studio-photo-move-controls" role="group" aria-label="Перемещение выбранной фотографии">'+
    '<div class="studio-photo-selected-title"><strong>Выбрано: фото '+(idx+1)+' из '+count+'</strong><span>'+esc(selectedTitle)+'</span></div>'+
    '<div class="studio-photo-move-buttons">'+
    button('↑ Предыдущее фото','previous',idx===0)+
    button('↓ Следующее фото','next',idx===photos.length-1)+
    button('↑ На один блок','block-up',index===0)+
    button('↓ На один блок','block-down',index===blocks.length-1)+
    '</div><p class="small muted">Кнопки остаются на месте. Повторное нажатие двигает ту же фотографию в выбранном направлении.</p></div>';
  }
  if(replacement&&canEdit){
   html+='<div class="studio-photo-replacement" role="status">Выберите изображение в медиатеке ниже, чтобы заменить фото №'+
    (photos.findIndex(x=>x.index===replacement.index)+1)+
    '. Оригинал останется в медиатеке. <button type="button" data-photo-cancel="1">Отмена замены</button></div>';
  }
  if(!count)html+='<p class="small muted">В этой версии статьи ещё нет фотографий. Их можно добавить ниже через медиатеку или загрузку.</p>';
  else html+='<div class="studio-photo-list">'+photos.map((x,i)=>{
   const b=x.block,src=assets[b.asset_id]||"",title=String(b.caption||b.alt||"Фото "+(i+1));
   const btn=(label,action,disabled=false)=>'<button type="button" data-photo-action="'+action+'" data-photo-index="'+x.index+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
   return '<div class="studio-photo-item'+(selected?.block===b?' studio-photo-item-selected':'')+'" data-photo-item="'+x.index+'">'+
    '<div class="studio-photo-thumb">'+(src?'<img src="'+esc(src)+'" alt="'+esc(title)+'" loading="lazy">':'<span>Изображение</span>')+'</div>'+
    '<div class="studio-photo-details"><b>Фото '+(i+1)+(draft.cover_path===b.asset_id?' · Обложка':'')+'</b>'+
    '<span title="'+esc(title)+'">'+esc(title.slice(0,110))+'</span>'+
    (canEdit?'<div class="studio-photo-buttons">'+
     btn(selected?.block===b?"✓ Выбрано":"◎ Выбрать","select")+
     btn("✎ Кадр / подпись","edit")+btn("⟳ Заменить","replace")+
     btn("★ Обложка","cover",draft.cover_path===b.asset_id)+btn("× Убрать","remove")+
     '</div>':'')+'</div></div>';
  }).join("")+'</div>';
  html+='<p class="small muted">Выберите снимок. «Предыдущее/следующее фото» меняет местами соседние фотографии, не переставляя текст. «На один блок» сдвигает фото через ближайший абзац или заголовок. Никакое перемещение не удаляет файлы из медиатеки.</p>';
  if(notice)html+='<p class="small studio-photo-notice" role="status">'+esc(notice)+'</p>';
  host.innerHTML=html;
 }
 function moveSelected(direction){
  if(!allowed())throw Error("Редактирование фотографий недоступно");
  const photo=selectedPhoto();
  if(!photo)return;
  const from=photo.index;
  let to=-1;
  if(direction==="previous"||direction==="next"){
   const photos=items(),pos=photos.findIndex(x=>x.block===selectedBlock);
   const target=photos[pos+(direction==="previous"?-1:1)];
   if(target)to=target.index;
  }else if(direction==="block-up"||direction==="block-down"){
   to=from+(direction==="block-up"?-1:1);
  }else throw Error("Некорректное направление");
  if(to<0||to>=blocks.length||to===from)return;
  // Preserve current text, captions and crop settings before moving an image.
  capture();
  [blocks[from],blocks[to]]=[blocks[to],blocks[from]];
  draft.blocks=blocks;
  dirty=true;
  notice="Фото перемещено "+(to<from?"вверх":"вниз")+". Продолжайте нажимать стрелку для дальнейшего перемещения. После завершения нажмите «Сохранить».";
  // selectedBlock still points at the same image despite its new array index.
  renderEditor();
 }
 async function beginReplace(index){
  if(!current?.id)throw Error("Сначала сохраните статью.");
  const block=blocks[index];if(!allowed()||block?.type!=="image")return;
  selectedBlock=block;
  capture();
  replacement={postId:current.id,project:project.slug,channel:window.StudioFeatures?.activeVersion?.()||"base",index,assetId:block.asset_id};
  notice="Выберите новое фото в медиатеке; замена не удаляет исходный файл.";
  render();
  await window.StudioImages.showLibrary("all");
  document.getElementById("studioImageLibrary")?.scrollIntoView({behavior:"smooth",block:"start"});
 }
 async function applyReplacement(id,item){
  if(!validTarget())throw Error("Исходная статья или порядок фотографий изменились. Начните замену заново.");
  if(!item?.available||item.id!==id)throw Error("Это изображение недоступно.");
  if(blocks.some((b,i)=>i!==replacement.index&&b.type==="image"&&b.asset_id===id))
   throw Error("Это изображение уже используется в тексте. Выберите другое.");
  const data=await call("/media/"+encodeURIComponent(id)+"?variant=article");
  if(!data?.url||!data.url.startsWith("https://"))throw Error("Не удалось открыть выбранное фото.");
  if(!validTarget())throw Error("Статья изменилась во время загрузки. Повторите выбор.");
  capture();
  const b=blocks[replacement.index];
  b.asset_id=id;
  // Keep the author's intentional caption, while refreshing alternative text
  // only when the selected image has its own description.
  if(item.alt||item.prompt)b.alt=String(item.alt||item.prompt).slice(0,350);
  b.crop={x:50,y:50,zoom:100,aspect:"auto"};
  assets[id]=data.url;draft.blocks=blocks;dirty=true;
  replacement=null;notice="Фото заменено в этой статье. Старый оригинал остался в медиатеке. Сохраните материал.";
  renderEditor();
  toast("Фотография заменена. Проверьте подпись и кадрирование, затем сохраните статью.");
 }
 function selectImage(index,scroll=false){
  const block=blocks[index];
  if(block?.type!=="image")return;
  selectedBlock=block;replacement=null;
  notice="Выбрана фотография. Используйте стрелки в панели для её перемещения.";
  render();
  if(scroll)document.getElementById("studioPhotoPanel")?.scrollIntoView({behavior:"smooth",block:"center"});
 }
 async function act(action,index){
  if(action==="select"){selectImage(index);return;}
  if(action==="edit"){
   const el=document.querySelector('#blocks [data-block="'+index+'"]')?.closest(".block");
   el?.scrollIntoView({behavior:"smooth",block:"center"});
   el?.querySelector('[data-prop="caption"]')?.focus({preventScroll:true});return;
  }
  if(!allowed())throw Error("Редактирование фотографий доступно только в черновике или материале на доработке.");
  const b=blocks[index];if(b?.type!=="image")return;
  if(action==="replace")return beginReplace(index);
  if(action==="cover"){
   capture();draft.cover_path=b.asset_id;dirty=true;notice="Обложка изменена. Сохраните статью.";renderEditor();return;
  }
  if(action==="remove"){
   const accepted=await editorialDecision({title:"Убрать фотографию из статьи",
    message:"Снимок исчезнет только из текста этой статьи. В медиатеке и у автора файл сохранится. Продолжить?",
    confirmLabel:"Убрать из статьи"});
   if(!accepted)return;
   modifyBlock(index,"remove");notice="Фото убрано из текста, но сохранено в медиатеке. Сохраните статью.";render();return;
  }
 }
 async function tool(action){
  if(action==="unlock"){
   if(!current?.id||!editorRole()||current.status!=="in_review")throw Error("Редакторская правка недоступна");
   return editArticle(current.id);
  }
  if(!allowed())throw Error("Сначала откройте редактируемый черновик или верните статью с проверки.");
  if(action==="upload"){
   const upload=document.querySelector(".jp-upload-area");
   upload?.scrollIntoView({behavior:"smooth",block:"center"});
   const choose=document.getElementById("file");
   if(choose){choose.click();}
   return;
  }
  if(action==="library"||action==="add"){
   if(!window.StudioImages?.showLibrary)throw Error("Модуль медиатеки не загрузился. Обновите страницу Ctrl+F5");
   replacement=null;render();
   await window.StudioImages.showLibrary("all");
   document.getElementById("studioImageLibrary")?.scrollIntoView({behavior:"smooth",block:"center"});
  }
 }
 host.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.photoCancel!==undefined){
   replacement=null;notice="Замена отменена.";render();run(()=>window.StudioImages?.showLibrary?.("all"));return;
  }
  if(b.dataset.photoTool)run(()=>tool(b.dataset.photoTool));
  if(b.dataset.photoMove)run(()=>moveSelected(b.dataset.photoMove));
  if(b.dataset.photoAction)run(()=>act(b.dataset.photoAction,Number(b.dataset.photoIndex)));
 });
 const original=renderEditor;
 renderEditor=function(...args){const value=original(...args);render();return value};
 window.StudioPhotoTools={activeReplacementIndex,applyReplacement,render,selectImage};
 render();
})();