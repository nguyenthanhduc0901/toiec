import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';

// Only complete files enter the cache. No credentials or arbitrary URLs are accepted.
export function createAudioCache(root,library,{fetcher=fetch}={}){
 const directory=path.join(root,'work','audio-cache');
 const allowed=new Set(Object.values(library.datasets).flatMap(d=>d.groups.map(g=>g.audio).filter(Boolean)));
 const pending=new Map();
 const filename=url=>path.join(directory,createHash('sha256').update(url).digest('hex')+'.mp3');
 function validate(url){if(!allowed.has(url))throw new Error('Unknown audio URL');}
 async function file(url){validate(url);try{const stat=await fs.stat(filename(url));return stat.size>0?{path:filename(url),size:stat.size}:null;}catch(error){if(error.code==='ENOENT')return null;throw error;}}
 async function download(url){
  validate(url);
  if(pending.has(url))return pending.get(url);
  const task=(async()=>{
   const cached=await file(url);if(cached)return cached;
   await fs.mkdir(directory,{recursive:true});
   const temporary=filename(url)+'.partial';
   let handle;
   try{
    const response=await fetcher(url,{redirect:'error',signal:AbortSignal.timeout(60000)});
    if(response.status!==200||!/^audio\//i.test(response.headers.get('content-type')||'')||!response.body)throw new Error('Audio source unavailable');
    handle=await fs.open(temporary,'w');let size=0;
    for await(const chunk of response.body){size+=chunk.length;if(size>64*1024*1024)throw new Error('Audio too large');await handle.writeFile(chunk);}
    const expected=Number(response.headers.get('content-length'));
    if(!size||(expected&&!response.headers.get('content-encoding')&&expected!==size))throw new Error('Incomplete audio');
    await handle.close();handle=null;
    await fs.rename(temporary,filename(url));return {path:filename(url),size};
   }catch(error){await handle?.close().catch(()=>{});await fs.rm(temporary,{force:true}).catch(()=>{});throw error;}
  })();
  pending.set(url,task);try{return await task;}finally{pending.delete(url);}
 }
 async function manifest(year,part){
  const data=library.datasets[String(year)];
  if(!data||!Number.isInteger(part)||part<1||part>7)throw new Error('Invalid collection');
  const urls=[...new Set(data.groups.filter(g=>g.part===part&&g.audio).map(g=>g.audio))];
  const ready=(await Promise.all(urls.map(async url=>(await file(url))?url:null))).filter(Boolean);
  return {urls,ready};
 }
 return {file,download,manifest};
}

export function audioRange(header,size){
 if(!header)return null;
 const match=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match||(!match[1]&&!match[2]))throw new Error('Invalid range');
 let start=match[1]?Number(match[1]):Math.max(0,size-Number(match[2]));
 let end=match[1]?(match[2]?Math.min(size-1,Number(match[2])):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>end||start>=size)throw new Error('Unsatisfiable range');
 return {start,end};
}
