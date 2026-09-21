import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const b=await chromium.launch();
for (const rm of ['no-preference','reduce']){
  const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,reducedMotion:rm});
  const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1200);
  console.log('\n===== prefers-reduced-motion: '+rm+' =====');
  console.log('  CSS scroll-behavior on #deck:', await p.evaluate(()=>getComputedStyle(document.getElementById('deck')).scrollBehavior));
  // sample deck.scrollTop over time right after a hash route to a far panel
  const samples = await p.evaluate(async ()=>{
    const d=document.getElementById('deck'); d.scrollTop=0; await new Promise(r=>setTimeout(r,300));
    const s=[]; location.hash='#/film-television/';
    for(let i=0;i<14;i++){ s.push(Math.round(d.scrollTop)); await new Promise(r=>requestAnimationFrame(r)); await new Promise(r=>setTimeout(r,40)); }
    return s;
  });
  console.log('  deck.scrollTop after hash->film-television (40ms samples):', samples.join(','));
  const distinct=new Set(samples).size;
  console.log('  -> ANIMATED (intermediate frames):', distinct>2 ? 'YES  <<< reduced-motion NOT respected' : 'no (jumped)');
  // menu nav click path
  const s2 = await p.evaluate(async ()=>{
    const d=document.getElementById('deck'); location.hash='#/'; await new Promise(r=>setTimeout(r,900)); d.scrollTop=0;
    await new Promise(r=>setTimeout(r,200));
    document.getElementById('menubtn').click(); await new Promise(r=>setTimeout(r,150));
    document.querySelectorAll('#navlist a')[3].click();
    const s=[]; for(let i=0;i<14;i++){ s.push(Math.round(d.scrollTop)); await new Promise(r=>setTimeout(r,45)); }
    return s;
  });
  console.log('  via menu nav click:', s2.join(','), '-> animated:', new Set(s2).size>2?'YES':'no');
  // HUD mark transition
  console.log('  .hud .mark transition-duration:', await p.evaluate(()=>getComputedStyle(document.querySelector('.hud .mark')).transitionDuration));
  await ctx.close();
}
await b.close();
