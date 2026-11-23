import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const backend=readFileSync(new URL("./prbuffer.mjs",import.meta.url),"utf8");
const migration=readFileSync(new URL("./instagram-interleaved-replacements-20261123.sql",import.meta.url),"utf8");

const between=(a,b)=>{
 const x=backend.indexOf(a),y=backend.indexOf(b,x+1);
 assert.ok(x>=0&&y>x,"missing implementation anchors "+a);
 return backend.slice(x,y);
};
test("old replacement schedule is separate from normal new four-slot schedule",()=>{
 assert.match(backend,/async function reconcileInterleavedReplacements/);
 assert.match(backend,/async function alignOldScheduledReplacement/);
 assert.match(backend,/async function refillInstagramQueue/);
 assert.match(backend,/async function nextInstagramDueAt/);
 assert.match(migration,/10:30/);
 assert.match(migration,/15:30/);
 assert.match(migration,/20:30/);
 assert.match(migration,/2026-11-24/);
});
test("existing scheduled replacement must be rescheduled IN PLACE without changing the new buffer IDs",()=>{
 const section=between("async function alignOldScheduledReplacement","async function refillInstagramQueue");
 assert.match(section,/EditPostInput!/);
 assert.match(section,/id:row\.replacement_buffer_post_id,mode:"customScheduled",dueAt:desired/);
 assert.match(section,/state='reschedule_pending'/);
 assert.match(section,/state='scheduled'/);
 assert.doesNotMatch(section,/createPost|deletePost|deleteMedia/);
});
test("new scheduled article retains priority, Buffer never exceeds ten",()=>{
 const section=between("async function refillInstagramQueue","async function schedule(id,options,userId)");
 assert.match(section,/if\(count>=BUFFER_PENDING_CAP\)return report/);
 assert.match(section,/const old=wait\|\|oldBlocked\?null:/);
 assert.match(section,/await nextInstagramDueAt\(\)/);
 assert.match(section,/new Date\(old\.interleave_due\)\.toISOString\(\)/);
 assert.match(section,/await scheduleWaitlisted\(wait,due\)/);
 assert.match(section,/await scheduleRetrofitDraft\(old,due\)/);
 assert.doesNotMatch(section,/mode:"shareNow"|CreatePostInput|deletePost/);
});
test("no automatic retry on ambiguous errors and spam failures do not block new posts",()=>{
 const section=between("async function refillInstagramQueue","async function schedule(id,options,userId)");
 assert.match(section,/oldBlocked/);
 assert.match(section,/scheduled_old_reconciled/);
 assert.match(section,/safelyDraft/);
 assert.match(section,/needs_review/);
 assert.match(backend,/async function reconcileInterleavedReplacements/);
 assert.match(backend,/remote\?\.error\?\.message/);
});
