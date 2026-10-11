import { readFile } from 'node:fs/promises';
const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
const externalAssets=/<(?:script|img|link)[^>]+(?:src|href)=["'](?:https?:|\/\/)/i.test(html);
const moduleScripts=/<script[^>]+type=["']module/i.test(html);
const scriptCount=(html.match(/<script>/g)||[]).length;
if(externalAssets||moduleScripts||scriptCount!==1)throw new Error('HTML is not a standalone classic-script bundle');
if(!html.includes('Permission is hereby granted'))throw new Error('Bundled license missing');
console.log(JSON.stringify({result:'PASS',bytes:Buffer.byteLength(html),externalAssets,moduleScripts,scriptCount},null,2));
