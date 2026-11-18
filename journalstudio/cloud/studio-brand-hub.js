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
 const canAccess=()=>!["author","reviewer"].includes(document.body.dataset.studioRole||"");
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
 function bind(){
  if(state.bound)return;state.bound=true;
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
