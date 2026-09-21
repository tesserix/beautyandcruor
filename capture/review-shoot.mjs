import { chromium } from 'playwright';
const S='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const O=S+'/review/';
const b=await chromium.launch();
const errs=[];
async function ctx(mobile){ return b.newContext(mobile?{viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}:{viewport:{width:1440,height:900}}); }
async function open(c,url){ const p=await c.newPage(); p.on('pageerror',e=>errs.push(url.slice(-30)+' JS: '+e.message)); await p.goto(url,{waitUntil:'load'}); await p.waitForTimeout(2500); return p; }
const W=n=>'file://'+S+'/'+n;
// ---- C immersive
for (const mob of [true,false]){
  const c=await ctx(mob); const p=await open(c,W('immersive-wrapped.html')); const t=mob?'m':'d';
  await p.screenshot({path:O+`C-${t}-00-open.png`});
  for (let i=1;i<=4;i++){
    await p.evaluate(i=>{const d=document.getElementById('deck');d.scrollTo({top:document.getElementById('panel-'+i).offsetTop,behavior:'instant'});},i);
    await p.waitForTimeout(700);
    await p.screenshot({path:O+`C-${t}-0${i}-panel.png`});
    if (mob && (i===1||i===3)){
      await p.evaluate(i=>{const r=document.querySelector('#panel-'+i+' .reel');r.scrollTo({left:r.firstChild.offsetWidth*2,behavior:'instant'});},i);
      await p.waitForTimeout(500);
      await p.screenshot({path:O+`C-${t}-0${i}-panel-f3.png`});
    }
  }
  if (mob){
    await p.evaluate(()=>{document.getElementById('menubtn').click();}); await p.waitForTimeout(600);
    await p.screenshot({path:O+`C-m-menu.png`});
    for (const r of ['about-me','credits','contact-us']){ await p.evaluate(r=>{location.hash='#/'+r+'/';},r); await p.waitForTimeout(800); await p.screenshot({path:O+`C-m-${r}.png`}); }
  }
  await c.close();
}
// ---- B fable
for (const mob of [true,false]){
  const c=await ctx(mob); const p=await open(c,W('fable-wrapped.html')); const t=mob?'m':'d';
  await p.screenshot({path:O+`B-${t}-home.png`});
  await p.evaluate(()=>window.scrollTo(0,900)); await p.waitForTimeout(500);
  await p.screenshot({path:O+`B-${t}-home-2.png`});
  await p.evaluate(()=>window.scrollTo(0,1900)); await p.waitForTimeout(500);
  await p.screenshot({path:O+`B-${t}-home-3.png`});
  for (const r of ['sfx-prosthetics','about-me']){ await p.evaluate(r=>{location.hash='#/'+r+'/';window.scrollTo(0,0)},r); await p.waitForTimeout(1200); await p.screenshot({path:O+`B-${t}-${r}.png`}); }
  await c.close();
}
// ---- A direction
for (const mob of [true,false]){
  const c=await ctx(mob); const p=await open(c,W('review/direction-wrapped.html')); const t=mob?'m':'d';
  await p.screenshot({path:O+`A-${t}-top.png`});
  await p.evaluate(()=>document.getElementById('stage').scrollIntoView()); await p.waitForTimeout(600);
  await p.screenshot({path:O+`A-${t}-stage.png`});
  if(!mob){ await p.click('#vw-desk').catch(()=>{}); await p.waitForTimeout(700); await p.evaluate(()=>document.getElementById('stage').scrollIntoView()); await p.screenshot({path:O+`A-d-stage-desk.png`}); }
  await c.close();
}
console.log(errs.length?errs.join('\n'):'no errors');
await b.close();
