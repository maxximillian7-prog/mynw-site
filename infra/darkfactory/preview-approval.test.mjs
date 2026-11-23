import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html=readFileSync(new URL("../../journalstudio/cloud/darkfactory.html",import.meta.url),"utf8");

test("Seriously photo preview explicitly confirms paid generation before article approval",()=>{
 const start=html.indexOf('$("illustrate").onclick=()=>task(async()=>{');
 const end=html.indexOf('$("download").onclick=',start);
 assert.ok(start>=0&&end>start,"The photo generation action must exist");
 const handler=html.slice(start,end);
 assert.match(handler,/const preapprovalGeneration=!\[x\.status_instagram,x\.status_telegram,x\.status_telegram_en\]\.includes\("approved"\)/);
 assert.match(handler,/if\(!confirm\(confirmation\)\)return/);
 assert.match(handler,/confirm_preapproval_generation:preapprovalGeneration/);
 assert.ok(handler.indexOf("if(!confirm(confirmation))return") <
   handler.indexOf('await api("/items/"+itemId+"/generate-image"'),"Never incur image costs before explicit confirmation");
 assert.match(handler,/статья НЕ будет утверждена или опубликована автоматически/i);
});

test("Image previews do not approve or publish editorial content",()=>{
 const start=html.indexOf('$("illustrate").onclick=()=>task(async()=>{');
 const end=html.indexOf('$("download").onclick=',start);
 const handler=html.slice(start,end);
 assert.doesNotMatch(handler,/\/approve|\/publish|status_instagram:"approved"|status_telegram:"approved"/);
 assert.match(handler,/result\.item\.visual_status!=="ready"/);
 assert.match(handler,/await reload\(\)/);
 assert.match(html,/Фото для предпросмотра можно создать до утверждения публикации/);
});
