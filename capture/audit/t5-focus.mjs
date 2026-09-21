import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1200);
console.log('--- Does tabbing to an off-screen reel bring it into view? ---');
for(let i=0;i<7;i++){
  await p.keyboard.press('Tab'); await p.waitForTimeout(350);
  const s=await p.evaluate(()=>{const a=document.activeElement; const d=document.getElementById('deck');
    const r=a.getBoundingClientRect();
    return {el:a.id||a.className, deckTop:Math.round(d.scrollTop), focusTop:Math.round(r.top), inViewport:r.top<innerHeight&&r.bottom>0,
      outline:getComputedStyle(a).outlineWidth+' '+getComputedStyle(a).outlineColor};});
  console.log('  tab'+(i+1), JSON.stringify(s));
}
console.log('\n--- reel focused: does it announce? computed a11y name ---');
await p.evaluate(()=>{document.getElementById('deck').scrollTop=0;});
const ax = await p.accessibility.snapshot({interestingOnly:false});
const find=(n,d=0,out=[])=>{ if(d<6) out.push(' '.repeat(d)+'['+n.role+'] "'+(n.name||'')+'"'); (n.children||[]).slice(0,14).forEach(c=>find(c,d+1,out)); return out; };
console.log(find(ax).slice(0,60).join('\n'));
console.log('\n--- images: alt text inventory ---');
const alts=await p.evaluate(()=>[...document.querySelectorAll('img')].map(i=>i.alt));
const counts={}; alts.forEach(a=>counts[a]=(counts[a]||0)+1);
Object.entries(counts).forEach(([k,v])=>console.log('  '+(v>1?'DUP x'+v+' ':'      ')+JSON.stringify(k)));
console.log('  total imgs:',alts.length);
console.log('\n--- rendered vs natural image size (upscale check) ---');
console.log(await p.evaluate(()=>{const i=document.querySelectorAll('.frame img')[0];const r=i.getBoundingClientRect();
 return `natural ${i.naturalWidth}x${i.naturalHeight}  css box ${Math.round(r.width)}x${Math.round(r.height)}  dpr ${devicePixelRatio} -> device px needed ${Math.round(r.width*devicePixelRatio)}x${Math.round(r.height*devicePixelRatio)}`;}));
console.log('\n--- loading/decoding attrs & unused image sets ---');
console.log(await p.evaluate(()=>{const i=document.querySelector('.frame img');return 'loading='+i.loading+' decoding='+i.decoding+' fetchpriority='+(i.getAttribute('fetchpriority')||'none')+' width/height attrs='+(i.getAttribute('width')||'none');}));
await b.close();
