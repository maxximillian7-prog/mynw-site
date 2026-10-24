"use strict";
/* Server-backed self-service budget for all image-generation paths.
   The browser only edits limits; the budget is enforced atomically in SQL. */
(function(){
 const $=id=>document.getElementById(id);
 const endpoint="https://npsfaymjckcqhtyiafms.supabase.co/functions/v1/studio-image/limits";
 let cached=null,loading=false,saving=false,requestedProject=null,latestSeq=0;
 const owner=()=>["owner","chief_editor"].includes(project?.role||"");
 const allowed=()=>["owner","chief_editor","editor"].includes(project?.role||"");
 function status(message,error=false){
  const el=$("studioImageLimitsStatus");
  if(el){el.textContent=message;el.style.color=error?"#a54439":"";}
 }
 function value(id){
  const raw=$(id)?.value,number=Number(raw);
  return raw!==""&&Number.isSafeInteger(number)?number:null;
 }
 async function request(method,slug,body){
  if(!session?.access_token)throw Error("Сессия завершена. Войдите повторно.");
  const url=endpoint+(method==="GET"?"?project="+encodeURIComponent(slug):"");
  const once=()=>fetch(url,{method,signal:AbortSignal.timeout(25000),
   headers:{apikey:PUBLIC_KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},
   body:body?JSON.stringify(body):undefined});
  let response=await once();
  if(response.status===401&&session.refresh_token){
   session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
   sessionStorage.setItem("journal_session",JSON.stringify(session));
   response=await once();
  }
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||"Сервер не сохранил лимиты ("+response.status+")");
  if(data.project!==slug||!data.limits)throw Error("Получен ответ от другого проекта");
  return data;
 }
 function paint(data){
  cached=data;requestedProject=data.project;
  $("studioImageDailyLimit").value=data.limits.daily_per_user;
  $("studioImageMonthlyLimit").value=data.limits.monthly_per_project;
  const editable=data.can_edit===true&&owner();
  $("studioImageDailyLimit").disabled=!editable;
  $("studioImageMonthlyLimit").disabled=!editable;
  $("studioImageLimitsSave").disabled=!editable;
  const daily=Number(data.usage?.daily_per_user??0),monthly=Number(data.usage?.monthly_per_project??0);
  $("studioImageDailyUsage").textContent="Использовано за 24 ч.: "+daily+" / "+data.limits.daily_per_user+
   " · осталось "+Math.max(0,data.limits.daily_per_user-daily);
  $("studioImageMonthlyUsage").textContent="Использовано в текущем месяце: "+monthly+" / "+data.limits.monthly_per_project+
   " · осталось "+Math.max(0,data.limits.monthly_per_project-monthly);
  if($("studioImageLimitsInline"))
   $("studioImageLimitsInline").textContent=data.limits.daily_per_user+" за 24 ч. / "+
    data.limits.monthly_per_project+" в месяц.";
  status(editable?"Лимиты активны на сервере. Изменения доступны только после нажатия «Сохранить лимиты».":
   "Лимиты активны на сервере; изменять их может владелец или главный редактор.");
 }
 async function refresh(){
  if(!allowed()||!project?.slug)return null;
  const slug=project.slug,seq=++latestSeq;
  loading=true;
  try{
   status("Получаем лимиты и текущий расход…");
   const data=await request("GET",slug);
   if(seq!==latestSeq||project?.slug!==slug)return null;
   paint(data);
   return data;
  }catch(error){
   if(seq===latestSeq)status("Не удалось получить настройки: "+error.message,true);
   throw error;
  }finally{if(seq===latestSeq)loading=false}
 }
 async function save(){
  if(!owner()||saving)throw Error("Изменение лимитов доступно только владельцу или главному редактору.");
  const slug=project?.slug,daily=value("studioImageDailyLimit"),monthly=value("studioImageMonthlyLimit");
  if(!slug)throw Error("Сначала выберите проект.");
  if(daily===null||daily<1||daily>500)throw Error("Суточный лимит должен быть целым числом от 1 до 500.");
  if(monthly===null||monthly<1||monthly>10000)throw Error("Месячный лимит должен быть целым числом от 1 до 10 000.");
  const previous=cached?.limits;
  if(previous&&previous.daily_per_user===daily&&previous.monthly_per_project===monthly){
   status("Значения уже сохранены.");return;
  }
  saving=true;$("studioImageLimitsSave").disabled=true;
  try{
   status("Сохраняем лимиты на сервере…");
   const data=await request("PATCH",slug,{project:slug,daily_per_user:daily,monthly_per_project:monthly});
   if(data.limits.daily_per_user!==daily||data.limits.monthly_per_project!==monthly)
    throw Error("Сервер подтвердил другие значения. Обновите данные.");
   if(project?.slug===slug){paint(data);toast("Лимиты генерации для "+slug+" сохранены.");}
  }catch(error){status("Ошибка сохранения: "+error.message,true);throw error}
  finally{saving=false;$("studioImageLimitsSave").disabled=!owner()}
 }
 $("studioImageLimitsRefresh").onclick=()=>run(refresh);
 $("studioImageLimitsSave").onclick=()=>run(save);
 const show=showTab;
 showTab=async function(target,...rest){
  const res=await show(target,...rest);
  if(target==="ai-studio"&&allowed())await refresh().catch(()=>{});
  return res;
 };
 const projectChange=changeProject;
 changeProject=async function(...args){
  cached=null;requestedProject=null;latestSeq++;
  const res=await projectChange(...args);
  if(tab==="ai-studio"&&allowed())await refresh().catch(()=>{});
  return res;
 };
 window.StudioImageLimits={
  get(){return cached?.project===project?.slug?cached:null},
  refresh,save
 };
})();
