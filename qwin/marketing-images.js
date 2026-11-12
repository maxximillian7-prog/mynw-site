/* Use verified Qwin-generated marketing assets when present. Gracefully fall back while
   the user's binary GitHub upload has not completed. No fabricated items or pricing. */
(function(){
  'use strict';
  document.querySelectorAll('img[data-fallback-src]').forEach(function(image){
    image.addEventListener('error',function(){
      var fallback=image.getAttribute('data-fallback-src');
      if(!fallback||image.dataset.fallbackUsed==='true')return;
      image.dataset.fallbackUsed='true';
      image.src=fallback;
    },{once:true});
  });
})();
