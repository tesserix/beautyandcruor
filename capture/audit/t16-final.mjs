import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const O='/Users/mayu/Projects/tesserix/beautyandcruor/capture/audit/';
const b=await chromium.launch();
for(const [w,h] of [[390,844],[320,568]]){
 const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1500);
 await p.screenshot({path:`${O}v${w}-home.png`});
 await p.evaluate(()=>{const d=document.getElementById('deck');d.scrollTo({top:d.clientHeight,behavior:'auto'});}); await p.waitForTimeout(800);
 await p.screenshot({path:`${O}v${w}-panel1.png`});
 // brightest frame of panel 3 (editorial) for the HUD contrast eyeball
 await p.evaluate(()=>{const d=document.getElementById('deck');d.scrollTo({top:3*d.clientHeight,behavior:'auto'});
   const r=document.querySelectorAll('.reel')[3]; r.scrollTo({left:5*r.clientWidth,behavior:'auto'});}); await p.waitForTimeout(900);
 await p.screenshot({path:`${O}v${w}-bright.png`});
 await p.evaluate(()=>{location.hash='#/'}); await p.waitForTimeout(500);
 await p.click('#menubtn'); await p.waitForTimeout(400); await p.screenshot({path:`${O}v${w}-menu.png`});
 await p.keyboard.press('Escape'); await p.waitForTimeout(200);
 await p.evaluate(()=>location.hash='#/credits/'); await p.waitForTimeout(600); await p.screenshot({path:`${O}v${w}-credits.png`});
 await ctx.close();
}
// background inertness + focus return
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1400);
console.log('=== modal hygiene ===');
await p.click('#menubtn'); await p.waitForTimeout(300);
console.log(' with menu open:', await p.evaluate(()=>({
  bgInert: document.getElementById('deck').inert, bgAriaHidden: document.getElementById('deck').getAttribute('aria-hidden'),
  hudAriaHidden: document.getElementById('hud').getAttribute('aria-hidden'), enquireInert: document.getElementById('enquirebtn').inert,
  focusInsideDialog: !!document.activeElement.closest('#menu'), activeEl: document.activeElement.id||document.activeElement.tagName,
  menuHasTabindex: document.getElementById('menu').getAttribute('tabindex'),
  ariaExpandedOnMenuBtn: document.getElementById('menubtn').getAttribute('aria-expanded')})));
// shift-tab from the first item in the dialog
await p.evaluate(()=>document.querySelector('#menu .closebtn').focus());
await p.keyboard.press('Shift+Tab'); await p.waitForTimeout(150);
console.log(' Shift+Tab from first dialog control lands on:', await p.evaluate(()=>{const a=document.activeElement;return (a.id||a.className)+' insideDialog='+!!a.closest('#menu');}));
// focus return after close
await p.evaluate(()=>{location.hash='#/'}); await p.waitForTimeout(400);
await p.evaluate(()=>document.getElementById('menubtn').focus());
await p.keyboard.press('Enter'); await p.waitForTimeout(300);
await p.click('#menu .closebtn'); await p.waitForTimeout(300);
console.log(' focus after closing menu with Close btn:', await p.evaluate(()=>document.activeElement.id||document.activeElement.tagName));
await p.evaluate(()=>{location.hash='#/'}); await p.waitForTimeout(300);
await p.evaluate(()=>document.getElementById('enquirebtn').focus());
await p.keyboard.press('Enter'); await p.waitForTimeout(500);
console.log(' contact opened by keyboard, focus is:', await p.evaluate(()=>document.activeElement.id||document.activeElement.tagName));
await p.click('#contact .closebtn'); await p.waitForTimeout(300);
console.log(' focus after closing contact:', await p.evaluate(()=>document.activeElement.id||document.activeElement.tagName));
console.log('\n=== double-routing from menu nav (hashchange + setTimeout) ===');
let n=0; await p.exposeFunction('__tick',()=>n++);
await p.evaluate(()=>{const o=document.getElementById('deck').scrollTo.bind(document.getElementById('deck'));
  document.getElementById('deck').scrollTo=function(...a){window.__tick();return o(...a);};});
await p.evaluate(()=>{location.hash='#/'}); await p.waitForTimeout(700); n=0;
await p.click('#menubtn'); await p.waitForTimeout(200);
await p.click('#navlist a:nth-child(3)'); await p.waitForTimeout(1200);
console.log('  deck.scrollTo called', n, 'times for one nav click');
await b.close();
