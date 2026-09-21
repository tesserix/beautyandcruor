import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1500);
await p.evaluate(()=>{ window.__mk=async(uri)=>{ const im=new Image(); im.src=uri; await im.decode();
  const c=document.createElement('canvas'); c.width=im.width;c.height=im.height; c.getContext('2d').drawImage(im,0,0);
  window.__px=c.getContext('2d').getImageData(0,0,c.width,c.height); return [c.width,c.height]; };
  window.__lin=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
  window.__L=(r,g,b)=>0.2126*__lin(r)+0.7152*__lin(g)+0.0722*__lin(b);
  window.__sample=(x,y,w,h,fgL)=>{ const d=__px.data,W=__px.width; const ls=[];
    for(let yy=Math.max(0,Math.round(y));yy<Math.min(__px.height,Math.round(y+h));yy++)
      for(let xx=Math.max(0,Math.round(x));xx<Math.min(W,Math.round(x+w));xx++){const o=(yy*W+xx)*4; ls.push([__L(d[o],d[o+1],d[o+2]),d[o],d[o+1],d[o+2]]);}
    if(!ls.length) return null; ls.sort((a,b)=>a[0]-b[0]);
    const cr=l=>{const a=Math.max(fgL,l)+.05,b=Math.min(fgL,l)+.05;return a/b;};
    const mean=ls.reduce((s,v)=>s+v[0],0)/ls.length;
    const p95=ls[Math.floor(ls.length*0.95)], p50=ls[Math.floor(ls.length*0.5)];
    return {n:ls.length, meanCR:+cr(mean).toFixed(2), medCR:+cr(p50[0]).toFixed(2), p95CR:+cr(p95[0]).toFixed(2), brightest:[p95[1],p95[2],p95[3]]};};
});
const hexL=async(h)=>p.evaluate(x=>{const n=parseInt(x.slice(1),16);return __L((n>>16)&255,(n>>8)&255,n&255);},h);
const LA=await hexL('#8C8780'), LC=await hexL('#F2EFEA'), LG=await hexL('#7AC943');
const plan=await p.evaluate(()=>[...document.querySelectorAll('.panel')].map((s,i)=>({i,frames:s.querySelectorAll('.frame').length})));
const rows=[];
for(const pl of plan) for(let f=0;f<pl.frames;f++){
  await p.evaluate(a=>{const d=document.getElementById('deck');d.scrollTop=a.i*d.clientHeight;
    const r=document.querySelectorAll('.panel')[a.i].querySelector('.reel'); r.scrollLeft=a.f*r.clientWidth; r.dispatchEvent(new Event('scroll'));},{i:pl.i,f});
  await p.waitForTimeout(240);
  const rects=await p.evaluate(a=>{const s=document.querySelectorAll('.panel')[a.i],o={};
    const g=(sel,k)=>{const e=s.querySelector(sel);if(e){const r=e.getBoundingClientRect();if(r.width>1&&r.height>1)o[k]=[r.x,r.y,r.width,r.height];}};
    g('.plate .cap','cap');g('.plate .lab','lab');g('.plate h2','h2');g('.meter .counter','counter');g('.cue','cue');g('.meter .bars','meterbars');
    const m=document.getElementById('menubtn').getBoundingClientRect();o.menubtn=[m.x,m.y,m.width,m.height];
    const hm=document.getElementById('hudmark').getBoundingClientRect();o.hudmark=[hm.x,hm.y,hm.width,hm.height];
    return o;},{i:pl.i});
  await p.evaluate(()=>document.querySelectorAll('.plate>*,.open-plate>*,#menubtn,#hudmark').forEach(e=>e.style.visibility='hidden'));
  const shot=await p.screenshot({type:'png'});
  await p.evaluate(()=>document.querySelectorAll('.plate>*,.open-plate>*,#menubtn,#hudmark').forEach(e=>e.style.visibility=''));
  await p.evaluate(u=>window.__mk(u),'data:image/png;base64,'+shot.toString('base64'));
  for(const [k,r] of Object.entries(rects)){
    const fg = (k==='menubtn'||k==='h2')?LC : k==='hudmark'?LG : LA;
    const s=await p.evaluate(a=>window.__sample(a.r[0],a.r[1],a.r[2],a.r[3],a.fg),{r,fg});
    if(s) rows.push({panel:pl.i,frame:f,el:k,...s}); else console.log("  skip empty",pl.i,f,k,JSON.stringify(r));
  }
}
const need=k=>k==='h2'?3:4.5;
console.log('=== contrast vs the actual pixels behind the glyph box (p95 = brightest 5% of that box) ===');
const groups={}; rows.forEach(r=>{(groups[r.el]??=[]).push(r)});
for(const [el,rs] of Object.entries(groups)){
  rs.sort((a,b)=>a.p95CR-b.p95CR);
  const w=rs[0], fails=rs.filter(r=>r.p95CR<need(el)).length, failsMean=rs.filter(r=>r.meanCR<need(el)).length;
  console.log(`\n  ${el}  (needs ${need(el)}:1)`);
  console.log(`    worst frame: panel ${w.panel} frame ${w.frame}  p95CR ${w.p95CR}  medianCR ${w.medCR}  meanCR ${w.meanCR}  brightest bg rgb(${w.brightest})`);
  console.log(`    frames failing on p95: ${fails}/${rs.length}   failing on MEAN bg: ${failsMean}/${rs.length}  ${fails?'*** FAIL ***':'ok'}`);
  if(fails) console.log('    worst 6: '+rs.slice(0,6).map(r=>`p${r.panel}f${r.frame}=${r.p95CR}`).join(' '));
}
await b.close();
