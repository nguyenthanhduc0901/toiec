import './build.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'dist');
fs.mkdirSync(output,{recursive:true});
// Publish only the application, never the repository or personal progress files.
fs.copyFileSync(path.join(root,'index.html'),path.join(output,'index.html'));
fs.writeFileSync(path.join(output,'_headers'),'/\n  Cache-Control: no-cache\n/index.html\n  Cache-Control: no-cache\n/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n');
const unexpected=fs.readdirSync(output).filter(name=>!['index.html','_headers'].includes(name));
if(unexpected.length)throw new Error('Unexpected files in dist; inspect before deploying: '+unexpected.join(', '));
console.log('Hosted build ready in dist/ (index.html and _headers only).');
