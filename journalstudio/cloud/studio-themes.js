"use strict";
/* UI-only project theme manager. It never changes editorial content, permissions or API calls. */
(function(){
const palettes=Object.freeze({
 nowgreen:{accent:"#3e815f",sidebar:"#173d31",chrome:"#173d31",label:"NowGreen"},
 nowcook:{accent:"#bf752a",sidebar:"#5b4030",chrome:"#5b4030",label:"NowCook"},
 nowwhat:{accent:"#3989c9",sidebar:"#204668",chrome:"#204668",label:"NowWhat"},
 nowkids:{accent:"#c39423",sidebar:"#6a5429",chrome:"#6a5429",label:"NowKids"}
});
let active="nowgreen";
function apply(slug){
 const key=Object.hasOwn(palettes,slug)?slug:"nowgreen";
 const entry=palettes[key];
 active=key;
 document.body.dataset.studioApp=key;
 document.documentElement.style.colorScheme="light";
 const meta=document.querySelector('meta[name="theme-color"]');
 if(meta)meta.setAttribute("content",entry.chrome);
 const title=document.querySelector("#workspace .sidebar .brand small");
 if(title)title.textContent="MYNOW PUBLISHING · "+entry.label.toUpperCase();
 const projectChoice=document.getElementById("project");
 if(projectChoice)projectChoice.setAttribute("aria-label","Текущий проект: "+entry.label);
 document.dispatchEvent(new CustomEvent("studio:theme-changed",{detail:{project:key,accent:entry.accent}}));
 return key;
}
window.StudioTheme={apply,current:()=>active,palette:slug=>palettes[slug]||palettes.nowgreen};
if(document.body)apply("nowgreen");
else document.addEventListener("DOMContentLoaded",()=>apply("nowgreen"),{once:true});
})();