import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadLibrary, serializeLibrary } from './library.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
// Escaping '<' prevents source text from closing the JSON script element.
const data=serializeLibrary(loadLibrary(root));
const css=read('src/app.css')+'\n.choice:disabled{opacity:1;cursor:default}';
const js=read('src/app.js');
const html=read('src/template.html')
  .replace('/*__CSS__*/',()=>css)
  .replace('/*__DATA__*/',()=>data)
  .replace('/*__JS__*/',()=>js);
fs.writeFileSync(path.join(root,'index.html'),html);
console.log(`Built index.html (${Buffer.byteLength(html).toLocaleString()} bytes).`);
