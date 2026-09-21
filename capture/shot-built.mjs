import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
const ROOT = new URL('../out/', import.meta.url).pathname;
const T = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml',
  '.avif':'image/avif','.webp':'image/webp','.jpg':'image/jpeg','.woff2':'font/woff2','.xml':'application/xml','.txt':'text/plain'};
const srv = createServer(async (req,res)=>{
  let p=decodeURIComponent(req.url.split('?')[0]); if(p.endsWith('/'))p+='index.html';
  try{const b=await readFile(join(ROOT,p));res.writeHead(200,{'content-type':T[extname(p)]??'application/octet-stream'});res.end(b);}
  catch{res.writeHead(404).end('nf');}
});
await new Promise(r=>srv.listen(4322,r));
const b=await chromium.launch(); const errs=[];
for(const [n,path,vp] of [['390-home','/',{width:390,height:844}],['390-about','/about-me/',{width:390,height:844}],['1280-home','/',{width:1280,height:900}]]){
  const ctx=await b.newContext({viewport:vp,isMobile:vp.width<500,deviceScaleFactor:2});
  const p=await ctx.newPage();
  p.on('pageerror',e=>errs.push(`${n} JS: ${e.message}`));
  p.on('console',c=>{if(c.type()==='error')errs.push(`${n} console: ${c.text()}`);});
  await p.goto(`http://localhost:4322${path}`,{waitUntil:'networkidle'});
  await p.waitForTimeout(600);
  await p.screenshot({path:`/tmp/built-${n}.png`});
  await ctx.close();
}
console.log(errs.length?errs.join('\n'):'no console/page errors');
await b.close(); srv.close();
