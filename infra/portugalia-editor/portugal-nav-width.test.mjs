import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {MAIN_NAV_MARKUP} from "./prpublish.mjs";

const html=readFileSync(new URL("../../journalstudio/cloud/portugal/index.html",import.meta.url),"utf8");
const publisher=readFileSync(new URL("./prpublish.mjs",import.meta.url),"utf8");

test("Each Telegram navigation button fills its own row with the correct URL",()=>{
 const rows=MAIN_NAV_MARKUP.inline_keyboard;
 assert.equal(rows.length,2);
 assert.ok(rows.every(row=>Array.isArray(row)&&row.length===1));
 assert.deepEqual(rows.map(row=>row[0].text),["🎭 АФИША","💬 ЧАТ"]);
 assert.deepEqual(rows.map(row=>row[0].url),["https://t.me/pt_afisha","https://t.me/pt_ryadom_chat"]);
});
test("Navigation changes only reply markup, never re-sends an existing article",()=>{
 const navigation=publisher.slice(publisher.indexOf("async function editWideNavigation("),publisher.indexOf("async function promote()"));
 assert.match(navigation,/editMessageReplyMarkup/);
 assert.doesNotMatch(navigation,/sendRichMessage|sendMessage|sendPhoto/);
 assert.match(publisher,/async function reconcileWideNavigation/);
 assert.match(publisher,/pr_post_nav_wide_sync/);
 assert.match(publisher,/pr_post_nav_sync/);
 assert.match(publisher,/post\.destination_code==="main"/);
});
test("Journal Studio preview uses full-width large uppercase labels",()=>{
 assert.match(html,/\.pt-post-nav-preview\{display:flex;flex-direction:column/);
 assert.match(html,/\.pt-post-nav-preview a\{display:block;width:100%/);
 assert.match(html,/>🎭 АФИША<\/a>/);
 assert.match(html,/>💬 ЧАТ<\/a>/);
});
