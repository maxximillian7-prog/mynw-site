#!/usr/bin/env node
/* Verify first-party visual assets, authentic brand identity and case study evidence
   before publishing MyNow Apps website. No external npm dependencies. */
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const slugs=['trailyo','qwin','nowwhat','nowcook','nowkids','nowgreen'];
const errors=[],checks=[];
const rd=p=>fs.readFileSync(path.join(root,p),'utf8');
const assetExists=p=>fs.existsSync(path.join(root,p));
const verify=(test,msg)=>{if(!test)errors.push(msg);else checks.push(msg)};
const officialQwin='/qwin/assets/qwin_home_logo_transparent.png';
const officialTrailyo='/trailyo/assets/trailyo-logo.png';
const imageRefs=html=>[...html.matchAll(/<img\b[^>]*?\bsrc="([^"]+)"/g)].map(x=>x[1]);
const dimensions=p=>{
 try {
  const b=fs.readFileSync(path.join(root,p));
  if(b[0]===0x89&&b[1]===0x50)return {width:b.readUInt32BE(16),height:b.readUInt32BE(20)};
  if(b.toString('ascii',0,4)==='RIFF') {
   const kind=b.toString('ascii',12,16);
   if(kind==='VP8 ')return {width:b.readUInt16LE(26)&0x3fff,height:b.readUInt16LE(28)&0x3fff};
   if(kind==='VP8X')return {width:b[24]+(b[25]<<8)+(b[26]<<16)+1,height:b[27]+(b[28]<<8)+(b[29]<<16)+1};
   if(kind==='VP8L'){const bits=b.readUInt32LE(21);return{width:(bits&0x3fff)+1,height:((bits>>>14)&0x3fff)+1}}
  }
 }catch{}return null;
};
verify(rd('qwin/index.html').includes(officialQwin+'?v=approved-20261112'),'Official Qwin website still uses approved logo');
verify(rd('trailyo/index.html').includes('./assets/trailyo-logo.png'),'Official Trailyo website still uses branded wordmark');
const portfolioCSS=rd('case-studies/index.html').match(/\/case-studies\/style\.css\?v=(20261122-v\d+)/);
const expectedCss=portfolioCSS?.[1]||'';
verify(!!portfolioCSS && Number(expectedCss.split('-v')[1])>=4,'Current portfolio CSS version is at least v4');
verify(rd('case-studies/style.css').includes('.portfolio-gallery-section .gallery-card:first-child img')&&rd('case-studies/style.css').includes('object-position:50% 0%'),'Portrait top-alignment fix exists in stylesheet');
const pages=['case-studies/index.html',...slugs.map(x=>'case-studies/'+x+'/index.html'),'services/index.html'];
for(const p of pages) {
 const html=rd(p);
 verify(html.includes(officialQwin),'Official Qwin brand is in '+p);
 verify(html.includes(officialTrailyo),'Official Trailyo brand is in '+p);
 verify(!html.includes('/qwin/assets/qwin_icon.png'),'No incorrect Qwin logo in '+p);
 verify(!html.includes('/case-studies/assets/trailyo-app-icon.png'),'No incorrect Trailyo logo in '+p);
 for(const src of imageRefs(html)){
  if(!src.startsWith('/'))continue;
  const rel=decodeURIComponent(src.split('?')[0]).slice(1);
  verify(assetExists(rel),'Image asset exists '+p+' -> '+rel);
 }
 if(p.startsWith('case-studies/')) {
  verify(html.includes('rel="canonical"'),'Canonical SEO URL in '+p);
  verify(html.includes('/case-studies/style.css?v='+expectedCss),'Consistent current portfolio CSS in '+p);
 }
}
const overview=rd('case-studies/index.html');
verify((overview.match(/class="project-cover /g)||[]).length===6,'All six case cards have real photo previews');
for(const slug of slugs)verify(overview.includes('href="/case-studies/'+slug+'/"'),'Case navigation for '+slug);
const trail=rd('case-studies/trailyo/index.html');
verify(trail.includes('/trailyo/assets/media/map-lisbon.webp'),'Trailyo shows original map discovery');
verify(trail.includes('/trailyo/assets/media/concerts.webp'),'Trailyo shows contrasting events concert photograph');
verify(!trail.includes('/trailyo/assets/media/map-second.webp'),'Trailyo no longer duplicates similar map photos');
for(const visual of ['nature.webp','art.webp','meetings.webp'])verify(trail.includes('/trailyo/assets/media/'+visual),'Trailyo distinct gallery includes '+visual);
verify(trail.includes('https://apps.apple.com/pt/app/trailyo-events-in-portugal/id6832330654'),'Trailyo verified Apple App Store link');
const playIDs={nowwhat:'com.nowwhatapp.app',nowcook:'com.nowapps.nowcook',nowkids:'com.nowapps.nowkids',nowgreen:'com.nowapps.nowgreen'};
for(const [slug,id] of Object.entries(playIDs))verify(rd('case-studies/'+slug+'/index.html').includes('https://play.google.com/store/apps/details?id='+id),'Verified Google Play link '+slug);
for(const slug of slugs){
 const p='case-studies/'+slug+'/index.html',html=rd(p);
 const sec=html.match(/<div class="hero-media[^"]*">([\s\S]*?)<p class="visual-caption">/);
 verify(!!sec,'Hero image gallery present '+slug);
 if(!sec)continue;
 const imgs=imageRefs(sec[0]),uniq=new Set(imgs.map(x=>x.split('?')[0]));
 verify(imgs.length>0,'Hero image(s) defined '+slug);
 verify(uniq.size===imgs.length,'Hero uses distinct source files '+slug);
 for(const u of uniq) {
  if(!u.startsWith('/'))continue;
  const file=u.slice(1),d=dimensions(file);
  if(d)verify(d.width>=600&&d.height>=380,'No low-resolution enlarged hero '+slug+': '+d.width+'x'+d.height);
 }
}
if(errors.length) {console.error('Portfolio audit FAILED:\n'+errors.map(x=>' • '+x).join('\n'));process.exit(1)}
console.log('Portfolio audit PASSED: '+checks.length+' checks across '+pages.length+' pages; original logos, varied images, links and image resolution verified.');
