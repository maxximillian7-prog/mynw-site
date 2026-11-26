import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const ddl=readFileSync(new URL("./instagram-cover-photo-selection-20261126.sql",import.meta.url),"utf8");
const web=readFileSync(new URL("../../journalstudio/cloud/portugal/instagram-cover-integration.js",import.meta.url),"utf8");
const pub=readFileSync(new URL("./prbuffer.mjs",import.meta.url),"utf8");

test("An approved Instagram typography cover cannot replace the article/Telegram original",()=>{
 assert.match(ddl,/NEW\.generation_model IS DISTINCT FROM 'pt_ryadom_instagram_typography_v1'/);
 assert.match(ddl,/NEW\.storage_key,'?\)?[^\n]*NOT LIKE 'instagram-covers\/\%'/);
 assert.match(ddl,/UPDATE public\.pr_items SET/);
});
test("Instagram still generates and approves a separate 1080x1350 media asset",()=>{
 assert.match(web,/window\.PtIgCover=\{onPreview,ensureApproved/);
 assert.match(web,/action:"approve_media",media_id:d\.media_id/);
 assert.match(web,/design_version:5/);
 assert.match(pub,/await verifyMedia\(original\)/);
});
