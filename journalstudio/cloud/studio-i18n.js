"use strict";
/* Journal Studio interface localization — zero per-page AI calls.
 * The 7 translated dictionaries are generated once server-side and cached.
 * Article drafts, previews, private messages and user-supplied values are never translated.
 */
(function(){
 const supported=["ru","en","pt-PT","uk","fr","de","es","it"];
 const languageNames={"ru":"Язык","en":"Language","pt-PT":"Idioma","uk":"Мова","fr":"Langue","de":"Sprache","es":"Idioma","it":"Lingua"};
 const fallback={
  "en":{"Удалить":"Remove","Изображение загружается…":"Image loading…","Главная":"Home","Материалы":"Articles","Конструктор":"Editor","Авторы":"Authors","ИИ-редакция":"AI Editorial","Публикации":"Publishing","Согласование":"Review","Настройки":"Settings","Сохранить":"Save","На проверку":"Submit for review","Заголовок":"Heading","Текст":"Text","Группа":"Group","Обложка":"Cover","Медиатека":"Media library"},
  "pt-PT":{"Удалить":"Remover","Изображение загружается…":"A carregar imagem…","Главная":"Início","Материалы":"Artigos","Конструктор":"Editor","Авторы":"Autores","ИИ-редакция":"Redação IA","Публикации":"Publicações","Согласование":"Revisão","Настройки":"Definições","Сохранить":"Guardar","На проверку":"Enviar para revisão","Заголовок":"Título","Текст":"Texto","Группа":"Grupo","Обложка":"Capa","Медиатека":"Biblioteca multimédia"},
  "uk":{"Удалить":"Видалити","Изображение загружается…":"Зображення завантажується…","Главная":"Головна","Материалы":"Матеріали","Конструктор":"Конструктор","Авторы":"Автори","ИИ-редакция":"ШІ-редакція","Публикации":"Публікації","Согласование":"Погодження","Настройки":"Налаштування","Сохранить":"Зберегти","На проверку":"На перевірку","Заголовок":"Заголовок","Текст":"Текст","Группа":"Група","Обложка":"Обкладинка","Медиатека":"Медіатека"},
  "fr":{"Удалить":"Retirer","Изображение загружается…":"Chargement de l’image…","Главная":"Accueil","Материалы":"Articles","Конструктор":"Éditeur","Авторы":"Auteurs","ИИ-редакция":"Rédaction IA","Публикации":"Publications","Согласование":"Validation","Настройки":"Paramètres","Сохранить":"Enregistrer","На проверку":"Soumettre","Заголовок":"Titre","Текст":"Texte","Группа":"Groupe","Обложка":"Couverture","Медиатека":"Médiathèque"},
  "de":{"Удалить":"Entfernen","Изображение загружается…":"Bild wird geladen…","Главная":"Startseite","Материалы":"Artikel","Конструктор":"Editor","Авторы":"Autoren","ИИ-редакция":"KI-Redaktion","Публикации":"Veröffentlichungen","Согласование":"Freigabe","Настройки":"Einstellungen","Сохранить":"Speichern","На проверку":"Zur Prüfung","Заголовок":"Überschrift","Текст":"Text","Группа":"Gruppe","Обложка":"Titelbild","Медиатека":"Medienbibliothek"},
  "es":{"Удалить":"Quitar","Изображение загружается…":"Cargando imagen…","Главная":"Inicio","Материалы":"Artículos","Конструктор":"Editor","Авторы":"Autores","ИИ-редакция":"Redacción IA","Публикации":"Publicaciones","Согласование":"Revisión","Настройки":"Configuración","Сохранить":"Guardar","На проверку":"Enviar a revisión","Заголовок":"Título","Текст":"Texto","Группа":"Grupo","Обложка":"Portada","Медиатека":"Biblioteca multimedia"},
  "it":{"Удалить":"Rimuovi","Изображение загружается…":"Caricamento immagine…","Главная":"Home","Материалы":"Articoli","Конструктор":"Editor","Авторы":"Autori","ИИ-редакция":"Redazione IA","Публикации":"Pubblicazioni","Согласование":"Revisione","Настройки":"Impostazioni","Сохранить":"Salva","На проверку":"Invia in revisione","Заголовок":"Titolo","Текст":"Testo","Группа":"Gruppo","Обложка":"Copertina","Медиатека":"Libreria multimediale"}
 };
 const normalize=(raw)=>{const s=String(raw||"").toLowerCase().replace("_","-");
  if(s==="pt"||s.startsWith("pt-"))return "pt-PT";
  const head=s.split("-")[0];return supported.includes(head)?head:null;
 };
 const preferenceKey="journal-studio-ui-locale-v1";
 let remembered=null;try{remembered=localStorage.getItem(preferenceKey)}catch{}
 const detected=(Array.isArray(navigator.languages)?navigator.languages:[navigator.language])
  .map(normalize).find(Boolean);
 let locale=supported.includes(remembered)?remembered:(detected||"en");
 let dictionary=fallback[locale]||{},requested=0,scheduled=false;
 const textOrigins=new WeakMap(),attributes=new WeakMap();
 const endpoint="https://npsfaymjckcqhtyiafms.supabase.co/functions/v1/studio-ui-i18n";
 const ignored=node=>{
  const el=node.nodeType===1?node:node.parentElement;
  return !el||!!el.closest("script,style,textarea,pre,code,[contenteditable],#studioUILanguage, "+
    "#preview .jp-body,#preview .jp-summary,#preview .jp-webarticle h2,#preview .jp-article-body h2,"+
    "#preview .jp-insta-caption,#preview figcaption");
 };
 function translateOne(source){
  if(locale==="ru")return source;
  const exact=dictionary[source]||fallback[locale]?.[source];
  if(exact)return exact;
  // Only compositional CMS chrome, never user-authored content.
  for(const prefix of ["Версия ","Сохранить версию: ","На проверку · ","Группа "," · На проверке: "]) {
   if(source.startsWith(prefix)) {
    const start=dictionary[prefix]||fallback[locale]?.[prefix];
    if(start)return start+source.slice(prefix.length);
    if(prefix==="Группа ")return (fallback[locale]?.["Группа"]||"Group")+" "+source.slice(prefix.length);
   }
  }
  return source;
 }
 function phrase(node){
  if(ignored(node))return;
  const current=node.nodeValue||"",trim=current.trim();
  if(!trim||!/[А-Яа-яЁё]/.test(trim)&&!textOrigins.has(node))return;
  let state=textOrigins.get(node);
  if(state&&trim!==state.value&&trim!==state.source)state=null;
  const source=state?.source||trim;
  const translated=translateOne(source);
  if(translated===source&&!state)return;
  const output=current.replace(trim,translated);
  if(current!==output)node.nodeValue=output;
  textOrigins.set(node,{source,value:translated});
 }
 const attrs=["placeholder","aria-label","title"];
 function attribute(element,key){
  if(ignored(element))return;
  const val=element.getAttribute(key);
  if(!val)return;
  let map=attributes.get(element);
  if(!map){map={};attributes.set(element,map)}
  let state=map[key];
  if(state&&val!==state.value&&val!==state.source)state=null;
  const source=state?.source||val;
  const translated=translateOne(source);
  if(val!==translated)element.setAttribute(key,translated);
  map[key]={source,value:translated};
 }
 function apply(){
  if(!document.body)return;
  document.documentElement.lang=locale;
  const sel=document.getElementById("studioUILanguage");
  if(sel)sel.value=locale;
  const lbl=document.getElementById("studioUILangLabel");
  if(lbl&&lbl.textContent!==(languageNames[locale]||"Language"))lbl.textContent=languageNames[locale]||"Language";
  const walk=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
  let textNode;while((textNode=walk.nextNode()))phrase(textNode);
  for(const el of document.querySelectorAll("[placeholder],[aria-label],[title]"))
   for(const key of attrs)if(el.hasAttribute(key))attribute(el,key);
 }
 function schedule(){
  if(scheduled)return;scheduled=true;
  setTimeout(()=>{scheduled=false;apply()},75);
 }
 async function load(target){
  const thisRequest=++requested;
  locale=target;document.documentElement.lang=target;
  dictionary=fallback[target]||{};
  schedule();
  if(target==="ru")return;
  try{
   const response=await fetch(endpoint+"?locale="+encodeURIComponent(target),{method:"GET",cache:"default"});
   if(!response.ok)throw Error("Translation dictionary unavailable: "+response.status);
   const result=await response.json();
   if(thisRequest!==requested||locale!==target)return;
   if(result.locale===target&&result.version===1&&result.translations&&typeof result.translations==="object"){
    dictionary={...result.translations,...(fallback[target]||{})};
    schedule();
   }
  }catch(error){console.warn("Journal Studio locale fallback",String(error))}
 }
 function choose(value){
  const mapped=normalize(value);
  if(!mapped)return;
  try{localStorage.setItem(preferenceKey,mapped)}catch{}
  void load(mapped);
 }
 const select=document.getElementById("studioUILanguage");
 if(select)select.addEventListener("change",e=>choose(e.target.value));
 const observer=new MutationObserver(events=>{
  // Avoid translating if mutations affect only ignored user content.
  if(events.some(x=>!ignored(x.target)))schedule();
 });
 observer.observe(document.body,{subtree:true,childList:true,characterData:true});
 window.StudioI18n={
  get locale(){return locale},
  t:translateOne,
  choose,
  applyNow:apply,
  supported:[...supported]
 };
 void load(locale);
})();
