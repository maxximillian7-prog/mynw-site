"use strict";
/* Journal Studio / Editorial portfolio controller.
 * Existing magazine services keep their own databases, rights and publishing queues.
 * This file unifies navigation, state indicators and consistent editorial affordances.
 */
window.StudioBrandHub=(function(){
 const brandTabs={green:"home",portugal:"portugal",seriously:"darkfactory",overview:"studios"};
 const tabBrands={studios:"overview",portugal:"portugal",darkfactory:"seriously"};
 const state={active:"overview",lastGreen:"home",pendingIntent:{portugal:null,seriously:null},
  metrics:{green:null,portugal:null,seriously:null},bound:false};
 const $=id=>document.getElementById(id);
 const safeNum=x=>typeof x==="number"&&Number.isFinite(x)&&x>=0&&x<=1000000?Math.round(x):null;
 const canAccess=()=>typeof project==="undefined"||!project?true:!["author","reviewer"].includes(project.role||"");
 function activeTabFromBrand(brand){return brandTabs[brand]||"studios";}
 function preferredTab(){
  if(!canAccess())return "home";
  const qp=new URLSearchParams(location.search).get("studio");
  const saved=sessionStorage.getItem("journal_editor_section");
  const target=(qp||saved||"studios").toLowerCase();
  if(target==="green")return "home";
  if(target==="portugal")return "portugal";
  if(target==="seriously"||target==="wow")return "darkfactory";
  return "studios";
 }
 function setSelected(brand){
  document.querySelectorAll("[data-hub-brand]").forEach(b=>{
   const active=b.dataset.hubBrand===brand;
   b.classList.toggle("is-active",active);
   if(b.classList.contains("studio-editor-link")){
    if(active)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current");
   }else{
    b.setAttribute("aria-pressed",String(active));
   }
  });
  document.querySelectorAll("[data-hub-go]").forEach(el=>{
   const active=el.dataset.hubGo===brand;
   if(el.classList.contains("studio-switch-tab"))el.setAttribute("aria-current",active?"page":"false");
  });
 }
 function remember(brand){
  if(!canAccess())return;
  try{sessionStorage.setItem("journal_editor_section",brand)}catch{}
  try{
   const u=new URL(location.href);
   if(brand==="overview")u.searchParams.delete("studio");
   else u.searchParams.set("studio",brand);
   history.replaceState(history.state,"",u.pathname+u.search+u.hash);
  }catch{}
 }
 function whenFrameReady(brand,fn){
  const frame=$(brand==="portugal"?"portugalFrame":"darkfactoryFrame");
  if(!frame)return;
  const apply=()=>{
   if(frame.src!=="about:blank"&&frame.contentWindow){
    try{fn(frame)}catch(e){console.warn("Journal Studio: child workspace",String(e))}
   }
  };
  if(!frame.dataset.loaded){
   frame.addEventListener("load",()=>{apply();deliverIntent(brand)}, {once:true});
   frame.dataset.loaded="1";frame.src=frame.dataset.src;
  }else{apply();deliverIntent(brand)}
 }
 function deliverIntent(brand){
  const action=state.pendingIntent[brand];if(!action)return;
  const frame=$(brand==="portugal"?"portugalFrame":"darkfactoryFrame");
  if(!frame?.contentWindow)return;
  try{
   frame.contentWindow.postMessage({type:"studio-editor-navigate",action},location.origin);
   // A same-origin DOM fallback handles older cached child implementations.
   if(brand==="portugal"){
    const d=frame.contentDocument;
    if(action==="review")d?.querySelector('[data-status="incoming"]')?.click();
    if(action==="queue")d?.querySelector('[data-status="queued"]')?.click();
   }else{
    const d=frame.contentDocument;
    if(action==="review"){
     const filter=d?.getElementById("filter");
     if(filter){filter.value="review";filter.dispatchEvent(new Event("change",{bubbles:true}))}
    }
    if(action==="queue")d?.getElementById("schedulePanel")?.scrollIntoView({block:"start",behavior:"smooth"});
   }
   state.pendingIntent[brand]=null;
  }catch(e){console.warn("Journal Studio: workspace navigation",String(e))}
 }
 function sync(tab){
  if(!canAccess())return;
  const brand=tabBrands[tab]||"green";
  if(brand==="green")state.lastGreen=tab;
  state.active=brand;document.body.dataset.studioBrand=brand;
  setSelected(brand);remember(brand);
  if(brand==="portugal"||brand==="seriously")whenFrameReady(brand,()=>{});
  if(brand==="overview")refreshGreen();
 }
 async function open(brand,action){
  if(!canAccess())return;
  if(!Object.prototype.hasOwnProperty.call(brandTabs,brand))return;
  if(brand==="green"&&typeof project!=="undefined"&&typeof projects!=="undefined"){
   const ng=projects.find(p=>p.slug==="nowgreen");
   if(ng&&project?.slug!=="nowgreen"){
    if(typeof changeProject==="function"){await changeProject("nowgreen");if(project?.slug!=="nowgreen")return;}
   }
  }
  if(brand==="portugal"||brand==="seriously"){
   state.pendingIntent[brand]=action||null;
  }
  if(brand==="green"){
   const page=action==="review"?"review-queue":action==="queue"?"publish":action==="create"?"editor":state.lastGreen;
   if(action==="create"&&typeof createPost==="function"){await createPost();return}
   await showTab(page||"home");return;
  }
  if(brand==="overview"){await showTab("studios");return}
  await showTab(activeTabFromBrand(brand));
  if(action)deliverIntent(brand);
 }
 function updateCard(brand,metrics){
  if(!Object.prototype.hasOwnProperty.call(state.metrics,brand))return;
  const before=state.metrics[brand]||{};
  state.metrics[brand]={...before,...metrics};
  for(const [field,val] of Object.entries(metrics)){
   const node=document.querySelector('[data-hub-metric="'+brand+":"+field+'"]');
   if(!node)continue;
   node.textContent=safeNum(val)===null?"—":String(safeNum(val));
  }
  const status=document.querySelector('[data-hub-status="'+brand+'"]');
  if(status){
   const d=state.metrics[brand];
   const count=safeNum(d.review);
   status.textContent=count===null?
    "Откройте редакцию для загрузки показателей":
    count>0?count+" материалов требуют внимания":"Нет ожидающих приёмки материалов";
  }
 }
 function refreshGreen(){
  const get=id=>{const v=Number($(id)?.textContent||"");return Number.isFinite(v)?v:null};
  const review=get("statReview"),published=get("statPublished");
  const drafts=get("statDraft");
  if(review!==null||published!==null||drafts!==null)updateCard("green",{review,queued:drafts,published});
 }
 function receive(event){
  if(event.origin!==location.origin||!event.data||event.data.type!=="studio-editor-summary")return;
  const brand=event.data.brand;if(brand!=="portugal"&&brand!=="seriously")return;
  const frame=$(brand==="portugal"?"portugalFrame":"darkfactoryFrame");
  if(event.source!==frame?.contentWindow)return;
  const metrics={};
  for(const k of ["review","queued","published"]){metrics[k]=safeNum(event.data[k])}
  updateCard(brand,metrics);
 }

 function logo(brand){return "./brand-"+(brand==="green"?"nowgreen":brand==="seriously"?"seriously":"portugal")+".svg"}
 function brandButton(brand,label,sub){
  return '<button type="button" class="studio-editor-link" data-hub-go="'+brand+'" data-hub-brand="'+brand+'" aria-label="Редакция '+label+'">'+
   '<img src="'+logo(brand)+'" alt=""><span class="meta"><b>'+label+'</b><small>'+sub+'</small></span><span class="mini-arrow">›</span></button>';
 }
 function summaryCard(brand,index,title,subtitle,badge,metrics){
  const headings=brand==="green"?["На приёмке","Черновики","Опубликовано"]:["На приёмке","В очереди","Опубликовано"];
  const keys=["review","queued","published"];
  return '<article class="studio-hub-card '+brand+'"><div class="cover"><img src="'+logo(brand)+'" alt="Эмблема '+title+'">'+
   '<span class="brand-index">'+index+' / '+badge+'</span></div>'+
   '<div class="content"><h3>'+title+'</h3><p>'+subtitle+'</p>'+
   '<div class="hub-metrics">'+keys.map((key,i)=>'<div><b data-hub-metric="'+brand+":"+key+'">—</b><span>'+headings[i]+'</span></div>').join("")+'</div>'+
   '<div class="hub-actions"><button type="button" class="primary" data-hub-go="'+brand+'">Открыть журнал</button>'+
   '<button type="button" data-hub-go="'+brand+'" data-hub-intent="'+(brand==="seriously"?"queue":"review")+'">'+
   (brand==="seriously"?"Расписание":"Приёмка")+'</button></div>'+
   '<div class="hub-subline" data-hub-status="'+brand+'">Откройте редакцию для загрузки показателей</div></div></article>';
 }
 function mount(){
  const main=document.querySelector("#workspace .main"),sidebar=document.querySelector("#workspace .sidebar");
  if(!main||!sidebar||document.getElementById("studioBrandSwitchbar"))return;
  const nav=sidebar.querySelector("nav[data-admin-nav]");
  if(nav){
   nav.innerHTML='<button type="button" data-tab="studios"><b>◈</b> Все редакции</button>'+
    '<button type="button" data-tab="settings"><b>⚙</b> Настройки</button>';
  }
  const firstHeading=sidebar.querySelector(".navhead");
  if(firstHeading)firstHeading.textContent="NOWGREEN · РЕДАКЦИЯ";
  const management=nav?.previousElementSibling;
  if(management?.classList?.contains("navhead"))management.textContent="ПАНЕЛЬ УПРАВЛЕНИЯ";
  const mainBrand=sidebar.querySelector(".brand");
  if(mainBrand){
   mainBrand.insertAdjacentHTML("afterend",
    '<div class="navhead" data-admin-nav>ЖУРНАЛЫ · ВЫБЕРИ РЕДАКЦИЮ</div>'+
    '<div class="studio-editor-nav" data-admin-nav>'+
     brandButton("green","NowGreen Journal","Растения · уход · зелёный дом")+
     brandButton("portugal","Португалия рядом","Новости · документы · афиша")+
     brandButton("seriously","НЕТ! СЕРЬЁЗНО?!","Необычные проверенные факты")+
    '</div>');
  }
  const bar='<div class="studio-brand-switchbar" id="studioBrandSwitchbar" data-admin-nav role="navigation" aria-label="Выбор редакционного журнала">'+
   '<strong>Journal Studio</strong>'+
   '<button type="button" class="studio-switch-tab hub-overview-button" data-hub-go="overview" data-hub-brand="overview">◈ Все редакции</button>'+
   ['green','portugal','seriously'].map(brand=>'<button type="button" class="studio-switch-tab" data-hub-go="'+brand+'" data-hub-brand="'+brand+'">'+
    '<img class="brand-bubble" src="'+logo(brand)+'" alt="">'+
    ({green:"NowGreen",portugal:"Португалия рядом",seriously:"НЕТ! СЕРЬЁЗНО?!"}[brand])+'</button>').join("")+
   '<div class="hub-right"><button type="button" data-hub-go="overview">Сводка редакций</button></div></div>';
  const header=main.querySelector(".topbar");
  if(header)header.insertAdjacentHTML("beforebegin",bar);
  const home=main.querySelector('[data-view="home"]');
  if(home){
   home.insertAdjacentHTML("beforebegin",'<section class="view" data-view="studios" data-admin-nav>'+
    '<div class="studio-hub-heading"><div><div class="eyebrow">MYNOW · ОБЩИЙ РЕДАКЦИОННЫЙ ЦЕНТР</div>'+
    '<h2>Три журнала. Одна редакционная панель.</h2>'+
    '<p>Собственные названия, эмблемы, аудитории и стиль публикаций. Общая навигация и единый понятный путь от идеи к публикации.</p></div>'+
    '<span class="pill">Редакции и каналы независимы</span></div>'+
    '<div class="studio-hub-grid">'+
     summaryCard("green","01","NowGreen Journal","Растения, домашняя зелень, сад и устойчивый образ жизни.","NATURE JOURNAL")+
     summaryCard("portugal","02","Португалия рядом","Новости, документы, семейная жизнь, советы и афиша.","PORTUGAL DESK")+
     summaryCard("seriously","03","НЕТ! СЕРЬЁЗНО?!","Научные, природные и жизненные факты: Telegram RU/EN, Instagram RU/EN.","WOW FACTORY")+
    '</div>'+
    '<div class="studio-hub-workflow">'+
     '<section class="card"><div class="eyebrow">ОБЩИЙ РЕДАКЦИОННЫЙ ПРОЦЕСС</div><h3>От идеи до выхода в канал</h3>'+
     '<p>Все журналы используют понятные этапы, но сохраняют свои проверки, права, хранилища медиа и собственные расписания.</p>'+
     '<div class="studio-hub-steps"><span>Идея</span><i>›</i><span>Черновик</span><i>›</i><span>Проверка</span><i>›</i><span>Приёмка</span><i>›</i><span>Очередь</span><i>›</i><span>Опубликовано</span></div></section>'+
     '<section class="card"><div class="eyebrow">КОНТРОЛЬ КАЧЕСТВА</div><h3>Правила каждого журнала</h3>'+
     '<div class="studio-hub-notes">'+
      '<div><span class="note-symbol">✓</span>Приёмка материала внутри своего журнала</div>'+
      '<div><span class="note-symbol">▣</span>Медиа хранятся независимо от текста и макетов</div>'+
      '<div><span class="note-symbol">◷</span>Тихие часы и интервал настраиваются для канала</div>'+
      '<div><span class="note-symbol">↗</span>Нет риска отправить публикацию в чужой канал</div>'+
     '</div></section></div></section>');
  }
  const old=document.querySelector('[data-view="darkfactory"]');
  if(old){
   const frame=old.querySelector("#darkfactoryFrame");
   if(frame){
    frame.classList.add("studio-embedded-frame");
    frame.removeAttribute("style");
    frame.setAttribute("loading","lazy");
    frame.dataset.src=(frame.dataset.src||"./darkfactory.html")+"&embedded=1";
   }
   old.insertAdjacentHTML("afterbegin",'<div class="studio-brand-workspace-header seriously">'+
    '<div class="title-cluster"><img src="'+logo("seriously")+'" alt=""><div><h2>НЕТ! СЕРЬЁЗНО?! / NO, SERIOUSLY?!</h2>'+
    '<p>Факты, визуалы и публикации · Instagram RU/EN · Telegram RU/EN</p></div></div>'+
    '<a class="open-external" href="./darkfactory.html" target="_blank" rel="noopener">Открыть отдельно ↗</a></div>');
   old.insertAdjacentHTML("beforebegin",
    '<section class="view" data-view="portugal" data-admin-nav>'+
    '<div class="studio-brand-workspace-header portugal">'+
     '<div class="title-cluster"><img src="'+logo("portugal")+'" alt=""><div><h2>Португалия рядом</h2>'+
     '<p>Новости, полезные статьи, афиша, сообщения и календарь публикаций</p></div></div>'+
     '<a class="open-external" href="./portugal/" target="_blank" rel="noopener">Открыть отдельно ↗</a></div>'+
    '<iframe id="portugalFrame" class="studio-embedded-frame" loading="lazy" title="Редакция Португалия рядом" data-src="./portugal/?embedded=1" src="about:blank"></iframe>'+
    '</section>');
  }
 }

 function bind(){
  if(state.bound)return;state.bound=true;
  mount();
  document.addEventListener("click",e=>{
   const t=e.target.closest("[data-hub-go],[data-hub-action]");
   if(!t)return;
   e.preventDefault();
   const brand=t.dataset.hubGo||t.dataset.hubAction;
   const action=t.dataset.hubIntent||null;
   if(!brand)return;
   open(brand,action).catch(err=>{console.warn("Journal Studio navigation",err);if(typeof toast==="function")toast("Не удалось открыть редакцию: "+err.message,true)});
  });
  window.addEventListener("message",receive);
  const counters=["statDraft","statReview","statPublished"].map(id=>$(id)).filter(Boolean);
  if(counters.length){
   const observer=new MutationObserver(()=>refreshGreen());
   counters.forEach(el=>observer.observe(el,{childList:true,characterData:true,subtree:true}));
  }
  refreshGreen();
  setSelected(state.active);
 }
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",bind,{once:true});
 else bind();
 return {open,sync,preferredTab,refreshGreen,updateCard,deliverIntent};
})();
