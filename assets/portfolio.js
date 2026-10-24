/* Unified MyNow Apps portfolio. All legacy legal pages, paths and scripts remain unmodified. */
(()=>{
  'use strict';
  const APP_IDS=['nowwhat','nowcook','nowgreen','nowkids'];
  const LANGS=['en','pt','ru','uk','fr','es','de','it'];
  const LABELS={en:'English',pt:'Português',ru:'Русский',uk:'Українська',fr:'Français',es:'Español',de:'Deutsch',it:'Italiano'};
  const URLS={
    nowwhat:{home:'/nowwhat/',guide:'/manual/',privacy:'/privacy/',terms:'/terms/',delete:'/delete-account/',support:'/support/',play:'https://play.google.com/store/apps/details?id=com.nowwhatapp.app'},
    nowcook:{home:'/nowcook/',play:'https://play.google.com/store/apps/details?id=com.nowapps.nowcook',guide:'/nowcook/manual/',privacy:'/nowcook/privacy/',terms:'/nowcook/terms/',delete:'/nowcook/delete-account/',support:'/nowcook/support/'},
    nowgreen:{home:'/nowgreen/',play:'https://play.google.com/store/apps/details?id=com.nowapps.nowgreen',guide:'/nowgreen/manual/',privacy:'/nowgreen/privacy/',terms:'/nowgreen/terms/',delete:'/nowgreen/delete-account/',support:'/nowgreen/support/',ai:'/nowgreen/ai-data/',rights:'/nowgreen/data-rights/'},
    nowkids:{home:'/nowkids/',play:'https://play.google.com/store/apps/details?id=com.nowapps.nowkids',guide:'/nowkids/manual/',privacy:'/nowkids/privacy/',terms:'/nowkids/terms/',delete:'/nowkids/delete-account/',support:'/nowkids/support/',ai:'/nowkids/ai-safety/',rights:'/nowkids/data-rights/',parents:'/nowkids/parents/',safety:'/nowkids/child-safety/',community:'/nowkids/community/',permissions:'/nowkids/permissions/'}
  };
  const LOGOS={nowwhat:'/assets/brand/nowwhat-logo.webp',nowcook:'/assets/brand/nowcook-logo.webp',nowgreen:'/assets/brand/nowgreen-logo.webp?v=20261022-1',nowkids:'/assets/brand/nowkids-logo.webp'};
  const FALLBACK_LOGOS={nowwhat:'/assets/nowwhat-qr-icon.png',nowcook:'/assets/nowcook-home-logo.webp',nowgreen:'/assets/nowgreen-icon.svg',nowkids:'/assets/nowkids-home-logo.png'};
  const BANNERS={nowwhat:'/assets/brand/nowwhat-banner.webp',nowcook:'/assets/brand/nowcook-banner.webp',nowgreen:'/assets/brand/nowgreen-banner.webp',nowkids:'/assets/brand/nowkids-banner.webp'};
  const SYMBOLS={nowgreen:'🌿'};
  const TITLES={nowwhat:'NowWhat',nowcook:'NowCook',nowgreen:'NowGreen',nowkids:'NowKids'};
  const KINDS={nowwhat:'📑',nowcook:'🍽️',nowgreen:'🌱',nowkids:'🎓'};
  const E=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const page=document.body.dataset.portfolio||'home',root=document.getElementById('portfolio');
  if(!root)return;
  let translations={},locale='en',busy=false;
  const detailedGuides=Object.create(null), pendingGuideLoads=Object.create(null);
  const current=()=>translations[locale]||translations.en;
  function logo(app){return '<img src="'+LOGOS[app]+'" alt="'+TITLES[app]+' logo" loading="lazy" decoding="async" onerror="this.onerror=null;this.src=\''+FALLBACK_LOGOS[app]+'\'">';}
  function visual(app,type){return '<div class="eco-picture eco-picture-'+app+' eco-picture-'+type+'"><img src="'+BANNERS[app]+'" alt="'+TITLES[app]+' — '+(type==='hero'?'app overview':'features and preview')+'" loading="lazy" decoding="async" onerror="this.hidden=true;this.parentNode.classList.add(\'eco-picture-fallback\')"><span class="eco-picture-watermark">'+TITLES[app]+'</span></div>';}
  function nav(localeText){
    document.documentElement.lang=locale==='uk'?'uk':locale;
    const brand=document.querySelector('.eco-brand small');if(brand)brand.textContent=localeText.brandSub;
    const links=document.querySelectorAll('[data-eco-link]');
    links.forEach(e=>{const k=e.dataset.ecoLink;if(localeText[k])e.textContent=localeText[k]});
    const select=document.getElementById('eco-language');
    if(select)select.value=locale;
  }
  function tags(values){return '<div class="eco-tags">'+values.map(x=>'<span class="eco-tag">'+E(x)+'</span>').join('')+'</div>';}
  function homeCard(app,t){
    const d=t[app],u=URLS[app];
    return '<a class="eco-card eco-card-'+app+'" href="'+u.home+'" aria-label="'+E(TITLES[app]+' — '+t.open)+'">'+
      '<div class="eco-card-top"><div class="eco-card-logo">'+logo(app)+'</div><div><div class="eco-kind">'+E(d.tag)+'</div><h3>'+TITLES[app]+'</h3></div></div>'+
      '<p>'+E(d.summary)+'</p>'+tags(d.chips)+visual(app,'card')+
      '<span class="eco-card-link">'+E(t.open)+' <span aria-hidden="true">→</span></span></a>';
  }
  function footer(t,app){
    const links=app&&app!=='home'?[['home','/'],['privacy',URLS[app].privacy],['terms',URLS[app].terms],['delete',URLS[app].delete],['support',URLS[app].support]]:[['navHome','/'],['navApps','/#apps'],['navDocs','/#documentation'],['navContact','mailto:support@mynw.app']];
    return '<footer class="eco-footer"><div class="eco-container eco-footer-flex"><div>© 2026 MyNow Apps · '+E(t.footer)+'</div><div class="eco-footer-links">'+links.map(([key,url])=>'<a href="'+url+'">'+E(t[key]||t.home)+'</a>').join('')+'</div></div></footer>';
  }
  const WELCOME_LABELS={en:'A welcome note',pt:'Mensagem de boas-vindas',ru:'Приветственное письмо',uk:'Привітальне повідомлення',fr:'Un mot de bienvenue',es:'Carta de bienvenida',de:'Willkommensgruß',it:'Un messaggio di benvenuto'};
  function qrGraphic(app){
    const path='/assets/'+app+'-google-play-qr.svg';
    const version=app==='nowwhat'?'20261015-1':'20261024-1';
    return '<img class="eco-play-qr" src="'+path+'?v='+version+'" width="170" height="170" loading="lazy" decoding="async" alt="'+E(TITLES[app])+' Google Play QR with app logo">';
  }
  function downloadPanel(app,t){
    const u=URLS[app];if(!u.play)return '';
    return '<section class="eco-section eco-install" id="download"><div class="eco-container"><div class="eco-note eco-download-note"><div><div class="eco-section-eyebrow">'+TITLES[app]+' · Android</div><h2>'+E(t.play)+'</h2><p>'+E(t[app].summary)+'</p><a class="eco-button" href="'+u.play+'" target="_blank" rel="noopener noreferrer">'+E(t.play)+' ↗</a></div><a class="eco-qr-link" href="'+u.play+'" target="_blank" rel="noopener noreferrer" aria-label="'+TITLES[app]+' Google Play QR">'+qrGraphic(app)+'</a></div></div></section>';
  }
  function home(t){
    const stage=APP_IDS.map(a=>'<a href="'+URLS[a].home+'" class="eco-stage-tile">'+logo(a)+'<strong>'+TITLES[a]+'</strong></a>').join('');
    root.innerHTML='<section class="eco-hero"><div class="eco-container eco-hero-grid"><div>'+
      '<div class="eco-eyebrow">'+E(t.eyebrow)+'</div><h1>'+E(t.head1)+'<br><em>'+E(t.head2)+'</em></h1><p>'+E(String(t.lead).split('. ')[0]+'.')+'</p>'+
      '<div class="eco-actions"><a class="eco-button eco-button-primary" href="#apps">'+E(t.explore)+' ↗</a><a class="eco-button eco-button-outline" href="mailto:support@mynw.app">'+E(t.contactUs)+'</a></div>'+
      '</div><div class="eco-stage" aria-label="MyNow Apps">'+stage+'</div></div></section>'+
      '<section class="eco-section" id="apps"><div class="eco-container"><div class="eco-section-eyebrow">'+E(t.appsKicker)+'</div>'+
      '<h2>'+E(t.appsTitle)+'</h2><p class="eco-section-lead">'+E(t.appsLead)+'</p>'+
      '<div class="eco-cards">'+APP_IDS.map(a=>homeCard(a,t)).join('')+'</div></div></section>'+
      '<section class="eco-section" id="documentation"><div class="eco-container"><div class="eco-note"><div><div class="eco-section-eyebrow">'+E(t.docsKicker)+'</div><h2>'+E(t.helpTitle)+'</h2><p>'+E(t.helpText)+'</p></div><a href="/nowwhat/" class="eco-button">'+E(t.explore)+' →</a></div></div></section>'+
      /* Retain old deep-link hash targets used in Google Play descriptions and documentation. */
      '<div id="features"></div><div id="documents"></div><div id="vault"></div><div id="saved"></div><div id="finance"></div><div id="calendar"></div><div id="briefing"></div>'+
      '<div id="download" hidden></div><div id="privacy"></div>'+footer(t,'home');
    document.title='MyNow Apps — NowWhat, NowCook, NowGreen & NowKids';
    setMeta(t.lead);
  }
  function resources(app,t){
    const u=URLS[app],keys=['welcome','guide','privacy','terms','delete','support',...(['nowgreen','nowkids'].includes(app)?['ai','rights']:[]),...(app==='nowkids'?['parents','safety','community','permissions']:[])];
    const glyph={welcome:'💌',guide:'📘',privacy:'🛡️',terms:'📜',delete:'🗑️',support:'✉️',ai:'✨',rights:'🗂️',parents:'👨‍👩‍👧',safety:'🔒',community:'🤝',permissions:'⚙️'};
    return keys.filter(k=>u[k]||k==='welcome').map(k=>'<a class="eco-resource" href="'+(u[k]||('/'+app+'/welcome/'))+'"><span class="eco-resource-icon">'+glyph[k]+'</span><span>'+E(k==='welcome'?WELCOME_LABELS[locale]:(t[k]||k))+'</span><span class="eco-resource-arrow">↗</span></a>').join('');
  }
  function appPage(app,t){
    const d=t[app],u=URLS[app];
    const mainAction=u.play?'<a class="eco-button" href="'+u.play+'" target="_blank" rel="noopener noreferrer">'+E(t.play)+' ↗</a>':'<a class="eco-button" href="#resources">'+E(t.resources)+' →</a>';
    const floats=d.chips.slice(0,2).join(' · ');
    const features=d.features.map((f,i)=>'<div class="eco-feature"><b>'+('0'+(i+1))+'</b>'+E(f)+'</div>').join('');
    const related=APP_IDS.filter(a=>a!==app).map(a=>'<a href="'+URLS[a].home+'">'+KINDS[a]+' '+TITLES[a]+' →</a>').join('');
    root.innerHTML='<div class="eco-app-'+app+'">'+
      '<section class="eco-app-hero"><div class="eco-container eco-app-intro"><div>'+
      '<a class="eco-back" href="/#apps">← '+E(t.allApps)+'</a>'+
      '<div class="eco-section-eyebrow">'+E(d.tag)+'</div><h1>'+TITLES[app]+'</h1>'+
      '<p class="eco-app-summary">'+E(d.summary)+'</p>'+tags(d.chips)+
      '<div class="eco-actions">'+mainAction+'<a class="eco-button" href="'+u.guide+'">'+E(t.guide)+' →</a></div></div>'+
      '<div class="eco-app-visual"><div class="eco-app-promo">'+visual(app,'hero')+'<div class="eco-app-promo-logo">'+logo(app)+'</div></div><div class="eco-visual-float">'+E(floats)+'</div></div>'+
      '</div></section>'+
      '<section class="eco-section" id="about"><div class="eco-container"><div class="eco-section-eyebrow">'+E(t.about)+'</div>'+
      '<h2>'+TITLES[app]+'</h2><p class="eco-detail">'+E(d.description)+'</p></div></section>'+
      '<section class="eco-section" id="features"><div class="eco-container"><div class="eco-section-eyebrow">'+E(t.features)+'</div>'+
      '<h2>'+E(d.summary)+'</h2><div class="eco-feature-grid">'+features+'</div></div></section>'+
      '<section class="eco-section" id="resources"><div class="eco-container"><div class="eco-section-eyebrow">'+E(t.resources)+'</div>'+
      '<h2>'+E(t.resources)+'</h2><p class="eco-section-lead">'+E(t.resourcesLead)+'</p>'+
      '<div class="eco-resource-grid">'+resources(app,t)+'</div></div></section>'+
      '<section class="eco-section"><div class="eco-container"><div class="eco-section-eyebrow">'+E(t.related)+'</div>'+
      '<div class="eco-related">'+related+'</div></div></section>'+downloadPanel(app,t)+'</div>'+footer(t,app);
    document.title=TITLES[app]+' — MyNow Apps';
    setMeta(d.summary);
  }
  function ensureDetailedGuide(code){
    if(detailedGuides[code]||pendingGuideLoads[code])return;
    pendingGuideLoads[code]=fetch('/assets/guides-v2/'+code+'.json',{cache:'no-cache'})
      .then(r=>{if(!r.ok)throw new Error('guide_unavailable');return r.json()})
      .then(json=>{detailedGuides[code]=json; if(page==='nowcook-guide'&&locale===code)guidePage(current())})
      .catch(()=>{detailedGuides[code]={}}).finally(()=>{delete pendingGuideLoads[code]});
  }
  function guidePage(t){
    const app='nowcook';
    const original=t.manualSteps.map(([h,body])=>({h,p:[body]}));
    const sections=[...original,...(detailedGuides[locale]?.nowcook||[])];
    const toc=sections.map((section,i)=>'<a href="#cook-guide-'+i+'">'+E(section.h)+'</a>').join('');
    const content=sections.map((section,i)=>'<section class="eco-guide-section" id="cook-guide-'+i+'"><h2>'+E(section.h)+'</h2>'+
      (section.p||[]).map(x=>'<p>'+E(x)+'</p>').join('')+'</section>').join('');
    root.innerHTML='<div class="eco-app-nowcook"><section class="eco-section"><div class="eco-container">'+
      '<a class="eco-back" href="/nowcook/">← NowCook</a>'+
      '<div class="eco-section-eyebrow">'+E(t.guide)+'</div><h1 class="eco-manual-heading">'+E(t.guideHeading)+'</h1>'+
      '<p class="eco-section-lead">'+E(t.guideIntro)+'</p>'+
      '<div class="eco-guide-layout"><aside class="eco-guide-toc" aria-label="'+E(t.guide)+'">'+toc+'</aside>'+
      '<article class="eco-guide-article">'+content+'</article></div>'+
      '<div class="eco-section"><div class="eco-section-eyebrow">'+E(t.resources)+'</div><div class="eco-resource-grid">'+resources(app,t)+'</div></div>'+
      '</div></section></div>'+footer(t,app);
    document.title=t.guideHeading+' — MyNow Apps';
    setMeta(t.guideIntro);
  }
  function setMeta(desc){const meta=document.querySelector('meta[name="description"]');if(meta)meta.setAttribute('content',desc)}
  function render(){
    const t=current();if(!t)return;
    nav(t);
    if(page==='home')home(t);
    else if(page==='nowcook-guide'){guidePage(t);ensureDetailedGuide(locale);}
    else if(APP_IDS.includes(page))appPage(page,t);
    document.getElementById('eco-menu')?.addEventListener('click',()=>document.getElementById('eco-nav')?.classList.toggle('open'));
    document.querySelectorAll('#eco-nav a').forEach(a=>a.addEventListener('click',()=>document.getElementById('eco-nav')?.classList.remove('open')));
  }
  function setLanguage(code){
    if(!LANGS.includes(code)||busy)return;
    locale=code;
    try{
      localStorage.setItem('mynw_lang',code);
      localStorage.setItem('nw_lang',code);
      localStorage.setItem('nc_lang',code);
      localStorage.setItem('nowgreen-site-lang',code);
      localStorage.setItem('nowkids-site-lang',code);
    }catch(_){}
    render();
  }
  async function init(){
    const sel=document.getElementById('eco-language');
    if(sel){sel.innerHTML=LANGS.map(x=>'<option value="'+x+'">'+E(LABELS[x])+'</option>').join('');sel.addEventListener('change',e=>setLanguage(e.target.value))}
    let lang;
    try{lang=localStorage.getItem('mynw_lang')||localStorage.getItem('nw_lang')||localStorage.getItem('nc_lang')||localStorage.getItem('nowgreen-site-lang')||localStorage.getItem('nowkids-site-lang')}catch(_){}
    const browser=(navigator.language||'en').slice(0,2).toLowerCase();
    locale=LANGS.includes(lang)?lang:(LANGS.includes(browser)?browser:'en');
    try{
      const responses=await Promise.all(['/assets/portfolio-i18n-core.json','/assets/portfolio-i18n-extra.json'].map(url=>fetch(url,{cache:'no-cache'})));
      if(responses.some(r=>!r.ok))throw new Error('translations_fetch');
      const files=await Promise.all(responses.map(r=>r.json()));
      translations={...files[0],...files[1]};
      if(!LANGS.every(c=>translations[c]&&APP_IDS.every(a=>translations[c][a]?.features?.length===4)))throw new Error('translations_incomplete');
      render();
    }catch(error){
      console.warn('Portfolio translations unavailable; preserving static HTML links',error);
      const fallback=document.getElementById('portfolio-fallback');if(fallback)fallback.hidden=false;
    }
  }
  document.addEventListener('DOMContentLoaded',init);
})();