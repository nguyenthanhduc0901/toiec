'use strict';
class PartAudioCache {
 constructor({onChange=()=>{},fetcher=(...args)=>fetch(...args),available=()=>location.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(location.hostname),random=Math.random}={}){
  this.onChange=onChange;this.fetcher=fetcher;this.available=available;this.random=random;this.ready=new Set();this.state=null;
 }
 shuffled(urls){const result=[...urls];for(let i=result.length-1;i>0;i--){const j=Math.floor(this.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}
 source(url,part){return (this.ready.has(url)&&this.available()?`/api/audio-cache/file?url=${encodeURIComponent(url)}`:url)+(part===1?'#t=5':part===2?'#t=1.9':'');}
 select(year,part,urls,current){
  const key=`${year}:${part}`;
  if(this.state?.key===key){this.prioritize(current);this.onChange();return;}
  this.state?.controller.abort();
  const state={key,urls:[...new Set(urls)],queue:[],failed:new Set(),attempts:new Map(),controller:new AbortController(),running:0,loading:false,unsupported:false};
  this.state=state;
  if(!state.urls.length){this.onChange();return;}
  if(!this.available()){state.unsupported=true;this.onChange();return;}
  state.loading=true;this.onChange();
  void this.initialize(state,year,part,current);
 }
 async initialize(state,year,part,current){
  try{
   const response=await this.fetcher(`/api/audio-cache?year=${year}&part=${part}`,{signal:state.controller.signal});
   if(!response.ok)throw new Error('Cache unavailable');
   const data=await response.json();if(!Array.isArray(data.ready))throw new Error('Invalid cache response');
   if(this.state!==state)return;
   for(const url of data.ready)if(state.urls.includes(url))this.ready.add(url);
   state.queue=this.shuffled(state.urls.filter(url=>!this.ready.has(url)));
   state.loading=false;this.prioritize(current);this.onChange();this.pump(state);
  }catch(error){if(this.state===state&&!state.controller.signal.aborted){state.loading=false;state.unsupported=true;this.onChange();}}
 }
 prioritize(url){const queue=this.state?.queue;if(!queue)return;const i=queue.indexOf(url);if(i>0){queue.splice(i,1);queue.unshift(url);}}
 pump(state){
  if(this.state!==state||state.controller.signal.aborted)return;
  // Two background requests keep bandwidth available for the active player.
  while(state.running<2&&state.queue.length){const url=state.queue.shift();state.running++;void this.download(state,url);}
 }
 async download(state,url){
  try{
   const response=await this.fetcher('/api/audio-cache',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url}),signal:state.controller.signal});
   if(!response.ok)throw new Error('Download failed');
   const result=await response.json();if(result.ready!==true||result.url!==url)throw new Error('Incomplete download');
   // The server acknowledges only an atomically committed, complete local file.
   this.ready.add(url);state.failed.delete(url);
  }catch(error){
   if(!state.controller.signal.aborted){const count=(state.attempts.get(url)||0)+1;state.attempts.set(url,count);if(count<3)state.queue.push(url);else state.failed.add(url);}
  }finally{state.running--;if(this.state===state){this.onChange();this.pump(state);}}
 }
 retry(){const state=this.state;if(!state)return;if(state.unsupported){this.state=null;this.select(...state.key.split(':'),state.urls);return;}for(const url of this.shuffled(state.failed)){state.attempts.delete(url);state.queue.push(url);}state.failed.clear();this.onChange();this.pump(state);}
}
