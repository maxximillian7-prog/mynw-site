"use strict";
/* Publication catalog – uses the existing authenticated posts/topics API and editor handlers. */
(function(){
 const $pub=id=>document.getElementById(id);
 const state={view:"articles",status:"all",topic:"all",search:"",project:null};
 const knownStatus=["all","published","scheduled","approved","in_review","drafts","ready","draft","changes_requested"];
 const statDefs=[
   ["all","Все статьи",()=>posts.length],
   ["published","Опубликовано",()=>posts.filter(p=>p.status==="published").length],
   ["ready","Готовы к выпуску",()=>posts.filter(p=>["approved","scheduled"].includes(p.status)).length],
   ["in_review","На проверке",()=>posts.filter(p=>p.status==="in_review").length],
   ["drafts","Черновики",()=>posts.filter(p=>["draft","changes_requested"].includes(p.status)).length]
 ];
 function allowed(p){
  if(state.status==="all")return true;
  if(state.status==="ready")return ["approved","scheduled"].includes(p.status);
  if(state.status==="drafts")return ["draft","changes_requested"].includes(p.status);
  return p.status===state.status;
 }
 function topicName(id){
  if(!id)return "Без темы";
  return topics.find(t=>t.id===id)?.title||"Тема недоступна";
 }
 function visiblePosts(){
  const needle=state.search.trim().toLocaleLowerCase();
  return posts.filter(p=>
   allowed(p)&&
   (state.topic==="all"|| (state.topic==="none"?!p.topic_id:p.topic_id===state.topic))&&
   (!needle||[p.title,p.summary,p.category,topicName(p.topic_id),p.locale,
       authors.find(a=>a.id===p.author_id)?.name].some(x=>String(x||"").toLocaleLowerCase().includes(needle)))
  ).sort((a,b)=>String(b.updated_at||"").localeCompare(String(a.updated_at||"")));
 }
 function itemCard(p){
  const id=esc(p.id),name=esc(p.title||"Без названия"),where=esc(topicName(p.topic_id));
  const role=esc(statuses[p.status]||p.status);
  const date=String(p.updated_at||"").slice(0,10);
  const ready=["approved","scheduled","published"].includes(p.status);
  const manager=canManagePost(p);
  const actions=[
   '<button type="button" class="primary" data-open-post="'+id+'">Открыть статью</button>',
   ...(ready?['<button type="button" data-delivery="'+id+'">Каналы / результаты</button>']:[]),
   ...(manager?[
    '<button type="button" data-article-topic="'+id+'">Тема</button>',
    '<button type="button" data-article-translations="'+id+'">Переводы</button>',
    '<button type="button" data-edit-post="'+id+'">Изменить</button>',
    '<button type="button" data-toggle-post-hidden="'+id+'">'+(p.is_hidden?'Показать':'Скрыть')+'</button>'
   ]:[]),
   ...(canDeletePost(p)?['<button type="button" data-delete-post="'+id+'">Удалить</button>']:[])
  ].join("");
  return '<article class="studio-pub-item">'+
   '<div class="studio-pub-item-top"><div style="min-width:0;flex:1">'+
     '<h3 class="studio-pub-item-title">'+name+'</h3>'+
     '<div class="studio-pub-meta"><span>▦ '+where+'</span><span>◷ '+esc(date||"—")+'</span>'+
     '<span>'+esc(p.locale||"ru")+'</span></div></div>'+
     '<div class="studio-pub-tags"><span class="chip '+(["in_review","scheduled"].includes(p.status)?"amber":"")+'">'+role+'</span>'+
      (p.is_hidden?'<span class="chip amber">Скрыта</span>':"")+'</div></div>'+
   (p.summary?'<p class="studio-pub-item-summary">'+esc(p.summary)+'</p>':"")+
   '<div class="studio-pub-actions">'+actions+'</div></article>';
 }
 function groupCards(items){
  const grouped=new Map();
  for(const p of items){const key=p.topic_id||"none";if(!grouped.has(key))grouped.set(key,[]);grouped.get(key).push(p)}
  const ordered=[...grouped.entries()].sort(([a],[b])=>{
   if(a==="none")return 1;if(b==="none")return -1;
   return topicName(a).localeCompare(topicName(b),"ru");
  });
  return '<div class="studio-pub-rows">'+ordered.map(([key,group])=>
   '<details class="studio-pub-group" open><summary><span class="studio-pub-group-head">'+
   '<span class="studio-pub-group-icon">▦</span><strong>'+esc(topicName(key==="none"?null:key))+
   '</strong></span><span class="chip">'+group.length+' статей</span></summary>'+
   '<div class="studio-pub-group-items">'+group.map(itemCard).join("")+'</div></details>'
  ).join("")+'</div>';
 }
 function applyControls(){
  const status=$pub("publicationStatus"),topic=$pub("publicationTopic"),search=$pub("publicationSearch");
  if(status)status.value=knownStatus.includes(state.status)?state.status:"all";
  if(search&&search.value!==state.search)search.value=state.search;
  if(topic){
   const available=topics.map(t=>t.id);
   topic.innerHTML='<option value="all">Все темы</option><option value="none">Без темы</option>'+
      topics.slice().sort((a,b)=>a.title.localeCompare(b.title,"ru")).map(t=>
       '<option value="'+esc(t.id)+'">'+esc(t.title)+(t.is_active?"":" · скрыта")+'</option>').join("");
   topic.value=state.topic==="all"||state.topic==="none"||available.includes(state.topic)?state.topic:"all";
   if(topic.value!==state.topic)state.topic=topic.value;
  }
  document.querySelectorAll("[data-publication-view]").forEach(b=>{
   const on=b.dataset.publicationView===state.view;
   b.classList.toggle("selected",on);b.setAttribute("aria-pressed",String(on));
  });
 }
 function draw(){
  const root=$pub("readyPosts");if(!root||!project)return;
  if(state.project!==project.slug){
   state.project=project.slug;state.topic="all";state.status="all";state.search="";
   const details=$pub("deliveryDetails");if(details)details.innerHTML="";
  }
  applyControls();
  const stats=$pub("publicationStats");
  if(stats)stats.innerHTML=statDefs.map(([key,label,fn])=>
    '<button type="button" class="studio-pub-stat" data-publication-status="'+key+
    '" aria-pressed="'+(state.status===key)+'"><strong>'+fn()+
    '</strong><span>'+label+'</span></button>').join("");
  const filtered=visiblePosts();
  const count=$pub("publicationCount");
  if(count)count.textContent="Показано "+filtered.length+" из "+posts.length+" статей · "+
    (state.view==="topics"?"группировка по темам":"список статей");
  root.innerHTML=filtered.length?
   (state.view==="topics"?groupCards(filtered):'<div class="studio-pub-rows">'+filtered.map(itemCard).join("")+'</div>'):
   '<div class="studio-pub-empty"><strong>По выбранным условиям статей нет</strong>'+
   '<p>Измените тему, статус или поисковую строку.</p>'+
   '<button type="button" data-publication-clear>Сбросить фильтры</button></div>';
  const add=$pub("publicationsCreate");
  if(add)add.hidden=project?.role==="reviewer";
 }
 // Publication browser replaces only the presentation. Existing editor and
 // delivery handlers remain authoritative and continue checking server roles.
 paintPublication=draw;
 const previousRefresh=refreshPosts;
 refreshPosts=async function(...args){
  const result=await previousRefresh(...args);
  if(tab==="publish")draw();
  return result;
 };
 const previousDashboard=renderDashboard;
 renderDashboard=function(...args){
  const result=previousDashboard(...args);
  ["recentAuthors","channelSummary"].forEach(id=>{
   $pub(id)?.querySelectorAll(id==="recentAuthors"?".authorCard":".channelCard").forEach(el=>{
    if(el.querySelector("button,a"))return;
    el.dataset.homeGo=id==="recentAuthors"?"authors":"publish";
    el.setAttribute("role","button");el.tabIndex=0;el.classList.add("studio-home-clickable");
    el.setAttribute("aria-label",id==="recentAuthors"?"Открыть раздел авторов":"Открыть публикации и направления");
   });
  });
  return result;
 };
 function setStatus(value){
  state.status=knownStatus.includes(value)?value:"all";
  draw();
 }
 document.addEventListener("click",event=>{
  const control=event.target.closest("[data-publication-status],[data-publication-view],[data-publication-clear],[data-home-go]");
  if(!control)return;
  if(control.dataset.publicationStatus!==undefined){setStatus(control.dataset.publicationStatus);return}
  if(control.dataset.publicationView!==undefined){state.view=control.dataset.publicationView==="topics"?"topics":"articles";draw();return}
  if(control.dataset.publicationClear!==undefined){
   state.search="";state.topic="all";state.status="all";draw();return;
  }
  if(control.dataset.homeGo!==undefined){
   const target=control.dataset.homeGo;
   if(!["publish","authors"].includes(target))return;
   const selection=control.dataset.homeFilter||"all";
   run(async()=>{
    await showTab(target);
    if(tab===target&&target==="publish"){state.status=selection;draw();}
   });
  }
 });
 document.addEventListener("keydown",event=>{
  if(event.key!=="Enter"&&event.key!==" ")return;
  const el=event.target.closest('[role="button"][data-home-go]');
  if(!el)return;
  event.preventDefault();el.click();
 });
 $pub("publicationSearch")?.addEventListener("input",event=>{state.search=event.target.value;draw()});
 $pub("publicationStatus")?.addEventListener("change",event=>{setStatus(event.target.value)});
 $pub("publicationTopic")?.addEventListener("change",event=>{state.topic=event.target.value;draw()});
 $pub("publicationsRefresh")?.addEventListener("click",()=>run(async()=>{await refreshPosts();toast("Список публикаций обновлён")}));
 $pub("publicationsCreate")?.addEventListener("click",()=>run(createPost));
 window.StudioPublications={draw,chooseStatus:setStatus};
})();
