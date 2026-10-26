"use strict";
/* Editorial photo workspace: use existing author assets, not generated substitutes.
   Source uploads remain in the private project media library after replacement/removal. */
(function(){
 const host=document.getElementById("studioPhotoPanel");
 if(!host)return;
 let replacement=null;
 let notice="";
 const items=()=>blocks.map((block,index)=>({block,index})).filter(x=>x.block?.type==="image");
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
  const photos=items(),canEdit=allowed();
  host.hidden=false;
  const count=photos.length;
  let html='<div class="row studio-photo-heading"><div><strong>📷 Фотографии в статье · '+count+'</strong>'+
   '<p class="small muted">Порядок снимков, кадрирование, подписи и обложка. Изменения вступят в силу после сохранения и согласования.</p></div></div>';
  if(replacement&&canEdit){
   html+='<div class="studio-photo-replacement" role="status">Выберите изображение в медиатеке ниже, чтобы заменить фото №'+
    (photos.findIndex(x=>x.index===replacement.index)+1)+
    '. Оригинал останется в медиатеке. <button type="button" data-photo-cancel="1">Отмена замены</button></div>';
  }
  if(!count)html+='<p class="small muted">В этой версии статьи ещё нет фотографий. Их можно добавить ниже через медиатеку или загрузку.</p>';
  else html+='<div class="studio-photo-list">'+photos.map((x,i)=>{
   const b=x.block,src=assets[b.asset_id]||"",title=String(b.caption||b.alt||"Фото "+(i+1));
   const btn=(label,action,disabled=false)=>'<button type="button" data-photo-action="'+action+'" data-photo-index="'+x.index+'"'+(disabled?' disabled':'')+'>'+label+'</button>';
   return '<div class="studio-photo-item" data-photo-item="'+x.index+'">'+
    '<div class="studio-photo-thumb">'+(src?'<img src="'+esc(src)+'" alt="'+esc(title)+'" loading="lazy">':'<span>Изображение</span>')+'</div>'+
    '<div class="studio-photo-details"><b>Фото '+(i+1)+(draft.cover_path===b.asset_id?' · Обложка':'')+'</b>'+
    '<span title="'+esc(title)+'">'+esc(title.slice(0,110))+'</span>'+
    (canEdit?'<div class="studio-photo-buttons">'+
     btn("↑ Выше в тексте","up",x.index===0)+btn("↓ Ниже в тексте","down",x.index===blocks.length-1)+
     btn("⇄ Пред. фото","swap-prev",i===0)+btn("⇄ След. фото","swap-next",i===photos.length-1)+
     btn("✎ Кадр / подпись","edit")+btn("⟳ Заменить","replace")+
     btn("★ Обложка","cover",draft.cover_path===b.asset_id)+btn("× Убрать","remove")+
     '</div>':'')+'</div></div>';
  }).join("")+'</div>';
  html+='<p class="small muted">«Выше/ниже» перемещает фотографию относительно абзацев. «Пред./след. фото» меняет местами два снимка, не переставляя текст. Из медиатеки файл не удаляется.</p>';
  if(notice)html+='<p class="small studio-photo-notice" role="status">'+esc(notice)+'</p>';
  host.innerHTML=html;
 }
 function swap(index,direction){
  const photos=items(),pos=photos.findIndex(x=>x.index===index),other=photos[pos+(direction==="swap-prev"?-1:1)];
  if(pos<0||!other)return;
  capture();
  [blocks[index],blocks[other.index]]=[blocks[other.index],blocks[index]];
  draft.blocks=blocks;dirty=true;notice="Порядок фотографий изменён. Нажмите «Сохранить».";renderEditor();
 }
 function beginReplace(index){
  if(!current?.id)throw Error("Сначала сохраните статью.");
  const block=blocks[index];if(!allowed()||block?.type!=="image")return;
  capture();
  replacement={postId:current.id,project:project.slug,channel:window.StudioFeatures?.activeVersion?.()||"base",index,assetId:block.asset_id};
  notice="Выберите новое фото в медиатеке; замена не удаляет исходный файл.";
  render();
  void window.StudioImages.showLibrary("all");
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
  b.asset_id=id;b.alt=String(item.alt||item.prompt||"").slice(0,350);
  b.caption="";b.crop={x:50,y:50,zoom:100,aspect:"auto"};
  assets[id]=data.url;draft.blocks=blocks;dirty=true;
  replacement=null;notice="Фото заменено в этой статье. Старый оригинал остался в медиатеке. Сохраните материал.";
  renderEditor();
  toast("Фотография заменена. Проверьте подпись и кадрирование, затем сохраните статью.");
 }
 async function act(action,index){
  if(action==="edit"){
   const el=document.querySelector('#blocks [data-block="'+index+'"]')?.closest(".block");
   el?.scrollIntoView({behavior:"smooth",block:"center"});
   el?.querySelector('[data-prop="caption"]')?.focus({preventScroll:true});return;
  }
  if(!allowed())throw Error("Редактирование фотографий доступно только в черновике или материале на доработке.");
  const b=blocks[index];if(b?.type!=="image")return;
  if(action==="replace")return beginReplace(index);
  if(action==="swap-prev"||action==="swap-next")return swap(index,action);
  if(action==="up"||action==="down"){
   modifyBlock(index,action);notice="Фото перемещено относительно текста. Сохраните статью.";render();return;
  }
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
 host.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.photoCancel!==undefined){
   replacement=null;notice="Замена отменена.";render();window.StudioImages?.showLibrary?.("all");return;
  }
  if(b.dataset.photoAction)run(()=>act(b.dataset.photoAction,Number(b.dataset.photoIndex)));
 });
 const original=renderEditor;
 renderEditor=function(...args){const value=original(...args);render();return value};
 window.StudioPhotoTools={activeReplacementIndex,applyReplacement,render};
 render();
})();