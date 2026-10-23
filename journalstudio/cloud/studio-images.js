"use strict";
/* Journal Studio media source chooser and explicit-cost image generation.
   Image API secrets and usage budgets live on the server, never in this browser script. */
(function(){
 const $=id=>document.getElementById(id);
 const esc=t=>String(t??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
 let result=null,busy=false,startedPost=null,startedProject=null;
 const url="https://npsfaymjckcqhtyiafms.supabase.co/functions/v1/studio-image";
 const status=(message,error=false)=>{const el=$("imageGenerateStatus");if(!el)return;el.textContent=message;el.style.color=error?"#9d453b":""};
 const editablePost=()=>Boolean(current?.id&&draft&&editable()&&project?.slug);
 function clear(){
  result=null;
  $("imageGeneratedPreview").hidden=true;
  $("imageGeneratedImg").removeAttribute("src");
  $("imageGeneratedAlt").textContent="";
 }
 function refreshControls(){
  const allowed=editablePost();
  $("imageGenerate").disabled=!allowed||busy;
  if(!allowed)status("Сначала сохраните черновик статьи. Генерация доступна только для редактируемых материалов.");
  else if(!busy&&result===null)status("Изображение будет генерироваться только после подтверждения платного запроса.");
 }
 function setSource(id){
  document.querySelectorAll("[data-image-source]").forEach(b=>b.classList.toggle("active",b.dataset.imageSource===id));
  $("studioImageAi").hidden=id!=="ai";
  $("studioImageStock").hidden=id!=="stock";
  if(id==="own"){document.querySelector(".jp-upload-area")?.scrollIntoView({behavior:"smooth",block:"center"});}
 }
 async function api(method,payload){
  if(!session?.access_token)throw Error("Сначала войдите в редакцию");
  const callOne=()=>fetch(url,{method,headers:{apikey:PUBLIC_KEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:payload?JSON.stringify(payload):undefined});
  let response=await callOne();
  if(response.status===401&&session.refresh_token){
   session=await auth("token?grant_type=refresh_token","POST",{refresh_token:session.refresh_token});
   sessionStorage.setItem("journal_session",JSON.stringify(session));response=await callOne();
  }
  const body=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(body.error||"Ошибка генерации изображения");
  return body;
 }
 async function generate(){
  if(busy)return;
  if(!editablePost())throw Error("Сначала сохраните редактируемую статью");
  const prompt=$("imagePrompt").value.trim(),style=$("imageStyle").value,size=$("imageSize").value,quality=$("imageQuality").value;
  if(prompt.length<8||prompt.length>650)throw Error("Опишите изображение подробнее (от 8 до 650 символов)");
  const ratio={ "1024x1024":"квадрат","1536x1024":"горизонтальный","1024x1536":"вертикальный"}[size]||size;
  const confirmText="Создать одно платное изображение?\n\nФормат: "+ratio+"\nКачество: "+(quality==="low"?"экономичное":"среднее")+
    "\nМодель: GPT Image 2.5 Flare\n\nЦена зависит от числа токенов и размера. Запрос спишет средства с OpenAI API. Результат останется черновиком, без публикации.";
  if(!confirm(confirmText))return;
  clear();startedPost=current.id;startedProject=project.slug;
  busy=true;$("imageGenerate").disabled=true;$("imageGenerate").textContent="⌛ Изображение создаётся…";
  status("Запрос отправлен. Генерация может потребовать времени; не нажимайте повторно.");
  try{
   const data=await api("POST",{project:startedProject,post_id:startedPost,prompt,style,size,quality});
   if(current?.id!==startedPost||project.slug!==startedProject){status("Изображение создано, но текущая статья изменилась. Вернитесь к прежнему черновику.");return}
   result={...data,postId:startedPost,project:startedProject};
   if(!result.asset_id)throw Error("Не получено сохранённое изображение");
   if(!result.url){
    const media=await call("/media/"+result.asset_id);
    result.url=media.url;
   }
   $("imageGeneratedImg").src=result.url;
   $("imageGeneratedAlt").textContent=prompt+" · Создано ИИ, необходимо проверить перед публикацией.";
   $("imageGeneratedPreview").hidden=false;
   status("Изображение создано и сохранено в закрытой медиатеке. Выбери, добавлять ли его в статью.");
   toast("Готово! Проверь результат и нажми «Добавить в статью» или «Сделать обложкой».");
  }catch(error){
   status("Ошибка: "+error.message,true);throw error;
  }finally{busy=false;$("imageGenerate").disabled=!editablePost();$("imageGenerate").textContent="✦ Сгенерировать изображение"}
 }
 function accept(asCover){
  if(!result?.asset_id)throw Error("Сначала сгенерируйте изображение");
  if(!editablePost()||current.id!==result.postId||project.slug!==result.project)throw Error("Откройте исходную статью");
  capture();
  const item={type:"image",asset_id:result.asset_id,caption:"Иллюстрация создана ИИ",alt:result.alt||$("imagePrompt").value.trim(),crop:{x:50,y:50,zoom:100,aspect:"auto"}};
  blocks.push(item);draft.blocks=blocks;assets[result.asset_id]=result.url;dirty=true;
  if(asCover||!draft.cover_path)draft.cover_path=result.asset_id;
  const imageId=result.asset_id;
  clear();renderEditor();status("ИИ-изображение добавлено в статью. Идёт бесплатная WebP-оптимизация — сохраните материал.");
  if(window.StudioOptimizer){
   void window.StudioOptimizer.optimizeExisting(imageId,{status:"pending"}).then(ok=>{
    if(ok)status("WebP-копии готовы. Сохрани статью; после публикации оригинал удалится безопасно.");
    else status("ИИ-изображение сохранено, но оптимизация ожидает повторной попытки.");
   });
  }
  toast("Изображение добавлено в черновик; проверь кадрирование и сохрани статью.");
 }
 document.addEventListener("click",e=>{
  const b=e.target.closest("button");if(!b)return;
  if(b.dataset.imageSource){setSource(b.dataset.imageSource);}
 });
 const originalRender=renderEditor;
 renderEditor=function(...args){originalRender(...args);refreshControls()};
 const originalChange=changeProject;
 changeProject=async function(...args){clear();const r=await originalChange(...args);refreshControls();return r};
 const originalOpen=openPost;
 openPost=async function(...args){clear();const r=await originalOpen(...args);refreshControls();return r};
 $("imageGenerate").onclick=()=>run(generate);
 $("imageAccept").onclick=()=>run(()=>accept(false));
 $("imageAcceptCover").onclick=()=>run(()=>accept(true));
 $("imageDiscard").onclick=()=>{clear();status("Не использовано. Сгенерированное изображение осталось в закрытом хранилище для учёта.")};
 setSource("ai");refreshControls();
 window.StudioImages={refreshControls};
})();