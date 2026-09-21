import { chromium } from 'playwright';
const P='file:///private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad/immersive-wrapped.html';
const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true})).newPage();
await p.goto(P,{waitUntil:'load'}); await p.waitForTimeout(1800);
// click path (how a real user opens it)
await p.click('#enquirebtn'); await p.waitForTimeout(400);
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
console.log('Enquire click -> Esc, focus returns to:', await p.evaluate(()=>document.activeElement.id||document.activeElement.tagName));
await p.click('#menubtn'); await p.waitForTimeout(400);
console.log('menu aria-expanded:', await p.evaluate(()=>document.getElementById('menubtn').getAttribute('aria-expanded')));
await p.keyboard.press('Escape'); await p.waitForTimeout(400);
console.log('Menu click -> Esc, focus returns to:', await p.evaluate(()=>document.activeElement.id||document.activeElement.tagName));
console.log('aria-expanded after close:', await p.evaluate(()=>document.getElementById('menubtn').getAttribute('aria-expanded')));
await b.close();
