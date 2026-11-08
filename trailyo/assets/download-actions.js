(()=> {
  function available(raw){
    if(typeof raw!=="string")return null;
    try{
      const u=new URL(raw);
      return u.protocol==="https:"?u.href:null;
    }catch{return null;}
  }
  const translations={
    en:{title:"Get Trailyo",soon:"Coming soon",ios:"App Store",android:"Google Play"},
    ru:{title:"Скачать Trailyo",soon:"Скоро",ios:"App Store",android:"Google Play"},
    pt:{title:"Descarregar Trailyo",soon:"Em breve",ios:"App Store",android:"Google Play"},
  };
  document.addEventListener("DOMContentLoaded",()=>{
    const links=window.TRAILYO_STORE_LINKS||{};
    for(const container of document.querySelectorAll(".trailyo-downloads")){
      const raw=container.getAttribute("data-lang")||document.documentElement.lang||"en";
      const lang=raw.startsWith("ru")?"ru":raw.startsWith("pt")?"pt":"en";
      const words=translations[lang];
      const heading=document.createElement("div");
      heading.className="trailyo-download-title";
      heading.textContent=words.title;
      container.appendChild(heading);
      const row=document.createElement("div");
      row.className="trailyo-store-row";
      for(const platform of ["android","ios"]){
        const href=available(links[platform]);
        const item=document.createElement(href?"a":"span");
        item.className="trailyo-store-link"+(href?"":" disabled");
        item.textContent=words[platform]+(href?"":" · "+words.soon);
        if(href){
          item.href=href;
          item.target="_blank";
          item.rel="noopener noreferrer";
        }else{
          item.setAttribute("aria-disabled","true");
          item.title=words.soon;
        }
        row.appendChild(item);
      }
      container.appendChild(row);
    }
  });
})();
