import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const backend=readFileSync(new URL("./prbuffer.mjs",import.meta.url),"utf8");
const frontend=readFileSync(new URL("../../journalstudio/cloud/portugal/index.html",import.meta.url),"utf8");

test("Buffer pending quota is 10 and new approvals enter durable reserve instead of throwing 10/10",()=>{
 assert.match(backend,/const BUFFER_PENDING_CAP=10/);
 assert.match(backend,/await instagramCapacity\(\)\)>=BUFFER_PENDING_CAP/);
 assert.match(backend,/INSERT INTO public\.pr_instagram_waitlist_4slots/);
 assert.match(backend,/waitlisted:true,buffer_queue_full:true/);
 assert.match(frontend,/result\.waitlisted\?/);
 assert.match(frontend,/автоматически добавляется при освобождении места/);
});
test("Buffer approved old drafts are edited by stable id, not duplicated by createPost",()=>{
 const a=backend.indexOf("async function scheduleRetrofitDraft(");
 const b=backend.indexOf("async function scheduleWaitlisted(",a);
 const code=backend.slice(a,b);
 assert.match(code,/await bufferPostStatus\(oldId\)/);
 assert.match(code,/mutation PromoteApprovedDraft\(\$input:EditPostInput!\)/);
 assert.match(code,/saveToDraft:false/);
 assert.match(code,/stage='scheduled_repost'/);
 assert.doesNotMatch(code,/createPost/);
});
test("Refill is locked to one post per run, then recovers ambiguous remote responses",()=>{
 const code=backend.slice(backend.indexOf("async function refillInstagramQueue("),backend.indexOf("async function schedule("));
 assert.match(code,/if\(count>=BUFFER_PENDING_CAP\)return report/);
 assert.match(code,/ORDER BY r\.created_at,r\.synced_at LIMIT 1/);
 assert.match(code,/stage='dispatching'/);
 assert.match(code,/scheduled_reconciled/);
 assert.match(code,/state='needs_review'/);
 assert.match(backend,/status='queued' AND buffer_post_id IS NOT NULL/);
});
test("Four fixed Portugal-local slots are advertised and refilled via server schedule",()=>{
 assert.match(frontend,/08:00 \/ 13:00 \/ 18:00 \/ 23:00/);
 assert.match(frontend,/4 статьи в сутки/);
 assert.match(backend,/pr_next_portugal_publication_slot/);
 assert.match(backend,/url\.pathname==="\x2Finternal\x2Frefill"/);
});
