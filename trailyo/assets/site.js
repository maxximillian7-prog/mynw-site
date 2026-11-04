(()=>{const select=document.getElementById('trailyo-lang');const param=new URLSearchParams(location.search).get('lang');let lang=['en','pt','ru'].includes(param)?param:null;
try{lang=lang||localStorage.getItem('trailyo_site_lang')}catch{}
if(!['en','pt','ru'].includes(lang))lang=navigator.language.toLowerCase().startsWith('ru')?'ru':navigator.language.toLowerCase().startsWith('pt')?'pt':'en';
const set=l=>{document.documentElement.lang=l;select.value=l;try{localStorage.setItem('trailyo_site_lang',l)}catch{}};
select.addEventListener('change',()=>set(select.value));set(lang)})();