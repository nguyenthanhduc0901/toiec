import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {createAudioCache,audioRange} from './audio-cache.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const source=await fs.readFile(path.join(root,'src/audio-cache.js'),'utf8');
const context=vm.createContext({AbortController});
const Client=vm.runInContext(source+'\nPartAudioCache;',context);
const tick=()=>new Promise(resolve=>setTimeout(resolve,1));
async function until(predicate){const deadline=Date.now()+3000;while(!predicate()){assert.ok(Date.now()<deadline,'Async operation timed out');await tick();}}
const response=value=>({ok:true,json:async()=>value});

test('downloads every unique URL, shuffles the queue, prioritizes current and caps concurrency',async()=>{
 const urls=['a','b','c','d','e','f'];const requested=[];let active=0,maxActive=0;const finish=[];
 const cache=new Client({available:()=>true,random:()=>0.5,fetcher:async(url,options)=>{
  if(!options?.method)return response({ready:[]});
  const audio=JSON.parse(options.body).url;requested.push(audio);active++;maxActive=Math.max(active,maxActive);
  return new Promise(resolve=>finish.push(()=>{active--;resolve(response({url:audio,ready:true}));}));
 }});
 cache.select('2024',2,[...urls,'a'],'a');await until(()=>finish.length===2);
 assert.equal(requested[0],'a');assert.equal(cache.ready.size,0,'Do not mark in-flight files ready');
 while(cache.ready.size<urls.length){finish.splice(0).forEach(fn=>fn());await tick();}
 assert.equal(maxActive,2);assert.deepEqual([...requested].sort(),urls);assert.notDeepEqual(requested,urls);
 assert.ok(cache.source('b',2).endsWith('#t=1.9'));assert.ok(cache.source('b',3).startsWith('/api/audio-cache/file?'));
});

test('keeps going after errors; only completed files become ready and retry works',async()=>{
 let broken=true;let attempts=0;
 const cache=new Client({available:()=>true,fetcher:async(url,options)=>{
  if(!options?.method)return response({ready:[]});const audio=JSON.parse(options.body).url;
  if(audio==='bad'&&broken){attempts++;throw new Error('Offline');}return response({url:audio,ready:true});
 }});
 cache.select('2024',1,['bad','good']);await until(()=>cache.state.failed.size===1);
 assert.equal(attempts,3);assert.ok(cache.ready.has('good'));assert.ok(!cache.ready.has('bad'));
 broken=false;cache.retry();await until(()=>cache.ready.has('bad'));assert.equal(cache.state.failed.size,0);
});

test('changing year/Part aborts old requests and does not start its remaining queue',async()=>{
 const old=[];
 const cache=new Client({available:()=>true,fetcher:async(url,options)=>{
  if(!options?.method)return response({ready:[]});const audio=JSON.parse(options.body).url;
  if(audio.startsWith('old')){old.push(audio);return new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true}));}
  return response({url:audio,ready:true});
 }});
 cache.select('2024',1,['old1','old2','old3']);await until(()=>old.length===2);const previous=cache.state;
 cache.select('2026',2,['new']);await until(()=>cache.ready.has('new'));
 assert.ok(previous.controller.signal.aborted);assert.equal(old.length,2);assert.equal(cache.state.key,'2026:2');
});

test('restores disk manifest, shares grouped URLs and handles file mode without false readiness',async()=>{
 let posts=0;const cache=new Client({available:()=>true,fetcher:async(url,options)=>{if(options?.method)posts++;return response({ready:['shared','foreign']});}});
 cache.select('2024',3,['shared','shared']);await until(()=>!cache.state.loading);
 assert.equal(cache.state.urls.length,1);assert.equal(posts,0);assert.ok(cache.ready.has('shared'));assert.ok(!cache.ready.has('foreign'));
 const standalone=new Client({available:()=>false});standalone.select('2024',1,['x']);assert.ok(standalone.state.unsupported);assert.equal(standalone.source('x',1),'x');
});

test('server commits full files atomically, restores them and refuses partial/unknown downloads',async()=>{
 const base=path.join(root,'work','audio-cache-tests');await fs.mkdir(base,{recursive:true});const temporary=await fs.mkdtemp(path.join(base,'run-'));
 const audio='https://example.com/allowed.mp3';const library={datasets:{2024:{groups:[{part:1,audio},{part:1,audio}]}}};let calls=0;
 const cache=createAudioCache(temporary,library,{fetcher:async()=>{calls++;await tick();return new Response(new Uint8Array([1,2,3]),{headers:{'content-type':'audio/mpeg','content-length':'3'}});}});
 try{
  assert.equal(await cache.file(audio),null);await assert.rejects(cache.download('https://example.com/other.mp3'));
  await Promise.all([cache.download(audio),cache.download(audio)]);assert.equal(calls,1);
  const manifest=await cache.manifest('2024',1);assert.deepEqual(manifest,{urls:[audio],ready:[audio]});
  const restarted=createAudioCache(temporary,library);assert.equal((await restarted.file(audio)).size,3);
  const bad='https://example.com/truncated.mp3';const broken=createAudioCache(temporary,{datasets:{2024:{groups:[{part:2,audio:bad}]}}},{fetcher:async()=>new Response(new Uint8Array([1]),{headers:{'content-type':'audio/mpeg','content-length':'100'}})});
  await assert.rejects(broken.download(bad));assert.equal(await broken.file(bad),null);
  assert.ok(!(await fs.readdir(path.join(temporary,'work','audio-cache'))).some(name=>name.endsWith('.partial')));
 }finally{
  const directory=path.join(temporary,'work','audio-cache');for(const name of await fs.readdir(directory))await fs.unlink(path.join(directory,name));
  await fs.rmdir(directory);await fs.rmdir(path.dirname(directory));await fs.rmdir(temporary);
 }
});

test('cached audio supports normal, suffix and open byte ranges for seeking',()=>{
 assert.deepEqual(audioRange('bytes=10-19',100),{start:10,end:19});
 assert.deepEqual(audioRange('bytes=90-',100),{start:90,end:99});
 assert.deepEqual(audioRange('bytes=-10',100),{start:90,end:99});
 assert.equal(audioRange(undefined,100),null);
 for(const header of ['bytes=100-','bytes=20-10','bytes=-','bytes=0-1,4-5'])assert.throws(()=>audioRange(header,100));
});
