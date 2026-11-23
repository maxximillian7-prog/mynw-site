/* Portugal Ryadom editorial cover: exact typographic lettering, 4:5 JPEG.
   Browser Canvas deliberately produces the headline; image AI models cannot
   guarantee correct Russian spelling. This asset is Instagram-only. */
(function(global){
"use strict";
const WIDTH=1080,HEIGHT=1350;
const THEMES={
 editorial:{accent:"#F9CE7B",shade:"#052F35",edge:"#B3E9D9"},
 noir:{accent:"#E9F2ED",shade:"#091F29",edge:"#77B3B0"},
 sunset:{accent:"#FFC08E",shade:"#4A2638",edge:"#F4D4B2"},
};
const tr=k=>({documents:"ДОКУМЕНТЫ",family:"СЕМЬЯ",life:"ЖИЗНЬ",work:"РАБОТА",tips:"ПОЛЕЗНОЕ",travel:"ПУТЕШЕСТВИЯ",events:"СОБЫТИЯ",news:"НОВОСТИ"})[k]||"ПОРТУГАЛИЯ";
const safeColor=v=>THEMES[v]?v:"editorial";
function rounded(ctx,x,y,w,h,r){
 const radius=Math.min(r,w/2,h/2);
 ctx.beginPath();ctx.moveTo(x+radius,y);ctx.arcTo(x+w,y,x+w,y+h,radius);
 ctx.arcTo(x+w,y+h,x,y+h,radius);ctx.arcTo(x,y+h,x,y,radius);ctx.arcTo(x,y,x+w,y,radius);ctx.closePath();
}
function linesFor(ctx,text,maxWidth){
 const words=String(text||"").trim().replace(/\s+/g," ").split(" ");
 const rows=[];let line="";
 for(const word of words){
  const next=line?line+" "+word:word;
  if(ctx.measureText(next).width<=maxWidth||!line){line=next;continue}
  rows.push(line);line=word;
 }
 if(line)rows.push(line);
 return rows;
}
function draw(canvas,photo,title,category,variant="editorial"){
 if(!canvas||!photo)throw Error("Нужно исходное фото");
 const theme=THEMES[safeColor(variant)];
 canvas.width=WIDTH;canvas.height=HEIGHT;
 const ctx=canvas.getContext("2d",{alpha:false});if(!ctx)throw Error("Canvas недоступен");
 const w=photo.width||photo.naturalWidth,h=photo.height||photo.naturalHeight;
 if(!w||!h)throw Error("Пустая фотография");
 const scale=Math.max(WIDTH/w,HEIGHT/h),rw=WIDTH/scale,rh=HEIGHT/scale;
 ctx.drawImage(photo,(w-rw)/2,(h-rh)/2,rw,rh,0,0,WIDTH,HEIGHT);
 const overlay=ctx.createLinearGradient(0,0,0,HEIGHT);
 overlay.addColorStop(0,"rgba(1,19,24,.49)");
 overlay.addColorStop(.32,"rgba(1,19,24,.12)");
 overlay.addColorStop(.51,"rgba(1,19,24,.43)");
 overlay.addColorStop(.74,"rgba(1,19,24,.86)");
 overlay.addColorStop(1,theme.shade);
 ctx.fillStyle=overlay;ctx.fillRect(0,0,WIDTH,HEIGHT);
 // The color bar and tile-like quads echo azulejo without imitating the logo.
 ctx.fillStyle=theme.accent;ctx.fillRect(67,70,8,113);
 ctx.strokeStyle=theme.edge;ctx.lineWidth=3;
 for(let k=0;k<3;k++){
  ctx.save();ctx.translate(861+55*k,93);ctx.rotate(Math.PI/4);
  ctx.strokeRect(-17,-17,34,34);ctx.restore();
 }
 ctx.textBaseline="alphabetic";
 ctx.font='700 27px "Manrope","Arial",sans-serif';ctx.fillStyle="#F9FAF7";
 ctx.letterSpacing="4px";ctx.fillText("PORTUGAL / РЯДОМ",96,102);ctx.letterSpacing="0px";
 ctx.font='700 23px "Manrope","Arial",sans-serif';
 ctx.fillStyle=theme.accent;ctx.fillText(tr(category),96,173);
 const x=70,maxWidth=940;
 let size=88,rowHeight=100,rows=[];
 for(;size>=56;size-=4){
  ctx.font='900 '+size+'px "Manrope","Arial",sans-serif';
  rows=linesFor(ctx,title,maxWidth);
  rowHeight=Math.round(size*1.16);
  if(rows.length<=6&&rows.length*rowHeight<=620)break;
 }
 if(rows.length>7)throw Error("Слишком длинный заголовок для обложки: сократите его");
 const blockHeight=rows.length*rowHeight;
 const start=Math.min(1010-blockHeight,Math.max(405,900-blockHeight/2));
 rounded(ctx,54,start-48,972,blockHeight+130,24);
 ctx.fillStyle=variant==="noir"?"rgba(3,17,22,.56)":"rgba(3,25,32,.33)";
 ctx.fill();ctx.strokeStyle="rgba(255,255,255,.18)";ctx.lineWidth=2;ctx.stroke();
 ctx.save();ctx.beginPath();ctx.rect(70,start-33,940,blockHeight+90);ctx.clip();
 ctx.shadowColor="rgba(0,0,0,.36)";ctx.shadowBlur=18;ctx.shadowOffsetY=5;
 rows.forEach((line,i)=>{
  ctx.fillStyle=(i===0?theme.accent:"#FFFFFF");
  ctx.font='900 '+size+'px "Manrope","Arial",sans-serif';
  ctx.fillText(line,x,start+i*rowHeight,maxWidth);
 });
 ctx.restore();
 const lower=Math.max(1175,start+blockHeight+62);
 ctx.fillStyle=theme.accent;ctx.fillRect(69,lower,72,6);
 ctx.font='600 23px "Manrope","Arial",sans-serif';
 ctx.fillStyle="#FFFFFF";ctx.fillText("О ПОРТУГАЛИИ — ПОНЯТНО И ПО ДЕЛУ",69,lower+49);
 ctx.fillStyle="rgba(255,255,255,.74)";ctx.font='600 19px "Manrope","Arial",sans-serif';
 ctx.fillText("instagram.com/pt_ryadom",69,1300);
 ctx.font='700 18px "Manrope","Arial",sans-serif';ctx.fillStyle=theme.edge;
 ctx.fillText("◈  MYNOW EDITORIAL",827,1300);
 return canvas;
}
async function createPreview(canvas,blob,title,category,variant){
 const bmp=await createImageBitmap(blob);
 try{return draw(canvas,bmp,title,category,variant)}
 finally{bmp.close()}
}
function toJpeg(canvas){
 for(const quality of [.86,.78,.68,.58]){
  const raw=canvas.toDataURL("image/jpeg",quality);
  if(raw.length<2600000)return raw;
 }
 throw Error("Файл обложки слишком большой. Уменьшите исходное изображение.");
}
global.PortugalInstagramCover={draw,createPreview,toJpeg,WIDTH,HEIGHT,THEMES};
})(window);
