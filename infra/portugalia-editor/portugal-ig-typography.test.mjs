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

test("Telegram has full article and a clickable inline Instagram-word footer",()=>{
 assert.match(telegramSql,/Наш канал в Инстаграмм: https:\/\/www\.instagram\.com\/pt_ryadom\//);
 assert.match(publisher,/richUrl\("Инстаграмм","https:\/\/www\.instagram\.com\/pt_ryadom\/"\)/);
 assert.match(publisher,/if\(!full\.includes\("https:\/\/www\.instagram\.com\/pt_ryadom\/"\)\)/);
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
