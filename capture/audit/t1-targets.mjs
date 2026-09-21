import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const URL='file://'+D+'/wrap.html';
const b=await chromium.launch();

for (const [w,h] of [[390,844],[320,568],[1440,900]]){
  const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:2,isMobile:w<900,hasTouch:w<900});
  const p=await ctx.newPage();
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERROR '+e.message));
  p.on('console',m=>{if(m.type()==='error')errs.push('CONSOLE '+m.text())});
  await p.goto(URL); await p.waitForTimeout(1200);
  console.log('\n======== '+w+'x'+h+' ========');
  const rects = await p.evaluate(()=>{
    const out=[];
    const push=(label,el)=>{ if(!el) return out.push([label,'MISSING']);
      const r=el.getBoundingClientRect(); out.push([label, Math.round(r.width*10)/10+'x'+Math.round(r.height*10)/10, 'at '+Math.round(r.x)+','+Math.round(r.y)]); };
    push('menubtn', document.getElementById('menubtn'));
    push('enquire', document.getElementById('enquirebtn'));
    push('hudmark', document.getElementById('hudmark'));
    return out;
  });
  rects.forEach(r=>console.log(' ', r.join('  ')));
  // open menu, measure close + nav
  await p.click('#menubtn'); await p.waitForTimeout(300);
  const m2=await p.evaluate(()=>{
    const out=[];
    const q=(s,l)=>document.querySelectorAll(s).forEach((el,i)=>{const r=el.getBoundingClientRect();out.push([l+'['+i+']', Math.round(r.width*10)/10+'x'+Math.round(r.height*10)/10, (el.textContent||'').trim().slice(0,22)])});
    q('#menu .closebtn','menu.close'); q('#menu .navlist a','nav'); q('#menu .pair a','pair');
    return out;
  });
  m2.forEach(r=>console.log(' ', r.join('  ')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // credits chips
  await p.evaluate(()=>location.hash='#/credits/'); await p.waitForTimeout(500);
  const m3=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('#filters button').forEach((el,i)=>{const r=el.getBoundingClientRect();out.push(['chip['+i+']',Math.round(r.width*10)/10+'x'+Math.round(r.height*10)/10, el.textContent.trim()])});
    const c=document.querySelector('#credits .closebtn').getBoundingClientRect();
    out.push(['credits.close', Math.round(c.width*10)/10+'x'+Math.round(c.height*10)/10]);
    return out;
  });
  m3.forEach(r=>console.log(' ', r.join('  ')));
  // contact form controls
  await p.evaluate(()=>location.hash='#/contact-us/'); await p.waitForTimeout(500);
  const m4=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('#contact input,#contact select,#contact textarea,#contact button').forEach((el,i)=>{const r=el.getBoundingClientRect();out.push([el.tagName.toLowerCase()+'['+i+']',Math.round(r.width*10)/10+'x'+Math.round(r.height*10)/10])});
    return out;
  });
  m4.forEach(r=>console.log(' ', r.join('  ')));
  if(errs.length) console.log(' ERRORS:', errs.join(' | '));
  await ctx.close();
}
await b.close();
