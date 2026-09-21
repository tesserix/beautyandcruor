import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const b=await chromium.launch();
const mk=async()=>{const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
 const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1200); return [ctx,p];};
const st=async(p,l)=>{const s=await p.evaluate(()=>({hash:location.hash,open:['menu','about','credits','blogs','contact'].filter(i=>!document.getElementById(i).hidden),focus:document.activeElement.id||document.activeElement.tagName}));console.log(l.padEnd(44),JSON.stringify(s));};

{ console.log('--- E: browser Back while a sheet is open ---');
  const [ctx,p]=await mk();
  await p.tap('#enquirebtn'); await p.waitForTimeout(400); await st(p,'contact open');
  await p.goBack(); await p.waitForTimeout(600); await st(p,'after browser Back');
  await ctx.close(); }

{ console.log('\n--- F: Close btn (replaceState) then Back ---');
  const [ctx,p]=await mk();
  await p.tap('#enquirebtn'); await p.waitForTimeout(400); await st(p,'contact open');
  await p.tap('#contact .closebtn'); await p.waitForTimeout(300); await st(p,'closed');
  await p.goBack(); await p.waitForTimeout(600); await st(p,'after Back');
  await ctx.close(); }

{ console.log('\n--- I: Enquire pill visibility while MENU is open ---');
  const [ctx,p]=await mk();
  await p.tap('#menubtn'); await p.waitForTimeout(300);
  const v=await p.evaluate(()=>{const e=document.getElementById('enquirebtn');const r=e.getBoundingClientRect();
    const top=document.elementFromPoint(r.x+r.width/2, r.y+r.height/2);
    return {rect:[Math.round(r.x),Math.round(r.y)], topEl:top? top.id||top.className||top.tagName : null, coveredBySheet: !!(top&&top.closest('.sheet'))};});
  console.log('  ', JSON.stringify(v));
  await ctx.close(); }

{ console.log('\n--- J: keyboard tab order from load (30 tabs) ---');
  const [ctx,p]=await mk();
  const seen=[];
  for(let i=0;i<30;i++){ await p.keyboard.press('Tab');
    seen.push(await p.evaluate(()=>{const a=document.activeElement; if(!a||a===document.body)return 'BODY';
      const r=a.getBoundingClientRect();
      return (a.id||a.tagName.toLowerCase()+'.'+String(a.className).split(' ')[0])+' "'+(a.textContent||a.alt||'').trim().slice(0,18)+'" vis='+(r.width>0&&r.height>0&&r.bottom>0&&r.top<innerHeight);})); }
  console.log('  '+seen.join('\n  '));
  await ctx.close(); }

{ console.log('\n--- K: tab order INSIDE an open sheet (focus trap?) ---');
  const [ctx,p]=await mk();
  await p.tap('#menubtn'); await p.waitForTimeout(300);
  const seen=[];
  for(let i=0;i<16;i++){ await p.keyboard.press('Tab');
    seen.push(await p.evaluate(()=>{const a=document.activeElement; if(!a||a===document.body)return 'BODY';
      const inSheet = !!a.closest('#menu');
      const r=a.getBoundingClientRect();
      return (a.id||a.tagName.toLowerCase()+'.'+String(a.className).split(' ')[0])+' inMenu='+inSheet+' onscreen='+(r.width>0&&r.height>0);})); }
  console.log('  '+seen.join('\n  '));
  await ctx.close(); }

{ console.log('\n--- L: are reels keyboard-focusable/scrollable? ---');
  const [ctx,p]=await mk();
  const r=await p.evaluate(()=>{const reel=document.querySelectorAll('.reel')[1];
    return {tabindex:reel.getAttribute('tabindex'), role:reel.getAttribute('role'), rd:reel.getAttribute('aria-roledescription'), scrollW:reel.scrollWidth, clientW:reel.clientWidth};});
  console.log('  reel attrs', JSON.stringify(r));
  // focus reel programmatically-free: try tabbing and see if any reel receives focus
  const reelFocus=await p.evaluate(async()=>{ return [...document.querySelectorAll('.reel')].map(x=>x.matches(':focus')); });
  // simulate: focus the panel then arrow keys
  await p.evaluate(()=>{document.getElementById('deck').scrollTop=document.getElementById('deck').clientHeight;});
  await p.waitForTimeout(600);
  const before=await p.evaluate(()=>document.querySelectorAll('.reel')[1].scrollLeft);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(500);
  const after=await p.evaluate(()=>document.querySelectorAll('.reel')[1].scrollLeft);
  console.log('  ArrowRight with body focus: scrollLeft', before,'->',after);
  // now try focusing the reel via .focus() to see if browser allows
  const canFocus=await p.evaluate(()=>{const r=document.querySelectorAll('.reel')[1]; r.focus(); return document.activeElement===r;});
  console.log('  reel.focus() succeeds:', canFocus);
  if(canFocus){ await p.keyboard.press('ArrowRight'); await p.waitForTimeout(600);
    console.log('  after focus+ArrowRight scrollLeft:', await p.evaluate(()=>document.querySelectorAll('.reel')[1].scrollLeft)); }
  await ctx.close(); }
await b.close();
