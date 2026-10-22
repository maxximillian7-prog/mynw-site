"use strict";
/* Journal Studio: read-only layout previews. No external publication is performed here. */
(function(){
const E=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
const live={mode:"phone",shape:"4:5",photo:0,ctx:null,articleKey:null,caption:"",captionDirty:false};
const link=u=>typeof u==="string"&&/^https:\/\//i.test(u);
function allImages(c){return (c.blocks||[]).filter(b=>b.type==="image").map(b=>({id:b.asset_id,src:c.assets?.[b.asset_id],alt:b.alt||"",caption:b.caption||"",isCover:!!b.is_cover})).filter(b=>b.src)}
function cover(c){const a=allImages(c),prefer=a.find(x=>x.id===c.draft?.cover_path||x.isCover);return prefer||a[0]||null}
function content(c){
return (c.blocks||[]).map(b=>{
 const t=E(b.text||"");switch(b.type){
 case"heading":return '<h3>'+t+'</h3>';
 case"text":return '<p>'+t+'</p>';
 case"quote":return '<blockquote>'+t+'</blockquote>';
 case"link":return link(b.url)?'<p class="jp-link">↗ <a target="_blank" rel="noopener noreferrer" href="'+E(b.url)+'">'+E(b.label||b.url)+'</a></p>':'';
 case"image":{const url=c.assets?.[b.asset_id];return url?'<figure><img loading="lazy" src="'+E(url)+'" alt="'+E(b.alt||"Фотография статьи")+'">'+(b.caption?'<figcaption>'+E(b.caption)+'</figcaption>':'')+'</figure>':'<p class="jp-placeholder">Изображение загружается…</p>'}
 default:return"";
 }
 }).join("")||'<p class="jp-placeholder">Содержание появится здесь, когда автор добавит блоки.</p>';
}
function articleTitle(c){return E(c.draft?.title||"Заголовок вашей будущей статьи")}
function byline(c){const a=(c.authors||[]).find(x=>x.id===c.draft?.author_id);return E(a?.name||"Редакция MyNow")+(a?.kind==="ai"?" · ИИ-автор":"")}
function imageOrPlaceholder(a,what){return a?'<img class="jp-cover-img" src="'+E(a.src)+'" alt="'+E(a.alt||what)+'">':'<div class="jp-cover-empty"><span>❧</span><small>Обложка статьи</small></div>'}
function phone(c){
 const cv=cover(c);
 return '<div class="jp-phone-shell"><div class="jp-phone"><div class="jp-phone-top"><span>9:41</span><span>◉  ▂▃▅</span></div>'+
 '<div class="jp-appnav"><span>‹</span><strong>'+E(c.projectName||"NowGreen")+' Journal</strong><span>♡</span></div>'+
 '<div class="jp-article-scroll"><div class="jp-cover jp-mobile-cover">'+imageOrPlaceholder(cv,"Обложка")+'</div><div class="jp-article-body"><span class="jp-kicker">'+E(c.draft?.category||"ЖУРНАЛ")+'</span><h2>'+articleTitle(c)+'</h2><div class="jp-byline">✒ '+byline(c)+' · '+E(c.draft?.locale||"ru")+'</div><p class="jp-summary">'+E(c.draft?.summary||"Краткое описание статьи")+'</p><div class="jp-body">'+content(c)+'</div></div></div><div class="jp-phone-bar"><span>⌂</span><span>◫</span><span>♡</span><span>⚙</span></div></div></div>';
}
function website(c){
 const cv=cover(c);
 return '<div class="jp-website"><div class="jp-browser"><i></i><i></i><i></i><span>https://mynw.app/journal/…</span></div>'+
 '<div class="jp-sitehead"><b>MYNOW <span>JOURNAL</span></b><span>Главная &nbsp;&nbsp; Статьи &nbsp;&nbsp; Авторы</span></div>'+
 '<div class="jp-webarticle"><div class="jp-crumb">Журнал / '+E(c.projectName||"NowGreen")+' / '+E(c.draft?.category||"Советы")+'</div>'+
 '<span class="jp-kicker">'+E(c.draft?.category||"РЕДАКЦИЯ")+'</span><h2>'+articleTitle(c)+'</h2><div class="jp-byline">'+byline(c)+' · Пример страницы статьи</div>'+
 '<div class="jp-cover jp-site-cover">'+imageOrPlaceholder(cv,"Обложка")+'</div><p class="jp-summary">'+E(c.draft?.summary||"Краткое описание статьи")+'</p><div class="jp-body">'+content(c)+'</div></div>'+
 '<footer>© MyNow Apps · Пример макета сайта</footer></div>';
}
function insta(c){
 const photos=allImages(c).sort((a,b)=>Number(b.id===c.draft?.cover_path)-Number(a.id===c.draft?.cover_path)),a=photos[live.photo%photos.length]||cover(c),b=c.draft||{};
 const intro=[b.summary||"",...((c.blocks||[]).filter(x=>x.type==="text").slice(0,3).map(x=>x.text||""))].filter(Boolean).join("\n\n");
 const selectedTitle=b.title||"Заголовок вашей публикации";
 const caption=live.caption.trim()||selectedTitle+"\n\n"+(intro||"Описание публикации")+"\n\n"+(c.blocks||[]).filter(x=>x.type==="link"&&link(x.url)).map(x=>x.url).join("\n");
 const short=caption.slice(0,2200);
 return '<div class="jp-insta-wrap"><div class="jp-instagram"><div class="jp-insta-header"><div class="jp-insta-logo">◎</div><strong>Instagram</strong><span>♡ &nbsp;➤</span></div>'+
 '<div class="jp-insta-user"><span class="jp-insta-avatar">✦</span><div><strong>mynow.apps</strong><small>Пример аккаунта издателя</small></div><span>···</span></div>'+
 '<div class="jp-insta-media '+(live.shape==="1:1"?"square":"portrait")+'">'+(a?'<img src="'+E(a.src)+'" alt="'+E(a.alt||"Фото публикации")+'">':'<div class="jp-cover-empty"><span>❧</span><small>Добавьте фото для Instagram</small></div>')+
 (photos.length>1?'<button class="jp-photo-prev" data-jp-step="-1" title="Предыдущее фото">‹</button><button class="jp-photo-next" data-jp-step="1" title="Следующее фото">›</button><span class="jp-photo-count">'+(live.photo%photos.length+1)+' / '+photos.length+'</span>':'')+'</div>'+
 '<div class="jp-insta-actions">♡ &nbsp; ▢ &nbsp; ➤ <span>♧</span></div><p class="jp-insta-caption"><b>mynow.apps </b>'+E(short)+'</p><div class="jp-insta-muted">Предпросмотр · без отправки в Instagram</div></div>'+
 '<div class="jp-insta-guidance"><strong>Особенности Instagram</strong><p>Фото будет обрезано под выбранное соотношение. Прямые ссылки из текста статьи здесь не становятся кликабельными. Для этой площадки обычно нужна отдельная короткая подпись и подборка фотографий.</p>'+
 '<div class="jp-counter">Текст в макете: '+short.length+' символов'+(caption.length>2200?' · сокращён для макета':'')+'</div></div></div>';
}
function render(ctx){
 if(ctx.postKey!==live.articleKey){
  live.articleKey=ctx.postKey;
  live.caption=ctx.instagramCaption||"";
  live.captionDirty=false;
 }else if(!live.captionDirty&&ctx.instagramCaption!==undefined&&ctx.instagramCaption!==live.caption)live.caption=ctx.instagramCaption||"";
 live.ctx=ctx;const root=document.getElementById("preview");if(!root)return;
 root.innerHTML=live.mode==="site"?website(ctx):live.mode==="instagram"?insta(ctx):phone(ctx);
 document.querySelectorAll("[data-preview-mode]").forEach(x=>{x.classList.toggle("selected",x.dataset.previewMode===live.mode);x.setAttribute("aria-pressed",x.dataset.previewMode===live.mode?"true":"false")});
 const shapes=document.getElementById("jpShape");if(shapes)shapes.hidden=live.mode!=="instagram";
 const captionFields=document.getElementById("jpCaptionFields");if(captionFields)captionFields.hidden=live.mode!=="instagram";
 const captionInput=document.getElementById("jpCaptionText");if(captionInput){captionInput.disabled=!ctx.canEdit;if(document.activeElement!==captionInput)captionInput.value=live.caption;}
 const counter=document.getElementById("jpCaptionLength");if(counter)counter.textContent=live.caption.length+" / 2200";
 const save=document.getElementById("jpSaveCaption");if(save){save.disabled=!ctx.postId||!ctx.canEdit;save.title=!ctx.postId?"Сначала сохраните статью":!ctx.canEdit?"После утверждения подпись заблокирована":"";}
 const notice=document.getElementById("jpNotice");if(notice)notice.textContent=live.mode==="phone"?"Пример отображения в приложении. Окончательный дизайн зависит от версии NowGreen.":live.mode==="site"?"Пример веб-статьи. Публичный сайт журнала пока не подключён.":"Макет публикации Instagram. Формат, обрезка и детали могут отличаться от приложения Meta.";
}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(b.dataset.previewMode){live.mode=b.dataset.previewMode;live.photo=0;if(live.ctx)render(live.ctx)}
 if(b.dataset.jpStep){const imgs=allImages(live.ctx||{});if(imgs.length){live.photo=(live.photo+Number(b.dataset.jpStep)+imgs.length)%imgs.length;render(live.ctx)}}
});
document.addEventListener("change",e=>{if(e.target.id==="jpAspect"){live.shape=e.target.value;if(live.ctx)render(live.ctx)}});
document.addEventListener("input",e=>{if(e.target.id==="jpCaptionText"){
 live.caption=e.target.value.slice(0,2200);live.captionDirty=true;
 const counter=document.getElementById("jpCaptionLength");if(counter)counter.textContent=live.caption.length+" / 2200";
 if(live.ctx){const root=document.getElementById("preview");if(root&&live.mode==="instagram")root.innerHTML=insta(live.ctx)}
 }});
window.JournalPreview={render,getCaption:()=>live.caption,setSavedCaption:v=>{live.caption=String(v||"");live.captionDirty=false;if(live.ctx){live.ctx.instagramCaption=live.caption;render(live.ctx)}},choose:s=>{if(["phone","site","instagram"].includes(s)){live.mode=s;if(live.ctx)render(live.ctx)}}};
})();