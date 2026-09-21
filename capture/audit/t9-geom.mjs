import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const b=await chromium.launch();
for(const [w,h,lbl] of [[390,844,'iPhone 14 Pro'],[390,664,'390 short (URL bar shown / landscape-ish)'],[320,568,'iPhone SE1'],[360,640,'small android'],[1440,900,'desktop']]){
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:w<900,hasTouch:w<900});
 const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1400);
 console.log(`\n===== ${w}x${h}  (${lbl}) =====`);
 // settle on panel 1
 await p.evaluate(()=>{const d=document.getElementById('deck'); d.scrollTo({top:d.clientHeight,behavior:'auto'});});
 await p.waitForTimeout(900);
 const g=await p.evaluate(()=>{
  const d=document.getElementById('deck'), pan=document.querySelectorAll('.panel')[1];
  const pr=pan.getBoundingClientRect(), plate=pan.querySelector('.plate'), pl=plate.getBoundingClientRect();
  const pill=document.getElementById('enquirebtn').getBoundingClientRect();
  const parts={}; ['.lab','h2','.cap','.meter'].forEach(s=>{const e=plate.querySelector(s); if(e){const r=e.getBoundingClientRect(); parts[s]=[Math.round(r.top),Math.round(r.bottom)];}});
  const meter=plate.querySelector('.meter').getBoundingClientRect();
  const overlap = !(meter.right<pill.left||meter.left>pill.right||meter.bottom<pill.top||meter.top>pill.bottom);
  const capOv = (()=>{const c=plate.querySelector('.cap').getBoundingClientRect();
     return !(c.right<pill.left||c.left>pill.right||c.bottom<pill.top||c.top>pill.bottom);})();
  return {dvh:d.clientHeight, innerH:innerHeight, panelTop:Math.round(pr.top), panelBottom:Math.round(pr.bottom),
    deckScrollTop:Math.round(d.scrollTop), plateTop:Math.round(pl.top), plateBottom:Math.round(pl.bottom),
    parts, pill:[Math.round(pill.left),Math.round(pill.top),Math.round(pill.right),Math.round(pill.bottom)],
    meterClippedBelowViewport: meter.bottom>innerHeight, meterBottom:Math.round(meter.bottom),
    meterOverlapsPill:overlap, capOverlapsPill:capOv,
    gapMeterToPill: Math.round(pill.top-meter.bottom)};});
 console.log(JSON.stringify(g,null,1));
 // capture the panel for eyeballing
 await p.screenshot({path:`/Users/mayu/Projects/tesserix/beautyandcruor/capture/audit/geom-${w}x${h}.png`});
 await ctx.close();
}
await b.close();
