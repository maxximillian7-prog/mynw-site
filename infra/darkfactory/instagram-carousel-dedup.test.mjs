import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const html=readFileSync(new URL("../../journalstudio/cloud/darkfactory.html",import.meta.url),"utf8");
const start=html.indexOf("function sentenceParts(text){");
const end=html.indexOf("function wrapCanvas(ctx,text",start);
assert.ok(start>=0&&end>start&&end-start<16000,"Carousel source must be extractable");
const {slidesFor,sentenceParts}=runInNewContext(
 html.slice(start,end)+"\n({slidesFor,sentenceParts})",{});
const copyKey=value=>String(value||"").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const ruParts=Array.from({length:9},(_,i)=>
 `Это уникальная подробность ${i+1}: прибор фиксирует измерение и показывает строго определённый результат эксперимента.`);
const enParts=Array.from({length:9},(_,i)=>
 `Distinct detail ${i+1}: the instrument measures a specific signal and reports an independent result for this experiment.`);
const item={
 format_type:"carousel",title:"Проверенный научный факт",title_en:"Verified science fact",
 hook:"Удивительный результат эксперимента.",hook_en:"A surprising experimental result.",
 body:ruParts.join(" "),body_en:enParts.join(" "),punch:ruParts.at(-1)
};

function assertNoLastSlideDuplicates(slides,lastFact){
 assert.equal(slides.length,7,"Expected a seven-slide carousel");
 const last=slides.at(-1).body,prev=copyKey(slides.at(-2).body);
 const ending=copyKey(lastFact);
 assert.ok(copyKey(last).includes(ending),"Final slide must retain the conclusion");
 assert.ok(!prev.includes(ending),"Penultimate slide must not repeat the conclusion");
 for(const sentence of sentenceParts(last)){
  const key=copyKey(sentence);
  if(key.length>45)assert.ok(!prev.includes(key),"Final slide repeats previous copy");
 }
}

test("Russian seven-slide carousel keeps the ending exclusive to slide seven",()=>{
 assertNoLastSlideDuplicates(slidesFor(item,false),ruParts.at(-1));
});

test("English seven-slide carousel keeps the ending exclusive to slide seven",()=>{
 assertNoLastSlideDuplicates(slidesFor(item,true),enParts.at(-1));
});

test("Already repeated RU punch is omitted from the final card",()=>{
 const cards=slidesFor(item,false);
 const finale=cards.at(-1).body;
 assert.equal(finale.split(ruParts.at(-1)).length-1,1,
  "Conclusion/punch should appear only once on the final card");
});

test("Independent punch line is retained without duplicating story text",()=>{
 const punch="А теперь подумай, какое ещё открытие может изменить наши представления!";
 const cards=slidesFor({...item,punch},false);
 assert.ok(cards.at(-1).body.includes(punch));
 assert.ok(!cards.at(-2).body.includes(punch));
});

test("Single-card formats remain single-card",()=>{
 assert.equal(slidesFor({...item,format_type:"card"},false).length,1);
 assert.equal(slidesFor({...item,format_type:"photo_story"},true).length,1);
});
