import test from "node:test";
import assert from "node:assert/strict";
import {chooseCoverDirection,coverPrompt} from "./prphoto.mjs";

const ARTICLE=(headline,category,story)=>{
 const title=headline;
 return {headline_ru:title,primary_category:category,story_ru:story||"Подробный редакционный текст о реальной жизненной ситуации в Португалии, где читателю важно получить точную, понятную и практическую информацию. Это не реклама и не туристический путеводитель."};
};
const articles=[
 ARTICLE("Трудно платить кредит? В Португалии есть бесплатная сеть помощи RACE","work"),
 ARTICLE("Магазин не возвращает деньги? Есть арбитраж","tips"),
 ARTICLE("Как работает бесплатная цифровая библиотека BiblioLED","family"),
 ARTICLE("Что делать, если ребёнок столкнулся с травлей в школе","family"),
 ARTICLE("Кому принадлежит кошка или собака с микрочипом SIAC","life"),
 ARTICLE("Подать заявление в полицию PSP онлайн","documents"),
 ARTICLE("Арендодатель не зарегистрировал квартиру","documents"),
 ARTICLE("Что делать при получении медицинской страховки","family"),
 ARTICLE("Попали в небольшое ДТП на дороге","life"),
 ARTICLE("Почему вырос тариф электричества","life"),
 ARTICLE("Тропы, пляжи и природные парки Португалии","places"),
 ARTICLE("Концерт и театральный фестиваль в Лиссабоне","events"),
 ARTICLE("Как использовать цифровое приложение онлайн","tips")
];
test("Article themes select different physical focal subjects rather than a generic woman/city",()=>{
 const chosen=articles.map((a,i)=>chooseCoverDirection(a,"article-"+i,[]));
 assert.ok(new Set(chosen.map(x=>x.topic)).size>=10);
 for(const d of chosen)assert.match(d.scene,/./);
 for(const [i,article] of articles.entries()){
  const prompt=coverPrompt(article,chosen[i]);
  assert.match(prompt,/PT_VISUAL_RULE_V2/);
  assert.match(prompt,/SPECIFIC SUBJECT TO DEPICT/);
  assert.match(prompt,/NO PEOPLE by default/);
  assert.doesNotMatch(prompt,/create a young woman in the street/i);
 }
});
test("Three generated variants for one article rotate scenes and camera angles",()=>{
 const article=articles[0],id="same-article";
 const history=[];
 const picked=[];
 for(let i=0;i<3;i++){
  const next=chooseCoverDirection(article,id,history);
  picked.push(next);
  history.unshift({item_id:id,generation_prompt:coverPrompt(article,next)});
 }
 assert.equal(new Set(picked.map(x=>x.sceneId)).size,3);
 assert.equal(new Set(picked.map(x=>x.angleId)).size,3);
});
test("A run of articles avoids repeating the last selected visual concept",()=>{
 const history=[],directions=[];
 for(let i=0;i<articles.length;i++){
  const article=articles[i],id="multi-"+i;
  const next=chooseCoverDirection(article,id,history);
  history.unshift({item_id:id,generation_prompt:coverPrompt(article,next)});
  directions.push(next);
 }
 const firstAngles=directions.slice(0,9).map(x=>x.angleId);
 assert.ok(new Set(firstAngles).size>=3);
 assert.ok(new Set(directions.map(x=>x.sceneId)).size>=10);
});
