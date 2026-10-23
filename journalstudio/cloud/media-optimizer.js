"use strict";
/* Journal Studio WebP optimization — free-tier compatible, browser canvas encoding.
   Originals remain private until a published article's optimized copies are verified
   and the server confirms there are no unpublished or author-avatar dependencies. */
(function(){
 const pending=new Map(),summaries=new Map();
 const variants=[
  {kind:"thumb",max:640,quality:.75,target:150000},
  {kind:"article",max:1400,quality:.80,target:350000},
  {kind:"cover",max:1600,quality:.82,target:520000}
 ];
 const bytesText=b=>{
  if(!Number.isFinite(Number(b))||Number(b)<=0)return "—";
  return b>=1048576?(b/1048576).toFixed(2)+" МБ":Math.round(b/1024)+" КБ";
 };
 const stamp=s=>{
  const parts=s?.variants||{},original=s?.original_bytes,optimized=Object.values(parts).reduce((a,v)=>a+Number(v.bytes||0),0);
  const deletion=s?.original_deleted;
  if(s?.status==="ready")return "WebP: миниатюра "+bytesText(parts.thumb?.bytes)+", статья "+bytesText(parts.article?.bytes)+
   ", обложка "+bytesText(parts.cover?.bytes)+" · Исходник "+(deletion?"удалён":bytesText(original))+
   (original&&optimized?" · Копии вместе: "+bytesText(optimized):"");
  return "Оптимизация изображений: "+(s?.status==="failed"?"ошибка":"ожидается");
 };
 const b64=blob=>new Promise((ok,no)=>{const reader=new FileReader();reader.onload=()=>ok(String(reader.result).split(",")[1]);reader.onerror=no;reader.readAsDataURL(blob)});
 const toBlob=(canvas,quality)=>new Promise((ok,no)=>canvas.toBlob(v=>v?ok(v):no(new Error("Не удалось создать WebP")), "image/webp",quality));
 async function renderVersions(file){
  if(!(file instanceof Blob)||file.size>8*1024*1024)throw Error("Файл должен быть изображением до 8 МБ");
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw Error("Неподдерживаемый формат");
  if(typeof createImageBitmap!=="function")throw Error("В браузере недоступно уменьшение изображений");
  const bmp=await createImageBitmap(file);
  const w=bmp.width,h=bmp.height;
  if(w<1||h<1||w*h>50000000){bmp.close?.();throw Error("Неверные размеры изображения")}
  const prepared={};
  try{
   for(const rule of variants){
    const scale=Math.min(1,rule.max/Math.max(w,h));
    const width=Math.max(1,Math.round(w*scale)),height=Math.max(1,Math.round(h*scale));
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;
    const context=canvas.getContext("2d",{alpha:true});
    if(!context)throw Error("Нет доступа к Canvas");
    context.imageSmoothingEnabled=true;context.imageSmoothingQuality="high";
    context.drawImage(bmp,0,0,width,height);
    let compressed=null;
    for(const quality of [rule.quality,Math.max(.57,rule.quality-.09),.54]){
     compressed=await toBlob(canvas,quality);
     if(compressed.type!=="image/webp")throw Error("Браузер не поддерживает WebP");
     if(compressed.size<=rule.target)break;
    }
    if(compressed.size>2200000)throw Error("Версия "+rule.kind+" получилась слишком большой");
    prepared[rule.kind]={base64:await b64(compressed),width,height};
    canvas.width=1;canvas.height=1;
   }
  }finally{bmp.close?.()}
  return prepared;
 }
 async function sourceBlob(id){
  let response;
  const url="https://npsfaymjckcqhtyiafms.supabase.co/functions/v1/studio-api/media/"+encodeURIComponent(id)+"/source";
  const once=()=>fetch(url,{headers:{apikey:PUBLIC_KEY,Authorization:"Bearer "+session.access_token}});
  response=await once();
  if(response.status===401&&session.refresh_token){
   session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
   sessionStorage.setItem("journal_session",JSON.stringify(session));response=await once();
  }
  if(!response.ok)throw Error("Не удалось прочитать исходное фото: "+response.status);
  const file=await response.blob();
  if(file.size>8*1024*1024)throw Error("Оригинал слишком большой для браузерной оптимизации");
  return file;
 }
 async function perform(id,file,readyVariants){
  if(!/^[0-9a-f-]{36}$/i.test(String(id)))throw Error("Некорректный ID фотографии");
  if(pending.has(id))return pending.get(id);
  const work=(async()=>{
   const original=file||await sourceBlob(id);
   const prepared=readyVariants||await renderVersions(original);
   const result=await call("/media/"+id+"/optimize","POST",{variants:prepared,original_bytes:original.size});
   if(result?.optimization){
    summaries.set(id,result.optimization);
    try{
     const update=await call("/media/"+id);
     if(typeof assets==="object")assets[id]=update.url;
     document.querySelectorAll('[data-media-id="'+id+'"]').forEach(img=>{if(img instanceof HTMLImageElement&&img.src!==update.url)img.src=update.url});
     updateLabels(id);
    }catch{}
   }
   return result;
  })().finally(()=>pending.delete(id));
  pending.set(id,work);return work;
 }
 function updateLabels(id){
  document.querySelectorAll('[data-optimized-id="'+id+'"]').forEach(el=>{el.textContent=stamp(summaries.get(id))});
 }
 function track(id,summary){
  if(summary){summaries.set(id,summary);updateLabels(id)}
 }
 async function optimizeExisting(id,metadata){
  if(!id||metadata?.original_deleted||metadata?.status==="ready")return false;
  if(pending.has(id))return pending.get(id);
  try{
   const data=await perform(id);
   return data?.optimization?.status==="ready";
  }catch(e){
   console.warn("Journal Studio: old photo kept because optimization could not finish",String(e));
   return false;
  }
 }
 async function fromPrepared(id,prepared,originalBytes){
  if(pending.has(id))return pending.get(id);
  const task=(async()=>{
   const result=await call("/media/"+id+"/optimize","POST",{variants:prepared,original_bytes:originalBytes});
   if(result?.optimization){summaries.set(id,result.optimization);updateLabels(id)}
   return result.optimization;
  })().finally(()=>pending.delete(id));
  pending.set(id,task);return task;
 }
 async function fromFile(id,file){
  const data=await perform(id,file);
  if(data?.optimization?.status!=="ready")throw Error("Оптимизированные версии не сохранились");
  return data.optimization;
 }
 window.StudioOptimizer={renderVersions,fromPrepared,fromFile,optimizeExisting,track,label:id=>stamp(summaries.get(id)),bytesText};
})();