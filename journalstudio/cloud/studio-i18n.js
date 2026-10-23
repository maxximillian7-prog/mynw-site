"use strict";
/* Journal Studio interface localization — zero per-page AI calls.
 * The 7 translated dictionaries are generated once server-side and cached.
 * Article drafts, previews, private messages and user-supplied values are never translated.
 */
(function(){
 const supported=["ru","en","pt-PT","uk","fr","de","es","it"];
 const languageNames={"ru":"Язык","en":"Language","pt-PT":"Idioma","uk":"Мова","fr":"Langue","de":"Sprache","es":"Idioma","it":"Lingua"};
 const fallback={
  "en":{"Обложка снята. Фото внутри статьи и в медиатеке сохранено.":"Cover removed. The photo remains in the article and media library.","Обложка статьи":"Article cover","Удалить":"Remove","Изображение загружается…":"Image loading…","Главная":"Home","Материалы":"Articles","Конструктор":"Editor","Авторы":"Authors","ИИ-редакция":"AI Editorial","Публикации":"Publishing","Согласование":"Review","Настройки":"Settings","Сохранить":"Save","На проверку":"Submit for review","Заголовок":"Heading","Текст":"Text","Группа":"Group","Обложка":"Cover","Медиатека":"Media library"},
  "pt-PT":{"Обложка снята. Фото внутри статьи и в медиатеке сохранено.":"Capa removida. A fotografia continua no artigo e na biblioteca multimédia.","Обложка статьи":"Capa do artigo","Удалить":"Remover","Изображение загружается…":"A carregar imagem…","Главная":"Início","Материалы":"Artigos","Конструктор":"Editor","Авторы":"Autores","ИИ-редакция":"Redação IA","Публикации":"Publicações","Согласование":"Revisão","Настройки":"Definições","Сохранить":"Guardar","На проверку":"Enviar para revisão","Заголовок":"Título","Текст":"Texto","Группа":"Grupo","Обложка":"Capa","Медиатека":"Biblioteca multimédia"},
  "uk":{"Обложка снята. Фото внутри статьи и в медиатеке сохранено.":"Обкладинку знято. Фото залишилося в статті та медіатеці.","Обложка статьи":"Обкладинка статті","Удалить":"Видалити","Изображение загружается…":"Зображення завантажується…","Главная":"Головна","Материалы":"Матеріали","Конструктор":"Конструктор","Авторы":"Автори","ИИ-редакция":"ШІ-редакція","Публикации":"Публікації","Согласование":"Погодження","Настройки":"Налаштування","Сохранить":"Зберегти","На проверку":"На перевірку","Заголовок":"Заголовок","Текст":"Текст","Группа":"Група","Обложка":"Обкладинка","Медиатека":"Медіатека"},
  "fr":{"Обложка снята. Фото внутри статьи и в медиатеке сохранено.":"Couverture retirée. La photo reste dans l’article et la médiathèque.","Обложка статьи":"Couverture de l’article","Удалить":"Retirer","Изображение загружается…":"Chargement de l’image…","Главная":"Accueil","Материалы":"Articles","Конструктор":"Éditeur","Авторы":"Auteurs","ИИ-редакция":"Rédaction IA","Публикации":"Publications","Согласование":"Validation","Настройки":"Paramètres","Сохранить":"Enregistrer","На проверку":"Soumettre","Заголовок":"Titre","Текст":"Texte","Группа":"Groupe","Обложка":"Couverture","Медиатека":"Médiathèque"},
  "de":{"Обложка снята. Фото внутри статьи и в медиатеке сохранено.":"Titelbild entfernt. Das Foto bleibt im Artikel und in der Medienbibliothek.","Обложка статьи":"Titelbild des Artikels","Удалить":"Entfernen","Изображение загружается…":"Bild wird geladen…","Главная":"Startseite","Материалы":"Artikel","Конструктор":"Editor","Авторы":"Autoren","ИИ-редакция":"KI-Redaktion","Публикации":"Veröffentlichungen","Согласование":"Freigabe","Настройки":"Einstellungen","Сохранить":"Speichern","На проверку":"Zur Prüfung","Заголовок":"Überschrift","Текст":"Text","Группа":"Gruppe","Обложка":"Titelbild","Медиатека":"Medienbibliothek"},
  "es":{"Обложка снята. Фото внутри статьи и в медиатеке сохранено.":"Portada retirada. La foto permanece en el artículo y en la biblioteca multimedia.","Обложка статьи":"Portada del artículo","Удалить":"Quitar","Изображение загружается…":"Cargando imagen…","Главная":"Inicio","Материалы":"Artículos","Конструктор":"Editor","Авторы":"Autores","ИИ-редакция":"Redacción IA","Публикации":"Publicaciones","Согласование":"Revisión","Настройки":"Configuración","Сохранить":"Guardar","На проверку":"Enviar a revisión","Заголовок":"Título","Текст":"Texto","Группа":"Grupo","Обложка":"Portada","Медиатека":"Biblioteca multimedia"},
  "it":{"Обложка снята. Фото внутри статьи и в медиатеке сохранено.":"Copertina rimossa. La foto resta nell’articolo e nella libreria multimediale.","Обложка статьи":"Copertina dell’articolo","Удалить":"Rimuovi","Изображение загружается…":"Caricamento immagine…","Главная":"Home","Материалы":"Articoli","Конструктор":"Editor","Авторы":"Autori","ИИ-редакция":"Redazione IA","Публикации":"Pubblicazioni","Согласование":"Revisione","Настройки":"Impostazioni","Сохранить":"Salva","На проверку":"Invia in revisione","Заголовок":"Titolo","Текст":"Testo","Группа":"Gruppo","Обложка":"Copertina","Медиатека":"Libreria multimediale"}
 };
 const topicLabels={
 "en":{"Темы журнала":"Journal topics","Создайте темы, назначьте изображения и распределяйте статьи по ним.":"Create topics, assign pictures and sort articles into them.","Название темы":"Topic title","Код темы (латиницей)":"Topic code (Latin letters)","Изображение темы":"Topic image","Без изображения":"No image","Название для PT (необязательно)":"Portuguese title (optional)","Загрузить медиатеку":"Load media library","Сохранить тему":"Save topic","Создать тему":"Create topic","Изменить":"Edit","Скрыть":"Hide","Показать":"Show","Отмена":"Cancel","Без темы":"No topic","Тема журнала":"Journal topic","Сохранить тему опубликованной статьи":"Save topic of published article","Язык введённого названия":"Language of original title","Предложить переводы на 8 языков (ИИ)":"Suggest translations in 8 languages (AI)","После генерации проверьте все названия. Непроверенные машинные переводы не следует публиковать.":"Review every suggested title. Do not publish unchecked machine translations.","Центр по горизонтали":"Horizontal focus","Центр по вертикали":"Vertical focus","Загрузить изображение темы (JPG, PNG, WebP, до 8 МБ)":"Upload topic image (JPG, PNG, WebP, up to 8 MB)","Автор / правообладатель":"Author / rights holder","Подтверждаю права на использование этого изображения":"I confirm the rights to use this image","Сохранить изображение в медиатеке":"Save image to media library","Квадрат 1:1 — так тема будет выглядеть в приложении.":"Square 1:1 – how the topic looks in the app.","Переводы названия темы для других языков":"Topic title translations into other languages","Картинка выбирается из одобренной медиатеки. Повторная загрузка не нужна.":"Choose from the approved media library. No reupload needed.","Тему можно создать на вкладке «Материалы». Изображение темы хранится отдельно от обложки статьи.":"Create topics in Articles. Topic images are separate from article covers."},
 "pt-PT":{"Темы журнала":"Temas da revista","Создайте темы, назначьте изображения и распределяйте статьи по ним.":"Crie temas, escolha imagens e organize os artigos.","Название темы":"Nome do tema","Код темы (латиницей)":"Código do tema (caracteres latinos)","Изображение темы":"Imagem do tema","Без изображения":"Sem imagem","Название для PT (необязательно)":"Título em português (opcional)","Загрузить медиатеку":"Carregar biblioteca de imagens","Сохранить тему":"Guardar tema","Создать тему":"Criar tema","Изменить":"Editar","Скрыть":"Ocultar","Показать":"Mostrar","Отмена":"Cancelar","Без темы":"Sem tema","Тема журнала":"Tema da revista","Сохранить тему опубликованной статьи":"Guardar tema do artigo publicado","Язык введённого названия":"Idioma do título original","Предложить переводы на 8 языков (ИИ)":"Sugerir traduções em 8 idiomas (IA)","После генерации проверьте все названия. Непроверенные машинные переводы не следует публиковать.":"Reveja todos os títulos sugeridos. Não publique traduções automáticas sem revisão.","Центр по горизонтали":"Centro horizontal","Центр по вертикали":"Centro vertical","Загрузить изображение темы (JPG, PNG, WebP, до 8 МБ)":"Carregar imagem do tema (JPG, PNG, WebP, até 8 MB)","Автор / правообладатель":"Autor / titular dos direitos","Подтверждаю права на использование этого изображения":"Confirmo que tenho direito de utilizar esta imagem","Сохранить изображение в медиатеке":"Guardar imagem na biblioteca","Квадрат 1:1 — так тема будет выглядеть в приложении.":"Quadrado 1:1 – como o tema aparece na aplicação.","Переводы названия темы для других языков":"Traduções do tema para outros idiomas","Картинка выбирается из одобренной медиатеки. Повторная загрузка не нужна.":"Escolha da biblioteca aprovada. Não precisa de carregar novamente.","Тему можно создать на вкладке «Материалы». Изображение темы хранится отдельно от обложки статьи.":"Crie temas em Artigos. As imagens dos temas são separadas das capas."},
 "uk":{"Темы журнала":"Теми журналу","Создайте темы, назначьте изображения и распределяйте статьи по ним.":"Створюйте теми, додавайте зображення й розподіляйте статті.","Название темы":"Назва теми","Код темы (латиницей)":"Код теми (латиницею)","Изображение темы":"Зображення теми","Без изображения":"Без зображення","Название для PT (необязательно)":"Назва португальською (необов’язково)","Загрузить медиатеку":"Завантажити медіатеку","Сохранить тему":"Зберегти тему","Создать тему":"Створити тему","Изменить":"Змінити","Скрыть":"Приховати","Показать":"Показати","Отмена":"Скасувати","Без темы":"Без теми","Тема журнала":"Тема журналу","Сохранить тему опубликованной статьи":"Зберегти тему опублікованої статті","Язык введённого названия":"Мова початкової назви","Предложить переводы на 8 языков (ИИ)":"Запропонувати переклади на 8 мов (ШІ)","После генерации проверьте все названия. Непроверенные машинные переводы не следует публиковать.":"Перевірте всі назви після генерації. Не публікуйте неперевірені переклади.","Центр по горизонтали":"Центр по горизонталі","Центр по вертикали":"Центр по вертикалі","Загрузить изображение темы (JPG, PNG, WebP, до 8 МБ)":"Завантажити зображення теми (JPG, PNG, WebP, до 8 МБ)","Автор / правообладатель":"Автор / правовласник","Подтверждаю права на использование этого изображения":"Підтверджую право використовувати це зображення","Сохранить изображение в медиатеке":"Зберегти зображення в медіатеці","Квадрат 1:1 — так тема будет выглядеть в приложении.":"Квадрат 1:1 — так тема виглядатиме в застосунку.","Переводы названия темы для других языков":"Переклади назви теми іншими мовами","Картинка выбирается из одобренной медиатеки. Повторная загрузка не нужна.":"Оберіть із затвердженої медіатеки. Завантажувати повторно не потрібно.","Тему можно создать на вкладке «Материалы». Изображение темы хранится отдельно от обложки статьи.":"Створюйте теми у «Матеріалах». Зображення теми зберігається окремо."},
 "fr":{"Темы журнала":"Thèmes du journal","Создайте темы, назначьте изображения и распределяйте статьи по ним.":"Créez des thèmes, attribuez des images et classez vos articles.","Название темы":"Titre du thème","Код темы (латиницей)":"Code du thème (lettres latines)","Изображение темы":"Image du thème","Без изображения":"Sans image","Название для PT (необязательно)":"Titre portugais (facultatif)","Загрузить медиатеку":"Charger la médiathèque","Сохранить тему":"Enregistrer le thème","Создать тему":"Créer un thème","Изменить":"Modifier","Скрыть":"Masquer","Показать":"Afficher","Отмена":"Annuler","Без темы":"Sans thème","Тема журнала":"Thème du journal","Сохранить тему опубликованной статьи":"Enregistrer le thème de l'article publié","Язык введённого названия":"Langue du titre d'origine","Предложить переводы на 8 языков (ИИ)":"Proposer des traductions en 8 langues (IA)","После генерации проверьте все названия. Непроверенные машинные переводы не следует публиковать.":"Vérifiez tous les titres proposés. Ne publiez pas de traductions automatiques non validées.","Центр по горизонтали":"Centre horizontal","Центр по вертикали":"Centre vertical","Загрузить изображение темы (JPG, PNG, WebP, до 8 МБ)":"Téléverser l'image du thème (JPG, PNG, WebP, 8 Mo max.)","Автор / правообладатель":"Auteur / titulaire des droits","Подтверждаю права на использование этого изображения":"Je confirme détenir le droit d'utiliser cette image","Сохранить изображение в медиатеке":"Enregistrer l'image dans la médiathèque","Квадрат 1:1 — так тема будет выглядеть в приложении.":"Carré 1:1 : aperçu du thème dans l'application.","Переводы названия темы для других языков":"Traductions du titre du thème","Картинка выбирается из одобренной медиатеки. Повторная загрузка не нужна.":"Choisissez dans la médiathèque validée. Aucun nouvel envoi nécessaire.","Тему можно создать на вкладке «Материалы». Изображение темы хранится отдельно от обложки статьи.":"Créez les thèmes dans Articles. L'image du thème est distincte de la couverture."},
 "de":{"Темы журнала":"Journal-Themen","Создайте темы, назначьте изображения и распределяйте статьи по ним.":"Erstelle Themen, wähle Bilder und ordne Artikel zu.","Название темы":"Thementitel","Код темы (латиницей)":"Themencode (lateinische Buchstaben)","Изображение темы":"Themenbild","Без изображения":"Ohne Bild","Название для PT (необязательно)":"Portugiesischer Titel (optional)","Загрузить медиатеку":"Medienbibliothek laden","Сохранить тему":"Thema speichern","Создать тему":"Thema erstellen","Изменить":"Bearbeiten","Скрыть":"Ausblenden","Показать":"Anzeigen","Отмена":"Abbrechen","Без темы":"Ohne Thema","Тема журнала":"Journal-Thema","Сохранить тему опубликованной статьи":"Thema des veröffentlichten Artikels speichern","Язык введённого названия":"Sprache des ursprünglichen Titels","Предложить переводы на 8 языков (ИИ)":"Übersetzungen in 8 Sprachen vorschlagen (KI)","После генерации проверьте все названия. Непроверенные машинные переводы не следует публиковать.":"Prüfe alle vorgeschlagenen Titel. Ungeprüfte KI-Übersetzungen nicht veröffentlichen.","Центр по горизонтали":"Horizontaler Fokus","Центр по вертикали":"Vertikaler Fokus","Загрузить изображение темы (JPG, PNG, WebP, до 8 МБ)":"Themenbild hochladen (JPG, PNG, WebP, max. 8 MB)","Автор / правообладатель":"Urheber / Rechteinhaber","Подтверждаю права на использование этого изображения":"Ich bestätige die Nutzungsrechte an diesem Bild","Сохранить изображение в медиатеке":"Bild in der Medienbibliothek speichern","Квадрат 1:1 — так тема будет выглядеть в приложении.":"Quadrat 1:1 – so erscheint das Thema in der App.","Переводы названия темы для других языков":"Übersetzungen des Thementitels","Картинка выбирается из одобренной медиатеки. Повторная загрузка не нужна.":"Wähle aus der freigegebenen Medienbibliothek. Kein neuer Upload nötig.","Тему можно создать на вкладке «Материалы». Изображение темы хранится отдельно от обложки статьи.":"Erstelle Themen unter Artikel. Themenbilder sind von Artikel-Titelbildern getrennt."},
 "es":{"Темы журнала":"Temas de la revista","Создайте темы, назначьте изображения и распределяйте статьи по ним.":"Crea temas, elige imágenes y organiza los artículos.","Название темы":"Título del tema","Код темы (латиницей)":"Código del tema (letras latinas)","Изображение темы":"Imagen del tema","Без изображения":"Sin imagen","Название для PT (необязательно)":"Título en portugués (opcional)","Загрузить медиатеку":"Cargar biblioteca multimedia","Сохранить тему":"Guardar tema","Создать тему":"Crear tema","Изменить":"Editar","Скрыть":"Ocultar","Показать":"Mostrar","Отмена":"Cancelar","Без темы":"Sin tema","Тема журнала":"Tema de la revista","Сохранить тему опубликованной статьи":"Guardar tema del artículo publicado","Язык введённого названия":"Idioma del título original","Предложить переводы на 8 языков (ИИ)":"Proponer traducciones a 8 idiomas (IA)","После генерации проверьте все названия. Непроверенные машинные переводы не следует публиковать.":"Revisa cada título sugerido. No publiques traducciones automáticas sin revisar.","Центр по горизонтали":"Centro horizontal","Центр по вертикали":"Centro vertical","Загрузить изображение темы (JPG, PNG, WebP, до 8 МБ)":"Subir imagen del tema (JPG, PNG, WebP, hasta 8 MB)","Автор / правообладатель":"Autor / titular de los derechos","Подтверждаю права на использование этого изображения":"Confirmo que tengo derecho a usar esta imagen","Сохранить изображение в медиатеке":"Guardar imagen en la biblioteca","Квадрат 1:1 — так тема будет выглядеть в приложении.":"Cuadrado 1:1: así se verá el tema en la aplicación.","Переводы названия темы для других языков":"Traducciones del título del tema","Картинка выбирается из одобренной медиатеки. Повторная загрузка не нужна.":"Elige de la biblioteca aprobada. No hace falta volver a subirla.","Тему можно создать на вкладке «Материалы». Изображение темы хранится отдельно от обложки статьи.":"Crea temas en Artículos. Sus imágenes son independientes de las portadas."},
 "it":{"Темы журнала":"Temi della rivista","Создайте темы, назначьте изображения и распределяйте статьи по ним.":"Crea temi, assegna immagini e organizza gli articoli.","Название темы":"Titolo del tema","Код темы (латиницей)":"Codice del tema (caratteri latini)","Изображение темы":"Immagine del tema","Без изображения":"Senza immagine","Название для PT (необязательно)":"Titolo in portoghese (facoltativo)","Загрузить медиатеку":"Carica libreria multimediale","Сохранить тему":"Salva tema","Создать тему":"Crea tema","Изменить":"Modifica","Скрыть":"Nascondi","Показать":"Mostra","Отмена":"Annulla","Без темы":"Senza tema","Тема журнала":"Tema della rivista","Сохранить тему опубликованной статьи":"Salva il tema dell'articolo pubblicato","Язык введённого названия":"Lingua del titolo originale","Предложить переводы на 8 языков (ИИ)":"Suggerisci traduzioni in 8 lingue (IA)","После генерации проверьте все названия. Непроверенные машинные переводы не следует публиковать.":"Controlla tutti i titoli. Non pubblicare traduzioni automatiche non verificate.","Центр по горизонтали":"Centro orizzontale","Центр по вертикали":"Centro verticale","Загрузить изображение темы (JPG, PNG, WebP, до 8 МБ)":"Carica immagine del tema (JPG, PNG, WebP, max 8 MB)","Автор / правообладатель":"Autore / titolare dei diritti","Подтверждаю права на использование этого изображения":"Confermo di avere il diritto di usare questa immagine","Сохранить изображение в медиатеке":"Salva l'immagine nella libreria","Квадрат 1:1 — так тема будет выглядеть в приложении.":"Quadrato 1:1: così apparirà il tema nell'app.","Переводы названия темы для других языков":"Traduzioni del titolo del tema","Картинка выбирается из одобренной медиатеки. Повторная загрузка не нужна.":"Scegli dalla libreria approvata. Non serve caricarla di nuovo.","Тему можно создать на вкладке «Материалы». Изображение темы хранится отдельно от обложки статьи.":"Crea i temi in Articoli. Le immagini dei temi sono separate dalle copertine."}
 };
 for(const [language, labels] of Object.entries(topicLabels)){
  Object.assign(fallback[language]||{},labels);
 }
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
