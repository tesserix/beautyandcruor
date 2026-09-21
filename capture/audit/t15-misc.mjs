import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1500);

console.log('=== ALT TEXT INVENTORY ===');
const alts=await p.evaluate(()=>[...document.querySelectorAll('img')].map(i=>({a:i.alt, panel:(i.closest('.panel')||{}).id||'sheet'})));
const c={}; alts.forEach(x=>c[x.a]=(c[x.a]||0)+1);
Object.entries(c).sort((a,b)=>b[1]-a[1]).forEach(([k,v])=>console.log(`  ${v>1?'DUPLICATE x'+v:'unique     '}  "${k}"`));
console.log('  total imgs:',alts.length,' unique alts:',Object.keys(c).length);
console.log('  caption === alt?', await p.evaluate(()=>{const s=document.querySelectorAll('.panel')[1];
  return s.querySelector('.plate .cap').textContent.trim()===s.querySelectorAll('.frame img')[0].alt;}));

console.log('\n=== IMAGE RESOLUTION vs RENDERED SIZE ===');
console.log(' ', await p.evaluate(()=>{const i=document.querySelectorAll('.frame img')[0];const r=i.getBoundingClientRect();
 const sc=Math.max(r.width/i.naturalWidth, r.height/i.naturalHeight);
 return `natural ${i.naturalWidth}x${i.naturalHeight} | css box ${Math.round(r.width)}x${Math.round(r.height)} | dpr ${devicePixelRatio} | cover scale ${(sc*devicePixelRatio).toFixed(2)}x  -> ${(sc*devicePixelRatio)>1?'UPSCALED (soft)':'ok'}`;}));
console.log('  attrs:', await p.evaluate(()=>{const i=document.querySelector('.frame img');
 return `loading=${i.loading} decoding=${i.decoding} width=${i.getAttribute('width')} height=${i.getAttribute('height')} srcset=${i.getAttribute('srcset')} fetchpriority=${i.getAttribute('fetchpriority')}`;}));

console.log('\n=== HEADING STRUCTURE on the main gallery (no sheet open) ===');
console.log(await p.evaluate(()=>[...document.querySelectorAll('h1,h2,h3')].filter(h=>!h.closest('[hidden]')).map(h=>'  '+h.tagName+' "'+h.textContent.trim().slice(0,40)+'"').join('\n')||'  (none)'));
console.log('  panels hidden from AT when off-screen?', await p.evaluate(()=>[...document.querySelectorAll('.panel')].map(s=>s.getAttribute('aria-hidden')).join(',')));
console.log('  live region on caption/counter?', await p.evaluate(()=>{const c=document.querySelector('.plate .cap');return 'aria-live='+c.getAttribute('aria-live')+' role='+c.getAttribute('role');}));

console.log('\n=== CONTACT FORM ===');
await p.evaluate(()=>location.hash='#/contact-us/'); await p.waitForTimeout(500);
console.log(await p.evaluate(()=>[...document.querySelectorAll('#contact input,#contact select,#contact textarea')].map(e=>
  `  <${e.tagName.toLowerCase()}> id=${e.id} name=${e.name||'(none)'} type=${e.type} autocomplete=${e.getAttribute('autocomplete')||'(none)'} required=${e.required} prefilled=${JSON.stringify(String(e.value).slice(0,38))}`).join('\n')));
console.log('  form action/handler:', await p.evaluate(()=>{const f=document.querySelector('#contact form');return 'action='+(f.getAttribute('action')||'none')+' onsubmit='+f.getAttribute('onsubmit');}));
console.log('  submit does what:', await p.evaluate(async()=>{const before=document.querySelector('#contact form').outerHTML.length;
  document.querySelector('#contact button[type=submit]').click(); await new Promise(r=>setTimeout(r,300));
  return document.querySelector('#contact form').outerHTML.length===before ? 'nothing (no feedback, no submission)' : 'changed';}));

console.log('\n=== 100dvh: viewport height change mid-session (iOS URL bar collapse) ===');
await p.evaluate(()=>{location.hash='#/'}); await p.waitForTimeout(600);
await p.evaluate(()=>{const d=document.getElementById('deck');d.scrollTo({top:2*d.clientHeight,behavior:'auto'});});
await p.waitForTimeout(700);
const pre=await p.evaluate(()=>{const d=document.getElementById('deck');return {h:d.clientHeight,top:d.scrollTop,frac:+(d.scrollTop/d.clientHeight).toFixed(3)};});
await p.setViewportSize({width:390,height:744}); await p.waitForTimeout(900);
const post=await p.evaluate(()=>{const d=document.getElementById('deck');const pr=document.querySelectorAll('.panel')[2].getBoundingClientRect();
 return {h:d.clientHeight,top:d.scrollTop,frac:+(d.scrollTop/d.clientHeight).toFixed(3), panel2Top:Math.round(pr.top), offSnapBy:Math.round(pr.top)};});
console.log('  before (844):',JSON.stringify(pre));
console.log('  after  (744):',JSON.stringify(post), post.offSnapBy!==0?'  <<< left off-snap by '+post.offSnapBy+'px':'  (re-snapped ok)');

console.log('\n=== unused image payload ===');
console.log('  rendered imgs:', alts.length, ' — JSON contains hero5+sfx8+casting6+editorial8+film5+beauty3+artist1 = 36');
console.log('  => "beauty" set (3 images) is parsed but never rendered.');
await p.screenshot({path:'/Users/mayu/Projects/tesserix/beautyandcruor/capture/audit/v-390-contact.png'});
await b.close();
