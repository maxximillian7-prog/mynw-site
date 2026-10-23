"use strict";
/* Journal Studio v0.4 — shared advanced constructor + role-aware workspace.
   This module extends the authenticated editor; permissions remain server-enforced. */
(function(){
let activeChannel="base",variants=[],dragIndex=null,knownPostId=null,editAuthorId=null;
const templates={editorial:"Журнал",guide:"Инструкция",story:"История",gallery:"Галерея",minimal:"Минимализм"};
const $s=s=>document.querySelector(s),$all=s=>Array.from(document.querySelectorAll(s));
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const label=v=>({base:"Основная статья",website:"Сайт",instagram:"Instagram"})[v]||v;
const isAuthor=()=>project?.role==="author";
function roleUI(){
 if(!project)return;
 document.body.setAttribute("data-studio-role",project.role||"");
 const userMode=isAuthor();
 const text={
 home:userMode?"Мои статьи":"Главная",
 editor:userMode?"Создать статью":"Конструктор",
 authors:userMode?"Мой профиль":"Авторы",
 publish:userMode?"Статусы":"Публикации",
 library:"Материалы"
 };
 for(const [key,v] of Object.entries(text)){const node=$s('[data-role-label="'+key+'"]');if(node)node.textContent=v}
 const hint=document.getElementById("authorHomeHint");
 if(hint)hint.hidden=!userMode;
 const profile=document.getElementById("authorProfileHint");
 if(profile)profile.hidden=!userMode;
 const name=document.getElementById("userDisplay");
 if(userMode&&name)name.textContent=(session?.user?.email||"Автор")+" · Автор";
}
function candidate(t){
 const value=t==="base"?null:variants.find(x=>x.channel===t&&x.locale===current?.locale);
 if(t==="base")return structuredClone(current);
 const v=value?structuredClone(value):{title:current.title,summary:current.summary,blocks:structuredClone(current.blocks||[]),template_id:current.template_id||"editorial",cover_path:current.cover_path,locale:current.locale,caption:""};
 return {...v,author_id:current.author_id,category:current.category,locale:v.locale||current.locale,cover_path:v.cover_path||null,template_id:v.template_id||"editorial"};
}
async function loadVersions(){
 if(!current){variants=[];return}
 const r=await call("/variants?post_id="+encodeURIComponent(current.id));
 variants=r.variants||[];
}
async function chooseVersion(channel){
 if(channel===activeChannel)return;
 if(!current){toast("Сначала создайте и сохраните основную статью.",true);return}
 if(dirty){toast("Сначала сохраните текущую версию статьи.",true);return}
 if(!editable()&&channel!=="base"&&!variants.some(v=>v.channel===channel)){toast("Нельзя создавать новую версию после согласования.",true);return}
 activeChannel=channel;draft=candidate(channel);blocks=draft.blocks||[];assets={};dirty=false;
 await fetchMedia();
 renderEditor();
 window.JournalPreview?.choose(channel==="instagram"?"instagram":channel==="website"?"site":"phone");
}
function versionUI(){
 const bar=document.getElementById("versionBar");if(!bar)return;
 for(const b of $all("[data-version]")){b.classList.toggle("selected",b.dataset.version===activeChannel);b.disabled=activeChannel!=="base"&&!current}
 const hint=document.getElementById("versionHint");
 if(hint){
  hint.textContent=activeChannel==="base"?"Основная версия для приложения. Сначала сохраните её — затем сможете создать отдельные варианты для сайта и Instagram.":
   variants.some(x=>x.channel===activeChannel&&x.locale===current?.locale)?"Вы редактируете сохранённую версию «"+label(activeChannel)+"». Она отличается от основной статьи.":
   "Новая версия «"+label(activeChannel)+"» создана на основе основной статьи. Сохраните её отдельно.";
 }
 const select=document.getElementById("templateSelect");if(select){select.value=draft?.template_id||"editorial";select.disabled=!editable()}
 const authorSel=document.getElementById("authorSelect");if(authorSel&&activeChannel!=="base")authorSel.disabled=true;
 const save=document.getElementById("save");if(save&&activeChannel!=="base"&&editable())save.textContent="Сохранить версию: "+label(activeChannel);else if(save)save.textContent="Сохранить статью";
 const variantsCount=variants.length;
 const channelPanel=document.getElementById("editorChannels");
 if(channelPanel&&variantsCount&&!channelPanel.querySelector(".studio-variant-info")){
  channelPanel.insertAdjacentHTML("beforeend",'<div class="studio-variant-info"><div class="eyebrow" style="margin-top:12px">Редакционные версии</div>'+variants.map(v=>'<span class="studio-variant-badge">'+escape(label(v.channel))+" · "+escape(templates[v.template_id]||v.template_id)+"</span>").join("")+'</div>');
 }
}
function crop(b){return b.crop||{x:50,y:50,zoom:100,aspect:"auto"}}
function cropUi(b,i){
 const c=crop(b),asset=assets[b.asset_id]||"";
 const aspectOptions=[["auto","Оригинал"],["1:1","Квадрат 1:1"],["4:5","Вертикально 4:5"],["16:9","Горизонтально 16:9"]];
 const option=aspectOptions.map(([v,text])=>'<option value="'+v+'" '+(c.aspect===v?"selected":"")+'>'+text+'</option>').join("");
 const block='<div class="studio-crop"><div class="eyebrow">КАДРИРОВАНИЕ ЭТОГО ФОТО · '+escape(label(activeChannel))+'</div>'+
 '<label>Формат кадра</label><select data-crop-index="'+i+'" data-crop-prop="aspect">'+option+'</select>'+
 [['x','Центр по горизонтали',0,100],['y','Центр по вертикали',0,100],['zoom','Приближение, %',100,250]].map(([key,title,min,max])=>'<label>'+title+'</label><div class="studio-slider-row"><input type="range" min="'+min+'" max="'+max+'" step="1" data-crop-index="'+i+'" data-crop-prop="'+key+'" value="'+Number(c[key])+'"><output data-crop-output="'+i+'-'+key+'">'+Number(c[key])+(key==="zoom"?"%":"")+'</output></div>').join("")+
 (asset?'<div class="studio-crop-preview" data-crop-thumb="'+i+'"><img data-media-id="'+escape(b.asset_id)+'" alt="Пример кадрирования" src="'+escape(asset)+'"></div>':"")+
 '<div class="small muted">Кадрирование сохраняется отдельно в каждой версии площадки. Исходный файл не изменяется.</div></div>';
 return block;
}
function photoCropUi(){
 if(!draft)return;
 const editableNow=editable();
 const items=$all("#blocks .block");
 items.forEach((el,index)=>{
  const b=blocks[index];if(!b)return;
  const top=el.querySelector(".row");
  if(top&&editableNow&&!top.querySelector("[data-studio-grip]")){
   top.insertAdjacentHTML("afterbegin",'<button type="button" draggable="true" class="studio-grip" data-studio-grip="'+index+'" title="Перетащить блок">⠿</button>');
  }
  if(b.type==="image"){
   if(editableNow&&!el.querySelector("[data-crop-index]"))el.insertAdjacentHTML("beforeend",cropUi(b,index));
   if(!editableNow&&el.querySelector(".studio-crop"))el.querySelector(".studio-crop").remove();
   updateThumb(index);
  }
 });
}
function updateThumb(index){
 const host=$s('[data-crop-thumb="'+index+'"]');if(!host)return;
 const img=host.querySelector("img");if(!img)return;
 const c=crop(blocks[index]);host.style.aspectRatio=c.aspect==="auto"?"4/5":c.aspect.replace(":","/");
 img.style.objectPosition=c.x+"% "+c.y+"%";img.style.transform="scale("+(c.zoom/100)+")";img.style.transformOrigin=c.x+"% "+c.y+"%";
}
function decorate(){if(!project)return;roleUI();if(!draft)return;versionUI();photoCropUi()}
const originalRender=renderEditor;
renderEditor=function(...a){originalRender(...a);decorate()};
const originalOpen=openPost;
openPost=async function(id){
 activeChannel="base";knownPostId=id;variants=[];
 await originalOpen(id);await loadVersions();
 const selected=["in_review","approved","scheduled","published"].includes(current?.status)?current?.review_channel:"base";
 if(selected&&selected!=="base"&&variants.some(v=>v.channel===selected&&v.locale===current?.locale)){
  activeChannel=selected;draft=candidate(selected);blocks=draft.blocks||[];dirty=false;
  await fetchMedia();
 }
 renderEditor();
};
const originalCreate=createPost;
createPost=async function(...args){activeChannel="base";knownPostId=null;variants=[];await originalCreate(...args);renderEditor()};
const originalSave=savePost;
let editionSavePending=null;
savePost=async function(...args){
 if(editionSavePending)return await editionSavePending;
 const runSave=(async()=>{
  if(activeChannel==="base"){await originalSave(...args);return}
  if(!current)throw Error("Сначала сохраните основную статью");
  if(!editable())throw Error("После отправки на согласование редакционные версии заблокированы");
  capture();
  if(!draft.title?.trim())throw Error("Введите заголовок версии");
  const channel=activeChannel,id=current.id;
  const data={post_id:id,expected_revision:current.revision,channel,locale:current.locale,
    title:draft.title,summary:draft.summary,caption:channel==="instagram"?(draft.caption||""):"",
    blocks,template_id:draft.template_id||"editorial",cover_path:draft.cover_path||null};
  const receipt=await call("/variants","POST",data);
  current=(await call("/posts/"+id)).post;
  if(Number(receipt.revision)!==current.revision)throw Error("Не удалось подтвердить сохранённую ревизию площадки");
  await loadVersions();
  draft=candidate(channel);blocks=draft.blocks||[];dirty=false;
  placements=(await call("/placements?post_id="+id)).placements||[];
  await refreshPosts();await fetchMedia();renderEditor();
  toast("Версия «"+label(channel)+"» сохранена: ревизия "+current.revision);
 })();
 editionSavePending=runSave;
 try{return await runSave}finally{if(editionSavePending===runSave)editionSavePending=null}
};
function hasUnsavedChanges(){
 if(!current||!draft)return !!dirty;
 const saved=activeChannel==="base"?current:variants.find(v=>v.channel===activeChannel&&v.locale===current.locale);
 if(!saved)return true;
 const props=["title","summary","blocks","cover_path","template_id","locale"];
 if(activeChannel==="base"){props.push("category","author_id")}
 if(activeChannel==="instagram")props.push("caption");
 return props.some(k=>JSON.stringify(draft[k]??null)!==JSON.stringify(saved[k]??null));
}
const originalWorkflow=workflow;
workflow=async function(action,...args){
 const selected=activeChannel;
 await originalWorkflow(action,...args);
 if(selected!=="base"&&current){
  await loadVersions();
  const chosen=variants.find(v=>v.channel===selected&&v.locale===current.locale);
  if(chosen){
   activeChannel=selected;draft=candidate(selected);blocks=draft.blocks||[];dirty=false;
   await fetchMedia();renderEditor();
  }
 }
};
const oldDashboard=renderDashboard;
renderDashboard=function(...args){
 oldDashboard(...args);roleUI();
 if(!isAuthor())return;
 const items=document.getElementById("recentPosts");
 if(items)items.innerHTML=posts.length?posts.map(listEntry).join(""):'<div class="empty"><h3>У вас пока нет статей</h3><p>Создайте первый материал и отправьте его редактору.</p><button class="primary" data-create>+ Начать статью</button></div>';
 const recentTitle=$s('[data-view="home"] .dashboardGrid .sectionHeading h2');
 if(recentTitle)recentTitle.textContent="Все мои статьи";
 const browse=$s('[data-view="home"] [data-open-tab="library"]');
 if(browse)browse.hidden=true;
};
const oldAuthors=renderAuthors;
renderAuthors=function(...args){
 oldAuthors(...args);roleUI();
 if(!isAuthor())return;
 const pane=document.getElementById("authorsList");
 if(pane&&!authors.length)pane.innerHTML='<div class="empty"><h3>Создайте свой профиль</h3><p>Укажите имя и информацию о себе, чтобы редактор мог указать автора материала.</p></div>';
 const kind=document.getElementById("authorKind");if(kind)kind.value="partner";
 const heading=$s('[data-view="authors"] h2');if(heading)heading.textContent="Мой профиль";
 const inviteBtn=document.getElementById("authorsInvite");if(inviteBtn)inviteBtn.hidden=true;
 const note=document.getElementById("authorProfileHint");if(note)note.hidden=false;
 if(pane&&authors.length&&!pane.querySelector("[data-edit-own-author]")){
   const items=authors.filter(a=>a.kind==="partner");
   pane.insertAdjacentHTML("beforeend",'<div class="btns">'+items.map(a=>'<button type="button" data-edit-own-author="'+escape(a.id)+'">✎ Изменить профиль: '+escape(a.name)+'</button>').join("")+'</div>');
 }
 const save=document.getElementById("saveAuthor");
 if(save)save.textContent=editAuthorId?"Сохранить изменения":"Создать профиль";
};
const oldSaveAuthor=saveAuthor;
saveAuthor=async function(...args){
 if(!editAuthorId)return oldSaveAuthor(...args);
 const author=authors.find(a=>a.id===editAuthorId);
 if(!author||author.kind!=="partner")throw Error("Профиль недоступен");
 const name=document.getElementById("authorName").value.trim();
 if(!name)throw Error("Укажите имя автора");
 const data={name,bio:document.getElementById("authorBio").value,social_url:document.getElementById("authorSocial").value.trim()};
 const response=await call("/authors/"+editAuthorId,"PATCH",data);
 editAuthorId=null;
 for(const id of ["authorName","authorBio","authorSocial"])document.getElementById(id).value="";
 await refreshPosts();renderAuthors();
 toast(response.consent_requires_review?"Профиль обновлён. Изменённая ссылка требует повторного согласования.":"Профиль сохранён");
};
const oldPublish=paintPublication;
paintPublication=function(...args){
 if(!isAuthor()){oldPublish(...args);return}
 const host=document.getElementById("readyPosts");if(!host)return;
 host.innerHTML=posts.length?posts.map(p=>'<div class="listItem"><div><strong>'+escape(p.title)+'</strong><div class="muted small">'+escape(statuses[p.status]||p.status)+'</div></div><button data-open-post="'+escape(p.id)+'">Открыть</button></div>').join(""):'<div class="empty">Когда вы создадите статью, здесь будет виден её статус и решение редактора.</div>';
 const h=$s('[data-view="publish"] h2');if(h)h.textContent="Статусы моих статей";
};
const oldChangeProject=changeProject;
changeProject=async function(...args){activeChannel="base";variants=[];await oldChangeProject(...args);roleUI()};
const oldShowTab=showTab;
showTab=async function(target,...args){if(isAuthor()&&["library","settings"].includes(target))target="home";await oldShowTab(target,...args);roleUI();if(target==="editor")decorate()};
const oldRenderChannels=renderEditorChannels;
renderEditorChannels=function(...args){oldRenderChannels(...args);if(draft)versionUI()};
document.addEventListener("click",e=>{
 const button=e.target.closest("button");if(!button)return;
 if(button.dataset.editOwnAuthor!==undefined){
 e.preventDefault();
 const person=authors.find(x=>x.id===button.dataset.editOwnAuthor);
 if(!person)return;
 editAuthorId=person.id;
 document.getElementById("authorName").value=person.name||"";
 document.getElementById("authorBio").value=person.bio||"";
 document.getElementById("authorSocial").value=person.social_links?.website||"";
 document.getElementById("authorKind").value="partner";
 document.getElementById("saveAuthor").textContent="Сохранить изменения";
 document.getElementById("authorName").focus();
 }
 if(button.dataset.version!==undefined){e.preventDefault();run(()=>chooseVersion(button.dataset.version))}
 if(button.dataset.studioGrip!==undefined)e.preventDefault();
});
const templateSelect=document.getElementById("templateSelect");
if(templateSelect)templateSelect.onchange=e=>{
 if(!draft||!editable())return;
 draft.template_id=e.target.value;dirty=true;renderPreview();versionUI();
};
document.addEventListener("input",e=>{
 const t=e.target;if(t.dataset.cropIndex===undefined||!draft||!editable())return;
 const i=Number(t.dataset.cropIndex),b=blocks[i];if(!b||b.type!=="image")return;
 if(!b.crop)b.crop={x:50,y:50,zoom:100,aspect:"auto"};
 const key=t.dataset.cropProp;b.crop[key]=key==="aspect"?t.value:Number(t.value);dirty=true;
 const out=$s('[data-crop-output="'+i+"-"+key+'"]');if(out)out.textContent=b.crop[key]+(key==="zoom"?"%":"");
 updateThumb(i);renderPreview();
});
document.addEventListener("change",e=>{
 const t=e.target;if(t.dataset.cropIndex===undefined||t.dataset.cropProp!=="aspect"||!draft)return;
 const i=Number(t.dataset.cropIndex),b=blocks[i];if(!b||b.type!=="image")return;
 if(!b.crop)b.crop={x:50,y:50,zoom:100,aspect:"auto"};
 b.crop.aspect=t.value;dirty=true;updateThumb(i);renderPreview();
});
document.addEventListener("dragstart",e=>{
 const grip=e.target.closest("[data-studio-grip]");if(!grip||!editable())return;
 dragIndex=Number(grip.dataset.studioGrip);const block=grip.closest(".block");
 if(block)block.classList.add("dragging");
 e.dataTransfer.effectAllowed="move";e.dataTransfer.setData("text/plain",String(dragIndex));
});
document.addEventListener("dragover",e=>{
 const block=e.target.closest("#blocks .block");if(!block||dragIndex===null)return;
 e.preventDefault();e.dataTransfer.dropEffect="move";$all("#blocks .block").forEach(el=>el.classList.remove("drop-target"));block.classList.add("drop-target");
});
document.addEventListener("drop",e=>{
 const target=e.target.closest("#blocks .block");if(!target||dragIndex===null)return;
 e.preventDefault();const items=$all("#blocks .block"),to=items.indexOf(target),from=dragIndex;
 dragIndex=null;items.forEach(x=>x.classList.remove("dragging","drop-target"));
 if(to<0||to===from||!editable())return;
 capture();const [item]=blocks.splice(from,1);blocks.splice(to,0,item);draft.blocks=blocks;dirty=true;renderEditor();toast("Блок перемещён. Сохраните изменения.");
});
document.addEventListener("dragend",()=>{dragIndex=null;$all("#blocks .block").forEach(x=>x.classList.remove("dragging","drop-target"))});
window.StudioFeatures={
 setDraftCaption:function(caption){if(activeChannel==="instagram"&&draft&&editable()){draft.caption=String(caption||"").slice(0,2200);dirty=true;}},
 saveCaptionForActiveVersion:async function(caption){
   if(activeChannel!=="instagram")return false;
   if(!current||!editable())throw Error("После согласования изменить подпись нельзя");
   draft.caption=String(caption||"").slice(0,2200);
   dirty=true;
   await savePost();
   return true;
 },
 activeVersion:()=>activeChannel,
 waitForSave:async()=>{if(editionSavePending)await editionSavePending},
 hasUnsavedChanges
};
roleUI();
})();