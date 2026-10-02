(() => {
  const SUPPORTED=['en','pt','ru','uk','de','it','fr','es'];
  const LABELS={en:'English',pt:'Português',ru:'Русский',uk:'Українська',de:'Deutsch',it:'Italiano',fr:'Français',es:'Español'};
  const PATHS={
    privacy:'privacy',
    terms:'terms',
    parents:'parents',
    ai:'ai-safety',
    community:'community',
    rights:'data-rights',
    deletion:'delete-account',
    support:'support',
    childSafety:'child-safety',
    permissions:'permissions',
    manual:'manual'
  };
  const ICONS={privacy:'🛡️',terms:'📜',parents:'👨‍👩‍👧',ai:'✨',community:'🧩',rights:'📥',deletion:'🗑️',support:'💬',childSafety:'🧒',permissions:'🔐',manual:'📘'};
  const ORDER=['manual','privacy','terms','parents','childSafety','ai','permissions','community','rights','deletion','support'];
  const page=document.body.dataset.nkPage||'home';
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const linkify=(v='')=>esc(v)
    .replace(/https:\/\/[^\s<]+/g,u=>'<a href="'+u+'" rel="noopener">'+u+'</a>')
    .replace(/support@mynw\.app/g,'<a href="mailto:support@mynw.app">support@mynw.app</a>');
  const deepMerge=(a,b)=>({
    ...a,...b,
    common:{...(a.common||{}),...(b.common||{}),cards:{...(a.common?.cards||{}),...(b.common?.cards||{})}},
    pages:{...(a.pages||{}),...(b.pages||{})}
  });

  let lang='en',data=null;

  async function loadLanguage(code){
    const target=SUPPORTED.includes(code)?code:'en';
    const [baseRes,extraRes]=await Promise.all([
      fetch('/assets/nowkids-i18n/'+target+'.json',{cache:'no-cache'}),
      fetch('/assets/nowkids-extra.json',{cache:'no-cache'})
    ]);
    if(!baseRes.ok) throw new Error('base_locale_failed');
    const base=await baseRes.json();
    const extraAll=extraRes.ok?await extraRes.json():{};
    data=deepMerge(base,extraAll[target]||{});
    lang=target;
    localStorage.setItem('nowkids-site-lang',lang);
    document.documentElement.lang=lang;
    render();
  }

  function renderNav(){
    const c=data.common;
    document.querySelectorAll('[data-nk-nav]').forEach(a=>{
      const k=a.dataset.nkNav;
      if(c[k]) a.textContent=c[k];
    });
    const sel=$('#nkLang');
    if(sel){
      sel.innerHTML=SUPPORTED.map(code=>'<option value="'+code+'">'+esc(LABELS[code])+'</option>').join('');
      sel.value=lang;
      sel.onchange=()=>loadLanguage(sel.value).catch(()=>loadLanguage('en'));
    }
    const footer=$('#nkFooter');
    if(footer) footer.textContent=c.footer;
    document.querySelectorAll('.menu').forEach(btn=>{
      btn.onclick=()=>btn.parentElement.querySelector('nav')?.classList.toggle('open');
    });
  }

  function contactBox(){
    const c=data.common;
    return '<div class="callout nk-contact"><strong>'+esc(c.developer)+'</strong><br>'+
      'Maksym Smyrnov · Portugal<br>'+
      '<a href="mailto:support@mynw.app">support@mynw.app</a> · '+
      '<a href="https://mynw.app/nowkids/">mynw.app/nowkids</a></div>';
  }

  function specialAction(key){
    if(key==='deletion'){
      return '<p class="nk-action"><a class="btn btn-primary" href="mailto:support@mynw.app?subject=Delete%20my%20NowKids%20account&body=Please%20delete%20my%20NowKids%20account%20and%20associated%20data.%0A%0AAccount%20email%3A%20">support@mynw.app</a></p>';
    }
    if(key==='support'||key==='childSafety'){
      return '<p class="nk-action"><a class="btn btn-primary" href="mailto:support@mynw.app">support@mynw.app</a></p>';
    }
    return '';
  }

  function renderDoc(){
    const c=data.common;
    const d=data.pages[page]||data.pages.privacy;
    document.title=d.title+' — NowKids';
    const sections=(d.sections||[]).map(s=>{
      const ps=(s.p||[]).map(x=>'<p>'+linkify(x)+'</p>').join('');
      const list=s.items?.length?'<ul>'+s.items.map(x=>'<li>'+linkify(x)+'</li>').join('')+'</ul>':'';
      return '<section class="nk-doc-section"><h2>'+esc(s.h)+'</h2>'+ps+list+'</section>';
    }).join('');
    $('#nkContent').innerHTML=
      '<article class="legal-card nk-legal-card">'+
      '<a class="nk-back" href="/nowkids/">← '+esc(c.back)+'</a>'+
      '<h1>'+esc(d.title)+'</h1>'+
      '<p class="meta">'+esc(c.updated)+'</p>'+
      contactBox()+
      '<p class="nk-intro">'+esc(d.intro)+'</p>'+
      specialAction(page)+sections+
      '</article>';
  }

  function renderHome(){
    const c=data.common;
    document.title=c.title;
    const cards=ORDER.map(k=>
      '<a class="card nk-doc-card" href="/nowkids/'+PATHS[k]+'/">'+
      '<div class="icon">'+ICONS[k]+'</div>'+
      '<h2>'+esc(c[k])+'</h2>'+
      '<p>'+esc(c.cards[k])+'</p></a>'
    ).join('');
    $('#nkContent').innerHTML=
      '<section class="nk-hero">'+
      '<div class="section-kicker">NowKids</div>'+
      '<h1>'+esc(c.title)+'</h1>'+
      '<p>'+esc(c.intro)+'</p>'+
      '<div class="callout">'+esc(c.status)+'<br><strong>'+esc(c.contact)+':</strong> <a href="mailto:support@mynw.app">support@mynw.app</a></div>'+
      '</section><div class="nk-doc-grid">'+cards+'</div>';
  }

  function render(){
    renderNav();
    if(page==='home') renderHome(); else renderDoc();
  }

  const saved=localStorage.getItem('nowkids-site-lang');
  const browser=(navigator.language||'en').slice(0,2).toLowerCase();
  const initial=SUPPORTED.includes(saved)?saved:(SUPPORTED.includes(browser)?browser:'en');
  loadLanguage(initial).catch(()=>loadLanguage('en')).catch(()=>{
    $('#nkContent').innerHTML='<article class="legal-card"><h1>NowKids</h1><p>Documentation could not be loaded. Contact <a href="mailto:support@mynw.app">support@mynw.app</a>.</p></article>';
  });
})();