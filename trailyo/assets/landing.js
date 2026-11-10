
(() => {
  'use strict';
  const translations = {
    en: {
      heroMain:'Discover your next experience',heroAccent:'in Portugal',poster1Category:'Concerts',poster1Tagline:'An evening of vivid emotions',poster2Category:'Art',poster2Tagline:'Another point of view',poster3Category:'Nature',poster3Tagline:'Find your horizon',poster4Category:'Meetups',poster4Tagline:'Taste the city',
      metaTitle: 'Trailyo — Discover Portugal, your way | MyNow Apps',
      metaDesc: 'Meet Trailyo, a new mobile app for discovering events, local experiences, communities and hidden corners of Portugal. Explore features and find out how it works.',
      navAllApps:'← All apps',navFeatures:'Features',navPreview:'App preview',navPosters:'Inspiration',navHow:'How it works',navPartners:'Partners',navDownload:'Get the app',
      heroKicker:'YOUR CITY. YOUR NEXT STORY.',heroA:'More life.',heroB:'More places.',heroC:'More',heroD:'moments.',heroText:'Meet Trailyo — a multilingual mobile app that brings events, local experiences, communities and hidden corners of Portugal together in one place.',heroBtn:'Explore the app',heroAlt:'See the highlights',heroNote:'Discover in Portugal · English, Русский, Português',
      floatingA:'Places worth exploring',floatingB:'Find your people',phoneExplore:'Explore',phoneLocation:'Portugal',phoneToday:'For you',phoneSee:'More',phoneEventA:'Sunset Sessions',phoneEventB:'Art after dark',phoneEventC:'City stories',phoneEventD:'Local flavours',
      strapA:'Events & culture',strapB:'Unique experiences',strapC:'Communities',strapD:'City discoveries',
      featuresKicker:'ONE APP. MANY POSSIBILITIES.',featuresTitle:'Everything around you, made easier to discover.',featuresIntro:'Trailyo is designed for people who want to spend less time searching and more time experiencing.',
      f1Title:'Events that match you',f1Body:'Explore concerts, exhibitions, markets and cultural activities by location, date and interests.',
      f2Title:'Experiences & tours',f2Body:'Find things to do and continue to the original provider to check availability and booking details.',
      f3Title:'Discover on the map',f3Body:'See places and activities geographically, and make exploring new areas feel intuitive.',
      f4Title:'Find your community',f4Body:'Connect around shared interests, explore groups and plan activities with others.',
      f5Title:'Save what inspires',f5Body:'Keep interesting events, communities and ideas in one personal place to return to later.',
      f6Title:'A city beyond the obvious',f6Body:'Explore local highlights, useful tips and lesser-known places worth discovering.',
      featuresNote:'Features and availability may evolve during testing.',
      showcaseKicker:'MADE FOR EXPLORATION',showcaseTitle:'One destination for every kind of day.',showcaseText:'From a quiet museum afternoon to a spontaneous weekend outside the city, Trailyo helps you discover possibilities that feel like yours.',
      s1:'Browse your city and nearby areas',s2:'Filter by date and interests',s3:'View event details and original sources',s4:'Save favourites and discover communities',showcaseMap:'Discover on the map',showcaseMapSub:'Explore places around you',showcaseCommunity:'Your communities',showcaseCommunitySub:'People with shared interests',
      posterKicker:'A FEEL FOR WHAT AWAITS',posterTitle:'A little inspiration for your next adventure.',posterIntro:'A creative glimpse of the atmosphere, culture and experiences Trailyo is built to help you discover.',
      poster1a:'Music & nightlife',poster1b:'SUNSET SESSIONS',poster1c:'An evening in colour',
      poster2a:'Art & culture',poster2b:'LUMEN / ART',poster2c:'A different perspective',
      poster3a:'Nature & coast',poster3b:'ATLANTIC WILD',poster3c:'Find your horizon',
      poster4a:'Food & discovery',poster4b:'NIGHT MARKET',poster4c:'Taste the city',
      posterDisclaimer:'These posters are original illustrative concepts for the Trailyo website — not real or bookable events.',
      stepsKicker:'SIMPLE BY DESIGN',stepsTitle:'From “What should we do?” to “Let’s go.”',
      step1Title:'Choose your place',step1Body:'Select a city or explore the map to see what is around you.',
      step2Title:'Follow your interests',step2Body:'Discover activities, groups and experiences that fit your plans.',
      step3Title:'Make it a real day out',step3Body:'Save a favourite, share an idea or continue to the organiser’s official page.',
      partnerKicker:'LET’S WORK TOGETHER',partnerTitle:'Your next audience is already looking for an experience.',partnerBody:'Trailyo is built to connect explorers with local culture and trusted experience providers. We welcome conversations with organisers, cultural organisations and affiliate/API partners.',partnerBtn:'Discuss a partnership',
      partner1:'Clear source attribution',partner2:'Links to original booking providers',partner3:'Multilingual discovery experience',partner4:'A mobile-first product for Portugal',
      downloadKicker:'YOUR NEXT STORY STARTS HERE',downloadTitle:'A whole world of “what’s next” in your pocket.',downloadBody:'Trailyo is available for iPhone on the App Store. On a computer, scan the QR code; on iPhone, tap the download button.',appStore:'App Store',googlePlay:'Google Play',availableSoon:'Coming soon',downloadNote:'Available now for iPhone. Google Play is coming soon.',iosDownloadBtn:'Download on the App Store',downloadOnThe:'Download on the',scanToInstall:'Scan with your iPhone to download Trailyo',helpLink:'See the app guide',
      footerIntro:'Discover experiences, places and people across Portugal.',footerExplore:'Explore',footerResources:'Resources',footerContact:'Get in touch',privacy:'Privacy',terms:'Terms',safety:'Community rules',support:'Support',data:'Data rights',delete:'Delete account',guide:'App guide',footerCopyright:'© 2026 MyNow Apps. Trailyo is a discovery platform, not a ticket seller.',footerExample:'Creative posters on this page are fictional demonstrations.',
      menuLabel:'Open menu',langLabel:'Website language'
    },
    ru: {
      heroMain:'Откройте новые впечатления',heroAccent:'в Португалии',poster1Category:'Концерты',poster1Tagline:'Вечер ярких эмоций',poster2Category:'Арт',poster2Tagline:'Другой взгляд',poster3Category:'Природа',poster3Tagline:'Найди свой горизонт',poster4Category:'Встречи',poster4Tagline:'Попробуй город на вкус',
      metaTitle:'Trailyo — Открывайте Португалию по-своему | MyNow Apps',
      metaDesc:'Trailyo — мобильное приложение для поиска событий, экскурсий, сообществ и интересных мест Португалии. Узнайте о возможностях приложения.',
      navAllApps:'← Все приложения',navFeatures:'Возможности',navPreview:'Приложение',navPosters:'Вдохновение',navHow:'Как работает',navPartners:'Партнёрам',navDownload:'Скачать',
      heroKicker:'ВАШ ГОРОД. ВАША НОВАЯ ИСТОРИЯ.',heroA:'Больше жизни.',heroB:'Больше мест.',heroC:'Больше',heroD:'впечатлений.',heroText:'Trailyo — многоязычное мобильное приложение, объединяющее события, развлечения, сообщества и интересные уголки Португалии в одном месте.',heroBtn:'О приложении',heroAlt:'Что внутри',heroNote:'Португалия · English, Русский, Português',
      floatingA:'Места, которые стоит открыть',floatingB:'Люди с общими интересами',phoneExplore:'События',phoneLocation:'Португалия',phoneToday:'Для вас',phoneSee:'Ещё',phoneEventA:'Музыка на закате',phoneEventB:'Ночь искусства',phoneEventC:'Городские истории',phoneEventD:'Вкусы города',
      strapA:'События и культура',strapB:'Новые впечатления',strapC:'Сообщества',strapD:'Открывайте города',
      featuresKicker:'ОДНО ПРИЛОЖЕНИЕ. МНОГО ВОЗМОЖНОСТЕЙ.',featuresTitle:'Всё интересное вокруг — находить проще.',featuresIntro:'Trailyo помогает меньше времени тратить на поиски и больше — на реальные впечатления.',
      f1Title:'События под ваши интересы',f1Body:'Концерты, выставки, рынки и культурные мероприятия с выбором города, даты и интересов.',
      f2Title:'Экскурсии и развлечения',f2Body:'Находите интересные занятия и переходите к организатору для проверки наличия мест и бронирования.',
      f3Title:'Открытия на карте',f3Body:'Исследуйте места и мероприятия прямо на карте и легко ориентируйтесь в новых районах.',
      f4Title:'Свои сообщества',f4Body:'Находите людей с общими интересами, вступайте в сообщества и планируйте совместный досуг.',
      f5Title:'Сохраняйте интересное',f5Body:'Собирайте понравившиеся события, сообщества и идеи в личной подборке.',
      f6Title:'Неочевидный город',f6Body:'Открывайте местные особенности, полезные советы и интересные места вдали от привычных маршрутов.',
      featuresNote:'Возможности и доступность функций могут изменяться во время тестирования.',
      showcaseKicker:'СОЗДАНО ДЛЯ ОТКРЫТИЙ',showcaseTitle:'Все идеи для отдыха — в одном приложении.',showcaseText:'Музей в спокойный день или спонтанная поездка на выходных — Trailyo помогает найти то, что подходит именно вам.',
      s1:'Выбирайте город и окрестности',s2:'Фильтруйте по датам и интересам',s3:'Смотрите детали и первоисточники',s4:'Сохраняйте избранное и находите сообщества',showcaseMap:'События на карте',showcaseMapSub:'Исследуйте места рядом',showcaseCommunity:'Ваши сообщества',showcaseCommunitySub:'Люди с общими интересами',
      posterKicker:'ВДОХНОВЕНИЕ НА КАЖДЫЙ ДЕНЬ',posterTitle:'Немного вдохновения для новых приключений.',posterIntro:'Визуальный образ атмосферы, культуры и впечатлений, которые можно искать с Trailyo.',
      poster1a:'Музыка и вечеринки',poster1b:'МУЗЫКА ЗАКАТА',poster1c:'Вечер ярких эмоций',
      poster2a:'Искусство и культура',poster2b:'LUMEN / АРТ',poster2c:'Другой взгляд',
      poster3a:'Природа и океан',poster3b:'ДИКИЙ АТЛАНТИК',poster3c:'Найти свой горизонт',
      poster4a:'Еда и открытия',poster4b:'НОЧНОЙ МАРКЕТ',poster4c:'Попробуйте город на вкус',
      posterDisclaimer:'Все афиши на этой странице — оригинальные вымышленные примеры оформления, а не реальные мероприятия или билеты.',
      stepsKicker:'ПРОСТО И ПОНЯТНО',stepsTitle:'От «Чем заняться?» до «Поехали!»',
      step1Title:'Выберите место',step1Body:'Укажите город или откройте карту, чтобы узнать, что интересного вокруг.',
      step2Title:'Найдите своё',step2Body:'Ищите мероприятия, сообщества и впечатления под ваши планы и интересы.',
      step3Title:'Отправляйтесь навстречу впечатлениям',step3Body:'Сохраните событие, поделитесь идеей или перейдите на сайт организатора.',
      partnerKicker:'ДАВАЙТЕ СОТРУДНИЧАТЬ',partnerTitle:'Ваша аудитория уже ищет новые впечатления.',partnerBody:'Trailyo соединяет любителей путешествий и досуга с культурными организациями и партнёрами. Мы открыты к сотрудничеству с организаторами и поставщиками API и партнёрских программ.',partnerBtn:'Обсудить сотрудничество',
      partner1:'Указание первоисточника',partner2:'Переходы на сайты бронирования',partner3:'Поиск на нескольких языках',partner4:'Мобильный сервис для Португалии',
      downloadKicker:'ВАША СЛЕДУЮЩАЯ ИСТОРИЯ',downloadTitle:'Целый мир интересных планов — в кармане.',downloadBody:'Trailyo уже доступен для iPhone в App Store. На компьютере отсканируйте QR-код, на iPhone нажмите кнопку загрузки.',appStore:'App Store',googlePlay:'Google Play',availableSoon:'Скоро',downloadNote:'Уже доступно для iPhone. Версия для Google Play скоро появится.',iosDownloadBtn:'Скачать в App Store',downloadOnThe:'Загрузить в',scanToInstall:'Наведите камеру iPhone, чтобы скачать Trailyo',helpLink:'Инструкция по приложению',
      footerIntro:'Впечатления, места и люди по всей Португалии.',footerExplore:'Разделы',footerResources:'Информация',footerContact:'Связаться',privacy:'Конфиденциальность',terms:'Условия',safety:'Правила сообществ',support:'Поддержка',data:'Права на данные',delete:'Удалить аккаунт',guide:'Инструкция',footerCopyright:'© 2026 MyNow Apps. Trailyo помогает находить события, но не продаёт билеты.',footerExample:'Афиши на сайте — вымышленные иллюстрации.',
      menuLabel:'Открыть меню',langLabel:'Язык сайта'
    },
    pt: {
      heroMain:'Descubra a sua próxima experiência',heroAccent:'em Portugal',poster1Category:'Concertos',poster1Tagline:'Uma noite cheia de emoções',poster2Category:'Arte',poster2Tagline:'Um novo olhar',poster3Category:'Natureza',poster3Tagline:'Encontre o seu horizonte',poster4Category:'Encontros',poster4Tagline:'Saboreie a cidade',
      metaTitle:'Trailyo — Descubra Portugal à sua maneira | MyNow Apps',
      metaDesc:'Conheça o Trailyo, uma aplicação para descobrir eventos, experiências, comunidades e recantos de Portugal. Explore as funcionalidades da aplicação.',
      navAllApps:'← Todas as aplicações',navFeatures:'Funcionalidades',navPreview:'A aplicação',navPosters:'Inspiração',navHow:'Como funciona',navPartners:'Parceiros',navDownload:'Obter a app',
      heroKicker:'A SUA CIDADE. A SUA PRÓXIMA HISTÓRIA.',heroA:'Mais vida.',heroB:'Mais lugares.',heroC:'Mais',heroD:'momentos.',heroText:'O Trailyo é uma aplicação móvel multilingue que reúne eventos, experiências locais, comunidades e recantos de Portugal num só lugar.',heroBtn:'Conhecer a app',heroAlt:'Ver destaques',heroNote:'Portugal · English, Русский, Português',
      floatingA:'Lugares por descobrir',floatingB:'Pessoas com os seus interesses',phoneExplore:'Explorar',phoneLocation:'Portugal',phoneToday:'Para si',phoneSee:'Ver mais',phoneEventA:'Música ao pôr do sol',phoneEventB:'Arte à noite',phoneEventC:'Histórias da cidade',phoneEventD:'Sabores locais',
      strapA:'Eventos e cultura',strapB:'Experiências únicas',strapC:'Comunidades',strapD:'Descobrir cidades',
      featuresKicker:'UMA APP. MUITAS POSSIBILIDADES.',featuresTitle:'Descobrir o que se passa à sua volta ficou mais fácil.',featuresIntro:'O Trailyo foi pensado para passar menos tempo à procura e mais tempo a viver experiências.',
      f1Title:'Eventos à sua medida',f1Body:'Explore concertos, exposições, mercados e atividades culturais por localidade, data e interesses.',
      f2Title:'Experiências e visitas',f2Body:'Descubra o que fazer e aceda ao parceiro original para confirmar disponibilidade e reservas.',
      f3Title:'Descobrir no mapa',f3Body:'Veja locais e atividades no mapa e explore novas zonas de forma intuitiva.',
      f4Title:'Encontre a sua comunidade',f4Body:'Ligue-se a pessoas com interesses comuns, explore grupos e combine atividades.',
      f5Title:'Guarde o que lhe interessa',f5Body:'Reúna eventos, comunidades e ideias favoritas num espaço pessoal para consultar mais tarde.',
      f6Title:'Para além do óbvio',f6Body:'Descubra sugestões locais, dicas úteis e locais menos conhecidos que merecem uma visita.',
      featuresNote:'As funcionalidades e a disponibilidade podem evoluir durante os testes.',
      showcaseKicker:'FEITA PARA EXPLORAR',showcaseTitle:'Um só lugar para todos os seus planos.',showcaseText:'Uma tarde tranquila no museu ou um fim de semana espontâneo fora da cidade: o Trailyo ajuda a descobrir possibilidades à sua maneira.',
      s1:'Explore cidades e arredores',s2:'Filtre por datas e interesses',s3:'Consulte detalhes e fontes originais',s4:'Guarde favoritos e descubra comunidades',showcaseMap:'Descobrir no mapa',showcaseMapSub:'Explore os locais à sua volta',showcaseCommunity:'As suas comunidades',showcaseCommunitySub:'Pessoas com interesses comuns',
      posterKicker:'INSPIRAÇÃO PARA A PRÓXIMA AVENTURA',posterTitle:'Um pouco de inspiração para sair da rotina.',posterIntro:'Uma amostra criativa do ambiente, da cultura e das experiências que o Trailyo ajuda a descobrir.',
      poster1a:'Música e vida noturna',poster1b:'SUNSET SESSIONS',poster1c:'Uma noite cheia de cor',
      poster2a:'Arte e cultura',poster2b:'LUMEN / ARTE',poster2c:'Uma nova perspetiva',
      poster3a:'Natureza e costa',poster3b:'ATLÂNTICO LIVRE',poster3c:'Encontre o seu horizonte',
      poster4a:'Gastronomia e descoberta',poster4b:'MERCADO NOTURNO',poster4c:'Saboreie a cidade',
      posterDisclaimer:'Estes cartazes são conceitos ilustrativos originais para o site Trailyo — não são eventos reais nem reserváveis.',
      stepsKicker:'SIMPLES E INTUITIVO',stepsTitle:'De «O que vamos fazer?» a «Vamos!»',
      step1Title:'Escolha o local',step1Body:'Escolha uma cidade ou explore o mapa para descobrir o que existe por perto.',
      step2Title:'Siga os seus interesses',step2Body:'Encontre atividades, grupos e experiências de acordo com os seus planos.',
      step3Title:'Viva a experiência',step3Body:'Guarde um favorito, partilhe uma ideia ou visite a página oficial do organizador.',
      partnerKicker:'VAMOS COLABORAR',partnerTitle:'O seu próximo público já procura novas experiências.',partnerBody:'O Trailyo liga exploradores à cultura local e a fornecedores de experiências. Estamos disponíveis para colaborar com organizadores, entidades culturais e parceiros de afiliação/API.',partnerBtn:'Falar sobre parceria',
      partner1:'Atribuição clara às fontes',partner2:'Ligações aos fornecedores de reservas',partner3:'Experiência de descoberta multilingue',partner4:'Produto mobile-first para Portugal',
      downloadKicker:'A SUA PRÓXIMA HISTÓRIA COMEÇA AQUI',downloadTitle:'Um mundo de possibilidades no seu bolso.',downloadBody:'O Trailyo já está disponível para iPhone na App Store. No computador, leia o código QR; no iPhone, toque no botão para descarregar.',appStore:'App Store',googlePlay:'Google Play',availableSoon:'Brevemente',downloadNote:'Já disponível para iPhone. Em breve no Google Play.',iosDownloadBtn:'Descarregar na App Store',downloadOnThe:'Descarregar na',scanToInstall:'Leia com a câmara do iPhone para descarregar o Trailyo',helpLink:'Consultar o manual',
      footerIntro:'Experiências, lugares e pessoas por todo o Portugal.',footerExplore:'Explorar',footerResources:'Informações',footerContact:'Contactos',privacy:'Privacidade',terms:'Termos',safety:'Regras da comunidade',support:'Apoio',data:'Direitos sobre os dados',delete:'Eliminar conta',guide:'Manual',footerCopyright:'© 2026 MyNow Apps. O Trailyo é uma plataforma de descoberta, não vende bilhetes.',footerExample:'Os cartazes deste site são demonstrações fictícias.',
      menuLabel:'Abrir menu',langLabel:'Idioma do site'
    }
  };
  const supported=['en','ru','pt'];
  const qs=new URLSearchParams(window.location.search);
  const requested=qs.get('lang');
  let stored='';
  try{stored=localStorage.getItem('trailyo_site_lang')||'';}catch(_){}
  const browser=(navigator.language||'en').slice(0,2).toLowerCase();
  const initial=supported.includes(requested)?requested:supported.includes(stored)?stored:supported.includes(browser)?browser:'en';
  function setLanguage(lang,updateUrl){
    const code=supported.includes(lang)?lang:'en';
    const dict=translations[code];
    document.documentElement.lang=code;
    document.title=dict.metaTitle;
    const meta=document.querySelector('meta[name="description"]');
    if(meta)meta.setAttribute('content',dict.metaDesc);
    document.querySelectorAll('[data-t]').forEach(el=>{
      const key=el.getAttribute('data-t');
      if(Object.prototype.hasOwnProperty.call(dict,key))el.textContent=dict[key];
    });
    document.querySelectorAll('[data-lang-choice]').forEach(button=>{
      button.setAttribute('aria-pressed',String(button.getAttribute('data-lang-choice')===code));
    });
    document.querySelectorAll('.language-label').forEach(el=>el.setAttribute('aria-label',dict.langLabel));
    const menu=document.querySelector('.menu-toggle');
    if(menu)menu.setAttribute('aria-label',dict.menuLabel);
    const qrLink=document.getElementById('trailyo-ios-qr-link');
    if(qrLink)qrLink.setAttribute('aria-label',dict.scanToInstall);
    try{localStorage.setItem('trailyo_site_lang',code);}catch(_){}
    if(updateUrl){
      const url=new URL(window.location.href);
      if(code==='en')url.searchParams.delete('lang');else url.searchParams.set('lang',code);
      history.replaceState(null,'',url.pathname+url.search+url.hash);
    }
  }
  document.querySelectorAll('[data-lang-choice]').forEach(button=>{
    button.addEventListener('click',()=>setLanguage(button.getAttribute('data-lang-choice'),true));
  });
  const menu=document.querySelector('.menu-toggle');
  const nav=document.querySelector('.navigation');
  if(menu&&nav){
    menu.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');
      menu.setAttribute('aria-expanded',String(open));
      menu.textContent=open?'×':'☰';
    });
    nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
      nav.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.textContent='☰';
    }));
  }
  function safeLink(link){
    if(typeof link!=='string'||!link.trim())return null;
    try{
      const url=new URL(link);
      return url.protocol==='https:'?url.href:null;
    }catch(_){return null;}
  }
  const links=window.TRAILYO_STORE_LINKS||{};
  for(const [id,key] of [['store-android','android'],['store-ios','ios'],['hero-store-ios','ios'],['trailyo-desktop-ios-button','ios'],['footer-store-ios','ios']]){
    const el=document.getElementById(id);
    if(!el)continue;
    const link=safeLink(links[key]);
    if(link){
      el.href=link;el.target='_blank';el.rel='noopener noreferrer';
      el.classList.remove('inactive');el.removeAttribute('aria-disabled');
    }else{
      el.classList.add('inactive');el.setAttribute('aria-disabled','true');el.removeAttribute('href');
      el.addEventListener('click',e=>e.preventDefault());
    }
  }
  const iosLink=safeLink(links.ios);
  const qrLink=document.getElementById('trailyo-ios-qr-link');
  const qrTarget=document.getElementById('trailyo-ios-qr');
  const qrDesktop=document.getElementById('trailyo-desktop-ios-qr');
  if(iosLink&&qrLink&&qrTarget&&typeof window.MyNowStoreQR==='function'){
    qrLink.href=iosLink;
    qrLink.target='_blank';
    qrLink.rel='noopener noreferrer';
    const markup=window.MyNowStoreQR('trailyo','/assets/trailyo-qr-icon.webp',
      'Trailyo App Store download QR');
    qrTarget.innerHTML=markup;
    if(qrDesktop)qrDesktop.innerHTML=markup;
  }else if(qrLink){
    qrLink.hidden=true;
  }
  setLanguage(initial,false);

  // Slow self-running feed inside the phone mock-up; user gestures take priority.
  const feed=document.getElementById('phone-feed');
  if(feed){
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let last=0, quietUntil=0, dragging=false;
    const pause=()=>{quietUntil=performance.now()+2800};
    feed.addEventListener('wheel',pause,{passive:true});
    feed.addEventListener('pointerdown',()=>{dragging=true;pause()},{passive:true});
    window.addEventListener('pointerup',()=>{if(dragging){dragging=false;pause()}},{passive:true});
    feed.addEventListener('touchstart',()=>{dragging=true;pause()},{passive:true});
    feed.addEventListener('touchend',()=>{dragging=false;pause()},{passive:true});
    feed.addEventListener('keydown',pause);
    feed.addEventListener('focus',pause);
    const animate=(stamp)=>{
      const dt=last?Math.min((stamp-last)/1000,.055):0;
      last=stamp;
      if(!motion.matches&&!dragging&&stamp>quietUntil&&document.visibilityState==='visible'){
        const max=Math.max(0,feed.scrollHeight-feed.clientHeight);
        if(max>0){
          if(feed.scrollTop>=max-1)feed.scrollTop=0;
          else feed.scrollTop=Math.min(max,feed.scrollTop+dt*17);
        }
      }
      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  // dragMouseReady
  (() => {
    const feed = document.getElementById('phone-feed');
    if (!feed || feed.dataset.dragMouseReady === '1') return;
    feed.dataset.dragMouseReady = '1';

    let dragging = false;
    let startY = 0;
    let startScrollTop = 0;

    feed.style.cursor = 'grab';

    feed.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || e.pointerType === 'pen') {
        dragging = true;
        startY = e.clientY;
        startScrollTop = feed.scrollTop;
        feed.style.cursor = 'grabbing';
        if (feed.setPointerCapture) {
          try { feed.setPointerCapture(e.pointerId); } catch (_) {}
        }
        e.preventDefault();
      }
    });

    feed.addEventListener('pointermove', (e) => {
      if (!dragging) return;
      const dy = e.clientY - startY;
      feed.scrollTop = startScrollTop - dy;
      e.preventDefault();
    });

    const stopDragging = (e) => {
      if (!dragging) return;
      dragging = false;
      feed.style.cursor = 'grab';
      if (feed.releasePointerCapture) {
        try { feed.releasePointerCapture(e.pointerId); } catch (_) {}
      }
    };

    feed.addEventListener('pointerup', stopDragging);
    feed.addEventListener('pointercancel', stopDragging);
    feed.addEventListener('lostpointercapture', stopDragging);
  })();

})();
