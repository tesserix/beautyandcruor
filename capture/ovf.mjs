import { chromium } from 'playwright';
const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true})).newPage();
await p.goto('file:///private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad/instagram-wrapped.html',{waitUntil:'load'});
await p.waitForTimeout(800);
const r=await p.evaluate(()=>({bodyScroll:document.documentElement.scrollWidth, vw:window.innerWidth,
  tableScrolls:(()=>{const s=document.querySelector('.scroller');return s.scrollWidth>s.clientWidth;})()}));
console.log('page scrollWidth',r.bodyScroll,'vs viewport',r.vw, r.bodyScroll<=r.vw?'— no page overflow OK':'— PAGE OVERFLOWS');
console.log('table scrolls inside its own container:',r.tableScrolls);
await b.close();
