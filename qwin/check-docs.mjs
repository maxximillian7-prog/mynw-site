import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Main page promotes the mobile app; all legal copy belongs to /qwin/docs/.
const home=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const docs=readFileSync(new URL('./docs/index.html',import.meta.url),'utf8');
const css=readFileSync(new URL('./marketplace.css',import.meta.url),'utf8');
const script=readFileSync(new URL('./i18n.js',import.meta.url),'utf8');
const dictionaryStart=script.indexOf('const words=')+'const words='.length;
const dictionaryEnd=script.indexOf(';\nconst supported=',dictionaryStart);
assert.ok(dictionaryStart>='const words='.length && dictionaryEnd>dictionaryStart,
  'Qwin translation dictionary must exist');
const dictionary=JSON.parse(script.slice(dictionaryStart,dictionaryEnd));
const allKeys=[...new Set([...home.matchAll(/data-t="([a-zA-Z][\w]*)"/g),
  ...docs.matchAll(/data-t="([a-zA-Z][\w]*)"/g)].map(x=>x[1]))];
for(const key of allKeys){
  assert.ok(dictionary[key],'Missing RU/PT translation: '+key);
  assert.equal(dictionary[key].length,2,'Translation pair required: '+key);
  assert.ok(dictionary[key].every(v=>typeof v==='string'&&v.trim()),
    'Empty RU/PT translation: '+key);
}

const legacyIds=['documents','about','privacy','terms','safety','ai',
  'delete','partners','cookies','contact'];
for(const id of legacyIds){
  assert.ok(new RegExp('id="'+id+'"').test(docs),
    'Missing original document anchor in /docs/: #'+id);
  assert.ok(!new RegExp('id="'+id+'"').test(home),
    'Document must not remain on the promotional homepage: #'+id);
}
for(const id of ['marketplace','how','platforms']){
  assert.ok(new RegExp('id="'+id+'"').test(home),
    'Missing app-promotion section: #'+id);
}
for(const id of ['privacy','terms','safety','ai','delete','partners','cookies','contact']){
  assert.match(docs,new RegExp('<a class="doccard" href="#'+id+'"'),
    'Missing document menu link: #'+id);
}
assert.ok(home.includes('href="/qwin/docs/" data-t="navDocs"'),
  'Main navigation must open standalone documents menu');
assert.ok(home.includes('href="/qwin/docs/#contact"'),
  'Support navigation must open standalone documents');
assert.ok(home.includes('href="/qwin/docs/#safety"'),
  'Safety CTA must point to the moved document');
assert.ok(home.includes('app-showcase')&&home.includes('phone-shell'),
  'Homepage must remain a mobile app promotion');
assert.ok(!home.includes('demo-grid') && !home.includes('demo-price'),
  'Do not simulate live inventory or a web marketplace');
assert.ok(docs.includes('Qwin is independent from OLX, Etsy and eBay'),
  'Platform independence disclosure missing');
assert.ok(docs.includes("The term 'Etsy' is a trademark of Etsy, Inc. This application uses the Etsy API but is not endorsed or certified by Etsy, Inc."),
  'Etsy API disclaimer missing');
for(const selector of ['.phone-shell','.hero-content','.doccard','.docs-page-intro']){
  assert.ok(css.includes(selector),'Missing CSS: '+selector);
}

// Hash fragments never reach a web server. Redirect old published OAuth,
// legal and support URLs in the browser while preserving any ?lang parameter.
const redirect=home.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(redirect,'Legacy fragment redirect missing from Qwin homepage');
for(const id of legacyIds){
  let destination='';
  const location={hash:'#'+id,search:'?lang=ru',
    replace(next){destination=next;}};
  runInNewContext(redirect,{window:{location}},{timeout:1500});
  assert.equal(destination,'/qwin/docs/?lang=ru#'+id,
    'Existing /qwin/#'+id+' link no longer resolves');
}
{
  let destination=null;
  const location={hash:'#marketplace',search:'',
    replace(next){destination=next;}};
  runInNewContext(redirect,{window:{location}},{timeout:1500});
  assert.equal(destination,null,'Marketing anchors must stay on Qwin homepage');
}

// Check both pages, not just the homepage, in three supported languages.
for(const [page,url] of [['home','https://mynw.app/qwin/'],
                         ['docs','https://mynw.app/qwin/docs/']]){
  for(const lang of ['ru','en','pt']){
    const elements=allKeys.map(key=>({
      key,dataset:{},textContent:'English original '+key,
      getAttribute:()=>key,
    }));
    const select={value:'',handler:null,addEventListener(_,fn){this.handler=fn;}};
    const context={
      document:{documentElement:{lang:'en'},title:'',
        getElementById:()=>select,querySelectorAll:()=>elements},
      location:{href:url+'?lang='+lang,search:'?lang='+lang},
      history:{replaceState(){}},
      localStorage:{getItem(){return null;},setItem(){}},
      navigator:{language:'en-US'},URL,URLSearchParams,
    };
    runInNewContext(script,context,{timeout:1500});
    assert.equal(context.document.documentElement.lang,lang);
    assert.equal(select.value,lang);
    for(const element of elements){
      assert.equal(element.textContent,lang==='en'
        ?'English original '+element.key
        :dictionary[element.key][lang==='ru'?0:1],
      'Missing text for '+page+'/'+lang+'/'+element.key);
    }
    if(page==='docs')assert.match(context.document.title,/Qwin/);
  }
}

console.log('Qwin validated: promotional home; separate docs with '+legacyIds.length+
 ' working legacy URLs; '+allKeys.length+' translated keys; RU/EN/PT.');
