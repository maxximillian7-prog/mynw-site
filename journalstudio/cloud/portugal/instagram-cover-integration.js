/* Portugal Ryadom: Instagram-only studio art direction.
   UI renders 1080x1350 JPEGs with precise lettering, then saves them securely.
   No Reels, no changes to original photo or Telegram delivery. */
(function(){
"use strict";
const BASE="https://br-young-paper-b972wmgd-prphoto.compute.c-7.eu-central-1.aws.neon.tech";
const MODEL="pt_ryadom_instagram_typography_v1";
let pending=0,photoCacheKey="",photoCache=null,lastSavedKey="";
const el=id=>document.getElementById(id);
const pane=()=>el("ptIgCoverCanvas");
const note=(message,bad=false)=>{const node=el("ptIgCoverStatus");if(node){node.textContent=message;node.style.color=bad?"#9f3e3e":"#436f67";}};
const selection=()=>el("ptIgCoverTheme")?.value||"editorial";
const headline=()=>String(el("headline")?.value||current?.article?.headline_ru||current?.article?.title_ru||"").trim();
function info(){
 const i=current?.article;
 if(!i?.id||!i.photo_url)throw Error("Сначала выберите фотографию статьи");
 if(!["cc_licensed","owned","permission_confirmed"].includes(i.photo_rights))throw Error("Нужны подтверждённые права на фотографию");
 if(previewPhotoId&&current?.media?.some(m=>m.id===previewPhotoId&&m.public_url!==i.photo_url))
   throw Error("Сначала нажмите «Сделать обложкой» для выбранного фото");
 return {id:i.id,photo:i.photo_url,title:headline(),category:i.primary_category};
}
function attachedCover(i=current?.article,status="approved"){
 const matches=(current?.media||[]).filter(m=>m.generation_model===MODEL&&m.status===status&&m.public_url);
 const head=String(el("headline")?.value||i?.headline_ru||"").trim();
 return matches.find(m=>{
  try{const p=JSON.parse(m.generation_prompt||"{}");return p.headline===head&&p.source_photo_url===i.photo_url&&p.variant===selection()&&p.design_version===3}
  catch{return false}
 })||null;
}
async function api(path,init={}){
 if(!session?.access_token)throw Error("Войдите в редакцию");
 const doRequest=()=>fetch(BASE+path,{method:init.method||"GET",
  headers:{"authorization":"Bearer "+session.access_token,...(init.body?{"content-type":"application/json"}:{})},
  body:init.body?JSON.stringify(init.body):undefined,cache:"no-store"});
 let res=await doRequest();
 if(res.status===401&&typeof call==="function"){
  await call("/api/me");res=await doRequest();
 }
 if(!res.ok){
  const data=await res.json().catch(()=>({}));
  throw Error(data.error||"Ошибка загрузки обложки ("+res.status+")");
 }
 return res;
}
async function source(item){
 const key=item.id+"|"+item.photo;
 if(key===photoCacheKey&&photoCache)return photoCache;
 const req=await api("/api/instagram/source?item_id="+encodeURIComponent(item.id));
 const blob=await req.blob();
 if(!blob.type.startsWith("image/")||blob.size>9000000)throw Error("Невозможно открыть исходное фото");
 photoCacheKey=key;photoCache=blob;return blob;
}
async function draw(){
 const item=info(),currentToken=++pending;
 if(!window.PortugalInstagramCover)throw Error("Модуль оформления обложек ещё не загружен");
 const blob=await source(item);
 if(currentToken!==pending||current?.article?.id!==item.id)return null;
 await window.PortugalInstagramCover.createPreview(pane(),blob,item.title,item.category,selection());
 if(currentToken!==pending||current?.article?.id!==item.id)return null;
 return {canvas:pane(),item,blob};
}
async function refresh(){
 if(!current?.article?.id||!el("ptIgCoverComposer"))return;
 const i=current.article;
 const ready=attachedCover(i,"approved");
 const hasOriginal=Boolean(i.photo_url);
 if(ready&&el("headline")?.value?.trim()===i.headline_ru)note("✓ Обложка уже утверждена для Instagram. В Telegram остаётся оригинал.");
 else if(hasOriginal)note("Отдельная обложка Instagram готовится к предпросмотру.");
 else note("Сначала выберите фото в разделе выше.",true);
 try{
  const result=await draw();
  if(!result)return;
  const phone=document.querySelector(".ig-phone img.ig-cover");
  if(phone&&current?.article?.id===result.item.id){
   const approved=attachedCover(i,"approved");
   if(approved&&!dirty&&el("headline")?.value?.trim()===i.headline_ru){
    phone.src=approved.public_url;
   }else{
    const canvas=document.createElement("canvas");
    canvas.className="ig-cover-canvas";canvas.setAttribute("aria-label","Предпросмотр фирменной обложки Instagram");
    const bmp=await createImageBitmap(result.blob);
    try{window.PortugalInstagramCover.draw(canvas,bmp,result.item.title,result.item.category,selection())}finally{bmp.close()}
    phone.replaceWith(canvas);
   }
  }
  if(!ready)note("Предпросмотр готов. Сохраните обложку либо утвердите материал для Instagram — обложка сохранится вместе с ним.");
 }catch(e){note(e.message,true)}
}
function onPreview(){
 if(!current?.article?.id)return;
 // Trigger after the main editor has replaced its device preview.
 clearTimeout(onPreview.timer);
 onPreview.timer=setTimeout(refresh,180);
}
async function save({approve=false}={}){
 // Save text first if the headline was edited, so both the poster and the
 // database staging guard refer to the exact same reviewed headline.
 if(dirty){
  if(current?.article?.status==="approved")throw Error("Утверждённую статью сначала верните к правкам");
  const id=current?.article?.id;
  if(!id)throw Error("Сначала откройте статью");
  await call("/api/save",{method:"POST",body:{item_id:id,fields:gather()}});
  dirty=false;
  await refreshSelected();
 }
 const original=info(),existing=attachedCover(current.article,"approved");
 if(existing&&!dirty&&el("headline")?.value?.trim()===current.article.headline_ru)return existing;
 const candidate=attachedCover(current.article,"candidate");
 if(approve&&candidate&&!dirty){
  await call("/api/action",{method:"POST",body:{item_id:original.id,action:"approve_media",media_id:candidate.id}});
  return {...candidate,status:"approved"};
 }
 const result=await draw();
 if(!result||current?.article?.id!==original.id)throw Error("Материал изменился, откройте предпросмотр повторно");
 const url=window.PortugalInstagramCover.toJpeg(result.canvas);
 const response=await api("/api/instagram/cover",{method:"POST",body:{
  item_id:original.id,headline:result.item.title,variant:selection(),design_version:3,data_url:url,
 }});
 const d=await response.json();
 if(!d?.media_id)throw Error("Сервер не сохранил Instagram-обложку");
 if(approve){
  await call("/api/action",{method:"POST",body:{item_id:original.id,action:"approve_media",media_id:d.media_id}});
  return {id:d.media_id,public_url:d.image_url,status:"approved"};
 }
 note("✓ Обложка сохранена как кандидат. При утверждении Instagram она будет проверена и одобрена.");
 return {id:d.media_id,public_url:d.image_url,status:"candidate"};
}
async function ensureApproved(){
 const i=current?.article,ok=attachedCover(i,"approved");
 if(ok&&!dirty&&el("headline")?.value?.trim()===i?.headline_ru)return ok;
 return await save({approve:true});
}
function previewDataUrl(){
 try{return pane()?.width===1080?window.PortugalInstagramCover.toJpeg(pane()):null}
 catch{return null}
}
function approvedUrl(){return attachedCover()?.public_url||null}
function bind(){
 el("ptIgCoverTheme")?.addEventListener("change",()=>{lastSavedKey="";onPreview()});
 el("ptIgSaveCover")?.addEventListener("click",async()=>{
  const btn=el("ptIgSaveCover");if(!btn)return;
  btn.disabled=true;note("Сохраняем отдельный JPEG для Instagram…");
  try{
   await save();toast("Instagram-обложка сохранена в приёмке.");
   if(typeof refreshSelected==="function")await refreshSelected();
  }catch(e){note(e.message,true);toast(e.message,true)}
  finally{btn.disabled=false}
 });
}
window.PtIgCover={onPreview,ensureApproved,approvedUrl,previewDataUrl,refresh};
bind();
})();
