import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const read=path=>fs.readFileSync(new URL(path,import.meta.url),"utf8");
const html=read("../../journalstudio/cloud/portugal/index.html");
const editor=read("./preditor.mjs");
const publisher=read("./prpublish.mjs");
const photo=read("./prphoto.mjs");
const buffer=read("./prbuffer.mjs");
const design=read("../../journalstudio/cloud/portugal/instagram-cover-design.js");
const integration=read("../../journalstudio/cloud/portugal/instagram-cover-integration.js");
const stage=read("./instagram-typography-stale-guard-20261123.sql");
const telegramSql=read("./instagram-cover-and-telegram-footer-20261123.sql");
const hub=read("../../journalstudio/cloud/studio-brand-hub.js");
const journalShell=read("../../journalstudio/cloud/index.html");

test("Instagram cover is art-directed 4:5 JPEG with legible exact Russian text",()=>{
 const sandbox={window:{}};
 vm.runInNewContext(design,sandbox,{timeout:3000});
 const api=sandbox.window.PortugalInstagramCover;
 assert.equal(api.WIDTH,1080);assert.equal(api.HEIGHT,1350);
 const output=[];
 const gradient={addColorStop(){}};
 const ctx={createLinearGradient:()=>gradient,drawImage(){},fillRect(){},
  beginPath(){},moveTo(){},arcTo(){},closePath(){},fill(){},stroke(){},
  save(){},translate(){},rotate(){},strokeRect(){},restore(){},rect(){},clip(){},
  measureText:s=>({width:[...String(s)].length*31}),
  fillText:t=>output.push(t)};
 const canvas={getContext:()=>ctx,toDataURL:()=> "data:image/jpeg;base64,AQID"};
 api.draw(canvas,{width:1600,height:1000},
  "В аптеке нет нужного лекарства? Не спешите объезжать весь город",
  "family","editorial");
 assert.equal(canvas.width,1080);assert.equal(canvas.height,1350);
 assert.ok(output.some(s=>s.includes("ПОРТУГАЛИИ")));
 assert.ok(output.some(s=>s.includes("аптеке")));
 assert.ok(output.some(s=>s.includes("INSTAGRAM")||s.includes("instagram.com")));
 assert.equal(api.toJpeg(canvas),"data:image/jpeg;base64,AQID");
});

test("Compact Instagram covers keep 8 editorial titles inside a 4-line, <=350px headline panel",()=>{
 const sandbox={window:{}};
 vm.runInNewContext(design,sandbox,{timeout:3000});
 const {layoutTitle,HEIGHT}=sandbox.window.PortugalInstagramCover;
 const ctx={font:"",measureText(value){
  const size=Number(this.font.match(/(\d+)px/)?.[1]||60);
  return {width:[...String(value)].length*size*.53};
 }};
 const titles=[
  "В аптеке нет нужного лекарства? Не спешите объезжать весь город — есть другой порядок",
  "Жёлтый, оранжевый или красный: как правильно читать предупреждения IPMA",
  "Запомните номер 144: в Португалии есть круглосуточная социальная экстренная помощь",
  "Пробежка у океана — всегда полезно? Проверьте качество воздуха на карте QualAr",
  "Рейс из Португалии задержали или отменили? Иногда авиакомпания должна до €600",
  "Сколько баллов у ваших водительских прав в Португалии? Проверить можно онлайн",
  "Справка о несудимости в Португалии: €5, онлайн-запрос и важный нюанс для AIMA",
  "Трудно платить кредит? В Португалии есть бесплатная сеть помощи RACE — до суда",
  "Это исключительно длинный заголовок, который в любой ситуации должен показываться красиво и компактно даже тогда, когда редактор ошибочно вводит несколько очень длинных предложений, потому что изображение важнее стены текста, а весь текст статьи всегда останется в подписи к публикации"
 ];
 for(const t of titles){
  const p=layoutTitle(ctx,t,895);
  assert.ok(p.rows.length>=1&&p.rows.length<=4,t);
  assert.ok(p.size>=44&&p.size<=60,t);
  assert.ok(p.rows.every(row=>row.trim().length>0),t);
  const height=(p.rows.length-1)*p.rowHeight+p.size+73;
  assert.ok(height<=350,"Oversized headline block: "+height+" for "+t);
  assert.ok(height/HEIGHT<.26,t);
  assert.ok(p.rows.join(" ").length>30,t);
 }
 const oversized=layoutTitle(ctx,titles[8],895);
 assert.equal(oversized.rows.length,4);
 assert.ok(oversized.rows[3].endsWith("…"));
 assert.ok(design.includes("rounded(ctx,70,blockTop,940,blockHeight,19)"));
 assert.doesNotMatch(design,/let size=88,rowHeight=100/);
});


