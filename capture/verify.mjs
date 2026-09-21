import { chromium } from 'playwright';
const P='file:///private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad/immersive-wrapped.html';
const b=await chromium.launch();
const errs=[];
const ctx=await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2});
const p=await ctx.newPage();
p.on('pageerror',e=>errs.push('JS: '+e.message));
p.on('console',c=>{if(c.type()==='error')errs.push('console: '+c.text());});
await p.goto(P,{waitUntil:'load'}); await p.waitForTimeout(2000);

// 1. THE CRITICAL BUG: Enquire -> Escape -> Enquire again
await p.click('#enquirebtn'); await p.waitForTimeout(500);
const open1 = await p.evaluate(()=>!document.getElementById('contact').hidden);
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
const closed = await p.evaluate(()=>document.getElementById('contact').hidden);
const hashAfter = await p.evaluate(()=>location.hash);
await p.click('#enquirebtn'); await p.waitForTimeout(500);
const open2 = await p.evaluate(()=>!document.getElementById('contact').hidden);
console.log(`1. Enquire->Esc->Enquire : open=${open1} closed=${closed} hash='${hashAfter}' reopens=${open2}  ${open1&&closed&&open2?'FIXED':'STILL BROKEN'}`);
await p.keyboard.press('Escape'); await p.waitForTimeout(300);

// 2. pill hidden on contact, visible elsewhere
await p.evaluate(()=>{location.hash='#/contact-us/';}); await p.waitForTimeout(500);
const pillOnContact = await p.evaluate(()=>document.getElementById('enquirebtn').hidden);
await p.evaluate(()=>{location.hash='#/credits/';}); await p.waitForTimeout(500);
const pillClickable = await p.evaluate(()=>{
  const r=document.getElementById('enquirebtn').getBoundingClientRect();
  const el=document.elementFromPoint(r.left+r.width/2, r.top+r.height/2);
  return el && el.id==='enquirebtn';
});
console.log(`2. Pill hidden on contact=${pillOnContact}, clickable over credits sheet=${pillClickable}`);

// 3. focus + inert
await p.evaluate(()=>{location.hash='#/about-me/';}); await p.waitForTimeout(500);
const modal = await p.evaluate(()=>({
  focusInside: document.getElementById('about').contains(document.activeElement),
  deckInert: document.getElementById('deck').inert === true,
  activeTag: document.activeElement.tagName + '.' + document.activeElement.className,
}));
console.log(`3. Focus inside sheet=${modal.focusInside} (${modal.activeTag}), deck inert=${modal.deckInert}`);
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
const returned = await p.evaluate(()=>document.activeElement.id||document.activeElement.tagName);
console.log(`   focus after Escape -> '${returned}'`);

// 4. touch targets
const rects = await p.evaluate(()=>{
  const g=s=>{const e=document.querySelector(s); if(!e)return null; const r=e.getBoundingClientRect(); return [Math.round(r.width),Math.round(r.height)];};
  return { menu:g('#menubtn'), enquire:g('#enquirebtn') };
});
await p.evaluate(()=>{location.hash='#/credits/';}); await p.waitForTimeout(400);
const rects2 = await p.evaluate(()=>{
  const g=s=>{const e=document.querySelector(s); if(!e)return null; const r=e.getBoundingClientRect(); return [Math.round(r.width),Math.round(r.height)];};
  return { close:g('#credits .closebtn'), chip:g('#credits .filters button') };
});
console.log(`4. Targets menu=${rects.menu} enquire=${rects.enquire} close=${rects2.close} chip=${rects2.chip}  (need >=44 tall)`);

// 5. reel semantics + alt uniqueness
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
const a11y = await p.evaluate(()=>{
  const reels=[...document.querySelectorAll('.reel')];
  const alts=[...document.querySelectorAll('.frame img')].map(i=>i.alt);
  return { reels:reels.length, roled:reels.filter(r=>r.getAttribute('role')==='group').length,
           tabbable:reels.filter(r=>r.tabIndex===0).length,
           imgs:alts.length, unique:new Set(alts).size };
});
console.log(`5. Reels=${a11y.reels} role=group:${a11y.roled} tabindex:${a11y.tabbable} | imgs=${a11y.imgs} uniqueAlts=${a11y.unique}`);

// 6. reduced motion
const rm = await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
const p2 = await rm.newPage();
await p2.goto(P,{waitUntil:'load'}); await p2.waitForTimeout(1800);
await p2.evaluate(()=>{location.hash='#/film-television/';});
const samples=[];
for(let i=0;i<8;i++){ samples.push(await p2.evaluate(()=>Math.round(document.getElementById('deck').scrollTop))); await p2.waitForTimeout(45); }
console.log(`6. reduced-motion scrollTop samples: ${samples.join(', ')}  ${samples[1]===samples[samples.length-1]?'INSTANT (fixed)':'animating'}`);

console.log(errs.length?('\nERRORS:\n'+errs.join('\n')):'\nno console/page errors');
await b.close();
