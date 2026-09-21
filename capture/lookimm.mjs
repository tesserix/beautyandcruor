import { chromium } from 'playwright';
const P = 'file:///private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad/immersive-wrapped.html';
const b = await chromium.launch();
const errs = [];
const m = await b.newContext({ viewport:{width:390,height:844}, isMobile:true, hasTouch:true, deviceScaleFactor:2 });
const p = await m.newPage();
p.on('pageerror', e => errs.push('JS: ' + e.message));
p.on('console', c => { if (c.type()==='error') errs.push('console: ' + c.text()); });
await p.goto(P, { waitUntil:'load' }); await p.waitForTimeout(2200);
await p.screenshot({ path:'/tmp/i-390-open.png' });
// scroll to the SFX panel
await p.evaluate(() => { const d=document.getElementById('deck'); d.scrollTo({top:document.getElementById('panel-1').offsetTop, behavior:'instant'}); });
await p.waitForTimeout(900);
await p.screenshot({ path:'/tmp/i-390-sfx.png' });
// swipe the reel
await p.evaluate(() => { const r=document.querySelector('#panel-1 .reel'); r.scrollTo({left:r.firstChild.offsetWidth*2, behavior:'instant'}); });
await p.waitForTimeout(700);
await p.screenshot({ path:'/tmp/i-390-sfx3.png' });
await p.evaluate(() => { location.hash='#/credits/'; }); await p.waitForTimeout(900);
await p.screenshot({ path:'/tmp/i-390-credits.png' });
await p.evaluate(() => { location.hash='#/'; document.getElementById('menubtn').click(); }); await p.waitForTimeout(700);
await p.screenshot({ path:'/tmp/i-390-menu.png' });
// desktop
const d = await b.newContext({ viewport:{width:1440,height:900} });
const p2 = await d.newPage();
p2.on('pageerror', e => errs.push('JS(desk): ' + e.message));
await p2.goto(P, { waitUntil:'load' }); await p2.waitForTimeout(2200);
await p2.screenshot({ path:'/tmp/i-desk-open.png' });
await p2.evaluate(() => { const dk=document.getElementById('deck'); dk.scrollTo({top:document.getElementById('panel-1').offsetTop, behavior:'instant'}); });
await p2.waitForTimeout(900);
await p2.screenshot({ path:'/tmp/i-desk-sfx.png' });
console.log(errs.length ? errs.join('\n') : 'no errors');
await b.close();
