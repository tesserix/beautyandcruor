import { chromium } from 'playwright';
const P='file:///private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad/instagram-wrapped.html';
const b=await chromium.launch(); const errs=[];
for (const [name,vp,dark] of [['390',{width:390,height:844},false],['dark',{width:900,height:1000},true]]){
  const ctx=await b.newContext({viewport:vp,isMobile:name==='390',hasTouch:name==='390',deviceScaleFactor:2,colorScheme:dark?'dark':'light'});
  const p=await ctx.newPage();
  p.on('pageerror',e=>errs.push('JS: '+e.message));
  p.on('console',c=>{if(c.type()==='error')errs.push('console: '+c.text());});
  await p.goto(P,{waitUntil:'load'}); await p.waitForTimeout(1200);
  await p.screenshot({path:`/tmp/ig-${name}.png`,fullPage:name==='dark'?false:false});
  if(name==='390'){ await p.evaluate(()=>document.getElementById('perf').scrollIntoView()); await p.waitForTimeout(400);
    await p.screenshot({path:'/tmp/ig-390-table.png'}); }
  await ctx.close();
}
console.log(errs.length?errs.join('\n'):'no errors');
await b.close();
