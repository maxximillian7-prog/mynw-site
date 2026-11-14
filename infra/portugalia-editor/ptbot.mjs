// Contact manager for @pt_ryadom_bot. Replaces public preferences UI with editorial inbox.
// Private Telegram messages -> Neon journal inbox -> verified Studio admins -> replies via bot.
// Existing channel/afisha publisher is not affected.
import {createHash,randomBytes,timingSafeEqual} from "node:crypto";
const PREFIX="https://api.telegram.org/bot";
const EDITOR_AUTH="https://br-young-paper-b972wmgd-preditor.compute.c-7.eu-central-1.aws.neon.tech/api/me";
const TRUSTED_ORIGINS=new Set(["https://mynw.app","https://www.mynw.app"]);
const CATS={
 question:["❓","Вопрос"],ad:["📣","Реклама"],suggestion:["💡","Предложение"],
 complaint:["⚠️","Жалоба"],partnership:["🤝","Сотрудничество"],
 event:["🎭","Сообщить о событии"],other:["✉️","Другое"]
};
const short=(v,n=1000)=>String(v??"").replace(/\u0000/g,"").slice(0,n);
const idOk=x=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(String(x||""));
const asInt=x=>Number.isSafeInteger(Number(x))&&Number(x)>0?Number(x):null;
const sha=s=>createHash("sha256").update(s).digest("hex");
const respond=(data,status=200,origin="")=>new Response(JSON.stringify(data),{status,headers:{"content-type":"application/json;charset=utf-8","cache-control":"no-store","vary":"Origin",...(TRUSTED_ORIGINS.has(origin)?{"access-control-allow-origin":origin}: {})}});
async function sql(query,params=[]){
 const connection=process.env.DATABASE_URL;if(!connection)throw Error("Database not configured");
 const host=new URL(connection).hostname;
 const r=await fetch("https://"+host+"/sql",{method:"POST",
  headers:{"content-type":"application/json","Neon-Connection-String":connection},
  body:JSON.stringify({query,params}),signal:AbortSignal.timeout(16000)});
 if(!r.ok)throw Error("Database query failed "+r.status);
 const body=await r.json();
 return body.rows??body;
}
async function tg(method,body){
 const token=process.env.TELEGRAM_BOT_TOKEN;if(!token)throw Error("Telegram bot not configured");
 const res=await fetch(PREFIX+token+"/"+method,{method:"POST",headers:{"content-type":"application/json"},
  body:JSON.stringify(body),signal:AbortSignal.timeout(18000)});
 const data=await res.json().catch(()=>({}));
 if(!res.ok||!data.ok)throw Error("Telegram "+method+" error "+(data.error_code||res.status));
 return data.result;
}
async function privateAdmin(req){
 const origin=req.headers.get("origin")||"";
 if(!TRUSTED_ORIGINS.has(origin))throw Object.assign(new Error("Origin not allowed"),{status:403});
 const bearer=req.headers.get("authorization")||"";
 if(!bearer.startsWith("Bearer ")||bearer.length>3500)throw Object.assign(new Error("Sign in to Journal Studio"),{status:401});
 const verify=await fetch(EDITOR_AUTH,{method:"GET",headers:{authorization:bearer,origin:"https://mynw.app"},signal:AbortSignal.timeout(16000)});
 if(!verify.ok)throw Object.assign(new Error("Editor session expired"),{status:401});
 const data=await verify.json();
 if(!data.user?.approve||!idOk(data.user.id))throw Object.assign(new Error("Only journal owners / chief editors can manage private inquiries"),{status:403});
 return data.user;
}
const categoryText=code=>CATS[code]?CATS[code].join(" "):CATS.other.join(" ");
const choices={inline_keyboard:[
 [{text:"❓ Вопрос",callback_data:"contact:question"},{text:"📣 Реклама",callback_data:"contact:ad"}],
 [{text:"💡 Предложение",callback_data:"contact:suggestion"},{text:"⚠️ Жалоба",callback_data:"contact:complaint"}],
 [{text:"🤝 Сотрудничество",callback_data:"contact:partnership"},{text:"🎭 Событие",callback_data:"contact:event"}],
 [{text:"✉️ Другое",callback_data:"contact:other"}]
]};
async function menu(chatId){
 await tg("sendMessage",{chat_id:chatId,
  text:"🇵🇹 Португалия рядом — связь с редакцией.\n\nВыберите тему обращения, затем напишите сообщение. Можно прикрепить фото, видео, файл, голосовое сообщение или геопозицию. Редакция получит обращение и сможет ответить здесь, через бота.\n\nДля нового обращения: /new\nДля своих обращений: /status\nУдалить данные обращений: /delete",
  reply_markup:choices,disable_web_page_preview:true});
}
function parseMessage(m){
 const media=["photo","video","document","audio","voice","animation","video_note","sticker","location","contact","poll","dice","venue"];
 const kind=media.find(k=>m[k]!=null)||"text";
 const data=m[kind],photo=Array.isArray(data)?data.at(-1):data;
 const fileId=short(photo?.file_id||"",512)||null;
 return {kind,body:short(m.text||m.caption||"",12000),file_id:fileId,
  file_name:short(photo?.file_name||"",255)||null,
  mime:short(photo?.mime_type||"",120)||null,
  metadata:{
   location:kind==="location"||kind==="venue"?{latitude:photo?.latitude,longitude:photo?.longitude,title:short(photo?.title,200)}:undefined,
   contact:kind==="contact"?{first_name:short(photo?.first_name,100),phone_number:short(photo?.phone_number,60)}:undefined,
   poll:kind==="poll"?{question:short(photo?.question,300)}:undefined,
   media_group_id:short(m.media_group_id||"",90)||undefined,
   file_size:Number(photo?.file_size)||undefined
  }};
}
async function notifyManagers(thread,msg,telegramMessage){
 const admins=await sql("SELECT telegram_chat_id FROM public.pr_contact_admin_links ORDER BY created_at LIMIT 8");
 const sender=thread.username?"@"+thread.username:thread.display_name||"Без имени";
 const text="📨 Обращение №"+thread.ticket_no+" · "+categoryText(thread.category)+
  "\nОт: "+short(sender,150)+"\nСтатус: "+thread.status+
  "\n\nОтветьте реплаем на это сообщение — бот перешлёт ответ автору. Или откройте Journal Studio → Обращения.";
 for(const admin of admins){
  try{
   const header=await tg("sendMessage",{chat_id:admin.telegram_chat_id,text,disable_web_page_preview:true});
   await sql("INSERT INTO public.pr_contact_admin_notifications(admin_chat_id,admin_message_id,thread_id) VALUES($1,$2,$3::uuid) ON CONFLICT DO NOTHING",[admin.telegram_chat_id,header.message_id,thread.id]);
   if(telegramMessage?.message_id){
    try{
     const copied=await tg("copyMessage",{chat_id:admin.telegram_chat_id,from_chat_id:telegramMessage.chat.id,message_id:telegramMessage.message_id});
     await sql("INSERT INTO public.pr_contact_admin_notifications(admin_chat_id,admin_message_id,thread_id) VALUES($1,$2,$3::uuid) ON CONFLICT DO NOTHING",[admin.telegram_chat_id,copied.message_id,thread.id]);
    }catch{
     await tg("sendMessage",{chat_id:admin.telegram_chat_id,text:"Тип: "+msg.kind+"\n"+short(msg.body||"Вложение; просмотрите в Journal Studio.",1200)});
    }
   }
  }catch{/* Next paired manager still receives their notification */}
 }
}
async function onSelect(q){
 const chat=q.message?.chat;
 if(!chat||chat.type!=="private"||q.from?.id!==chat.id)return;
 const key=String(q.data||"").slice(8);
 if(!CATS[key])return;
 await sql("INSERT INTO public.pr_contact_sessions(telegram_user_id,selected_category,active_thread_id,updated_at) VALUES($1,$2,NULL,now()) ON CONFLICT(telegram_user_id) DO UPDATE SET selected_category=excluded.selected_category,active_thread_id=NULL,updated_at=now()",[q.from.id,key]);
 await tg("answerCallbackQuery",{callback_query_id:q.id,text:"Выбрано: "+CATS[key][1]});
 await tg("sendMessage",{chat_id:chat.id,text:categoryText(key)+"\n\nНапишите сообщение или отправьте вложение. Мы передадим его редакции. После отправки можно добавить детали следующими сообщениями."});
}
async function startNew(m){await sql("INSERT INTO public.pr_contact_sessions(telegram_user_id,selected_category,active_thread_id,updated_at) VALUES($1,NULL,NULL,now()) ON CONFLICT(telegram_user_id) DO UPDATE SET selected_category=NULL,active_thread_id=NULL,updated_at=now()",[m.from.id]);await menu(m.chat.id);}
async function pairAdmin(m){
 const code=short((m.text||"").split(/\s+/)[1]||"",100).toLowerCase();
 if(!/^[a-f0-9]{18}$/.test(code)){await tg("sendMessage",{chat_id:m.chat.id,text:"Для подключения редактора получите одноразовый код в Journal Studio → Обращения → Подключить Telegram. Затем отправьте /manager КОД."});return;}
 const digest=sha(code);
 const rows=await sql("UPDATE public.pr_contact_admin_pair_codes SET used_at=now() WHERE code_sha256=$1 AND expires_at>now() AND used_at IS NULL RETURNING studio_user_id",[digest]);
 if(!rows.length){await tg("sendMessage",{chat_id:m.chat.id,text:"Код недействителен или истёк. Создайте новый в Journal Studio."});return;}
 await sql("INSERT INTO public.pr_contact_admin_links(telegram_user_id,telegram_chat_id,studio_user_id,username) VALUES($1,$2,$3::uuid,$4) ON CONFLICT(telegram_user_id) DO UPDATE SET telegram_chat_id=excluded.telegram_chat_id,studio_user_id=excluded.studio_user_id,username=excluded.username",[m.from.id,m.chat.id,rows[0].studio_user_id,short(m.from.username,100)]);
 await tg("sendMessage",{chat_id:m.chat.id,text:"✅ Вы подключены как редактор обращений.\n\nНовые обращения будут поступать сюда. Чтобы ответить — нажмите «Ответить» на уведомлении или пересланном сообщении и отправьте текст, фото, голосовое или файл.\n\nКоманда /inbox — последние открытые обращения.\nКоманда /unmanager — отключить уведомления."});
}
async function isManager(m){
 const [row]=await sql("SELECT telegram_user_id FROM public.pr_contact_admin_links WHERE telegram_user_id=$1 AND telegram_chat_id=$2 LIMIT 1",[m.from.id,m.chat.id]);
 return !!row;
}
async function adminReply(m){
 if(!m.reply_to_message||!await isManager(m))return false;
 const [match]=await sql("SELECT t.* FROM public.pr_contact_admin_notifications n JOIN public.pr_contact_threads t ON t.id=n.thread_id WHERE n.admin_chat_id=$1 AND n.admin_message_id=$2",[m.chat.id,m.reply_to_message.message_id]);
 if(!match)return false;
 if(match.status==="closed"){await tg("sendMessage",{chat_id:m.chat.id,text:"Обращение №"+match.ticket_no+" закрыто. Откройте его в Journal Studio, если нужно ответить снова."});return true;}
 const parts=parseMessage(m);
 let sent;
 try{
  if(parts.kind==="text"){
   if(!parts.body.trim())return true;
   sent=await tg("sendMessage",{chat_id:match.telegram_chat_id,text:"✉️ Ответ редакции · обращение №"+match.ticket_no+"\n\n"+parts.body,disable_web_page_preview:true});
  }else{
   sent=await tg("copyMessage",{chat_id:match.telegram_chat_id,from_chat_id:m.chat.id,message_id:m.message_id});
  }
 }catch{await tg("sendMessage",{chat_id:m.chat.id,text:"Не удалось доставить ответ. Возможно, пользователь заблокировал бота."});return true;}
 await sql("INSERT INTO public.pr_contact_messages(thread_id,direction,actor_telegram_id,telegram_message_id,body,media_type,telegram_file_id,media_name,media_mime,media_metadata) VALUES($1::uuid,'out',$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT DO NOTHING",[match.id,m.from.id,sent.message_id||null,parts.body,parts.kind,parts.file_id,parts.file_name,parts.mime,JSON.stringify(parts.metadata)]);
 await sql("UPDATE public.pr_contact_threads SET status='replied',updated_at=now(),last_reply_at=now() WHERE id=$1::uuid",[match.id]);
 await tg("sendMessage",{chat_id:m.chat.id,text:"✅ Ответ доставлен по обращению №"+match.ticket_no});
 return true;
}
async function adminInbox(m){
 if(!await isManager(m))return false;
 const rows=await sql("SELECT ticket_no,category,status,display_name,username,last_message_at FROM public.pr_contact_threads WHERE status<>'closed' ORDER BY last_message_at DESC LIMIT 10");
 if(!rows.length){await tg("sendMessage",{chat_id:m.chat.id,text:"Открытых обращений пока нет."});return true;}
 await tg("sendMessage",{chat_id:m.chat.id,text:"📨 Последние обращения:\n"+rows.map(x=>"№"+x.ticket_no+" "+categoryText(x.category)+" — "+(x.username?"@"+x.username:x.display_name||"Читатель")+" ("+x.status+")").join("\n")+"\n\nЧтобы ответить, используйте реплай на уведомлении или Journal Studio."});
 return true;
}
async function acceptUserMessage(m){
 const user=m.from?.id,chat=m.chat?.id;
 if(!user||!chat)return;
 const [session]=await sql("SELECT selected_category,active_thread_id FROM public.pr_contact_sessions WHERE telegram_user_id=$1",[user]);
 if(!session?.selected_category){await menu(chat);return;}
 const [throttle]=await sql("SELECT count(*)::int AS n FROM public.pr_contact_messages z JOIN public.pr_contact_threads t ON t.id=z.thread_id WHERE t.telegram_user_id=$1 AND z.direction='in' AND z.created_at>now()-interval '1 hour'",[user]);
 if(Number(throttle.n)>=35){await tg("sendMessage",{chat_id:chat,text:"Слишком много сообщений за час. Пожалуйста, попробуйте позже."});return;}
 let thread=null,newThread=false;
 if(idOk(session.active_thread_id)){
  const [found]=await sql("SELECT * FROM public.pr_contact_threads WHERE id=$1::uuid AND telegram_user_id=$2 AND status<>'closed'",[session.active_thread_id,user]);
  thread=found||null;
 }
 if(!thread){
  const [created]=await sql("INSERT INTO public.pr_contact_threads(telegram_user_id,telegram_chat_id,username,display_name,category) VALUES($1,$2,$3,$4,$5) RETURNING *",[user,chat,short(m.from.username,100),short([m.from.first_name,m.from.last_name].filter(Boolean).join(" "),150),session.selected_category]);
  thread=created;newThread=true;
  await sql("UPDATE public.pr_contact_sessions SET active_thread_id=$2::uuid,updated_at=now() WHERE telegram_user_id=$1",[user,thread.id]);
 }
 const data=parseMessage(m);
 const saved=await sql("INSERT INTO public.pr_contact_messages(thread_id,direction,actor_telegram_id,telegram_message_id,body,media_type,telegram_file_id,media_name,media_mime,media_metadata) VALUES($1::uuid,'in',$2,$3,$4,$5,$6,$7,$8,$9::jsonb) ON CONFLICT DO NOTHING RETURNING id",[thread.id,user,m.message_id,data.body,data.kind,data.file_id,data.file_name,data.mime,JSON.stringify(data.metadata)]);
 if(!saved.length)return;
 await sql("UPDATE public.pr_contact_threads SET last_message_at=now(),updated_at=now(),status='open',username=$2,display_name=$3 WHERE id=$1::uuid",[thread.id,short(m.from.username,100),short([m.from.first_name,m.from.last_name].filter(Boolean).join(" "),150)]);
 if(newThread)await tg("sendMessage",{chat_id:chat,text:"✅ Обращение №"+thread.ticket_no+" принято: "+categoryText(thread.category)+".\n\nМожно прислать дополнительные сообщения или вложения. Ответ редакции придёт сюда. Для другого вопроса нажмите /new."});
 else await tg("sendMessage",{chat_id:chat,text:"✅ Добавлено к обращению №"+thread.ticket_no});
 await notifyManagers(thread,data,m);
}
async function processMessage(m){
 if(m.chat?.type!=="private"||!m.from||m.from.is_bot)return;
 const text=String(m.text||"").trim();
 if(/^\/manager(?:\s|$)/i.test(text))return pairAdmin(m);
 if(/^\/unmanager(?:\s|$)/i.test(text)){
  await sql("DELETE FROM public.pr_contact_admin_links WHERE telegram_user_id=$1 AND telegram_chat_id=$2",[m.from.id,m.chat.id]);
  return tg("sendMessage",{chat_id:m.chat.id,text:"Уведомления администратора отключены."});
 }
 if(/^\/inbox(?:\s|$)/i.test(text))return adminInbox(m);
 if(m.reply_to_message&&await adminReply(m))return;
 if(/^\/(?:start|new|menu|cancel)(?:\s|$)/i.test(text))return startNew(m);
 if(/^\/status(?:\s|$)/i.test(text)){
  const threads=await sql("SELECT ticket_no,category,status FROM public.pr_contact_threads WHERE telegram_user_id=$1 ORDER BY created_at DESC LIMIT 5",[m.from.id]);
  return tg("sendMessage",{chat_id:m.chat.id,text:threads.length?"Ваши обращения:\n"+threads.map(t=>"№"+t.ticket_no+" "+categoryText(t.category)+" · "+(t.status==="open"?"Принято":t.status==="replied"?"Есть ответ":"Закрыто")).join("\n"):"Обращений пока нет. Для нового обращения: /start"});
 }
 if(/^\/privacy(?:\s|$)/i.test(text))return tg("sendMessage",{chat_id:m.chat.id,text:"Мы храним ваши сообщения, имя профиля, Telegram ID и присланные ссылки на файлы только для обработки обращений редакцией. Доступ есть у авторизованных редакторов. Команда /delete удаляет данные ваших обращений из базы журнала. Отправленные ранее сообщения в Telegram невозможно гарантированно удалить из чатов редакторов."});
 if(/^\/delete(?:\s|$)/i.test(text)){
  await sql("DELETE FROM public.pr_contact_threads WHERE telegram_user_id=$1",[m.from.id]);
  await sql("DELETE FROM public.pr_contact_sessions WHERE telegram_user_id=$1",[m.from.id]);
  return tg("sendMessage",{chat_id:m.chat.id,text:"Записи ваших обращений удалены из базы журнала. Копии уже полученных редакторами сообщений в Telegram могут остаться у них."});
 }
 if(text.startsWith("/"))return tg("sendMessage",{chat_id:m.chat.id,text:"Выберите тему для обращения: /start. Для статуса: /status."});
 return acceptUserMessage(m);
}
async function botUpdate(update){
 const id=asInt(update.update_id);if(id==null)return;
 const inserted=await sql("INSERT INTO pr_bot_update_receipts(update_id) VALUES($1) ON CONFLICT DO NOTHING RETURNING update_id",[id]);
 if(!inserted.length){
  const resumed=await sql("UPDATE pr_bot_update_receipts SET received_at=now() WHERE update_id=$1 AND completed_at IS NULL AND received_at<now()-interval '1 minute' RETURNING update_id",[id]);
  if(!resumed.length)return;
 }
 try{
  if(update.callback_query&&String(update.callback_query.data||"").startsWith("contact:"))await onSelect(update.callback_query);
  else if(update.message)await processMessage(update.message);
  await sql("UPDATE pr_bot_update_receipts SET completed_at=now() WHERE update_id=$1",[id]);
 }catch(e){
  // Leave receipt incomplete so a later Telegram retry can recover it.
  throw e;
 }
}
async function adminRequest(req,url,user){
 const path=url.pathname;
 if(req.method==="GET"&&path==="/api/contacts"){
  const status=["open","replied","closed","all"].includes(url.searchParams.get("status"))?url.searchParams.get("status"):"all";
  const category=Object.hasOwn(CATS,url.searchParams.get("category"))?url.searchParams.get("category"):"all";
  const threads=await sql("SELECT t.id,t.ticket_no,t.category,t.status,t.username,t.display_name,t.created_at,t.last_message_at,t.last_reply_at, (SELECT coalesce(m.body,'['||m.media_type||']') FROM pr_contact_messages m WHERE m.thread_id=t.id ORDER BY m.id DESC LIMIT 1) AS preview, (SELECT count(*)::int FROM pr_contact_messages m WHERE m.thread_id=t.id) AS message_count FROM pr_contact_threads t WHERE ($1='all' OR t.status=$1) AND ($2='all' OR t.category=$2) ORDER BY CASE WHEN t.status='closed' THEN 1 ELSE 0 END,t.last_message_at DESC LIMIT 120",[status,category]);
  const [counts]=await sql("SELECT count(*) FILTER(WHERE status='open')::int open_count,count(*) FILTER(WHERE status='replied')::int replied_count,count(*) FILTER(WHERE status='closed')::int closed_count FROM pr_contact_threads");
  return {threads,counts};
 }
 if(req.method==="GET"&&path==="/api/contact"){
  const id=url.searchParams.get("id");if(!idOk(id))throw Object.assign(new Error("Invalid ticket"),{status:400});
  const [thread]=await sql("SELECT * FROM public.pr_contact_threads WHERE id=$1::uuid",[id]);
  if(!thread)throw Object.assign(new Error("Ticket not found"),{status:404});
  const messages=await sql("SELECT id,direction,body,media_type,telegram_file_id IS NOT NULL AS has_attachment,media_name,media_mime,media_metadata,created_at FROM pr_contact_messages WHERE thread_id=$1::uuid ORDER BY id ASC LIMIT 150",[id]);
  return {thread,messages,private_chat_url:thread.username&&/^[A-Za-z0-9_]{5,32}$/.test(thread.username)?"https://t.me/"+thread.username:null};
 }
 if(req.method==="POST"&&path==="/api/contact/reply"){
  const data=await req.json();const id=data.thread_id,body=short(data.text,4000).trim();
  if(!idOk(id)||!body)throw Object.assign(new Error("Enter reply text"),{status:400});
  const [thread]=await sql("SELECT * FROM pr_contact_threads WHERE id=$1::uuid",[id]);
  if(!thread)throw Object.assign(new Error("Ticket not found"),{status:404});
  if(thread.status==="closed")throw Object.assign(new Error("Reopen this ticket first"),{status:409});
  const sent=await tg("sendMessage",{chat_id:thread.telegram_chat_id,text:"✉️ Ответ редакции · обращение №"+thread.ticket_no+"\n\n"+body,disable_web_page_preview:true});
  await sql("INSERT INTO public.pr_contact_messages(thread_id,direction,telegram_message_id,body,media_type) VALUES($1::uuid,'out',$2,$3,'text')",[id,sent.message_id,body]);
  await sql("UPDATE pr_contact_threads SET status='replied',last_reply_at=now(),updated_at=now() WHERE id=$1::uuid",[id]);
  return {ok:true,telegram_delivered:true};
 }
 if(req.method==="POST"&&path==="/api/contact/status"){
  const data=await req.json();
  if(!idOk(data.thread_id)||!["open","closed"].includes(data.status))throw Object.assign(new Error("Invalid request"),{status:400});
  const row=await sql("UPDATE pr_contact_threads SET status=$2,closed_at=CASE WHEN $2='closed' THEN now() ELSE NULL END,updated_at=now() WHERE id=$1::uuid RETURNING id",[data.thread_id,data.status]);
  if(!row.length)throw Object.assign(new Error("Ticket not found"),{status:404});
  return {ok:true};
 }
 if(req.method==="POST"&&path==="/api/contact/admin-code"){
  const [lim]=await sql("SELECT count(*)::int AS n FROM pr_contact_admin_pair_codes WHERE studio_user_id=$1::uuid AND issued_at>now()-interval '1 hour'",[user.id]);
  if(Number(lim.n)>=6)throw Object.assign(new Error("Try again later"),{status:429});
  const code=randomBytes(9).toString("hex");
  await sql("INSERT INTO pr_contact_admin_pair_codes(code_sha256,studio_user_id,expires_at) VALUES($1,$2::uuid,now()+interval '10 minutes')",[sha(code),user.id]);
  return {ok:true,command:"/manager "+code,expires_in_minutes:10,bot_url:"https://t.me/pt_ryadom_bot"};
 }
 if(req.method==="GET"&&path==="/api/contact/media"){
  const id=url.searchParams.get("message_id");if(!/^\d{1,17}$/.test(String(id)))throw Object.assign(new Error("Invalid attachment"),{status:400});
  const [message]=await sql("SELECT telegram_file_id,media_type,media_mime,media_name FROM public.pr_contact_messages WHERE id=$1 AND direction='in' AND telegram_file_id IS NOT NULL",[id]);
  if(!message)throw Object.assign(new Error("File not found"),{status:404});
  const file=await tg("getFile",{file_id:message.telegram_file_id});
  if(!file.file_path||Number(file.file_size)>20_000_000)throw Object.assign(new Error("File too large for Telegram Bot API"),{status:413});
  const download=await fetch("https://api.telegram.org/file/bot"+process.env.TELEGRAM_BOT_TOKEN+"/"+file.file_path,{signal:AbortSignal.timeout(16000)});
  if(!download.ok)throw Error("Telegram file download failed");
  const kind=message.media_type;
  const mime=kind==="photo"?"image/jpeg":kind==="voice"?"audio/ogg":kind==="video"?"video/mp4":kind==="audio"?message.media_mime||"application/octet-stream":"application/octet-stream";
  return new Response(download.body,{status:200,headers:{"content-type":mime,"content-disposition":"attachment; filename=\""+(kind==="photo"?"photo.jpg":kind==="voice"?"voice.ogg":kind==="video"?"video.mp4":"telegram-file")+"\"","x-content-type-options":"nosniff","cache-control":"no-store","access-control-allow-origin":req.headers.get("origin")||""}});
 }
 throw Object.assign(new Error("Unknown endpoint"),{status:404});
}
export default {async fetch(req){
 const url=new URL(req.url),origin=req.headers.get("origin")||"";
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:{"access-control-allow-origin":TRUSTED_ORIGINS.has(origin)?origin:"null","access-control-allow-methods":"GET,POST,OPTIONS","access-control-allow-headers":"authorization,content-type","access-control-max-age":"300","vary":"Origin"}});
 if(req.method==="GET"&&(url.pathname==="/health"||url.pathname==="/"))return respond({ok:true,service:"pt-ryadom-contact-manager",version:4,ready:!!process.env.TELEGRAM_BOT_TOKEN&&!!process.env.TELEGRAM_WEBHOOK_SECRET,editorial_inbox:true,private_bot:true,attachment_support:true,admin_reply:true});
 if(url.pathname.startsWith("/api/")){
  try{
   const user=await privateAdmin(req);
   const result=await adminRequest(req,url,user);
   return result instanceof Response?result:respond(result,200,origin);
  }catch(e){return respond({error:short(e.message,240)},e.status||500,origin)}
 }
 // Telegram webhook may have been registered under an older path. The secret header, not the URL, authorizes updates.
 if(req.method!=="POST")return respond({error:"Not found"},404);
 const expected=process.env.TELEGRAM_WEBHOOK_SECRET||"";
 const received=req.headers.get("X-Telegram-Bot-Api-Secret-Token")||"";
 const a=Buffer.from(expected),b=Buffer.from(received);
 if(!expected||a.length!==b.length||!timingSafeEqual(a,b))return respond({error:"Unauthorized"},403);
 try{
  const raw=await req.text();if(raw.length>900000)return respond({error:"Too large"},413);
  const update=JSON.parse(raw);
  await botUpdate(update);
  return respond({ok:true});
 }catch(e){return respond({ok:false,error:"Temporary delivery error"},503)}
}};
