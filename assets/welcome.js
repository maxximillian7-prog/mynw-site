/* Standalone welcome letter — no dependence on portfolio runtime or legal pages. */
(() => {
  'use strict';
  const L = {
    ru: {
      eyebrow:'Небольшое приветствие', heroA:'Пусть важное будет рядом.', heroB:'А день — немного легче.',
      lead:'Привет! Мы создали NowWhat, чтобы документы, заметки, планы и дела не требовали столько внимания. Одно спокойное пространство для того, что важно именно вам.',
      about:'Узнать о NowWhat', play:'Google Play', hint:'Если вы пришли из приложения, просто вернитесь к нему после знакомства.',
      visual:'Меньше суеты. Больше ясности.', letterTag:'От команды',
      letterTitle:'У хорошего помощника простая задача — облегчать день.',
      letterP1:'В NowWhat можно сохранять информацию, планировать дела, вести финансы и организовывать семейные вопросы. ИИ помогает разобраться и предлагает следующие шаги, а выбор всегда остаётся за вами.',
      letterP2:'Мы стараемся делать приложение понятным, полезным и ненавязчивым. Спасибо, что дали нам возможность стать частью вашего дня.',
      sign:'С теплом, команда MyNow Apps', ending:'Не нужно осваивать всё сразу. Начните с того, что важно вам сегодня.',
      site:'О приложении', privacy:'Конфиденциальность', support:'Связаться с нами', meta:'Знакомство с NowWhat: немного больше порядка, ясности и времени для важного.', title:'Добро пожаловать в NowWhat — MyNow Apps'
    },
    en: {
      eyebrow:'A little welcome note', heroA:'Keep what matters close.', heroB:'Let the day feel lighter.',
      lead:'Hello! We made NowWhat so documents, notes, plans and to-dos take less of your attention. One calm place for the things that matter to you.',
      about:'Discover NowWhat', play:'Google Play', hint:'If you came from the app, simply return to it when you’re ready.',
      visual:'Less busywork. More clarity.', letterTag:'From our team',
      letterTitle:'A good assistant has one simple job: make your day easier.',
      letterP1:'NowWhat brings saved information, tasks, finances and family plans together. AI helps you make sense of things and suggests useful next steps, while every choice stays yours.',
      letterP2:'We’re working to make it clear, useful and never intrusive. Thank you for letting us be a small part of your day.',
      sign:'Warmly, the MyNow Apps team', ending:'There’s no need to learn everything at once. Start with what matters today.',
      site:'About the app', privacy:'Privacy', support:'Get in touch', meta:'Meet NowWhat: a little more order, clarity and time for what matters.', title:'Welcome to NowWhat — MyNow Apps'
    },
    pt: {
      eyebrow:'Uma pequena mensagem de boas-vindas', heroA:'O que importa, sempre por perto.', heroB:'E o dia um pouco mais leve.',
      lead:'Olá! Criámos o NowWhat para que documentos, notas, planos e tarefas não exijam tanta atenção. Um espaço simples e tranquilo para o que é importante para si.',
      about:'Conhecer o NowWhat', play:'Google Play', hint:'Se veio da aplicação, basta regressar quando quiser.',
      visual:'Menos complicações. Mais clareza.', letterTag:'Da nossa equipa',
      letterTitle:'Um bom assistente tem uma missão simples: facilitar o dia.',
      letterP1:'O NowWhat reúne informações guardadas, tarefas, finanças e planos de família. A IA ajuda a compreender a informação e sugere próximos passos úteis, mas as decisões são sempre suas.',
      letterP2:'Trabalhamos para tornar a aplicação clara, útil e discreta. Obrigado por nos deixar fazer uma pequena parte do seu dia.',
      sign:'Com carinho, a equipa MyNow Apps', ending:'Não precisa de descobrir tudo de uma vez. Comece pelo que é importante hoje.',
      site:'Sobre a aplicação', privacy:'Privacidade', support:'Contactar-nos', meta:'Conheça o NowWhat: mais organização, clareza e tempo para o que importa.', title:'Boas-vindas ao NowWhat — MyNow Apps'
    },
    uk: {
      eyebrow:'Кілька слів на знайомство', heroA:'Нехай важливе буде поруч.', heroB:'А день — трохи легшим.',
      lead:'Вітаємо! Ми створили NowWhat, щоб документи, нотатки, плани й справи забирали менше уваги. Один спокійний простір для того, що важливе саме вам.',
      about:'Дізнатися про NowWhat', play:'Google Play', hint:'Якщо ви перейшли із застосунку, просто поверніться до нього після знайомства.',
      visual:'Менше метушні. Більше ясності.', letterTag:'Від команди',
      letterTitle:'У хорошого помічника просте завдання — полегшувати день.',
      letterP1:'У NowWhat можна зберігати інформацію, планувати справи, вести фінанси й організовувати сімейні плани. ШІ допомагає розібратися та підказує наступні кроки, а рішення завжди за вами.',
      letterP2:'Ми прагнемо зробити застосунок зрозумілим, корисним і ненав’язливим. Дякуємо, що дозволили нам стати маленькою частиною вашого дня.',
      sign:'З теплом, команда MyNow Apps', ending:'Не обов’язково опановувати все одразу. Почніть із того, що важливе сьогодні.',
      site:'Про застосунок', privacy:'Конфіденційність', support:'Зв’язатися з нами', meta:'Знайомство з NowWhat: більше порядку, ясності й часу для важливого.', title:'Ласкаво просимо до NowWhat — MyNow Apps'
    },
    fr: {
      eyebrow:'Un petit mot de bienvenue', heroA:'Gardez l’essentiel à portée de main.', heroB:'Et l’esprit un peu plus léger.',
      lead:'Bonjour ! Nous avons créé NowWhat pour que documents, notes, projets et tâches prennent moins de place dans votre esprit. Un espace simple et apaisant pour ce qui compte pour vous.',
      about:'Découvrir NowWhat', play:'Google Play', hint:'Si vous venez de l’application, vous pouvez simplement y retourner ensuite.',
      visual:'Moins de contraintes. Plus de clarté.', letterTag:'De notre équipe',
      letterTitle:'Un bon assistant a une mission simple : vous faciliter la journée.',
      letterP1:'NowWhat rassemble informations enregistrées, tâches, finances et projets familiaux. L’IA vous aide à y voir plus clair et suggère des étapes utiles, mais vous gardez toujours le choix.',
      letterP2:'Nous voulons une application claire, utile et discrète. Merci de nous laisser prendre une petite place dans votre quotidien.',
      sign:'Avec toute notre sympathie, l’équipe MyNow Apps', ending:'Pas besoin de tout découvrir d’un coup. Commencez par ce qui compte aujourd’hui.',
      site:'À propos', privacy:'Confidentialité', support:'Nous contacter', meta:'Découvrez NowWhat : plus d’ordre, de clarté et de temps pour l’essentiel.', title:'Bienvenue sur NowWhat — MyNow Apps'
    },
    es: {
      eyebrow:'Un pequeño mensaje de bienvenida', heroA:'Ten lo importante cerca.', heroB:'Y vive el día con más calma.',
      lead:'¡Hola! Creamos NowWhat para que los documentos, las notas, los planes y las tareas reclamen menos atención. Un espacio sencillo y tranquilo para lo que de verdad te importa.',
      about:'Conocer NowWhat', play:'Google Play', hint:'Si has llegado desde la aplicación, puedes volver a ella cuando quieras.',
      visual:'Menos complicaciones. Más claridad.', letterTag:'De nuestro equipo',
      letterTitle:'Un buen asistente tiene una misión sencilla: hacerte el día más fácil.',
      letterP1:'NowWhat reúne información guardada, tareas, finanzas y planes familiares. La IA ayuda a entenderlo todo y sugiere pasos útiles, pero las decisiones siempre son tuyas.',
      letterP2:'Trabajamos para que la aplicación sea clara, útil y discreta. Gracias por dejarnos formar una pequeña parte de tu día.',
      sign:'Con cariño, el equipo de MyNow Apps', ending:'No hace falta descubrirlo todo de una vez. Empieza por lo que importa hoy.',
      site:'Sobre la aplicación', privacy:'Privacidad', support:'Contactar', meta:'Conoce NowWhat: más orden, claridad y tiempo para lo que importa.', title:'Te damos la bienvenida a NowWhat — MyNow Apps'
    },
    de: {
      eyebrow:'Ein kleiner Willkommensgruß', heroA:'Das Wichtige bleibt in Reichweite.', heroB:'Und der Tag wird etwas leichter.',
      lead:'Hallo! Wir haben NowWhat entwickelt, damit Dokumente, Notizen, Pläne und Aufgaben weniger Aufmerksamkeit beanspruchen. Ein ruhiger, übersichtlicher Ort für das, was Ihnen wichtig ist.',
      about:'NowWhat kennenlernen', play:'Google Play', hint:'Wenn Sie aus der App hierhergekommen sind, können Sie danach einfach zurückkehren.',
      visual:'Weniger Aufwand. Mehr Klarheit.', letterTag:'Von unserem Team',
      letterTitle:'Ein guter Assistent hat eine einfache Aufgabe: den Alltag erleichtern.',
      letterP1:'NowWhat bringt gespeicherte Informationen, Aufgaben, Finanzen und Familienpläne zusammen. KI hilft beim Verstehen und schlägt hilfreiche nächste Schritte vor. Die Entscheidung bleibt immer bei Ihnen.',
      letterP2:'Wir möchten die App verständlich, nützlich und unaufdringlich gestalten. Danke, dass wir ein kleiner Teil Ihres Alltags sein dürfen.',
      sign:'Herzliche Grüße, das MyNow Apps Team', ending:'Sie müssen nicht alles auf einmal entdecken. Beginnen Sie mit dem, was heute wichtig ist.',
      site:'Über die App', privacy:'Datenschutz', support:'Kontakt', meta:'Lernen Sie NowWhat kennen: mehr Ordnung, Klarheit und Zeit für das Wesentliche.', title:'Willkommen bei NowWhat — MyNow Apps'
    },
    it: {
      eyebrow:'Un piccolo messaggio di benvenuto', heroA:'Tieni vicino ciò che conta.', heroB:'E rendi la giornata più leggera.',
      lead:'Ciao! Abbiamo creato NowWhat perché documenti, note, programmi e impegni richiedano meno attenzione. Uno spazio semplice e sereno per tutto ciò che è importante per te.',
      about:'Scopri NowWhat', play:'Google Play', hint:'Se arrivi dall’app, puoi semplicemente tornarci quando vuoi.',
      visual:'Meno complicazioni. Più chiarezza.', letterTag:'Dal nostro team',
      letterTitle:'Un buon assistente ha un compito semplice: rendere più facile la giornata.',
      letterP1:'NowWhat riunisce informazioni salvate, attività, finanze e programmi di famiglia. L’IA aiuta a fare chiarezza e suggerisce i prossimi passi utili, ma le decisioni restano sempre tue.',
      letterP2:'Lavoriamo per rendere l’app chiara, utile e discreta. Grazie per permetterci di far parte, anche solo un po’, delle tue giornate.',
      sign:'Con affetto, il team di MyNow Apps', ending:'Non serve scoprire tutto subito. Comincia da ciò che conta oggi.',
      site:'Informazioni sull’app', privacy:'Privacy', support:'Contattaci', meta:'Scopri NowWhat: più ordine, chiarezza e tempo per ciò che conta.', title:'Benvenuto in NowWhat — MyNow Apps'
    }
  };
  const LANGS=['en','pt','ru','uk','fr','es','de','it'];
  const select=document.getElementById('welcome-language');
  const preferred=()=>{
    const params=new URLSearchParams(location.search);
    const query=(params.get('lang')||'').toLowerCase().slice(0,2);
    if(LANGS.includes(query))return query;
    try{
      const saved=localStorage.getItem('mynw_lang')||localStorage.getItem('nw_lang');
      if(LANGS.includes(saved))return saved;
    }catch(_){}
    const browser=(navigator.language||'en').slice(0,2).toLowerCase();
    return LANGS.includes(browser)?browser:'en';
  };
  function setLanguage(code,fromUser=false){
    if(!LANGS.includes(code))code='en';
    const t=L[code];
    document.documentElement.lang=code;
    if(select)select.value=code;
    document.querySelectorAll('[data-i18n]').forEach(node=>{
      const value=t[node.dataset.i18n];
      if(typeof value==='string')node.textContent=value;
    });
    document.title=t.title;
    const meta=document.querySelector('meta[name="description"]');
    if(meta)meta.content=t.meta;
    const ogt=document.querySelector('meta[property="og:title"]');
    if(ogt)ogt.content=t.title;
    const ogd=document.querySelector('meta[property="og:description"]');
    if(ogd)ogd.content=t.meta;
    if(fromUser){
      try{
        localStorage.setItem('mynw_lang',code);
        localStorage.setItem('nw_lang',code);
      }catch(_){}
    }
  }
  if(select)select.addEventListener('change',()=>setLanguage(select.value,true));
  setLanguage(preferred());
})();
