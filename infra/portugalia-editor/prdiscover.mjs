import {neon} from "./driver.mjs";
import {createHash} from "node:crypto";
const db=neon(process.env.DATABASE_URL),sql=(q,p=[])=>db.query(q,p),json=(v,s=200)=>Response.json(v,{status:s});
const SHA=t=>createHash("sha256").update(t).digest("hex");
const clean=t=>String(t||"").replace(/<!\[CDATA\[|\]\]>/gi,"").replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<br\s*\/?>|<\/p>|<\/div>/gi,"\n").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([a-f0-9]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16))).replace(/[ \t]+/g," ").replace(/\n{3,}/g,"\n\n").trim();
const xmlTag=(xml,name)=>{const m=xml.match(new RegExp("<"+name+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/"+name+">","i"));return m?m[1]:""};
const pt=/(portugal|portugu[eê]s|lisboa|porto|algarve|cascais|sintra|set[úu]bal|coimbra|braga|aveiro|madeira|a[cç]ores|faro|viseu|leiria|santar[eé]m|oeiras|amadora|loul[eé]|nacional|governo|autarqu|munic[ií]p|c[âa]mara |presidente da rep[úu]blica|assembleia da rep[úu]blica|aima|sns|seguran[cç]a social|irs|finan[cç]as)/i;
// Strict, reader-centred topic classification. Do not classify from accidental words in summaries.
const topicTitle={
 documents:/\b(aima|sef|autoriza[cç][ãa]o de resid[êe]ncia|t[ií]tulo de resid[êe]ncia|visto[s]?|passaporte[s]?|nacionalidade|cidadania|cart[ãa]o de cidad[ãa]o|nif|niss|reagrupamento familiar|documentos pessoais|certid[ãa]o de nascimento|renova[cç][ãa]o de documentos)\b/i,
 family:/\b(escola[s]?|creche[s]?|educa[cç][ãa]o|professor(?:es)?|aluno[s]?|crian[cç]a[s]?|estudante[s]?|universidade[s]?|ensino|maternidade|jardim de inf[âa]ncia|parentalidade|bolsa de estudo)\b/i,
 life:/\b(habita[cç][ãa]o|renda[s]?|arrendamento|habita[cç][õo]es|transportes p[úu]blicos|comboio[s]?|metro|autocarro[s]?|passe[s]? social|hospital|sns|sa[úu]de|centro de sa[úu]de|eletricidade|[áa]gua|custo de vida|imobili[áa]rio|bairros|mun[ií]cipes)\b/i,
 work:/\b(emprego[s]?|desemprego|sal[áa]rios?|trabalho[s]?|irs|impostos?|pens[õo]es|reforma[s]?|subs[ií]dios?|contratos? de trabalho|apoio[s]? social[is]?|remunera[cç][ãa]o|negocia[cç][ãa]o salarial)\b/i,
 tips:/\b(como (?:fazer|pedir|obter|evitar|poupar)|guia pr[áa]tico|passo a passo|dicas para|descontos?|burlas?|fraudes?|poupar|apoios gratuitos?|inscri[cç][õo]es)\b/i,
 places:/\b(praia[s]?|parque natural|passeio[s]?|trilho[s]?|percursos?|castelo[s]?|miradouro[s]?|monumento[s]?|turismo rural|rotas?|destinos?|algarve|serra[s]?|caminhada[s]?|aldeia[s]? hist[óo]rica[s]?)\b/i,
 events:/\b(festival|concertos?|feira[s]?|exposi[cç][õo]es|teatro|espet[áa]culo[s]?|agenda cultural|evento[s]?|m[úu]sica ao vivo|visita[s]? guiada[s]?)\b/i,
 news:/\b(alerta[s]?|greve[s]?|avisos?|tempestade[s]?|prote[cç][ãa]o civil|interrup[cç][õo]es|encerramento[s]?|interdi[cç][ãa]o|restri[cç][õo]es|aprovad[ao] nova lei|mudan[cç]a nas regras)\b/i
};
const actionable=/\b(como|quando|onde|prazo[s]?|pre[cç]os?|regras?|apoios?|entrada em vigor|gratuit[oa]s?|inscri[cç][ãa]o|candidatura[s]?|benefici[áa]rios?|descontos?|recomenda[cç][ãa]o|moradores?|pessoas?|residente[s]?|nova[s]? medida[s]?|alter[aã][cç][õo]es|alarga|poupar|evitar burlas|documentos necess[áa]rios|condi[cç][õo]es)\b/i;
const reject=/\b(celebridade|fofoca|hor[oó]scopo|reality show|meme|star wars|darth vader|nvidia|bitcoin|elon musk|trump|iran|ir[ãa]o|israel|ucr[âa]nia|r[úu]ssia|guerra mundial)\b/i;
const evalItem=(title,body,preferred)=>{
 const head=title.toLowerCase(),summary=body.toLowerCase(),all=head+" "+summary;
 if(!pt.test(all)||reject.test(head))return null;
 let category=null;
 // Specific eligibility in the headline is mandatory, with one defensible primary category.
 for(const topic of ["documents","family","life","work","tips","places","events","news"]){
  if(topicTitle[topic].test(head)){category=topic;break}
 }
 if(!category)return null;
 const practical=actionable.test(all);
 if(!practical&&!["places","events"].includes(category))return null;
 // This thematic channel is not a general politics, international or celebrity feed.
 if(/\b(presidente|ministro|fmi|banco central|bce|elei[cç][õo]es)\b/.test(head) &&
    !/\b(renda|habita[cç]|irs|visto|resid[êe]ncia|sal[áa]rio|subs[ií]dio|gratuit|apoio|transporte|sa[úu]de)\b/.test(head))return null;
 const localInTitle=pt.test(head);
 let score=40+(localInTitle?13:7)+(body.length>=150?13:body.length>=100?6:0)+(practical?21:0)+
 (/\b(€|euros|gratuit|prazo|dias?|hor[áa]rio|quando|quem pode|saber mais)\b/i.test(all)?7:0)+
 (/^(como|nov[ao]s?|gratuit|alerta|apoio|redu[cç])/.test(head)?5:0);
 if(category==="events")score-=13;
 if(category==="places"&&body.length>210)score+=5;
 if(category==="news"&&!/\b(seguran[cç]a|sa[úu]de|transporte|interrup[cç][ãa]o|aviso|alerta|servi[cç]o)\b/.test(all))return null;
 score=Math.min(100,Math.max(0,score));
 return{category,score,reason:"Tema указан в заголовке; есть практическая польза для жителей Португалии. Требуются русский рерайт, первичная проверка фактов и лицензированное фото."};
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
  const current=await sql("SELECT recommended_category,count(*) AS n FROM pr_discovery_hits WHERE stage IN ('research','promoted') AND created_at>now()-interval '7 days' GROUP BY recommended_category");
  const counts=new Map(current.map(x=>[x.recommended_category,Number(x.n)]));
  const usedThisScan=new Map();
  const candidates=[];
  for(const item of options){
   if(!verifiedHost(item.url,feed.expected_host)||item.title.length<20||item.body.length<95||item.body.length>14000){rejected++;continue}
   const when=new Date(item.time);if(!Number.isFinite(when.getTime())||when.getTime()<Date.now()-7*86400000||when.getTime()>Date.now()+86400000){rejected++;continue}
   const val=evalItem(item.title,item.body,feed.primary_category);
   if(!val||val.score<feed.min_score){rejected++;continue}
   if(val.category==="events"&&feed.source_family==="rtp_news"){rejected++;continue}
   if(feed.source_family==="rtp_news"&&val.score<76){rejected++;continue}
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
     if(r.length){
      promoted++;await sql("UPDATE pr_discovery_hits SET stage='promoted',item_id=$2::uuid WHERE id=$1",[inserted.id,r[0].id]);
      await sql("INSERT INTO pr_editorial_value_reviews(item_id,value_score,reviewer_kind,decision,reason_ru,reviewed_at) VALUES($1::uuid,$2,'heuristic','keep',$3,now()) ON CONFLICT(item_id) DO NOTHING",[r[0].id,x.val.score,x.val.reason]);
     }
    }
   }
  }
  await sql("UPDATE pr_discovery_feeds SET last_scan_at=now(),last_error=NULL,last_new_count=$2 WHERE code=$1",[feed.code,saved]);
  return json({ok:true,feed:feed.code,feed_items:options.length,passing_criteria:candidates.length,rejected,saved_research_hits:saved,promoted_to_translation_rtp:promoted,duplicate,telegram_sent:0});
 }catch(e){
  const msg=String(e.message||e).slice(0,160);
  await sql("UPDATE pr_discovery_feeds SET last_scan_at=now(),last_error=$1,last_new_count=0 WHERE code=(SELECT code FROM pr_discovery_feeds WHERE is_enabled ORDER BY COALESCE(last_scan_at,'1970-01-01'::timestamptz) LIMIT 1)",[msg]).catch(()=>{});
  return json({ok:false,error:msg},500)
 }
}};
