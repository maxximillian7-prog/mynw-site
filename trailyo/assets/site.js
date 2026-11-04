(()=>{
  const select=document.getElementById('trailyo-lang');
  const requested=new URLSearchParams(location.search).get('lang');
  let lang=['en','pt','ru'].includes(requested)?requested:null;
  try{lang=lang||localStorage.getItem('trailyo_site_lang')}catch(_){}
  if(!['en','pt','ru'].includes(lang))
    lang=navigator.language.toLowerCase().startsWith('ru')?'ru':
      navigator.language.toLowerCase().startsWith('pt')?'pt':'en';

  const translations={
    en:{home:'Home',manual:'Guide',privacy:'Privacy',terms:'Terms',
      'community-rules':'Safety',support:'Support','delete-account':'Delete account',
      'data-rights':'Data rights'},
    ru:{home:'Главная',manual:'Инструкция',privacy:'Конфиденциальность',
      terms:'Условия','community-rules':'Правила',support:'Поддержка',
      'delete-account':'Удалить аккаунт','data-rights':'Права на данные'},
    pt:{home:'Início',manual:'Manual',privacy:'Privacidade',terms:'Termos',
      'community-rules':'Segurança',support:'Apoio',
      'delete-account':'Eliminar conta','data-rights':'Direitos aos dados'},
  };
  function routeName(link){
    const href=link.getAttribute('href')||'';
    if(href.startsWith('mailto:'))return 'support';
    const path=new URL(href,location.href).pathname.replace(/\/+$/,'');
    if(path==='/trailyo')return 'home';
    return path.split('/').filter(Boolean).pop()||'home';
  }
  function render(value){
    document.documentElement.lang=value;
    select.value=value;
    try{localStorage.setItem('trailyo_site_lang',value)}catch(_){}
    for(const a of document.querySelectorAll('header nav a,footer a')){
      const name=routeName(a),caption=translations[value][name];
      if(caption)a.textContent=caption;
    }
    const aria={en:'Website language',ru:'Язык сайта',pt:'Idioma do site'};
    select.setAttribute('aria-label',aria[value]);
  }
  select.addEventListener('change',()=>render(select.value));
  render(lang);

  // Same approved Trailyo wordmark as the mobile home screen.
  // The PNG is imported from the original owner-approved image, not redrawn.
  const wordmark='/trailyo/assets/trailyo-logo.png';
  const anchors=[...document.querySelectorAll('a.brand')];
  const headings=[...document.querySelectorAll('main h1')].filter(h=>h.textContent.trim()==='Trailyo');
  for(const target of [...anchors,...headings]){
    const img=document.createElement('img');
    img.src=wordmark;
    img.alt='Trailyo';
    img.className='trailyo-wordmark';
    img.onload=()=>{
      target.textContent='';
      target.appendChild(img);
    };
    // Keep readable text if the image has not been published.
  }
})();
