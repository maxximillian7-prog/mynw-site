(()=>{
  const select=document.getElementById('trailyo-lang');
  if(!select)return;
  const available=['en','pt','ru'];
  const urlLang=new URLSearchParams(location.search).get('lang');
  let lang=available.includes(urlLang)?urlLang:null;
  if(!lang){try{lang=localStorage.getItem('trailyo_site_lang')}catch(_){}}
  if(!available.includes(lang)){
    const browser=(navigator.language||'en').toLowerCase();
    lang=browser.startsWith('ru')?'ru':browser.startsWith('pt')?'pt':'en';
  }
  const labels={
    en:'Website language',ru:'Язык сайта',pt:'Idioma do site'
  };
  function render(value){
    const next=available.includes(value)?value:'en';
    document.documentElement.lang=next;
    select.value=next;
    select.setAttribute('aria-label',labels[next]);
    try{localStorage.setItem('trailyo_site_lang',next)}catch(_){}
    // The header and footer labels are rendered by CSS using their
    // built-in RU/EN/PT spans. No JS innerHTML/text replacement or
    // image-loading race: the logo is an <img> already in every page.
  }
  select.addEventListener('change',()=>render(select.value));
  render(lang);
})();