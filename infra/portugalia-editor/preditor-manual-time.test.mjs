import test from "node:test";
import assert from "node:assert/strict";
import { parseRequestedPublishTime } from "./preditor.mjs";

const now=Date.parse("2026-11-15T23:53:00.000Z");

test("manual Lisbon time for 16 November at 08:00 is valid",()=>{
 assert.equal(parseRequestedPublishTime("2026-11-16T08:00:00.000Z",now),
   "2026-11-16T08:00:00.000Z");
});

test("manual time handles summer Lisbon offset",()=>{
 assert.equal(parseRequestedPublishTime("2026-07-16T08:00:00+01:00",Date.parse("2026-07-15T22:00:00Z")),
   "2026-07-16T07:00:00.000Z");
});

test("malformed date strings are rejected",()=>{
 for(const value of [null,undefined,"","16.11.2026","2026-11-16","2026-11-16T08:00:00","yesterday"]){
  assert.throws(()=>parseRequestedPublishTime(value,now),/Укажите корректные дату и время/);
 }
});

test("past times and times less than a minute away are rejected",()=>{
 assert.throws(()=>parseRequestedPublishTime("2026-11-15T23:50:00.000Z",now),/Выберите будущее время/);
 assert.throws(()=>parseRequestedPublishTime("2026-11-15T23:53:20.000Z",now),/Выберите будущее время/);
});

test("manual time applies equally to owner's approval and normal queue",async()=>{
 const {readFileSync}=await import("node:fs");
 const source=readFileSync(new URL("./preditor.mjs",import.meta.url),"utf8");
 assert.equal(source.split("publishAt=parseRequestedPublishTime(p.publish_at??p.scheduled_for);").length-1,2);
 assert.ok(!source.includes("!/^\\\\d{4}"));
});
