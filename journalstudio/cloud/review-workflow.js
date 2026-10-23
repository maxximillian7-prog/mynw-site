"use strict";
/* Journal Studio: review inbox and article conversation.
   All operations use the authenticated studio-api and are authorization checked server-side. */
(function(){
 const $=id=>document.getElementById(id);
 const E=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
 let currentThread=null,threadBusy=false,queueBusy=false,lastFilter="in_review";
 const admin=()=>["owner","chief_editor","editor","reviewer"].includes(project?.role||"");
 const chief=()=>["owner","chief_editor"].includes(project?.role||"");
 const actionLabels={comment:"Комментарий",submit:"Отправлено на проверку",request_changes:"Возвращено на доработку",approve:"Утверждено",schedule:"Назначена дата публикации",publish:"Опубликовано"};
 const formatDate=s=>{try{return new Date(s).toLocaleString("ru-RU",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"})}catch{return s||""}};
 function renderThread(events){
  const area=$("reviewTimeline");if(!area)return;
  if(!current){area.innerHTML='<div class="studio-review-empty">Сначала сохраните материал.</div>';return;}
  if(!events.length){area.innerHTML='<div class="studio-review-empty">Пока нет комментариев. Замечания и решения появятся здесь.</div>';return}
  area.innerHTML=events.map(x=>{
   const mine=x.actor_id===session?.user?.id;
   const who=mine?"Вы":x.actor_id===current?.owner_user_id?"Автор":"Редакция";
   const status=x.action!=="comment";
   return '<article class="studio-review-item '+(status?"status":"")+'"><header><b>'+E(who)+' · '+E(actionLabels[x.action]||x.action)+'</b><time>'+E(formatDate(x.created_at))+'</time></header>'+
     (x.note?'<p>'+E(x.note)+'</p>':'<p class="muted small">Изменение статуса материала</p>')+'</article>';
  }).join("");
  area.scrollTop=area.scrollHeight;
 }
 async function loadThread(){
  const area=$("reviewTimeline");
  if(!current?.id){currentThread=null;renderThread([]);return}
  const id=current.id;currentThread=id;
  if(area)area.innerHTML='<p class="muted small">Загрузка обсуждения…</p>';
  const r=await call("/reviews?post_id="+encodeURIComponent(id));
  if(current?.id===id)renderThread(r.reviews||[]);
 }
 async function sendComment(){
  if(threadBusy)return;if(!current?.id)throw Error("Сначала сохраните статью");
  const input=$("reviewMessage"),note=input?.value?.trim();
  if(!note)throw Error("Введите текст комментария");
  threadBusy=true;try{
   await call("/reviews","POST",{post_id:current.id,note});
   input.value="";
   await loadThread();
   toast("Комментарий добавлен в историю статьи.");
  }finally{threadBusy=false}
 }
 function renderQueue(rows){
  const area=$("reviewQueueList");if(!area)return;
  if(!rows.length){area.innerHTML='<div class="studio-review-empty">В этой категории материалов пока нет.</div>';return}
  area.innerHTML=rows.map(p=>{
   const actions=p.status==="in_review"
     ?'<button type="button" data-review-open="'+E(p.id)+'">Проверить →</button>'
     :'<button type="button" data-review-open="'+E(p.id)+'">Открыть →</button>';
   return '<div class="studio-review-queue-item"><div><b>'+E(p.title)+'</b><small>'+E(p.locale||"ru")+' · версия '+Number(p.revision||1)+' · '+E(formatDate(p.updated_at))+'</small><span class="studio-review-status">'+E(statuses[p.status]||p.status)+'</span></div><div class="btns">'+actions+'</div></div>';
  }).join("");
 }
 async function loadQueue(){
  if(!admin()||queueBusy||!project)return;
  queueBusy=true;const area=$("reviewQueueList"),filter=$("reviewFilter")?.value||lastFilter;
  if(area)area.innerHTML='<p class="muted small">Обновление очереди…</p>';
  try{
   const r=await call("/review-queue?project="+encodeURIComponent(project.slug)+"&status="+encodeURIComponent(filter));
   lastFilter=filter;renderQueue(r.queue||[]);
  }catch(e){if(area)area.textContent="Не удалось загрузить очередь: "+e.message;throw e}
  finally{queueBusy=false}
 }
 async function updateQueueCount(){
  const badge=$("reviewQueueCount");if(!badge||!admin()||!project){if(badge)badge.hidden=true;return}
  try{
   const r=await call("/review-queue?project="+encodeURIComponent(project.slug)+"&status=in_review");
   const count=(r.queue||[]).length;badge.textContent=String(count);badge.hidden=count===0;
  }catch{badge.hidden=true}
 }
 const originalOpen=openPost;
 openPost=async function(id){
  await originalOpen(id);
  await loadThread();
 };
 const originalRender=renderEditor;
 renderEditor=function(...args){
  originalRender(...args);
  const panel=$("reviewDiscussion");
  if(panel)panel.hidden=!draft;
  if(draft&&!current?.id&&$("reviewTimeline"))$("reviewTimeline").innerHTML='<div class="studio-review-empty">Сначала сохраните статью, затем можно будет обсуждать её с редакцией.</div>';
 };
 const originalWorkflow=workflow;
 workflow=async function(...args){
  await originalWorkflow(...args);
  if(current?.id)await loadThread();
  await updateQueueCount();
 };
 const originalRefresh=refreshPosts;
 refreshPosts=async function(...args){
  const result=await originalRefresh(...args);
  await updateQueueCount();
  if(tab==="review-queue")await loadQueue();
  return result;
 };
 const originalLoad=loadData;
 loadData=async function(...args){
  const result=await originalLoad(...args);
  await updateQueueCount();
  return result;
 };
 const originalShow=showTab;
 showTab=async function(target,...args){
  if(project?.role==="reviewer"&&target!=="review-queue")target="review-queue";
  await originalShow(target,...args);
  if(target==="review-queue"){if(!admin()){toast("Недостаточно прав для просмотра очереди.",true);return}await loadQueue()}
 };
 const originalChange=changeProject;
 changeProject=async function(...args){
  const result=await originalChange(...args);
  currentThread=null;lastFilter="in_review";
  if($("reviewFilter"))$("reviewFilter").value=lastFilter;
  await updateQueueCount();return result;
 };
 document.addEventListener("click",e=>{
  const button=e.target.closest("button");if(!button)return;
  if(button.dataset.reviewOpen!==undefined)e.preventDefault(),run(()=>openPost(button.dataset.reviewOpen));
 });
 $("reviewSend").onclick=()=>run(sendComment);
 $("reviewReload").onclick=()=>run(loadThread);
 $("reviewRefresh").onclick=()=>run(loadQueue);
 $("reviewFilter").onchange=()=>run(loadQueue);
 window.JournalReview={loadQueue,loadThread,sendComment};
})();