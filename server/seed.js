import "dotenv/config";
import db from "./db.js";
import bcrypt from "bcryptjs";

const activities = [
  {
    id:"grid", title:"Grid Challenge", icon:"👁️", skill:"Executive attention",
    description:"Remember where and in what order the dots appear, with symmetry checks between grids.",
    instructions:"Study the highlighted positions. Remember their order. During the recall step, choose the option that reproduces the same positions in the same order.",
    rounds:7, round_seconds:77, scoring_note:"Accuracy and remaining time"
  },
  {
    id:"motion", title:"Motion Challenge", icon:"🎯", skill:"Planning & problem solving",
    description:"Move the ball to the hole using the minimum number of block moves.",
    instructions:"Drag/move the blocking bars to clear a route. Plan before moving and aim for the minimum number of moves.",
    rounds:10, round_seconds:36, scoring_note:"Minimum moves + speed"
  },
  {
    id:"inductive", title:"Inductive Logical Thinking", icon:"🧠", skill:"Pattern recognition",
    description:"Find the two figures that follow the same positional rule.",
    instructions:"Focus on how positions change. Symbols can interchange positions while the underlying rule stays the same.",
    rounds:10, round_seconds:36, scoring_note:"Pattern accuracy + speed"
  },
  {
    id:"deductive", title:"Deductive Logical Thinking", icon:"🧩", skill:"Planning ahead",
    description:"Complete a missing cell using row and column rules.",
    instructions:"Each object appears once in every row and column. Observe the grid and identify the object that logically belongs in the missing cell.",
    rounds:10, round_seconds:36, scoring_note:"Logical accuracy + speed"
  },
  {
    id:"numbubbles", title:"NumBubbles", icon:"🫧", skill:"Fast calculation",
    description:"Pop an equation bubble that equals the target number.",
    instructions:"Read the target and quickly calculate the equations. Pop a bubble whose value equals the target.",
    rounds:10, round_seconds:12, scoring_note:"12 seconds per target"
  },
  {
    id:"shortcuts", title:"Short Cuts", icon:"⚡", skill:"Path optimization",
    description:"Move the blue marble to the star using the shortest available path.",
    instructions:"Select the track between spaces. The red marble contributes distance. Special shaded areas can subtract distance once. Undo and reset are available.",
    rounds:7, round_seconds:34, scoring_note:"Shortest distance + speed"
  },
  {
    id:"resemble", title:"Resemble", icon:"🪞", skill:"Spatial visualization",
    description:"Recreate a pattern using rotation and mental visualization.",
    instructions:"Rotate the source pattern 90°, 180° or 270° as required. Choose the recreated pattern. Pieces may be reused.",
    rounds:9, round_seconds:20, scoring_note:"Rotation accuracy + speed"
  },
  {
    id:"tally", title:"Tally Up", icon:"🔢", skill:"Math at speed",
    description:"Compare two box sums and choose the greater sum, or equality.",
    instructions:"Sum all values in both boxes. A struck value is zero. A multiplier changes the value. Choose >, < or =.",
    rounds:35, round_seconds:4, scoring_note:"4 seconds per round"
  }
];

const seedPattern = (seed) => {
  const p = Array(16).fill(false);
  for (let i=0;i<16;i++) p[i] = ((i+seed)%5===0 || (i+seed)%7===0);
  return p;
};
const rotate = (p,times) => {
  let a=[...p];
  for(let k=0;k<times;k++){
    const b=Array(16).fill(false);
    for(let r=0;r<4;r++) for(let c=0;c<4;c++) b[c*4+(3-r)] = a[r*4+c];
    a=b;
  }
  return a;
};
const nums = (seed,count) => {
  const out=[]; for(let i=0;i<count;i++) out.push(((seed+i*3)%9)+1); return out;
};

