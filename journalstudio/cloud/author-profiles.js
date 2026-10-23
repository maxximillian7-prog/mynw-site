"use strict";
/* Rich author profiles for partner authors and AI personas; portrait media stays in private Studio Storage. */
(function(){
 const $=id=>document.getElementById(id);
 const E=v=>String(v??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
 let editing=null,uploadBusy=false;
 const photos=new Map();
 const canEdit=a=>project?.role==="owner"||project?.role==="chief_editor"||a.kind==="partner"&&a.owner_user_id===session?.user?.id;
 const profileFields={name:"authorName",bio:"authorBio",tagline:"authorTagline",focus:"authorFocus",voice_style:"authorVoice",preferred_locale:"authorLang",website:"authorSocial",instagram:"authorInstagram",youtube:"authorYoutube",photo_asset_id:"authorPhotoId"};
 const safeLink=v=>typeof v==="string"&&/^https:\/\//i.test(v)?v:"";
 function photo(id){
  if(!id)return null;
  if(photos.has(id))return photos.get(id);
  return null;
 }
 async function signed(id){
  if(!id||photos.has(id))return;
  try{const d=await call("/media/"+encodeURIComponent(id));photos.set(id,d.url);renderImages()}catch{photos.set(id,null)}
 }
 function face(author){
  const url=photo(author.photo_asset_id);
  return url?'<img alt="Аватар '+E(author.name)+'" loading="lazy" src="'+E(url)+'">':E((author.name||"А").slice(0,1));
 }
 function renderImages(){
  for(const a of authors||[]){
   if(!a.photo_asset_id)continue;
   const img=photo(a.photo_asset_id);
   if(!img)continue;
   document.querySelectorAll('[data-author-face="'+a.id+'"]').forEach(el=>{
     el.innerHTML='<img loading="lazy" alt="Фото '+E(a.name)+'" src="'+E(img)+'">';
   });
  }
  if(editing?.photo_asset_id){
   const img=photo(editing.photo_asset_id);
   if(img)$("authorPhotoPreview").innerHTML='<img alt="Фото автора" src="'+E(img)+'">';
  }
 }
 function links(a){
  const data=a.social_links||{},arr=[];
  for(const [key,label] of [["website","Сайт"],["instagram","Instagram"],["youtube","YouTube"],["tiktok","TikTok"],["facebook","Facebook"]]){
   const url=safeLink(data[key]);
   if(url)arr.push('<a target="_blank" rel="noopener noreferrer" href="'+E(url)+'">'+label+' ↗</a>');
  }
  return arr.join("");
 }
 function render(){
  const pane=$("authorsList");if(!pane)return;
  pane.innerHTML=(authors||[]).length?authors.map(a=>{
   const edit=canEdit(a);
   return '<article class="ai-author-item"><div class="ai-author-avatar" data-author-face="'+E(a.id)+'">'+face(a)+'</div><div class="info">'+
    '<b>'+E(a.name)+'</b> <span class="chip">'+(a.kind==="ai"?"ИИ-автор":"Автор")+'</span>'+
    '<div class="small muted">'+E(a.tagline||a.focus||"")+'</div>'+
    '<p class="ai-author-bio">'+E(a.bio||"")+'</p>'+
    '<div class="ai-author-links">'+links(a)+'</div>'+
    (a.kind==="partner"&&a.consent_status!=="approved"?'<div class="small muted">Согласие на публикацию ожидает проверки</div>':"")+
    '</div><div class="btns">'+(edit?'<button type="button" data-profile-edit="'+E(a.id)+'">Редактировать</button>':"")+
    (["owner","chief_editor"].includes(project.role)&&a.kind==="partner"&&a.consent_status!=="approved"?'<button type="button" data-author-approve="'+E(a.id)+'">✓ Согласие</button>':"")+'</div></article>';
  }).join(""):'<div class="empty">Добавьте первого автора.</div>';
  if(editing&&!(authors||[]).some(a=>a.id===editing.id))reset();
  for(const a of authors||[])if(a.photo_asset_id&&!photos.has(a.photo_asset_id))void signed(a.photo_asset_id);
 }
 function reset(){
  editing=null;
  for(const id of Object.values(profileFields)){const el=$(id);if(el)el.value=id==="authorLang"?"ru":""}
  $("authorPhotoPreview").textContent="♙";$("authorPhotoRights").checked=false;$("authorPhoto").value="";
  $("authorFormTitle").textContent="Новый профиль автора";$("saveAuthor").textContent="Добавить автора";
  $("authorKind").disabled=false;$("authorKind").value="partner";
 }
 function fill(author){
  editing=author;
  $("authorFormTitle").textContent="Редактирование: "+author.name;
  $("saveAuthor").textContent="Сохранить профиль";
  $("authorName").value=author.name||"";$("authorBio").value=author.bio||"";
  $("authorTagline").value=author.tagline||"";$("authorFocus").value=author.focus||"";
  $("authorVoice").value=author.voice_style||"";$("authorLang").value=author.preferred_locale||"ru";
  $("authorSocial").value=author.social_links?.website||"";
  $("authorInstagram").value=author.social_links?.instagram||"";
  $("authorYoutube").value=author.social_links?.youtube||"";
  $("authorPhotoId").value=author.photo_asset_id||"";
  $("authorKind").value=author.kind;$("authorKind").disabled=true;
  const url=photo(author.photo_asset_id);
  $("authorPhotoPreview").innerHTML=url?'<img src="'+E(url)+'" alt="Фото автора">':E(author.name.slice(0,1));
  if(author.photo_asset_id)void signed(author.photo_asset_id);
  $("authorName").focus();
 }
 function data(){
  const kind=editing?.kind||$("authorKind").value;
  const fields={
   name:$("authorName").value.trim(),kind,tagline:$("authorTagline").value.trim(),
   bio:$("authorBio").value,focus:$("authorFocus").value,voice_style:$("authorVoice").value,
   preferred_locale:$("authorLang").value,photo_asset_id:$("authorPhotoId").value||null,
   social_url:$("authorSocial").value.trim(),instagram:$("authorInstagram").value.trim(),
   youtube:$("authorYoutube").value.trim()
  };
  if(!fields.name)throw Error("Укажите имя автора");
  for(const k of ["social_url","instagram","youtube"])if(fields[k]&&!safeLink(fields[k]))throw Error("Ссылки должны начинаться с https://");
  return fields;
 }
 const oldRender=renderAuthors;
 renderAuthors=function(...args){oldRender(...args);render()};
 const oldSave=saveAuthor;
 saveAuthor=async function(){
  const body=data();
  if(body.kind==="ai"&&!["owner","chief_editor"].includes(project.role))throw Error("ИИ-профилем управляет главный редактор");
  if(editing)await call("/authors/"+editing.id,"PATCH",body);
  else await call("/authors","POST",{...body,project:project.slug});
  reset();await refreshPosts();toast("Профиль автора сохранён.");
 };
 const oldProject=changeProject;
 changeProject=async function(...args){reset();return await oldProject(...args)};
 async function uploadPhoto(){
  if(uploadBusy)return;
  const file=$("authorPhoto").files?.[0];
  if(!file)throw Error("Выберите изображение");
  if(!["image/png","image/jpeg","image/webp"].includes(file.type)||file.size>8*1024*1024)throw Error("JPG, PNG, WebP не более 8 МБ");
  if(!$("authorPhotoRights").checked)throw Error("Подтвердите право использования изображения");
  uploadBusy=true;
  try{
   const b64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(",")[1]);reader.onerror=reject;reader.readAsDataURL(file)});
   const response=await call("/media","POST",{project:project.slug,mime:file.type,base64:b64,alt_text:"Фото автора "+($("authorName").value||"Journal Studio"),copyright_holder:$("authorName").value||"Автор",license:"Права подтверждены владельцем профиля",rights_confirmed:true});
   $("authorPhotoId").value=response.asset.id;
   $("authorPhotoRights").checked=false;$("authorPhoto").value="";
   await signed(response.asset.id);
   const img=photo(response.asset.id);
   if(img)$("authorPhotoPreview").innerHTML='<img src="'+E(img)+'" alt="Предпросмотр аватара">';
   toast("Фото загружено. Нажмите «Сохранить профиль», чтобы закрепить его за автором.");
  }finally{uploadBusy=false}
 }
 document.addEventListener("click",e=>{
  const btn=e.target.closest("button");if(!btn)return;
  if(btn.dataset.profileEdit!==undefined){
    e.preventDefault();
    const a=(authors||[]).find(x=>x.id===btn.dataset.profileEdit);
    if(a&&canEdit(a))fill(a);
  }
 });
 $("authorUploadPhoto").onclick=()=>run(uploadPhoto);
 document.getElementById("authorKind").onchange=e=>{
  const ai=e.target.value==="ai";
  $("authorFocus").parentElement?.classList.toggle("ai-persona-fields",ai);
 };
 window.StudioProfiles={render,reset,photo};
})();