(() => {
  const SUPPORTED=['ru','uk','en','pt','es','fr','de','it'];
  const LABELS={ru:'Русский',uk:'Українська',en:'English',pt:'Português',es:'Español',fr:'Français',de:'Deutsch',it:'Italiano'};
  const PATHS={manual:'manual',privacy:'privacy',terms:'terms',ai:'ai-data',rights:'data-rights',deletion:'delete-account',support:'support'};
  const ICONS={manual:'📘',privacy:'🛡️',terms:'📜',ai:'✨',rights:'📥',deletion:'🗑️',support:'💬'};
  const ORDER=['manual','privacy','terms','ai','rights','deletion','support'];
  const page=document.body.dataset.ngPage||'home';
  const $=s=>document.querySelector(s);
  const esc=(v='')=>String(v).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const linkify=(v='')=>esc(v)
    .replace(/https:\/\/[^\s<]+/g,u=>'<a href="'+u+'" rel="noopener">'+u+'</a>')
    .replace(/support@mynw\.app/g,'<a href="mailto:support@mynw.app">support@mynw.app</a>');

  let lang='en',data=null;
  async function loadLanguage(code){
    const target=SUPPORTED.includes(code)?code:'en';
    const res=await fetch('/assets/nowgreen-i18n/'+target+'.json',{cache:'no-cache'});
    if(!res.ok) throw new Error('locale_failed');
    data=await res.json(); lang=target;
    localStorage.setItem('nowgreen-site-lang',lang);
    document.documentElement.lang=lang;
    render();
  }
  function renderNav(){
    const c=data.common;
    document.querySelectorAll('[data-ng-nav]').forEach(a=>{
      const k=a.dataset.ngNav;if(c[k])a.textContent=c[k];
    });
    const sel=$('#ngLang');
    if(sel){
      sel.innerHTML=SUPPORTED.map(code=>'<option value="'+code+'">'+esc(LABELS[code])+'</option>').join('');
      sel.value=lang;
      sel.setAttribute('aria-label',c.languageSelector||c.language||'Language');
      sel.onchange=()=>loadLanguage(sel.value).catch(()=>loadLanguage('en'));
    }
    const footer=$('#ngFooter');if(footer)footer.textContent=c.footer;
    document.querySelectorAll('.menu').forEach(btn=>{
      btn.setAttribute('aria-label',c.menuOpen||'Open menu');
      btn.onclick=()=>btn.parentElement.querySelector('nav')?.classList.toggle('open');
    });
    const meta=document.querySelector('meta[name="description"]');
    if(meta)meta.setAttribute('content',c.intro);
  }
  function contactBox(){
    const c=data.common;
    return '<div class="callout ng-contact"><strong>'+esc(c.developer)+'</strong><br>Maksym Smyrnov · Portugal<br><a href="mailto:support@mynw.app">support@mynw.app</a> · <a href="https://mynw.app/nowgreen/">mynw.app/nowgreen</a></div>';
  }
  function renderDoc(){
    const c=data.common,d=data.pages[page]||data.pages.privacy;
    document.title=d.title+' — NowGreen';
    const sections=(d.sections||[]).map(s=>{
      const ps=(s.p||[]).map(x=>'<p>'+linkify(x)+'</p>').join('');
      const list=s.items?.length?'<ul>'+s.items.map(x=>'<li>'+linkify(x)+'</li>').join('')+'</ul>':'';
      return '<section class="ng-doc-section"><h2>'+esc(s.h)+'</h2>'+ps+list+'</section>';
    }).join('');
    const action=(page==='deletion'||page==='support')?'<p class="ng-action"><a class="btn btn-primary" href="mailto:support@mynw.app">support@mynw.app</a></p>':'';
    $('#ngContent').innerHTML='<article class="legal-card ng-legal-card"><a class="ng-back" href="/nowgreen/">← '+esc(c.back)+'</a><h1>'+esc(d.title)+'</h1><p class="meta">'+esc(c.updated)+'</p>'+contactBox()+'<p class="ng-intro">'+esc(d.intro)+'</p>'+action+sections+'</article>';
  }
  function renderHome(){
    const c=data.common;document.title=c.title;
    const cards=ORDER.map(k=>'<a class="card ng-doc-card" href="/nowgreen/'+PATHS[k]+'/"><div class="icon">'+ICONS[k]+'</div><h2>'+esc(c[k])+'</h2><p>'+esc(c.cards[k])+'</p></a>').join('');
    $('#ngContent').innerHTML='<section class="ng-hero"><div class="section-kicker">NowGreen</div><h1>'+esc(c.title)+'</h1><p>'+esc(c.intro)+'</p><div class="callout">'+esc(c.status)+'<br><strong>'+esc(c.contact)+':</strong> <a href="mailto:support@mynw.app">support@mynw.app</a></div></section><div class="ng-doc-grid">'+cards+'</div>';
  }
  function render(){renderNav();page==='home'?renderHome():renderDoc();}
  const saved=localStorage.getItem('nowgreen-site-lang');
  const browser=(navigator.language||'en').slice(0,2).toLowerCase();
  const initial=SUPPORTED.includes(saved)?saved:(SUPPORTED.includes(browser)?browser:'en');
  loadLanguage(initial).catch(()=>loadLanguage('en')).catch(()=>{
    $('#ngContent').innerHTML='<article class="legal-card"><h1>NowGreen</h1><p><a href="mailto:support@mynw.app">support@mynw.app</a></p></article>';
  });
})();