function buildQuestion(activity, round){
  const r=round;
  if(activity==="grid"){
    const count=Math.min(6,2+Math.floor((r-1)/2));
    const positions=Array.from({length:25},(_,i)=>i).filter(i=>((i+r*3)%5===0 || (i+r*2)%7===0)).slice(0,count);
    const distractors=[
      positions.map(x=>x+1<25?x+1:x-1),
      [...positions].reverse(),
      positions.map(x=>(x+5)%25)
    ];
    return {
      type:"grid",
      prompt:`Remember the ${count} highlighted positions in order.`,
      description:"Study the grid first. The highlighted cells are the memory sequence for this round.",
      payload:{rows:5,cols:5,positions},
      answer:{positions}
    };
  }
  if(activity==="motion"){
    const minMoves=4+Math.floor((r-1)/2);
    return {
      type:"motion",
      prompt:"Move the ball to the hole in the minimum number of moves.",
      description:"The route contains blocking bars. Choose the minimum move count shown by the puzzle.",
      payload:{rows:5,cols:7,start:0,goal:34,walls:[8,9,15,22,23,24],minimumMoves:minMoves},
      answer:{minimumMoves:minMoves}
    };
  }
  if(activity==="inductive"){
    const shift=(r%3)+1;
    const answer=shift;
    return {
      type:"inductive",
      prompt:"Which option follows the same positional rule?",
      description:"The highlighted position advances by a fixed amount. Identify the rule.",
      payload:{sequence:[0,shift,(shift*2)%9,(shift*3)%9], options:[shift,(shift+1)%5,(shift+2)%5,(shift+3)%5]},
      answer:{option:0}
    };
  }
  if(activity==="deductive"){
    const base=(r%4)+1;
    const matrix=[base,base+1,base+2,base+1,base+2,base+3,base+2,base+3,null];
    return {
      type:"deductive",
      prompt:"Complete the missing cell.",
      description:"Each row and column increases consistently. Select the value that preserves the rule.",
      payload:{matrix,options:[base+4,base+3,base+5,base+2]},
      answer:{option:0}
    };
  }
  if(activity==="numbubbles"){
    const targets=[18,30,17,9,50,-4,6,44,90,8];
    const target=targets[r-1];
    const correct=`${target>=0?target-3:target+3}${target>=0?"+3":"-3"}`;
    const options=[correct,`${target+2}+2`,`${target-4}+1`,`${target*2}/2`,`${target+5}-1`,`${target+1}+4`,`${target-2}+2`,`${target+6}-6`];
    return {
      type:"numbubbles",
      prompt:`Target: ${target}`,
      description:"Pop the equation whose value equals the target.",
      payload:{target,options},
      answer:{equation:correct}
    };
  }
  if(activity==="shortcuts"){
    const minDistance=9+r*2;
    return {
      type:"shortcuts",
      prompt:"Choose the shortest path to the star.",
      description:"Compare the available routes. The correct choice is the route with the minimum effective distance.",
      payload:{nodes:["A","B","C","D","E"],edges:[["A","B",2],["B","C",3],["A","D",4],["D","E",2],["C","E",3]],options:[minDistance,minDistance+2,minDistance+4,minDistance+7]},
      answer:{option:0}
    };
  }
  if(activity==="resemble"){
    const source=seedPattern(r+2), rotation=(r%3)+1, target=rotate(source,rotation);
    const options=[target,rotate(target,1),rotate(target,2),rotate(target,3)];
    return {
      type:"resemble",
      prompt:`Rotate the source pattern ${rotation*90}° clockwise.`,
      description:"Select the pattern that exactly matches the required rotation.",
      payload:{source,rotation,options},
      answer:{option:0}
    };
  }
  if(activity==="tally"){
    const left=nums(r+1,3+(r%4)), right=nums(r+5,3+((r+1)%4));
    const ls=left.reduce((a,b)=>a+b,0), rs=right.reduce((a,b)=>a+b,0);
    return {
      type:"tally",
      prompt:"Which box has the greater sum?",
      description:"Add both boxes and select >, < or =.",
      payload:{left,right,leftSum:ls,rightSum:rs},
      answer:{operator:ls>rs?">":ls<rs?"<":"="}
    };
  }
}

db.prepare("DELETE FROM questions").run();
db.prepare("DELETE FROM activities").run();

const insertActivity=db.prepare(`INSERT INTO activities
(id,title,icon,skill,description,instructions,rounds,round_seconds,scoring_note,active)
VALUES (@id,@title,@icon,@skill,@description,@instructions,@rounds,@round_seconds,@scoring_note,1)`);

const insertQuestion=db.prepare(`INSERT INTO questions
(activity_id,round_no,type,prompt,description,payload_json,answer_json)
VALUES (@activity_id,@round_no,@type,@prompt,@description,@payload_json,@answer_json)`);

const tx=db.transaction(()=>{
  for(const a of activities){
    insertActivity.run(a);
    for(let r=1;r<=a.rounds;r++){
      const q=buildQuestion(a.id,r);
      insertQuestion.run({
        activity_id:a.id, round_no:r, type:q.type, prompt:q.prompt,
        description:q.description, payload_json:JSON.stringify(q.payload),
        answer_json:JSON.stringify(q.answer)
      });
    }
  }
});
tx();

const adminTeam=String(process.env.ADMIN_TEAM||"abrar").trim();
const adminPassword=process.env.ADMIN_PASSWORD||"";
const hash=adminPassword ? bcrypt.hashSync(adminPassword,12) : null;
const exists=db.prepare("SELECT id FROM users WHERE role='admin' LIMIT 1").get();
if (hash) {
  if(!exists){
    db.prepare("INSERT INTO users(name,email,team_name,password_hash,role) VALUES (?,?,?,?, 'admin')")
      .run("NeuroQuest Admin",`${adminTeam}@admin.neuroquest.local`,adminTeam,hash);
  }else{
    db.prepare("UPDATE users SET name=?, email=?, team_name=?, password_hash=? WHERE role='admin'")
      .run("NeuroQuest Admin",`${adminTeam}@admin.neuroquest.local`,adminTeam,hash);
  }
}

console.log(`Seeded ${activities.length} activities and ${activities.reduce((n,a)=>n+a.rounds,0)} rounds.`);
console.log("Admin account configured from environment variables.");
