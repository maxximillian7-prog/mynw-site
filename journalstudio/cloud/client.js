
const URLROOT="https://npsfaymjckcqhtyiafms.supabase.co",PUBLICKEY="sb_publishable_-HPESNuXtfZQo-gLREwi2Q_1_aAoxee";
let session=null,projects=[],active=null,posts=[],current=null,blocks=[];
const $=id=>document.getElementById(id),safe=t=>String(t??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
function message(t){$("status").textContent=t}
async function auth(path,data){
const r=await fetch(URLROOT+"/auth/v1/"+path,{method:"POST",headers:{apikey:PUBLICKEY,"Content-Type":"application/json"},body:JSON.stringify(data)});
const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.msg||j.error_description||j.message||"Ошибка авторизации");return j
}
async function api(path,method="GET",body){
if(!session)throw Error("Сначала войдите");
const go=()=>fetch(URLROOT+"/functions/v1/studio-api"+path,{method,headers:{apikey:PUBLICKEY,Authorization:"Bearer "+session.access_token,"Content-Type":"application/json"},body:body?JSON.stringify(body):undefined});
let r=await go();if(r.status===401&&session.refresh_token){session=await auth("token?grant_type=refresh_token",{refresh_token:session.refresh_token});sessionStorage.setItem("journal_session",JSON.stringify(session));r=await go()}
const j=await r.json().catch(()=>({}));if(!r.ok)throw Error(j.error||"Ошибка сервера");return j
}
async function enter(){
const mail=$("email").value.trim(),password=$("password").value;
session=await auth("token?grant_type=password",{email:mail,password});sessionStorage.setItem("journal_session",JSON.stringify(session));await initialize()
}
async function signup(){
const password=$("password").value,email=$("email").value.trim();
if(password.length<12)throw Error("Пароль не короче 12 символов");
const j=await auth("signup",{email,password,options:{email_redirect_to:location.origin+location.pathname}});
if(j.access_token){session=j;sessionStorage.setItem("journal_session",JSON.stringify(session));await initialize()}
else message("Подтвердите электронную почту по письму и войдите с этим паролем")
}
async function bootstrap(){
const x=$("setup").value;if(!x)throw Error("Введите установочный ключ");
await api("/bootstrap","POST",{setup_key:x});$("setup").value="";await initialize()
}
async function initialize(){
const r=await api("/projects");projects=r.projects||[];
if(!projects.length){$("gate").hidden=false;$("workspace").hidden=true;$("setupZone").hidden=false;message("Пользователь подтверждён. Для первого входа нужен одноразовый ключ.");return}
active=projects[0];$("gate").hidden=true;$("workspace").hidden=false;
$("project").innerHTML=projects.map(p=>'<option value="'+safe(p.slug)+'">'+safe(p.name)+" — "+safe(p.role)+"</option>").join("");
await refresh();
}
async function refresh(){posts=(await api("/posts?project="+encodeURIComponent(active.slug))).posts;showPosts();}
function showPosts(){
$("headline").textContent=active.name+" — Редакция";
$("library").innerHTML=posts.map(p=>'<div class="entry"><div><strong>'+safe(p.title)+'</strong><small>'+safe(p.status)+" · "+safe(p.locale)+" · v"+p.revision+"</small></div><button data-open='"+safe(p.id)+"'>Открыть</button></div>").join("")||'<p>Статей пока нет. Создайте первую.</p>';
document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openPost(b.dataset.open));
}
function newPost(){current=null;blocks=[];$("title").value="";$("summary").value="";$("category").value="";$("locale").value=active.default_locale;$("editor").hidden=false;$("workTitle").textContent="Новый материал";renderBlocks();editorButtons();}
async function openPost(id){
current=(await api("/posts/"+id)).post;blocks=JSON.parse(JSON.stringify(current.blocks||[]));
$("title").value=current.title;$("summary").value=current.summary;$("category").value=current.category;$("locale").value=current.locale;
$("editor").hidden=false;$("workTitle").textContent=current.title;renderBlocks();editorButtons();
}
function collect(){document.querySelectorAll("[data-block]").forEach(el=>{blocks[+el.dataset.block][el.dataset.prop]=el.value})}
function renderBlocks(){
const editable=!current||["draft","changes_requested"].includes(current.status);
$("blocks").innerHTML=blocks.map((b,i)=>{
let item='<div class="block"><label>'+safe(b.type)+'</label>';
if(b.type==="image")item+='<small>📷 Фото загружено: '+safe(b.asset_id)+'</small><input data-block="'+i+'" data-prop="caption" value="'+safe(b.caption||'')+'" placeholder="Подпись">';
else if(b.type==="link")item+='<input data-block="'+i+'" data-prop="label" value="'+safe(b.label||'')+'" placeholder="Подпись ссылки"><input data-block="'+i+'" data-prop="url" value="'+safe(b.url||'')+'" placeholder="https://...">';
else item+='<textarea data-block="'+i+'" data-prop="text">'+safe(b.text||"")+'</textarea>';
return item+(editable?'<button data-remove="'+i+'">Убрать блок</button>':'')+'</div>'
}).join("");
document.querySelectorAll("[data-remove]").forEach(b=>b.onclick=()=>{collect();blocks.splice(+b.dataset.remove,1);renderBlocks()})
for(const id of ["title","summary","category","locale"])$(id).disabled=!editable;
$("editTools").hidden=!editable;
}
function editorButtons(){
const s=current?.status||"draft",role=active.role;
$("statusLine").textContent="Статус: "+s;
$("save").hidden=!["draft","changes_requested"].includes(s);
$("submit").hidden=!current||!["draft","changes_requested"].includes(s);
$("approve").hidden=!current||s!=="in_review"||!["owner","chief_editor"].includes(role);
$("return").hidden=!current||s!=="in_review"||!["owner","chief_editor","editor"].includes(role);
$("publish").hidden=!current||s!=="approved"||!["owner","chief_editor"].includes(role);
$("schedule").hidden=!current||s!=="approved"||!["owner","chief_editor"].includes(role);
}
function addBlock(t){collect();blocks.push(t==="link"?{type:t,label:"",url:""}:{type:t,text:""});renderBlocks()}
async function upload(){
const file=$("file").files[0];if(!file)return;if(file.size>8*1024*1024)throw Error("Файл больше 8 МБ");
const holder=prompt("Автор изображения / правообладатель:","")||"",license=prompt("Лицензия / разрешение:","")||"";
if(!confirm("Подтверждаете право использовать и публиковать фотографию?"))return;
const data=await new Promise((resolve,reject)=>{const fr=new FileReader();fr.onload=()=>resolve(String(fr.result).split(",")[1]);fr.onerror=reject;fr.readAsDataURL(file)});
const r=await api("/media","POST",{project:active.slug,base64:data,mime:file.type,rights_confirmed:true,copyright_holder:holder,license,alt_text:file.name});
collect();blocks.push({type:"image",asset_id:r.asset.id,caption:"",alt:file.name});renderBlocks();message("Фотография загружена в закрытое хранилище");
}
async function savePost(){
collect();const data={title:$("title").value.trim(),summary:$("summary").value,category:$("category").value,locale:$("locale").value,blocks};
if(!data.title)throw Error("Введите заголовок");
const r=current?await api("/posts/"+current.id,"PATCH",{...data,expected_revision:current.revision}):await api("/posts","POST",{...data,project:active.slug});
current=r.post;
await api("/placements","POST",{post_id:current.id,channel:active.slug,locale:current.locale});
await refresh();editorButtons();message("Черновик сохранён");
}
async function workflow(action){
const b={action};if(action==="schedule"){b.scheduled_at=prompt("Дата и время публикации (ISO 8601):",new Date(Date.now()+86400000).toISOString());if(!b.scheduled_at)return}
if(action==="request_changes")b.note=prompt("Комментарий автору:")||"";
current=(await api("/posts/"+current.id+"/action","POST",b)).post;await refresh();editorButtons();message("Статус: "+current.status);
}
async function invite(){const address=prompt("E-mail приглашаемого автора:");if(!address)return;await api("/invite","POST",{project:active.slug,email:address,role:"author"});message("Приглашение отправлено")}
function logout(){session=null;sessionStorage.removeItem("journal_session");$("gate").hidden=false;$("workspace").hidden=true}
async function click(fn){try{await fn()}catch(e){message("Ошибка: "+e.message)}}
$("login").onclick=()=>click(enter);$("register").onclick=()=>click(signup);$("activate").onclick=()=>click(bootstrap);
$("create").onclick=()=>click(async()=>newPost());$("save").onclick=()=>click(savePost);$("submit").onclick=()=>click(()=>workflow("submit"));
$("approve").onclick=()=>click(()=>workflow("approve"));$("return").onclick=()=>click(()=>workflow("request_changes"));
$("publish").onclick=()=>click(()=>workflow("publish"));$("schedule").onclick=()=>click(()=>workflow("schedule"));
$("invite").onclick=()=>click(invite);$("logout").onclick=logout;
$("project").onchange=async e=>click(async()=>{active=projects.find(x=>x.slug===e.target.value);$("editor").hidden=true;await refresh()});
document.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>addBlock(b.dataset.add));$("file").onchange=()=>click(upload);
(async()=>{const q=new URLSearchParams(location.hash.slice(1));if(q.get("access_token")){session={access_token:q.get("access_token"),refresh_token:q.get("refresh_token")};sessionStorage.setItem("journal_session",JSON.stringify(session));history.replaceState(null,"",location.pathname)}
else{try{session=JSON.parse(sessionStorage.getItem("journal_session")||"null")}catch{}}
if(session)click(initialize)})();
