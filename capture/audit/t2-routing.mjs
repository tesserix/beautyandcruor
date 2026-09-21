import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage();
await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1200);
const st=async(l)=>{const s=await p.evaluate(()=>({hash:location.hash,
  open:['menu','about','credits','blogs','contact'].filter(i=>!document.getElementById(i).hidden),
  focus:document.activeElement.id||document.activeElement.tagName+'.'+(document.activeElement.className||'')}));
  console.log(l.padEnd(46), JSON.stringify(s));};

console.log('--- SCENARIO A: Enquire pill -> Escape -> Enquire pill again ---');
await st('initial');
await p.tap('#enquirebtn'); await p.waitForTimeout(400); await st('after tap Enquire');
await p.keyboard.press('Escape'); await p.waitForTimeout(300); await st('after Escape');
await p.tap('#enquirebtn'); await p.waitForTimeout(500); await st('after tap Enquire AGAIN <<<');

console.log('\n--- SCENARIO B: same via Close button (control) ---');
await p.evaluate(()=>{location.hash='#/'});await p.waitForTimeout(300);
await p.tap('#enquirebtn'); await p.waitForTimeout(400); await st('after tap Enquire');
await p.tap('#contact .closebtn'); await p.waitForTimeout(300); await st('after Close btn');
await p.tap('#enquirebtn'); await p.waitForTimeout(500); await st('after tap Enquire AGAIN');

console.log('\n--- SCENARIO C: menu -> nav to Contact -> Escape -> Enquire ---');
await p.evaluate(()=>{location.hash='#/'});await p.waitForTimeout(300);
await p.tap('#menubtn'); await p.waitForTimeout(300); await st('menu open');
await p.tap('#navlist a:nth-child(8)'); await p.waitForTimeout(500); await st('nav->Contact');
await p.keyboard.press('Escape'); await p.waitForTimeout(300); await st('Escape');
await p.tap('#enquirebtn'); await p.waitForTimeout(500); await st('tap Enquire <<<');

console.log('\n--- SCENARIO D: menu -> Escape -> menu (control) ---');
await p.evaluate(()=>{location.hash='#/'});await p.waitForTimeout(300);
await p.tap('#menubtn'); await p.waitForTimeout(250); await st('menu open');
await p.keyboard.press('Escape'); await p.waitForTimeout(250); await st('Escape');
await p.tap('#menubtn'); await p.waitForTimeout(250); await st('menu again');

console.log('\n--- SCENARIO E: browser Back after opening a sheet ---');
await p.evaluate(()=>{location.hash='#/'});await p.waitForTimeout(300);
await p.tap('#enquirebtn'); await p.waitForTimeout(400); await st('contact open');
await p.goBack(); await p.waitForTimeout(500); await st('after browser Back');

console.log('\n--- SCENARIO F: Close btn from a sheet reached by menu nav, then Back ---');
await p.evaluate(()=>{location.hash='#/'});await p.waitForTimeout(300);
await p.tap('#menubtn'); await p.waitForTimeout(250);
await p.tap('#navlist a:nth-child(6)'); await p.waitForTimeout(400); await st('credits open');
await p.tap('#credits .closebtn'); await p.waitForTimeout(300); await st('closed (replaceState)');
await p.goBack(); await p.waitForTimeout(500); await st('after Back <<<');

console.log('\n--- SCENARIO G: discipline routes / deck position ---');
for (const h of ['#/sfx-prosthetics/','#/film-television/','#/']){
  await p.evaluate(x=>location.hash=x,h); await p.waitForTimeout(1200);
  const s=await p.evaluate(()=>({hash:location.hash,scrollTop:Math.round(document.getElementById('deck').scrollTop),vh:innerHeight}));
  console.log('  ',h,JSON.stringify(s));
}
console.log('\n--- SCENARIO H: does scrolling the deck update the hash? ---');
await p.evaluate(()=>{const d=document.getElementById('deck');d.scrollTop=d.clientHeight*2});
await p.waitForTimeout(800);
await st('after manual scroll to panel 2');
await b.close();
