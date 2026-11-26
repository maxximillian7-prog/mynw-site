import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";

const editor=readFileSync(new URL("../../journalstudio/cloud/portugal/index.html",import.meta.url),"utf8");
const sourceStart=editor.indexOf("function instagramCandidatePhoto(){");
const sourceEnd=editor.indexOf("function updateApprovalButtons(){",sourceStart);
assert.ok(sourceStart>=0 && sourceEnd>sourceStart && sourceEnd-sourceStart<4000,"Cannot inspect Instagram eligibility");
const evaluate=current=>runInNewContext(editor.slice(sourceStart,sourceEnd)+"\n({candidate:instagramCandidatePhoto(),ready:instagramReadyPhoto()})",{current});
const selected={id:"photo-1",status:"candidate",public_url:"https://assets.example/photo.jpg",media_type:"licensed_original",rights_verified:true};
const article={photo_url:selected.public_url,photo_rights:"cc_licensed",status:"approved"};
const context=media=>({article,media});

test("Already approved article may explicitly approve its selected licensed candidate",()=>{
 const result=evaluate(context([selected]));
 assert.equal(result.candidate?.id,"photo-1");
 assert.equal(result.ready,false);
});
test("Never approve an unselected candidate, even if its rights are verified",()=>{
 const result=evaluate(context([{...selected,public_url:"https://assets.example/different.jpg"}]));
 assert.equal(result.candidate,null);
});
test("Never approve a source without verified rights",()=>{
 const result=evaluate(context([{...selected,rights_verified:false}]));
 assert.equal(result.candidate,null);
});
test("An already approved source remains ready",()=>{
 const result=evaluate(context([{...selected,status:"approved"}]));
 assert.equal(result.candidate,null);
 assert.equal(result.ready,true);
});
test("Generated photos require a marked saved asset",()=>{
 assert.equal(evaluate(context([{...selected,media_type:"generated_illustration",illustration_label_required:false,storage_key:"ai.jpg"}])).candidate,null);
 assert.ok(evaluate(context([{...selected,media_type:"generated_illustration",illustration_label_required:true,storage_key:"ai.jpg"}])).candidate);
});
test("Instagram approval explicitly confirms source candidate before poster approval",()=>{
 const start=editor.indexOf('async function approveAndQueue(');
 const end=editor.indexOf('/* PT_REJECT_INSTANT',start);
 const body=editor.slice(start,end);
 assert.ok(body.indexOf('action:"approve_media"')>0);
 assert.ok(body.indexOf('action:"approve_media"')<body.indexOf('PtIgCover.ensureApproved()'));
 assert.ok(body.indexOf('PtIgCover.ensureApproved()')<body.indexOf('"/api/instagram/schedule"'));
});
