/* Qwin approved generated visuals: show each local file when installed.
 * Until marketing PNGs arrive in GitHub, display original licensed fallback
 * photos instead of broken placeholders. Handles early image-load failures too. */
(function(){
  'use strict';
  document.querySelectorAll('img[data-fallback-src]').forEach(function(img){
    function useFallback(){
      var fallback=img.getAttribute('data-fallback-src');
      if(!fallback||img.dataset.fallbackUsed==='true')return;
      img.dataset.fallbackUsed='true';
      img.src=fallback;
    }
    img.addEventListener('error',useFallback,{once:true});
    if(img.complete && img.naturalWidth===0)useFallback();
  });
})();
