import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('./i18n.js',import.meta.url),'utf8');
const match=script.match(/const words=([^;]+);/);
assert.ok(match,'Qwin language dictionary must exist');
const dictionary=JSON.parse(match[1]);
const keys=[...new Set([...html.matchAll(/data-t="([a-zA-Z][\w]*)"/g)]
  .map(x=>x[1]))];
for(const name of keys){
  assert.ok(dictionary[name],`Missing Qwin translation: ${name}`);
  assert.equal(dictionary[name].length,2,
    `Qwin translation must contain RU and PT: ${name}`);
  assert.ok(dictionary[name].every(x=>typeof x==='string'&&x.trim().length>0),
    `Qwin translation missing text: ${name}`);
}
const sections=[...html.matchAll(/<section[^>]+id="([^"]+)"/g)]
  .map(x=>x[1]);
for(const name of ['privacy','terms','safety','ai','delete','cookies','contact']){
  assert.ok(sections.includes(name),`Missing Qwin policy section: ${name}`);
}
for(const lang of ['ru','en','pt']){
  const elements=keys.map(k=>({
    key:k,dataset:{},textContent:`English original ${k}`,
    getAttribute:()=>k,
  }));
  const select={value:'',handler:null,addEventListener(_,fn){this.handler=fn}};
  const context={
    document:{
      documentElement:{lang:'en'},
      title:'',
      getElementById:()=>select,
      querySelectorAll:()=>elements,
    },
    location:{
      href:`https://mynw.app/qwin/?lang=${lang}`,
      search:`?lang=${lang}`
    },
    history:{replaceState(){}},
    localStorage:{getItem(){return null},setItem(){}},
    navigator:{language:'en-US'},
    URL,URLSearchParams,
  };
  runInNewContext(script,context,{timeout:1500});
  assert.equal(context.document.documentElement.lang,lang);
  assert.equal(select.value,lang);
  for(const element of elements){
    if(lang==='en')assert.equal(element.textContent,
      `English original ${element.key}`);
    else assert.equal(element.textContent,
      dictionary[element.key][lang==='ru'?0:1],
      `Translation not rendered for ${element.key}/${lang}`);
  }
}
console.log('Qwin documents validated: '+keys.length+
  ' translatable keys, 7 policy sections, RU EN PT locale switching');
