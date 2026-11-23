import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const publisher=readFileSync(new URL("./prbuffer.mjs",import.meta.url),"utf8");

test("Fast replacement is a separate authenticated Neon task, not the new-article scheduler",()=>{
 assert.match(publisher,/url\.pathname==="\x2Finternal\x2Frapid-replace"/);
 assert.match(publisher,/x-neon-trigger-invocation-id/);
 assert.match(publisher,/async function rapidReplacementTick\(\)/);
 assert.match(publisher,/async function refillInstagramQueue\(\)/);
 assert.match(publisher,/paused_while_old_replacements_republish/);
});
test("Only existing approved replacement Buffer IDs are shared now; never create or delete Instagram originals",()=>{
 const a=publisher.indexOf("async function rapidReplacementTick()");
 const b=publisher.indexOf("async function refillInstagramQueue()",a);
 const body=publisher.slice(a,b);
 assert.match(body,/pr_instagram_rapid_replace_20261123/);
 assert.match(body,/replacement_buffer_post_id/);
 assert.match(body,/mode:"shareNow"/);
 assert.match(body,/EditPostInput!/);
 assert.doesNotMatch(body,/CreatePostInput|deletePost|deleteMedia|pr_posts SET|pr_instagram_publications SET status='cancelled'/);
 assert.match(body,/ORDER BY q\.ordinal LIMIT 1/);
});
test("Delivery outcomes are idempotent and a rejected or ambiguous Buffer result pauses all subsequent replacements",()=>{
 const a=publisher.indexOf("async function rapidReplacementStatus()");
 const b=publisher.indexOf("async function refillInstagramQueue()",a);
 const body=publisher.slice(a,b);
 assert.match(body,/state='submitting'/);
 assert.match(body,/state='submitted'/);
 assert.match(body,/state='sent'/);
 assert.match(body,/state='needs_review'/);
 assert.match(body,/if\(tally\.needs_review>0\)/);
 assert.match(body,/55[0]{3}/);
 assert.match(body,/10\*60000/);
 assert.match(body,/before\.status/);
});
