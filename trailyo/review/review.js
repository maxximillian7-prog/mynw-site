'use strict';
const api='https://egjxgintpcoqhmdohabk.supabase.co/functions/v1/trailyo-review-admin';
const el=(id)=>document.getElementById(id);
const params=new URLSearchParams(location.hash.slice(1));
let token=params.get('token')||'';
let intent=params.get('intent')||'approve';
let details=null;
const accepted=/^[0-9a-f]{64}$/i.test(token)&&/^(approve|reject)$/.test(intent);
function node(tag,value){const n=document.createElement(tag);n.textContent=value??'';return n;}
function status(message){el('state').textContent=message;}
function addLine(target,label,value){const dt=node('dt',label),dd=node('dd',String(value??'—'));target.append(dt,dd);}
function missing(target,message){target.replaceChildren(node('div',message));target.firstChild.className='missing';}
function renderMedia(target,urls,video=false){
 target.replaceChildren();
 if(!urls?.length){missing(target,video?'No approved videos uploaded.':'No approved photographs uploaded.');return;}
 urls.forEach((url,i)=>{
   if(typeof url!=='string'||!url.startsWith('https://egjxgintpcoqhmdohabk.supabase.co/storage/v1/object/public/'))return;
   const fig=document.createElement('figure');
   const media=document.createElement(video?'video':'img');
   if(video){media.controls=true;media.preload='none';media.src=url;}
   else{media.src=url;media.loading='lazy';media.alt='Submitted photograph '+(i+1);}
   const cap=document.createElement('figcaption');
   const a=document.createElement('a');
   a.href=url;a.target='_blank';a.rel='noopener noreferrer';
   a.textContent=video?'Open original video '+(i+1):'Open original photo '+(i+1);
   cap.append(a);fig.append(media,cap);target.append(fig);
 });
 if(!target.childElementCount)missing(target,'No accessible media.');
}
function choose(kind){
 intent=kind;
 const rejecting=kind==='reject';
 el('reason').hidden=!rejecting;el('reason-label').hidden=!rejecting;
 el('approve').hidden=rejecting;
 el('reject').textContent=rejecting?'Confirm rejection':'Reject event';
 el('decision-status').textContent='';
}
async function read(){
 if(!accepted){status('Invalid review link. Request a new moderation email.');return;}
 try{
   const u=new URL(api);u.searchParams.set('mode','preview');u.searchParams.set('token',token);
   const r=await fetch(u,{mode:'cors',cache:'no-store',referrerPolicy:'no-referrer'});
   const v=await r.json();
   if(!r.ok)throw new Error(v.error||'Review request is unavailable');
   details=v;
   status('');
   el('request').hidden=false;
   const e=v.event;
   el('heading').textContent=e.title||'Untitled event';
   el('summary').textContent='Review request · '+String(v.request.status||'Awaiting decision');
   const dl=el('details');dl.replaceChildren();
   [['Event ID',e.id],['Organiser email',v.request.author_email],['City',e.city],
     ['Venue',e.venue],['Start',e.starts_at],['Category',e.category],
     ['Tags',Array.isArray(e.category_tags)?e.category_tags.join(', '):''],
     ['Original language',e.original_locale],
     ['Admission',e.is_free?'Free':e.price==null?'Unknown':e.price+' EUR'],
     ['Status',e.status]].forEach(([k,val])=>addLine(dl,k,val));
   el('description').textContent=e.description||'';
   el('note').textContent=v.request.note||'No note provided';
   el('automatic').textContent=[v.automatic.reason_code||'pending',v.automatic.reason_details||''].filter(Boolean).join(' · ');
   renderMedia(el('photographs'),v.media.photos,false);
   renderMedia(el('videos'),v.media.videos,true);
   const warnings=el('warnings');warnings.replaceChildren();
   (v.blockers||[]).forEach(s=>warnings.append(node('p','• '+s)));
   el('approve').disabled=(v.blockers||[]).length>0;
   choose(intent);
 }catch(e){status('Could not load moderation request: '+String(e.message||e));}
}
async function decide(kind){
 if(!details||!accepted)return;
 if(kind==='reject'&&intent!=='reject'){choose('reject');return;}
 const reason=el('reason').value.trim();
 if(kind==='reject'&&reason.length<10){el('decision-status').textContent='Please provide a rejection reason of at least 10 characters.';return;}
 if(kind==='approve'&&(details.blockers||[]).length){el('decision-status').textContent='Approval blocked until the event is corrected.';return;}
 if(!confirm(kind==='approve'?'Publish this event after manual review?':'Reject this event with the entered reason?'))return;
 el('approve').disabled=true;el('reject').disabled=true;
 el('decision-status').textContent='Recording decision…';
 try{
   const r=await fetch(api,{method:'POST',mode:'cors',referrerPolicy:'no-referrer',
     headers:{'Content-Type':'application/json'},
     body:JSON.stringify({token,intent:kind,reason})});
   const v=await r.json();
   if(!r.ok)throw new Error(v.error||'Could not record decision');
   token='';history.replaceState(null,'',location.pathname);
   el('decision-status').textContent=kind==='approve'?'Event published.':'Event rejected. The organiser will see the reason in Trailyo.';
   el('approve').hidden=true;el('reject').hidden=true;el('reason').hidden=true;el('reason-label').hidden=true;
   el('summary').textContent='Decision recorded · '+v.status;
 }catch(e){
   el('decision-status').textContent='Decision not recorded: '+String(e.message||e);
   el('approve').disabled=details.blockers?.length>0;el('reject').disabled=false;
 }
}
el('approve').addEventListener('click',()=>decide('approve'));
el('reject').addEventListener('click',()=>decide('reject'));
read();
