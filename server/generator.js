// Server-side question variation generator. A stable seed per attempt + round
// makes a question reproducible on refresh without storing the answer in the API.
const hashSeed = (attemptId, round) => (Math.imul(Number(attemptId) || 1, 2654435761) ^ Math.imul(Number(round) || 1, 2246822519)) >>> 0;
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
const shuffle = (items, rand) => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const sampleInts = (count, max, rand) => shuffle(Array.from({ length: max }, (_, i) => i), rand).slice(0, count);
const rotate4 = (cells, turns) => {
  let out = [...cells];
  for (let k = 0; k < turns; k++) {
    const next = Array(16).fill(false);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) next[c * 4 + (3 - r)] = out[r * 4 + c];
    out = next;
  }
  return out;
};
function makeOptions(correct, distractors, rand) {
  const values = [correct, ...distractors];
  const shuffled = shuffle(values, rand);
  return { options: shuffled, answer: shuffled.findIndex(v => JSON.stringify(v) === JSON.stringify(correct)) };
}
function equationFor(target, rand) {
  const forms = [
    () => `${target - 3}+3`, () => `${target + 5}-5`,
    () => `${target * 2}/2`, () => `${target + 8}-8`,
    () => `${target}*1`, () => `${target + 1}-1`
  ];
  return forms[Math.floor(rand() * forms.length)]();
}
function generateQuestion(activityId, round, attemptId, templateId) {
  const rand = random(hashSeed(attemptId, round));
  const r = Math.max(1, Number(round) || 1);
  let type, prompt, description, payload, answer;
  if (activityId === "grid") {
    type = "grid";
    const count = Math.min(7, 2 + Math.floor((r - 1) / 2));
    const positions = sampleInts(count, 25, rand);
    const symmetryChecks = Array.from({length:count-1},()=>{
      const left=sampleInts(4,25,rand);
      const reflect=cell=>Math.floor(cell/5)*5+(4-cell%5);
      const symmetric=rand()>.5;
      let right=left.map(reflect);
      if(!symmetric){const replacementPool=Array.from({length:25},(_,i)=>i).filter(i=>!right.includes(i));right[0]=replacementPool[Math.floor(rand()*replacementPool.length)];}
      return {left,right,symmetric};
    });
    prompt = `Remember the ${count} highlighted positions in order.`;
    description = "Memorize each dot. Between dots, decide whether the two figures are symmetrical, then recall the dot sequence.";
    const choices=shuffle([positions,[...positions].reverse(),positions.map(x=>(x+1)%25),positions.map(x=>(x+5)%25)],rand);
    payload = { rows: 5, cols: 5, positions, choices, symmetryChecks:symmetryChecks.map(({left,right})=>({left,right})) };
    answer = { positions, symmetryAnswers:symmetryChecks.map(check=>check.symmetric) };
  } else if (activityId === "motion") {
    type = "motion";
    const route=[0];let row=0,col=0;
    while(row<4||col<6){const canDown=row<4,canRight=col<6;const down=canDown&&(!canRight||rand()<.42);if(down)row++;else col++;route.push(row*7+col);}
    const minBlockCount=Math.min(7,3+Math.floor((r-1)/3));
    const wallCells=shuffle(route.slice(2,-1),rand).slice(0,minBlockCount);
    const correct=wallCells.length;
    const picks=new Set([correct]);while(picks.size<4)picks.add(Math.max(1,correct+Math.floor(rand()*7)-3));
    const choices=shuffle([...picks],rand);
    prompt = "Move the red ball to the black hole by clearing the blocked track.";
    description = "Tap a purple block to move it off the track. Guide the ball along the connected track, then choose the minimum number of block moves.";
    payload = { rows:5,cols:7,start:0,goal:34,route,walls:wallCells,options:choices };
    answer = { minimumMoves:correct,option:choices.indexOf(correct) };
  } else if (activityId === "inductive") {
    type = "inductive";
    const step = 1 + Math.floor(rand() * 4);
    const starts = sampleInts(2, 9, rand);
    const sequence = [0, 1, 2, 3].map(i => starts.map(start => (start + i * step) % 9));
    const correctCells = starts.map(start => (start + 4 * step) % 9);
    const distractors = shuffle(Array.from({ length: 9 }, (_, i) => i).filter(x => !correctCells.includes(x)), rand).slice(0, 2);
    const options = shuffle([...correctCells, ...distractors], rand);
    prompt = "Which TWO figures continue the positional pattern?";
    description = "Track both highlighted positions across the sequence. Select the two cells that follow the same movement rule.";
    payload = { sequence, options };
    answer = { options: correctCells.map(cell => options.indexOf(cell)).sort((a,b)=>a-b) };
  } else if (activityId === "deductive") {
    type = "deductive";
    const size = r > 7 ? 4 : 3;
    const shift = Math.floor(rand() * size);
    const matrix = Array.from({ length: size * size }, (_, i) => (Math.floor(i / size) + i % size + shift) % size);
    const missing = size * size - 1;
    const correct = matrix[missing]; matrix[missing] = null;
    const distractors = shuffle(Array.from({ length: size }, (_, i) => i).filter(x => x !== correct), rand);
    while(distractors.length<3)distractors.push(size+distractors.length);
    const opts = makeOptions(correct, distractors.slice(0,3), rand);
    prompt = "Which symbol completes the logic grid?";
    description = "Each symbol appears once in every row and column. Find the missing value.";
    payload = { size, matrix, options: opts.options };
    answer = { option: opts.answer };
  } else if (activityId === "numbubbles") {
    type = "numbubbles";
    const target = Math.floor(rand() * 91) + 5;
    const correct = equationFor(target, rand);
    const options = new Set([correct]);
    while (options.size < 20) {
      const a = Math.floor(rand() * 121) - 10;
      const b = Math.floor(rand() * 30) + 1;
      const op = ["+", "−", "×"][Math.floor(rand() * 3)];
      const expr = op === "+" ? `${a}+${b}` : op === "−" ? `${a}-${b}` : `${a}*${b}`;
      const value = op === "+" ? a + b : op === "−" ? a - b : a * b;
      if (value !== target) options.add(expr);
    }
    const list = shuffle([...options], rand);
    prompt = `Pop the bubble that equals ${target}.`;
    description = "Calculate quickly and tap the one equation bubble matching the target.";
    payload = { target, options: list };
    answer = { equation: correct };
  } else if (activityId === "shortcuts") {
    type = "shortcuts";
    const nodes = ["A", "B", "C", "D", "E", "F"];
    const edges = [[0,1],[1,2],[0,3],[3,4],[4,5],[2,5],[1,4],[2,4]].map(([a,b]) => [nodes[a], nodes[b], 1 + Math.floor(rand() * 8)]);
    const discountNode=rand()<.5?"D":"E";
    const discount=4+Math.floor(rand()*7);
    const paths = [
      ["A","B","C","F"], ["A","D","E","F"], ["A","B","E","F"], ["A","D","E","C","F"]
    ].map(path => {
      const blueDistance=path.slice(0,-1).reduce((sum,node,i) => {
        const edge=edges.find(e => (e[0]===node&&e[1]===path[i+1])||(e[1]===node&&e[0]===path[i+1]));
        return sum+(edge?.[2]??5);
      },0);
      const redDistance=1+Math.floor(rand()*5);
      const shortcutUsed=path.includes(discountNode);
      return {path,blueDistance,redDistance,shortcutUsed,distance:Math.max(0,blueDistance+redDistance-(shortcutUsed?discount:0))};
    });
    const sorted = [...paths].sort((a,b)=>a.distance-b.distance);
    const correctPath = sorted[0];
    const shuffled = shuffle(paths, rand);
    prompt = "Choose the shortest total route from the blue marble to the star.";
    description = "Compare blue-route and red-marble distances. Passing the grey shortcut subtracts its value once.";
    payload = { nodes, edges, paths: shuffled, discountNode, discount };
    answer = { option: shuffled.findIndex(p => JSON.stringify(p.path)===JSON.stringify(correctPath.path)) };
  } else if (activityId === "resemble") {
    type = "resemble";
    let source,orbit;
    for(let tries=0;tries<30;tries++){
      source=Array.from({length:16},()=>rand()>.62);
      orbit=[source,rotate4(source,1),rotate4(source,2),rotate4(source,3)];
      if(new Set(orbit.map(pattern=>JSON.stringify(pattern))).size===4)break;
    }
    if(new Set(orbit.map(pattern=>JSON.stringify(pattern))).size!==4){source=[true,true,false,false,true,false,false,false,false,true,false,false,false,false,false,true];orbit=[source,rotate4(source,1),rotate4(source,2),rotate4(source,3)];}
    const turns = 1 + Math.floor(rand()*3);
    const correct = rotate4(source,turns);
    const variants = [correct,rotate4(correct,1),rotate4(correct,2),rotate4(correct,3)];
    const options = shuffle(variants,rand);
    prompt = `Rotate the source pattern ${turns*90}° clockwise.`;
    description = "Mentally rotate the 4 × 4 pattern and select the matching image.";
    payload = { source, rotation:turns, options };
    answer = { option:options.findIndex(p=>JSON.stringify(p)===JSON.stringify(correct)) };
  } else if (activityId === "tally") {
    type = "tally";
    const makeBox = () => Array.from({length:3+Math.floor(rand()*4)},()=>({value:Math.floor(rand()*12)+1,struck:rand()<.15,multiplier:rand()<.25?2:1}));
    const left=makeBox(), right=makeBox();
    const leftMega=rand()<.18?2:1, rightMega=rand()<.18?2:1;
    const sum = box => box.reduce((s,x)=>s+(x.struck?0:x.value*x.multiplier),0);
    const ls=sum(left)*leftMega, rs=sum(right)*rightMega;
    prompt = "Which box has the greater total?";
    description = "Struck values count as zero. Apply item multipliers and any box multiplier, then compare totals.";
    payload = { left,right,leftMega,rightMega };
    answer = { operator:ls>rs?">":ls<rs?"<":"=" };
  } else throw new Error(`Unknown activity: ${activityId}`);
  return { id:templateId, activity_id:activityId, round_no:r, type, prompt, description, payload_json:JSON.stringify(payload), answer_json:JSON.stringify(answer) };
}
export { generateQuestion };
