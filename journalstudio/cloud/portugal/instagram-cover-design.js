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
// Keep a visual editorial headline, not a full-screen wall of text.
// Preserve whole words. Only exceptionally long cover titles receive an ellipsis;
// the full original title always stays in the article and Instagram caption.
function layoutTitle(ctx,source,maxWidth=895){
 const title=String(source||"").replace(/\s+/g," ").trim();
 if(!title)throw Error("Укажите заголовок статьи");
 let rows=[],size=60,rowHeight=69;
 for(;size>=44;size-=2){
  ctx.font='800 '+size+'px "Manrope","Arial",sans-serif';
  rows=linesFor(ctx,title,maxWidth);
  rowHeight=Math.round(size*1.13);
  if(rows.length<=4&&rows.length*rowHeight<=275)break;
 }
 if(rows.length>4){
  size=44;
  const complete=rows.slice(0,3);
  let fourth=rows[3]||"";
  while(fourth&&ctx.measureText(fourth.replace(/[\s.,;:!—–-]+$/u,"")+"…").width>maxWidth){
   const cut=fourth.lastIndexOf(" ");
   if(cut<1)break; // An unusually long word is scaled by canvas fillText.
   fourth=fourth.slice(0,cut).trim();
  }
  rows=[...complete,fourth.replace(/[\s.,;:!—–-]+$/u,"")+"…"];
 }
 return {rows,size,rowHeight,shortened:rows.join(" ")!==title};
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
 // Original photograph stays bright: no full-frame darkening,
 // gradients, vignettes or decorative diamonds.
 // A compact light editorial label keeps the name readable on any photo.
 rounded(ctx,58,47,636,150,17);
 ctx.fillStyle="rgba(255,255,255,.88)";ctx.fill();
 ctx.strokeStyle="rgba(18,67,68,.16)";ctx.lineWidth=1.5;ctx.stroke();
 ctx.fillStyle=theme.shade;ctx.fillRect(78,67,6,108);
 ctx.textBaseline="alphabetic";
 ctx.font='700 27px "Manrope","Arial",sans-serif';ctx.fillStyle="#163A3D";
 ctx.letterSpacing="2px";ctx.fillText("ПОРТУГАЛИЯ / РЯДОМ",106,106);ctx.letterSpacing="0px";
 ctx.font='700 23px "Manrope","Arial",sans-serif';
 ctx.fillStyle="#336A6A";ctx.fillText(tr(category),106,164);
 // Compact Instagram headline: at most four lines, confined to the
 // bottom 25% of the image. The full article title remains in the caption.
 const x=92,maxWidth=895;
 const {rows,size,rowHeight}=layoutTitle(ctx,title,maxWidth);
 const firstBaseline=1055-(rows.length-1)*rowHeight;
 const blockTop=firstBaseline-size-24;
 const blockHeight=(rows.length-1)*rowHeight+size+73;
 rounded(ctx,70,blockTop,940,blockHeight,19);
 // The photo is never dimmed; only the typographic panel is translucent white.
 ctx.fillStyle="rgba(255,255,255,.88)";
 ctx.fill();ctx.strokeStyle="rgba(20,72,73,.18)";ctx.lineWidth=1.5;ctx.stroke();
 ctx.save();ctx.beginPath();ctx.rect(86,blockTop+8,908,blockHeight-16);ctx.clip();
 ctx.shadowColor="rgba(255,255,255,.18)";ctx.shadowBlur=7;ctx.shadowOffsetY=1;
 rows.forEach((line,i)=>{
  ctx.fillStyle=i===0?theme.shade:"#173A40";
  ctx.font='800 '+size+'px "Manrope","Arial",sans-serif';
  ctx.fillText(line,x,firstBaseline+i*rowHeight,maxWidth);
 });
 ctx.restore();
 const lower=1185;
 rounded(ctx,56,1168,968,151,18);
 ctx.fillStyle="rgba(255,255,255,.86)";ctx.fill();
 ctx.fillStyle="#336A6A";ctx.fillRect(76,1191,72,5);
 ctx.font='600 23px "Manrope","Arial",sans-serif';
 ctx.fillStyle="#163A3D";ctx.fillText("О ПОРТУГАЛИИ — ПОНЯТНО И ПО ДЕЛУ",76,1233);
 ctx.fillStyle="#466E6C";ctx.font='600 19px "Manrope","Arial",sans-serif';
 ctx.fillText("instagram.com/pt_ryadom",76,1294);
 ctx.font='700 18px "Manrope","Arial",sans-serif';ctx.fillStyle="#466E6C";
 ctx.fillText("MYNOW EDITORIAL",844,1294);
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
global.PortugalInstagramCover={draw,layoutTitle,createPreview,toJpeg,WIDTH,HEIGHT,THEMES};
})(window);