test("Bright Instagram v3 preserves photo, removes right diamonds and uses ПОРТУГАЛИЯ",()=>{
 const vmGlobals={window:{}};
 vm.runInNewContext(design,vmGlobals,{timeout:3000});
 const api=vmGlobals.window.PortugalInstagramCover;
 const draws=[],labels=[];
 const ctx={
   font:"",createLinearGradient:()=>{throw Error("Photo must not be darkened with a gradient")},
   drawImage:()=>draws.push(["photo"]),fillRect:(...args)=>draws.push(["fill",...args]),
   beginPath(){},moveTo(){},arcTo(){},closePath(){},fill(){},stroke(){},
   save(){},translate(){},rotate:()=>{throw Error("No decorative diamonds")},
   strokeRect:()=>{throw Error("No decorative diamonds")},restore(){},rect(){},clip(){},
   measureText:v=>({width:[...String(v)].length*24}),
   fillText:t=>labels.push(t)
 };
 const c={getContext:()=>ctx};
 api.draw(c,{width:1920,height:1080},
   "Рейс из Португалии задержали или отменили? Иногда авиакомпания должна до €600",
   "tips","editorial");
 assert.equal(c.width,1080);assert.equal(c.height,1350);
 assert.ok(draws.some(r=>r[0]==="photo"));
 assert.ok(!draws.some(r=>r[0]==="fill"&&r[3]===1080&&r[4]===1350),
   "Never paint a global dark rectangle over the original photo");
 assert.ok(labels.includes("ПОРТУГАЛИЯ / РЯДОМ"));
 assert.ok(!labels.some(v=>v.includes("PORTUGAL /")||v.includes("◈")));
 assert.match(design,/rgba\(255,255,255,\.88\)/);
 assert.ok(!design.includes("ctx.rotate(Math.PI/4)"));
 assert.ok(!design.includes("const overlay=ctx.createLinearGradient"));
 assert.match(integration,/p\.design_version===3/);
 assert.match(integration,/design_version:3/);
 assert.match(photo,/design_version:3/);
 assert.match(html,/instagram-cover-design\.js\?v=20261123-bright3/);
});

test("Embedded Portugal workspace cannot keep an older dark Instagram canvas",()=>{
 assert.match(hub,/portugal\/\?embedded=1&v=20261123-photo-original4/);
 assert.match(hub,/data-portugal-reload/);
 assert.match(hub,/refreshPortugalFrame\(\)/);
 assert.match(journalShell,/studio-brand-hub\.js\?v=20261123-photo-original4/);
 assert.match(html,/instagram-cover-design\.js\?v=20261123-photo-original4/);
 assert.match(html,/instagram-cover-integration\.js\?v=20261123-photo-original4/);
 assert.match(integration,/\.ig-phone \.ig-cover, \.ig-phone \.ig-cover-canvas/);
 assert.match(integration,/phone\.replaceWith\(canvas\)/);
 assert.match(html,/if\(mode==='instagram'\)\{\s*root\.classList\.remove\('pt-photo-adjust-enabled'\);\s*return;/);
});

test("Telegram has full article and a clickable inline Instagram-word footer",()=>{
 assert.match(telegramSql,/Наш канал в Инстаграмм: https:\/\/www\.instagram\.com\/pt_ryadom\//);
 assert.match(publisher,/richUrl\("Инстаграмм","https:\/\/www\.instagram\.com\/pt_ryadom\/"\)/);
 assert.match(publisher,/blocks\.push\(\{type:"footer",text:\["Наш канал в ",richUrl\("Инстаграмм"/);
 assert.ok(publisher.includes('return null; // always placed as the last footer below'));
 assert.match(html,/previewLink\("Инстаграмм","https:\/\/www\.instagram\.com\/pt_ryadom\/"\)/);
 assert.match(publisher,/const blocks=\[\{type:"photo"/);
 assert.match(telegramSql,/nullif\(trim\(x\.story\),''\)/);
});

test("Article rejection is exactly one click, no mandatory reason, no author note",()=>{
 assert.match(html,/function rejectWithoutNote\(/);
 assert.match(html,/action:"reject"\}\}/);
 assert.match(html,/\$\("rejectBtn"\)\.onclick=rejectWithoutNote/);
 assert.match(editor,/if\(a==="request_changes"&&note\.length<10\)/);
 assert.doesNotMatch(editor,/if\(a!=="reopen"&&note\.length<10\)/);
});

test("Instagram typography cannot replace Telegram original photo",()=>{
 assert.match(photo,/async function uploadInstagramCover/);
 assert.match(photo,/\/api\/instagram\/cover/);
 assert.match(photo,/generation_prompt/);
 assert.match(photo,/storage_key/);
 assert.match(photo,/1080/);
 assert.match(photo,/1350/);
 assert.match(photo,/rights_verified/);
 assert.match(stage,/generation_model='pt_ryadom_instagram_typography_v1'/);
 assert.match(stage,/\(m\.generation_prompt::jsonb->>'headline'\)=d\.headline_ru/);
 assert.match(stage,/\(m\.generation_prompt::jsonb->>'source_photo_url'\)=i\.photo_url/);
 assert.match(stage,/media\.public_url/);
 assert.match(html,/m\.generation_model!=="pt_ryadom_instagram_typography_v1"/);
 assert.match(html,/PtIgCover\.ensureApproved\(\)/);
 assert.match(integration,/attachedCover\(/);
 assert.match(integration,/action:"approve_media"/);
 assert.doesNotMatch(photo.slice(photo.indexOf("async function uploadInstagramCover")),/UPDATE pr_items SET photo_url/);
});

test("Only image-based Instagram posts; no Reels. Editor and Buffer keep full copy",()=>{
 assert.match(buffer,/instagram:\{type:"post",shouldShareToFeed:true/);
 assert.doesNotMatch(buffer,/instagram:\{type:"reel"/);
 assert.match(html,/Reels не создаются/);
 assert.match(html,/const room=Math\.min\(1900/);
 assert.match(html,/const story=String\(f\.story_ru\|\|""\)\.trim\(\)/);
 assert.match(design,/toDataURL\("image\/jpeg"/);
 assert.ok(photo.includes('"data:image/jpeg;base64,"'));
 assert.match(html,/instagram-cover-design\.js/);
 assert.match(html,/instagram-cover-integration\.js/);
});
