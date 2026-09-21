import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const b=await chromium.launch();
console.log('=== plate/pill collision across the desktop breakpoint ===');
for(const w of [880,900,940,1000,1100,1280,1440]){
 const ctx=await b.newContext({viewport:{width:w,height:820},deviceScaleFactor:1});
 const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1300);
 await p.evaluate(()=>{const d=document.getElementById('deck');d.scrollTo({top:d.clientHeight,behavior:'auto'});});
 await p.waitForTimeout(700);
 const r=await p.evaluate(()=>{const pan=document.querySelectorAll('.panel')[1];
  const pill=document.getElementById('enquirebtn').getBoundingClientRect();
  const hit=[...pan.querySelectorAll('.plate .lab,.plate h2,.plate .cap,.meter')].map(e=>{const c=e.getBoundingClientRect();
   return {el:e.className||e.tagName, ov:!(c.right<pill.left||c.left>pill.right||c.bottom<pill.top||c.top>pill.bottom), box:[Math.round(c.left),Math.round(c.top),Math.round(c.right),Math.round(c.bottom)]};});
  return {pill:[Math.round(pill.left),Math.round(pill.top),Math.round(pill.right),Math.round(pill.bottom)], hit,
   frames:pan.querySelectorAll('.frame').length, frameW:Math.round(pan.querySelector('.frame').getBoundingClientRect().width),
   snap:getComputedStyle(document.getElementById('deck')).scrollSnapType};});
 const bad=r.hit.filter(x=>x.ov);
 console.log(` ${w}px  frameW=${r.frameW} snap=${r.snap}  pill=${r.pill}  ${bad.length? 'OVERLAP: '+bad.map(x=>x.el+' '+x.box).join(' | ') : 'no overlap'}`);
 await ctx.close();
}
await b.close();
