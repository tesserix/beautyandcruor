import { chromium } from 'playwright'; import http from 'http'; import fs from 'fs'; import zlib from 'zlib';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const html=fs.readFileSync(D+'/wrap.html');
const gz=zlib.gzipSync(html,{level:9});
console.log('transfer: raw', (html.length/1048576).toFixed(2),'MB   gzip', (gz.length/1048576).toFixed(2),'MB');
const srv=http.createServer((q,r)=>{ r.writeHead(200,{'content-type':'text/html; charset=utf-8','content-encoding':'gzip','cache-control':'no-store'}); r.end(gz); });
await new Promise(r=>srv.listen(8787,r));
const b=await chromium.launch();
for(const [label, cond, cpu] of [
  ['Lighthouse mobile (1.6Mbps, 150ms RTT, 4x CPU)', {offline:false,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8,latency:150}, 4],
  ['Good 4G (9Mbps, 60ms, 4x CPU)',                   {offline:false,downloadThroughput:9*1024*1024/8,uploadThroughput:3*1024*1024/8,latency:60}, 4],
  ['Unthrottled',                                      null, 1]]){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const p=await ctx.newPage(); const cdp=await ctx.newCDPSession(p);
  if(cond){ await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions',{...cond,connectionType:'cellular4g'}); }
  await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpu});
  const t0=Date.now();
  await p.goto('http://127.0.0.1:8787/',{waitUntil:'load',timeout:180000});
  const loadMs=Date.now()-t0;
  await p.waitForTimeout(2500);
  const m=await p.evaluate(()=>{const g=n=>{const e=performance.getEntriesByName(n)[0];return e?Math.round(e.startTime):null;};
    const nav=performance.getEntriesByType('navigation')[0];
    let lcp=null; const le=performance.getEntriesByType('largest-contentful-paint'); if(le.length) lcp=Math.round(le[le.length-1].startTime);
    let tbt=0; performance.getEntriesByType('longtask').forEach(t=>{tbt+=Math.max(0,t.duration-50)});
    return {FP:g('first-paint'),FCP:g('first-contentful-paint'),LCP:lcp, domInteractive:Math.round(nav.domInteractive),
      domContentLoaded:Math.round(nav.domContentLoadedEventEnd), loadEvent:Math.round(nav.loadEventEnd),
      responseEnd:Math.round(nav.responseEnd), transfer:nav.transferSize, decoded:nav.decodedBodySize, longtaskTBT:Math.round(tbt)};});
  console.log('\n--- '+label+' ---');
  console.log('  ', JSON.stringify(m));
  console.log('   wall-clock to load event:', loadMs+'ms');
  await ctx.close();
}
// blank-until-parsed check
{ const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const p=await ctx.newPage(); const cdp=await ctx.newCDPSession(p);
  await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions',{offline:false,downloadThroughput:1.6*1024*1024/8,uploadThroughput:1e5,latency:150,connectionType:'cellular4g'});
  p.goto('http://127.0.0.1:8787/').catch(()=>{});
  console.log('\n--- what is on screen during load (1.6Mbps) ---');
  for(const t of [1000,3000,6000,9000,12000]){
    await p.waitForTimeout(t===1000?1000:3000);
    const s=await p.evaluate(()=>({deckChildren:document.getElementById('deck')?document.getElementById('deck').children.length:'no #deck',
      imgs:document.querySelectorAll('img').length, bodyText:(document.body.innerText||'').trim().slice(0,40)})).catch(()=>({err:1}));
    console.log('   t='+t+'ms', JSON.stringify(s));
  }
  await ctx.close(); }
await b.close(); srv.close();
