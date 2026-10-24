/* Load shared feedback modal independently of optional, privacy-respecting traffic analytics. */
(() => {
  if (window.__mynwFeedbackScriptLoaded) return;
  window.__mynwFeedbackScriptLoaded = true;
  const script = document.createElement('script');
  script.src = '/assets/contact-modal.js?v=20261024-1';
  document.head.appendChild(script);
})();

/* Privacy-first MyNow Apps traffic. Counts page loads, not unique people. */
(()=>{
 'use strict';
 if(window.__mynwTrafficSent)return;
 window.__mynwTrafficSent=true;
 if(navigator.globalPrivacyControl===true||navigator.doNotTrack==='1')return;
 try{
   let path=location.pathname;
   if(document.body?.dataset.titleKey==='notfound_title'||path==='/404.html')path='/404/';
   else{
     path=path.replace(/\/index\.html$/i,'/');
     if(!path.endsWith('/'))path+='/';
     path=path.toLowerCase();
   }
   if(path.length>128||!/^\/[a-z0-9_\/-]*$/.test(path))return;
   const params=new URLSearchParams(location.search);
   const langs=new Set(['ru','en','pt','uk','fr','es','de','it']);
   const apps=new Set(['nowwhat','nowkids','nowcook','nowgreen']);
   let lang=(params.get('lang')||'').toLowerCase().slice(0,2);
   if(!langs.has(lang)){
     try{
       lang=(localStorage.getItem('mynw_lang')||localStorage.getItem('nw_lang')||
         localStorage.getItem('nc_lang')||localStorage.getItem('nowkids-site-lang')||
         localStorage.getItem('nowgreen-site-lang')||'').toLowerCase().slice(0,2);
     }catch(_){}
   }
   if(!langs.has(lang))lang=(document.documentElement.lang||'').toLowerCase().slice(0,2);
   if(!langs.has(lang))lang=(navigator.language||'').toLowerCase().slice(0,2);
   if(!langs.has(lang))lang='und';
   const tag=(params.get('src')||params.get('utm_source')||'').toLowerCase();
   let source=apps.has(tag)?tag:'direct';
   if(source==='direct'&&document.referrer){
     try{
       const hostname=new URL(document.referrer).hostname.toLowerCase();
       source=['mynw.app','www.mynw.app'].includes(hostname)?'internal':'external';
     }catch(_){}
   }
   // Never transmit IP, full URL, invitation tokens, query, referrer or identifiers.
   void fetch('https://utauewtqtmqgmguxtmvn.supabase.co/functions/v1/website-traffic',{
     method:'POST',mode:'cors',credentials:'omit',keepalive:true,
     headers:{'Content-Type':'text/plain;charset=UTF-8'},
     body:JSON.stringify({path,lang,source})
   }).catch(()=>{});
 }catch(_){}
})();
