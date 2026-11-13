import {neon} from "./driver.mjs";
const db=neon(process.env.DATABASE_URL),sql=(s,p=[])=>db.query(s,p);
const result=(x,s=200)=>Response.json(x,{status:s,headers:{"cache-control":"no-store"}});
const feeds={
 rtp_news:"https://www.rtp.pt/noticias/rss/pais",
 cascais_news:"https://www.cascais.pt/rsscascais/noticias2"
};
const host={rtp_news:"www.rtp.pt",cascais_news:"www.cascais.pt"};
function decode(s){return String(s||"").replace(/<!\[CDATA\[|\]\]>/gi,"").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));}
function field(xml,n){const m=xml.match(new RegExp("<"+n+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+n+">","i"));return m?m[1]:"";}
function plain(s){return decode(s).replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<br\s*\/?>|<\/p>|<\/div>|<\/h[1-6]>/gi,"\n").replace(/<[^>]+>/g," ").replace(/[ \t]+/g," ").replace(/ *\n+ */g,"\n").replace(/\n{3,}/g,"\n\n").trim();}
function approvedLink(url,code){try{const u=new URL(url);return u.protocol==="https:" && u.hostname===host[code]&&!u.username&&!u.password}catch{return false;}}
function textItems(xml){return [...xml.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,60).map(m=>{
 const piece=m[1],url=plain(field(piece,"link")),title=plain(field(piece,"title")),body=plain(field(piece,"description"));
 return {url,title,body};
}).filter(x=>x.url&&x.title);}
async function fetchRSS(code){const response=await fetch(feeds[code],{headers:{"accept":"application/rss+xml,application/xml,text/xml","user-agent":"PortugalRyadomEditorialEnrichment/1.0"},redirect:"error",signal:AbortSignal.timeout(17000)});if(!response.ok)throw Error("rss_http_"+response.status);const content=await response.text();if(content.length>2400000||!/<item\b/i.test(content))throw Error("invalid_rss");return textItems(content);}
async function enrich(code){
 const items=await fetchRSS(code);let checked=0,updated=0,skip=0;const longer=[];
 const [src]=await sql("SELECT id FROM pr_sources WHERE code=$1 AND verification_status IN ('verified_editorial','verified_official')",[code]);
 if(!src)return result({ok:false,reason:"unknown_source"},403);
 for(const item of items){
  if(!approvedLink(item.url,code)||item.body.length<60){skip++;continue;}
  let article=await sql("SELECT id,canonical_url,status,body_original FROM pr_items WHERE source_id=$1 AND canonical_url=$2 LIMIT 1",[src.id,item.url]);
  if(!article.length&&code==="rtp_news"){
   // Identical news can have alternate article/video URL forms; require identical final numeric ID.
   const id=item.url.match(/_([anv]\d{5,})$/)?.[1];
   if(id)article=await sql("SELECT id,canonical_url,status,body_original FROM pr_items WHERE source_id=$1 AND canonical_url LIKE $2 LIMIT 1",[src.id,"%_"+id]);
  }
  if(!article.length){skip++;continue;}
  const record=article[0];
  if(record.status!=="candidate"){skip++;continue;}
  checked++;
  const excerpt=item.body.slice(0,2200);
  if(excerpt.length>String(record.body_original||"").length){
   await sql("UPDATE pr_items SET body_original=$2,updated_at=now() WHERE id=$1::uuid AND status='candidate'",[record.id,excerpt]);
   updated++;
  }
  await sql("INSERT INTO pr_source_context(item_id,context_excerpt,extraction_method,source_url,is_verified) VALUES($1::uuid,$2,'rss_excerpt',$3,false) ON CONFLICT(item_id) DO UPDATE SET context_excerpt=EXCLUDED.context_excerpt,extraction_method='rss_excerpt',retrieved_at=now() WHERE pr_source_context.is_verified=false AND length(pr_source_context.context_excerpt)<length(EXCLUDED.context_excerpt)",[record.id,excerpt,item.url]);
  longer.push({id:record.id,len:excerpt.length});
 }
 return result({ok:true,source:code,rss_items:items.length,matched:checked,updated,skipped:skip,max_context_chars:Math.max(0,...longer.map(x=>x.len)),telegram_sent:0});
}
export default{async fetch(req){
 const path=new URL(req.url).pathname;
 if(path==="/health"&&req.method==="GET")return result({ok:true,mode:"verified_rss_context_only",sources:Object.keys(feeds)});
 if(req.method!=="POST"||!req.headers.get("x-neon-trigger-invocation-id"))return result({error:"trigger_required"},403);
 try{if(path==="/rtp")return await enrich("rtp_news");if(path==="/cascais")return await enrich("cascais_news");return result({error:"unknown_feed"},404);}
 catch(e){return result({ok:false,error:String(e.message||e).slice(0,150)},500);}
}};