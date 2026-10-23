"use strict";
/* Refresh expired Supabase Storage signed photo links in all Journal Studio previews.
   This module uses the user's authenticated studio-api; it never exposes storage secrets. */
(function(){
 const pending=new Map(),attempts=new Map();
 const idOk=s=>typeof s==="string"&&/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(s);
 function images(id){
  return Array.from(document.querySelectorAll('img[data-media-id="'+id+'"]'));
 }
 async function recover(id){
  if(pending.has(id))return pending.get(id);
  const task=(async()=>{
   const entry=attempts.get(id)||{count:0,at:0};
   if(Date.now()-entry.at>120000)entry.count=0;
   if(entry.count>=2)return;
   entry.count++;entry.at=Date.now();attempts.set(id,entry);
   try{
    const data=await call("/media/"+encodeURIComponent(id));
    const next=data?.url;
    if(typeof next!=="string"||!next.startsWith("https://")||!next.includes("/storage/v1/object/sign/studio-private/"))
     throw Error("Invalid photo URL");
    assets[id]=next;
    for(const img of images(id)){
     if(img.src!==next)img.src=next;
    }
   }catch{
    if(entry.count>=2)toast("Фотографию не удалось загрузить. Откройте статью повторно; оригинал сохранён в медиатеке.",true);
   }finally{pending.delete(id)}
  })();
  pending.set(id,task);return task;
 }
 document.addEventListener("error",event=>{
  const el=event.target;
  if(!(el instanceof HTMLImageElement))return;
  const id=el.dataset.mediaId;
  if(!idOk(id))return;
  void recover(id);
 },true);
 document.addEventListener("load",event=>{
  const el=event.target;
  if(el instanceof HTMLImageElement&&idOk(el.dataset.mediaId))attempts.delete(el.dataset.mediaId);
 },true);
 window.StudioMediaRecovery={recover};
})();