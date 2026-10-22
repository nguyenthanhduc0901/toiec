import fs from 'node:fs';
import path from 'node:path';
export function loadLibrary(root){const years=fs.readdirSync(path.join(root,'data')).map(name=>/^ets(\d{4})\.json$/.exec(name)?.[1]).filter(Boolean).sort();return {version:2,datasets:Object.fromEntries(years.map(year=>[year,JSON.parse(fs.readFileSync(path.join(root,`data/ets${year}.json`),'utf8'))]))};}
export function serializeLibrary(library){return JSON.stringify(library).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');}
