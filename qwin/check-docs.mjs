import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const script=readFileSync(new URL('./i18n.js',import.meta.url),'utf8');
const dictionaryStart=script.indexOf('const words=')+'const words='.length;
const dictionaryEnd=script.indexOf(';\nconst supported=',dictionaryStart);
assert.ok(dictionaryStart>='const words='.length&&dictionaryEnd>dictionaryStart,
  'Qwin language dictionary must exist');
const dictionary=JSON.parse(script.slice(dictionaryStart,dictionaryEnd));
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
const requiredSections=['marketplace','how','platforms','documents','about',
  'privacy','terms','safety','ai','delete','partners','cookies','contact'];
for(const id of requiredSections){
  assert.ok(new RegExp('id="'+id+'"').test(html),
    'Missing app landing or documentation anchor: '+id);
}
assert.match(html,/<div class="app-showcase"/,
  'Promotional page must present the mobile application');
assert.match(html,/phone-shell/,
  'Illustrative app-phone preview must be present');
assert.ok(!html.includes('demo-grid') && !html.includes('demo-price'),
  'Promotional website must not simulate a live sales catalogue');
assert.ok(html.includes('Qwin is independent from OLX, Etsy and eBay'),
  'Provider independence must be disclosed');
assert.ok(html.includes("The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc."),
  'Official Etsy API disclaimer must be present verbatim');
assert.ok(!html.includes('https://play.google.com/store/apps/details?id=') && !html.includes('https://apps.apple.com/app/'),
  'Do not advertise nonexistent public app-store listing links');
const css=readFileSync(new URL('./marketplace.css',import.meta.url),'utf8');
for(const selector of ['.phone-shell','.hero-content','.partner-card','.doccard']){
  assert.ok(css.includes(selector),'Missing core marketing CSS: '+selector);
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
console.log('Qwin promotional site and documents validated: '+keys.length+
  ' translatable keys, 7 policy sections, RU EN PT locale switching');
