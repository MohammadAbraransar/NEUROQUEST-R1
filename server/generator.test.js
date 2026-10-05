import test from "node:test";
import assert from "node:assert/strict";
import { generateQuestion } from "./generator.js";

const activities=["grid","motion","inductive","deductive","numbubbles","shortcuts","resemble","tally"];
const q=(activity,round=1,attempt=1)=>{const raw=generateQuestion(activity,round,attempt,7);return {...raw,payload:JSON.parse(raw.payload_json),answer:JSON.parse(raw.answer_json)}};

test("all activity generators return clear question structures",()=>{
  for(const activity of activities){
    const item=q(activity,3,19);
    assert.ok(item.prompt.length>8,activity+" prompt");
    assert.ok(item.description.length>8,activity+" description");
    assert.equal(item.type,activity==="shortcuts"?"shortcuts":activity==="numbubbles"?"numbubbles":activity);
  }
});

test("Grid questions contain ordered positions and interstitial checks without leaking their keys",()=>{
  for(let round=1;round<=12;round++){
    const item=q("grid",round,51),p=item.payload,a=item.answer;
    assert.equal(new Set(p.positions).size,p.positions.length);
    assert.equal(p.symmetryChecks.length,p.positions.length-1);
    assert.equal(a.symmetryAnswers.length,p.symmetryChecks.length);
    assert.ok(p.symmetryChecks.every(check=>!Object.hasOwn(check,"symmetric")));
  }
});

test("Motion questions use a connected route and offer the generated minimum",()=>{
  for(let attempt=1;attempt<=60;attempt++){
    const item=q("motion",attempt,attempt),p=item.payload,a=item.answer;
    assert.equal(p.route[0],p.start);assert.equal(p.route.at(-1),p.goal);
    assert.ok(p.walls.every(cell=>p.route.includes(cell)));
    assert.equal(p.options[a.option],a.minimumMoves);
  }
});

test("Inductive questions require two distinct matching choices",()=>{
  for(let attempt=1;attempt<=60;attempt++){
    const item=q("inductive",attempt,attempt),p=item.payload,a=item.answer;
    assert.equal(p.options.length,4);assert.equal(a.options.length,2);
    assert.equal(new Set(a.options).size,2);
    assert.ok(a.options.every(index=>index>=0&&index<4));
  }
});

test("Deductive grids have one missing cell and four answer choices",()=>{
  for(let round=1;round<=15;round++){
    const item=q("deductive",round,8),p=item.payload,a=item.answer;
    assert.equal(p.matrix.filter(value=>value===null).length,1);
    assert.equal(p.options.length,4);assert.ok(a.option>=0&&a.option<4);
  }
});

test("NumBubbles generates 20 unique expressions including the target expression",()=>{
  for(let attempt=1;attempt<=60;attempt++){
    const item=q("numbubbles",attempt,attempt),p=item.payload,a=item.answer;
    assert.equal(p.options.length,20);assert.equal(new Set(p.options).size,20);
    assert.ok(p.options.includes(a.equation));
  }
});

test("Short Cuts answer identifies the least-distance displayed route",()=>{
  for(let attempt=1;attempt<=60;attempt++){
    const item=q("shortcuts",attempt,attempt),p=item.payload,a=item.answer;
    assert.equal(p.paths.length,4);
    assert.equal(p.paths[a.option].distance,Math.min(...p.paths.map(path=>path.distance)));
  }
});

test("Resemble and Tally answers match their generated payloads",()=>{
  for(let attempt=1;attempt<=60;attempt++){
    const r=q("resemble",attempt,attempt);assert.equal(r.payload.options.length,4);assert.equal(new Set(r.payload.options.map(pattern=>JSON.stringify(pattern))).size,4);assert.ok(r.answer.option>=0&&r.answer.option<4);
    const t=q("tally",attempt,attempt),p=t.payload,a=t.answer;
    const sum=box=>box.reduce((total,item)=>total+(item.struck?0:item.value*item.multiplier),0);
    const left=sum(p.left)*p.leftMega,right=sum(p.right)*p.rightMega;
    assert.equal(a.operator,left>right?">":left<right?"<":"=");
  }
});

test("fresh attempts produce different question variations",()=>{
  for(const activity of activities){
    assert.notEqual(q(activity,2,101).payload_json,q(activity,2,102).payload_json,activity);
  }
});
