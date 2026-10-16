import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const data=JSON.parse(read('data/ets2024.json'));
assert.equal(data.questions.length,2000,'Must contain 2,000 questions');
assert.equal(data.tests.length,10,'Must contain 10 tests');
assert.equal(new Set(data.questions.map(q=>q.id)).size,2000,'Question IDs must be unique');
const groups=new Map(data.groups.map(g=>[g.id,g]));
assert.equal(groups.size,data.groups.length,'Group IDs must be unique');
const counts=[60,250,390,300,300,160,540];
for(let part=1;part<=7;part++)assert.equal(data.questions.filter(q=>q.part===part).length,counts[part-1],`Part ${part} count`);
for(let test=1;test<=10;test++){
 const questions=data.questions.filter(q=>q.test===test);
 assert.equal(questions.length,200,`Test ${test} count`);
 assert.deepEqual(questions.map(q=>q.original),Array.from({length:200},(_,i)=>i+1),`Test ${test} original order`);
 for(let part=1;part<=7;part++)assert.equal(questions.filter(q=>q.part===part).length,counts[part-1]/10,`Test ${test} Part ${part}`);
}
for(const q of data.questions){
 const g=groups.get(q.group);
 assert.ok(g,`Missing group ${q.group}`);
 assert.equal(g.test,q.test);assert.equal(g.part,q.part);
 assert.ok(g.numbers.includes(q.original));
 assert.equal(q.choices.length,q.part===2?3:4,`Choice count ${q.id}`);
 assert.deepEqual(q.choices.map(c=>c.label),q.part===2?['A','B','C']:['A','B','C','D']);
 assert.ok(Number.isInteger(q.correct)&&q.correct>=0&&q.correct<q.choices.length,`Correct answer ${q.id}`);
 assert.ok(typeof q.explanation==='string'&&q.explanation.trim(),`Explanation ${q.id}`);
 if(q.part<=4)assert.ok(g.audio.startsWith('https://'),`Audio URL ${q.id}`);
}
new vm.Script(read('src/app.js'),{filename:'src/app.js'});
const html=read('index.html');
assert.ok(!html.includes('/*__CSS__*/')&&!html.includes('/*__JS__*/')&&!html.includes('/*__DATA__*/'),'Build placeholders remain');
const embedded=html.match(/<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/);
assert.ok(embedded,'Embedded dataset missing');
assert.deepEqual(JSON.parse(embedded[1]),data,'Built dataset is stale');
const expected=read('src/template.html')
 .replace('/*__CSS__*/',()=>read('src/app.css')+'\n.choice:disabled{opacity:1;cursor:default}')
 .replace('/*__DATA__*/',()=>JSON.stringify(data).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029'))
 .replace('/*__JS__*/',()=>read('src/app.js'));
assert.equal(html,expected,'index.html is stale; run npm run build');
console.log('PASS: 10 tests, 2,000 questions/answers/explanations, ordering, grouping, choices, audio URLs, JS syntax, and reproducible standalone HTML.');
