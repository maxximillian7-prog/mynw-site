import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const pub=readFileSync(new URL("./prbuffer.mjs",import.meta.url),"utf8");
const sql=readFileSync(new URL("./instagram-retrofit-fulltext-20261123.sql",import.meta.url),"utf8");
const renderer=readFileSync(new URL("../../scripts/portugal_instagram_retrofit.py",import.meta.url),"utf8");
const result=JSON.parse(readFileSync(new URL("./instagram-retrofit-result.json",import.meta.url),"utf8"));

test("All 52 approved Instagram covers and full text slides were generated",()=>{
 assert.equal(result.records.length,52);
 assert.equal(result.records.filter(x=>x.status==="ready").length,52);
 assert.equal(result.records.filter(x=>x.files.length>1).length,16);
 for(const r of result.records){
  assert.match(r.files[0],/journalstudio\/instagram-retrofit\/[0-9a-f-]{36}\.jpg$/);
  assert.ok(r.files.length<=10);
 }
});
test("Published Instagram images stay immutable; replacements are unscheduled Buffer drafts",()=>{
 const i=pub.indexOf("async function retrofitInstagramBatch");
 const end=pub.indexOf("export default {async fetch(request){",i);
 const body=pub.slice(i,end);
 assert.match(body,/row\.current_status==="published"\|\|alreadySent/);
 assert.match(body,/saveToDraft:true/);
 assert.match(body,/mode:"addToQueue"/);
 assert.match(body,/stage='creating_draft'/);
 assert.match(body,/stage='draft_created'/);
 assert.doesNotMatch(body,/deletePost|deleteMedia|shareNow|publishPostNow/);
});
test("Only originally queued Buffer posts are edited in place without moving the slot",()=>{
 assert.match(pub,/mutation RetrofitEdit\(\$input:EditPostInput!\)/);
 assert.match(pub,/id:row\.current_buffer_id,text:row\.caption,metadata,assets/);
 assert.match(pub,/Math\.abs\(Date\.parse\(changed\.post\.dueAt\)-Date\.parse\(row\.scheduled_for\)\)>60000/);
});
test("For long Instagram articles the full original remains on the carousel rather than being silently cut",()=>{
 assert.match(sql,/pr_prepare_instagram_caption_v3/);
 assert.match(sql,/2200/);
 assert.match(sql,/Полная статья — на следующих слайдах/);
 assert.match(renderer,/split_pages\(story\)/);
 assert.match(renderer,/raise ValueError\("Article requires more than 9 continuation pages"\)/);
});
