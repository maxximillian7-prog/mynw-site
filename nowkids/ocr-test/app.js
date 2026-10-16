(function () {
"use strict";
const SUPABASE_API_KEY="sb_publishable_X5atQoLVH9RZKOd7Y-AyZw_fNGLOooJ";
const root="https://czqwuaanobkowckpnyhg.supabase.co";
const ocrEndpoint="https://czqwuaanobkowckpnyhg.supabase.co/functions/v1/nowkids-ocr-mobile-test";
const $=id=>document.getElementById(id);
let token=null;
let imageData=null;
let busy=false;
function status(message,isError){$("status").style.display="block";$("status").textContent=message;$("status").dataset.error=String(!!isError)}
function clearStatus(){$("status").style.display="none";$("status").textContent=""}
function updateButton(){$("recognize").disabled=!token||!imageData||!$("noPersonal").checked||!$("consent").checked||busy}
function showSignedIn(){token=token||null;$("signIn").classList.add("hidden");$("upload").classList.remove("hidden");$("password").value="";$("otp").value="";status("Аккаунт подтверждён. Выбери документ без личных данных.",false);updateButton()}
async function auth(path,data){
 const response=await fetch(root+"/auth/v1/"+path,{method:"POST",headers:{"apikey":SUPABASE_API_KEY,"Content-Type":"application/json"},body:JSON.stringify(data),cache:"no-store"});
 const dataOut=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(dataOut.msg||dataOut.error_description||dataOut.message||"Не удалось войти");
 return dataOut;
}
function block(value){busy=value;$("login").disabled=value;$("sendCode").disabled=value;$("verifyCode").disabled=value;updateButton()}
$("login").addEventListener("click",async()=>{if(busy)return;clearStatus();block(true);
 try{const response=await auth("token?grant_type=password",{email:$("email").value.trim(),password:$("password").value});if(!response.access_token)throw new Error("Не получен токен пользователя");token=response.access_token;showSignedIn()}
 catch(e){status(String(e.message||e),true)}finally{block(false)}
});
$("sendCode").addEventListener("click",async()=>{if(busy)return;clearStatus();block(true);
 try{await auth("otp",{email:$("email").value.trim(),create_user:false});status("Проверь письмо и введи код. Если пришла только ссылка, войди через пароль.",false)}
 catch(e){status(String(e.message||e),true)}finally{block(false)}
});
$("verifyCode").addEventListener("click",async()=>{if(busy)return;clearStatus();block(true);
 try{const response=await auth("verify",{email:$("email").value.trim(),token:$("otp").value.trim(),type:"email"});if(!response.access_token)throw new Error("Токен не выдан");token=response.access_token;showSignedIn()}
 catch(e){status(String(e.message||e),true)}finally{block(false)}
});
$("logout").addEventListener("click",()=>{token=null;imageData=null;$("file").value="";$("preview").src="";$("preview").style.display="none";$("output").classList.add("hidden");$("upload").classList.add("hidden");$("signIn").classList.remove("hidden");$("consent").checked=false;$("noPersonal").checked=false;$("result").textContent="";status("Сеанс тестирования завершён. Ничего не сохранено.",false);updateButton()});
async function processFile(file){
 if(!file)throw Error("Выбери изображение");
 if(file.size>18*1024*1024)throw Error("Файл слишком большой, сначала уменьши его в галерее");
 const url=URL.createObjectURL(file);
 try{
  const img=new Image();img.decoding="async";
  await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error("Браузер не открыл изображение"));img.src=url});
  let width=img.naturalWidth,height=img.naturalHeight;
  if(!width||!height||width*height>35000000)throw Error("Изображение слишком большое");
  for(const [maxDim,quality] of [[2200,.92],[1900,.88],[1600,.83],[1300,.78]]){
    const scale=Math.min(1,maxDim/Math.max(width,height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
    const ctx=canvas.getContext("2d",{alpha:false});
    ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(img,0,0,canvas.width,canvas.height);
    const data=canvas.toDataURL("image/jpeg",quality);
    if((data.length-23)*.75<=2900000){return {data,preview:URL.createObjectURL(await new Promise(ok=>canvas.toBlob(ok,"image/jpeg",quality))),width:canvas.width,height:canvas.height,bytes:Math.round(data.length*.75)}}
  }
  throw Error("Слишком большой файл после сжатия. Обрежь фото в галерее");
 }finally{URL.revokeObjectURL(url)}
}
$("file").addEventListener("change",async()=>{imageData=null;$("output").classList.add("hidden");$("consent").checked=false;$("noPersonal").checked=false;updateButton();clearStatus();
 try{const selected=$("file").files[0];const processed=await processFile(selected);imageData=processed.data;
 $("preview").src=processed.preview;$("preview").style.display="block";
 $("imageInfo").textContent="Подготовлено локально: "+processed.width+" × "+processed.height+" px, "+Math.round(processed.bytes/1024)+" КБ (JPEG).";
 status("Проверь изображение: личные данные должны быть удалены ДО загрузки.",false);
 }catch(e){status(String(e.message||e),true)}finally{updateButton()}
});
$("noPersonal").addEventListener("change",updateButton);
$("consent").addEventListener("change",updateButton);
$("recognize").addEventListener("click",async()=>{if(!token||!imageData||busy)return;clearStatus();block(true);$("output").classList.add("hidden");status("IONOS распознаёт текст. Подожди примерно 5–30 секунд…",false);
 try{
  const response=await fetch(ocrEndpoint,{method:"POST",
   headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json","apikey":SUPABASE_API_KEY},
   body:JSON.stringify({real_owner_test:true,cloud_consent:$("consent").checked,attest_no_personal_data:$("noPersonal").checked,image_data_url:imageData}),cache:"no-store"});
  const result=await response.json().catch(()=>({}));
  if(!response.ok||result.ok!==true)throw Error("OCR: "+(result.error||"ошибка")+" ("+response.status+")");
  $("result").textContent=String(result.text||"");
  $("metrics").textContent="Модель: "+String(result.model)+" · Время: "+String(result.elapsed_ms)+" мс · Входные токены: "+String(result.usage?.input_tokens??"—")+" · Выходные токены: "+String(result.usage?.output_tokens??"—");
  $("output").classList.remove("hidden");status("Распознавание завершено. Сравни текст с фотографией.",false);
 }catch(e){status(String(e.message||e),true)}finally{block(false)}
});
$("copy").addEventListener("click",async()=>{try{await navigator.clipboard.writeText($("result").textContent);status("Текст скопирован. Не публикуй личную информацию.",false)}catch(e){status("Не удалось скопировать автоматически: выдели текст вручную.",true)}});
})();
