import {neon} from "./driver.mjs";
import {createHash} from "node:crypto";
const db=neon(process.env.DATABASE_URL),sql=(q,p=[])=>db.query(q,p),json=(v,s=200)=>Response.json(v,{status:s});
const SHA=t=>createHash("sha256").update(t).digest("hex");
const clean=t=>String(t||"").replace(/<!\[CDATA\[|\]\]>/gi,"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<br\s*\/?>|<\/p>|<\/div>/gi,"\n").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
const xmlTag=(xml,name)=>{const m=xml.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+name+">","i"));return m?m[1]:""};
const pt=/(portugal|portugu[eê]s|lisboa|porto|algarve|cascais|sintra|set[úu]bal|coimbra|braga|aveiro|madeira|a[cç]ores|faro|viseu|leiria|santar[eé]m|oeiras|amadora|loul[eé]|nacional|governo|autarqu|munic[ií]p|c[âa]mara |presidente da rep[úu]blica|assembleia da rep[úu]blica|aima|sns|seguran[cç]a social|irs|finan[cç]as)/i;
const patterns={
 documents:/aima|resid[êe]ncia|autoriza[cç][ãa]o de|passaport|cart[ãa]o de cidad|visto|nacionalidade|cidadania|imigra[cç]|reagrupamento|licen[cç]a|certid[ãa]o|burocracia|document|servi[cç]o p[úu]blico/i,
 family:/crian[cç]|fam[ií]li|filho|filha|escola|educa[cç]|ensino|professor|universidade|estudante|inf[âa]ncia|creche|aluno|parental|bolsa de estudo|juven|adolesc|jardim de inf[âa]ncia/i,
 work:/emprego|trabalho|sal[áa]rio|remunera[cç]|profiss|desemprego|subs[ií]dio|irs|impost|finan[cç]as|atividade|pens[ãa]o|rendimento|economia|empresa|contrato de trabalho|teletrabalho|apoio social/i,
 life:/habita[cç]|arrendamento|renda|casa|moradia|transport|metro|comboio|autocarro|[úu]tente|sa[úu]de|hospital|centro de sa[úu]de|sns|alimenta[cç]|mercado|custo de vida|eletricidade|energia|[áa]gua|seguran[cç]a rodovi[áa]ria/i,
 tips:/como |dicas|guia pr[áa]tico|passo a passo|poupar|gratuit|desconto|vantagen|servi[cç]o digital|online|app|candidatura|inscri[cç][ãa]o|prevenir|evitar|procedimento|hor[áa]rio|acesso|benef[ií]cio|recomenda[cç][ãa]o/i,
 places:/turism|praia|parque natural|passeio|trilho|percurs|castelo|museu|patrim[óo]nio|monumento|visitar|viagem|paisagem|sintra|rio douro|serra|costa|rota|destino|caminhada|praias/i,
 events:/festival|concerto|feira|exposi[cç]|teatro|espet[áa]culo|agenda cultural|evento|festival|m[úu]sica ao vivo|mostra|cinema|oficina|visita guiada/i,
 news:/aviso|alerta|interrup[cç]|restri[cç]|greve|tempestade|prote[cç][ãa]o civil|decis[ãa]o|lei|medida|governo|novo programa|prazo|regras|regulamento|anuncia/i
};
const actionable=/prazo|pre[cç]o|regras|apoio|novas medidas|entrada em vigor|alter[aã][cç]|quando|como |onde |redu[cç]|gratuit|abertura|inscri[cç]|candidatura|bilhete|alerta|hor[áa]rio|pagamento|subsid|benef[ií]cio/i;
const reject=/celebridade|fofoca|hor[oó]scopo|reality show|meme|star wars|darth vader|nvidia|bitcoin|elon musk|trump|iran|ir[ãa]o|usa|eua|israel|ucr[âa]nia|r[úu]ssia|guerra mundial/i;
const evalItem=(title,body,preferred)=>{
 const merged=(title+" "+body).toLowerCase();
 if(!pt.test(merged)||reject.test(merged))return null;
 let category=preferred,weight=0;
 for(const [code,rx] of Object.entries(patterns)){const m=merged.match(rx),n=m?m.length:0;
  let bonus=code==="events"?-12:0;
  if(n&&code!=="news")bonus+=17;
  if(n&&code===preferred)bonus+=4;
  if(m&&bonus>weight){category=code;weight=bonus}
 }
 if(!patterns[category]?.test(merged))return null;
 let score=20+(pt.test(title)?19:9)+(body.length>=160?14:body.length>=100?7:0)+
 (body.length>260?5:0)+(actionable.test(merged)?21:0)+(weight>0?15:0)+
 (/(\d{1,3}\s?€|20\d\d|[0-9]{1,2}:[0-9]{2})/.test(merged)?8:0);
 if(category==="events")score-=11;
 if(category==="news"&&!actionable.test(merged))score-=18;
 return{category,score:Math.min(100,Math.max(0,score)),reason:"Выбран за практическую полезность, актуальность и привязку к Португалии; полный русскоязычный рерайт и изображение ещё требуются"};
};
function parseRSS(raw){
 const found=[...raw.matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)].slice(0,70);
 return found.map(x=>{const piece=x[1];return{title:clean(xmlTag(piece,"title")),url:clean(xmlTag(piece,"link")),body:clean(xmlTag(piece,"description")),time:clean(xmlTag(piece,"pubDate"))}}).filter(x=>x.title&&x.url);
}
const verifiedHost=(url,host)=>{try{const u=new URL(url);return u.protocol==="https:"&&u.hostname.toLowerCase()===host.toLowerCase()&&!u.username&&!u.password}catch{return false}};
export default {async fetch(req){
 const path=new URL(req.url).pathname;
 if(path==="/health")return json({ok:true,service:"prdiscover",mode:"scored_research_with_limited_rtp_promotion"});
 if(req.method!=="POST"||!req.headers.get("x-neon-trigger-invocation-id"))return json({error:"scheduled_only"},403);
 try{
  const [feed]=await sql("SELECT f.* FROM pr_discovery_feeds f WHERE f.is_enabled ORDER BY COALESCE(f.last_scan_at,'1970-01-01'::timestamptz) ASC LIMIT 1");
  if(!feed)return json({ok:true,skipped:"no_enabled_source"});
  if(!verifiedHost(feed.feed_url,feed.expected_host))throw Error("feed_host_mismatch");
  const response=await fetch(feed.feed_url,{redirect:"error",headers:{"accept":"application/rss+xml,application/xml,text/xml","user-agent":"PortugaliaRyadomEditorialCurator/1.0"},signal:AbortSignal.timeout(17000)});
  if(!response.ok)throw Error("feed_http_"+response.status);
  const xml=await response.text();if(xml.length>2400000||!xml.includes("<item"))throw Error("invalid_feed");
  const options=parseRSS(xml);let saved=0,promoted=0,rejected=0,duplicate=0;
  const limits=await sql("SELECT category_code,weekly_target_max FROM pr_editorial_priority WHERE enabled=true");
  const caps=new Map(limits.map(x=>[x.category_code,x.weekly_target_max]));
  const current=await sql("SELECT recommended_category,count(*) AS n FROM pr_discovery_hits WHERE created_at>now()-interval '7 days' GROUP BY recommended_category");
  const counts=new Map(current.map(x=>[x.recommended_category,Number(x.n)]));
  const usedThisScan=new Map();
  const candidates=[];
  for(const item of options){
   if(!verifiedHost(item.url,feed.expected_host)||item.title.length<20||item.body.length<95||item.body.length>14000){rejected++;continue}
   const when=new Date(item.time);if(!Number.isFinite(when.getTime())||when.getTime()<Date.now()-7*86400000||when.getTime()>Date.now()+86400000){rejected++;continue}
   const val=evalItem(item.title,item.body,feed.primary_category);
   if(!val||val.score<feed.min_score){rejected++;continue}
   if(val.category==="events"&&feed.source_family==="rtp_news"){rejected++;continue}
   candidates.push({...item,when,val});
  }
  candidates.sort((a,b)=>b.val.score-a.val.score);
  for(const x of candidates){
   if(saved>=feed.max_per_run)break;
   const cat=x.val.category,cap=caps.get(cat)||4;
   if((counts.get(cat)||0)+(usedThisScan.get(cat)||0)>=cap)continue;
   const dupe=await sql("SELECT id FROM pr_discovery_hits WHERE canonical_url=$1 LIMIT 1",[x.url]);
   if(dupe.length){duplicate++;continue}
   const [inserted]=await sql("INSERT INTO pr_discovery_hits(feed_code,canonical_url,original_title,excerpt_original,source_published_at,recommended_category,interest_score,reason_ru,stage) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'research') ON CONFLICT(canonical_url) DO NOTHING RETURNING id",[feed.code,x.url,x.title,x.body.slice(0,7000),x.when.toISOString(),cat,x.val.score,x.val.reason]);
   if(!inserted){duplicate++;continue}
   saved++;usedThisScan.set(cat,(usedThisScan.get(cat)||0)+1);
   if(feed.source_family==="rtp_news"){
    const [src]=await sql("SELECT id FROM pr_sources WHERE code='rtp_news' AND is_enabled=true");
    if(src){
     const external=SHA(x.url);
     const r=await sql("INSERT INTO pr_items(source_id,external_id,canonical_url,content_fingerprint,title_original,body_original,original_language,primary_category,source_published_at,importance,ingested_via,photo_rights,status) VALUES($1,$2,$3,$4,$5,$6,'pt',$7,$8,$9,'curated_rss','unverified','candidate') ON CONFLICT(source_id,external_id) DO NOTHING RETURNING id",[src.id,external,x.url,SHA(x.title.toLowerCase()),x.title,x.body.slice(0,7000),cat,x.when.toISOString(),x.val.score>=85?3:2]);
     if(r.length){promoted++;await sql("UPDATE pr_discovery_hits SET stage='promoted',item_id=$2::uuid WHERE id=$1",[inserted.id,r[0].id])}
    }
   }
  }
  await sql("UPDATE pr_discovery_feeds SET last_scan_at=now(),last_error=NULL,last_new_count=$2 WHERE code=$1",[feed.code,saved]);
  return json({ok:true,feed:feed.code,feed_items:options.length,passing_criteria:candidates.length,rejected,saved_research_hits:saved,promoted_to_translation_rtp:promoted,duplicate,telegram_sent:0});
 }catch(e){
  const msg=String(e.message||e).slice(0,160);
  await sql("UPDATE pr_discovery_feeds SET last_scan_at=now(),last_error=$2,last_new_count=0 WHERE code=(SELECT code FROM pr_discovery_feeds WHERE is_enabled ORDER BY COALESCE(last_scan_at,'1970-01-01'::timestamptz) LIMIT 1)",["",msg]).catch(()=>{});
  return json({ok:false,error:msg},500)
 }
}};
