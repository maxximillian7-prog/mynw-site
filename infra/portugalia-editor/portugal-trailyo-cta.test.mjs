import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const backend=readFileSync(new URL("./prpublish.mjs",import.meta.url),"utf8");
const preview=readFileSync(new URL("../../journalstudio/cloud/portugal/index.html",import.meta.url),"utf8");
const url="https://apps.apple.com/us/app/trailyo-events-in-portugal/id6832330654";

test("Afisha Telegram has linked Trailyo heading matching Instagram size and placed above it",()=>{
 const start=backend.indexOf("const addInstagramHeading=()=>");
 const end=backend.indexOf("for(const section of paragraphs)",start);
 assert.ok(start>=0&&end>start,"Missing Telegram heading insertion");
 const helper=backend.slice(start,end);
 assert.match(helper,/if\(isAfisha\)blocks\.push\(\{type:"heading",size:4,text:\["Больше событий в приложении ",richUrl\("Trailyo",TRAILYO_APP_URL\)\]\}\)/);
 assert.match(helper,/blocks\.push\(\{type:"heading",size:4,text:\["Наш канал в ",richUrl\("Инстаграмм"/);
 assert.ok(helper.indexOf("Больше событий в приложении")<helper.indexOf("Наш канал в "));
 assert.ok(backend.includes(url),"Exact user-provided App Store link must be retained");
 assert.match(backend,/if\(!instagramPlaced\)addInstagramHeading\(\)/);
 assert.doesNotMatch(backend,/if\(isAfisha\)blocks\.push\(\{type:"paragraph",text:\["Больше событий в приложении "/);
});

test("Afisha editorial preview shows the same prominent linked Trailyo CTA before Instagram, only once",()=>{
 const start=preview.indexOf("function renderTelegramMessage(");
 const end=preview.indexOf("function activeTags(",start);
 assert.ok(start>=0&&end>start);
 const render=preview.slice(start,end);
 assert.match(render,/if\(isAfisha\)html\+='\<div class="pt-instagram-cta"\>Больше событий в приложении '/);
 assert.ok(render.indexOf("Больше событий в приложении '+previewLink")<render.indexOf("Наш канал в '+previewLink"));
 assert.ok(render.includes(url));
 assert.match(render,/class="pt-instagram-cta"/); // CTA class is shared for size and styling
 assert.doesNotMatch(render,/if\(isAfisha\)html\+='\<div class="pt-source"\>Больше событий/);
});
