import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1500);
await p.evaluate(()=>{ window.__lin=v=>{v/=255;return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
 window.__L=(r,g,b)=>0.2126*__lin(r)+0.7152*__lin(g)+0.0722*__lin(b);
 window.__mk=async u=>{const im=new Image();im.src=u;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);window.__px=c.getContext('2d').getImageData(0,0,c.width,c.height);};
 window.__s=(x,y,w,h,fg)=>{const d=__px.data,W=__px.width,ls=[];
  for(let yy=Math.max(0,Math.round(y));yy<Math.min(__px.height,Math.round(y+h));yy++)for(let xx=Math.max(0,Math.round(x));xx<Math.min(W,Math.round(x+w));xx++){const o=(yy*W+xx)*4;ls.push(__L(d[o],d[o+1],d[o+2]));}
  if(!ls.length)return null; ls.sort((a,b)=>a-b); const cr=l=>{const a=Math.max(fg,l)+.05,bb=Math.min(fg,l)+.05;return a/bb;};
  return {p95:+cr(ls[Math.floor(ls.length*.95)]).toFixed(2), med:+cr(ls[Math.floor(ls.length*.5)]).toFixed(2), mean:+cr(ls.reduce((s,v)=>s+v,0)/ls.length).toFixed(2)};};
 // hide the pill so its red doesn't pollute plate samples
 document.getElementById('enquirebtn').style.display='none';
});
const hx=async h=>p.evaluate(x=>{const n=parseInt(x.slice(1),16);return __L((n>>16)&255,(n>>8)&255,n&255);},h);
const LA=await hx('#8C8780'), LC=await hx('#F2EFEA');
const plan=await p.evaluate(()=>[...document.querySelectorAll('.panel')].map((s,i)=>({i,frames:s.querySelectorAll('.frame').length})));
const rows=[];
for(const pl of plan){ if(pl.i===0) continue;
 for(let f=0;f<pl.frames;f++){
  await p.evaluate(a=>{const d=document.getElementById('deck');d.scrollTo({top:a.i*d.clientHeight,behavior:'auto'});
    const r=document.querySelectorAll('.panel')[a.i].querySelector('.reel'); r.scrollTo({left:a.f*r.clientWidth,behavior:'auto'});},{i:pl.i,f});
  await p.waitForTimeout(650);
  const ok=await p.evaluate(a=>{const pr=document.querySelectorAll('.panel')[a.i].getBoundingClientRect();return Math.abs(pr.top)<3;},{i:pl.i});
  if(!ok){ console.log('  !! not settled p'+pl.i+'f'+f); continue; }
  const rects=await p.evaluate(a=>{const s=document.querySelectorAll('.panel')[a.i],o={};
   const g=(sel,k)=>{const e=s.querySelector(sel);if(e){const r=e.getBoundingClientRect();o[k]=[r.x,r.y,r.width,r.height];}};
   g('.plate .lab','lab');g('.plate .cap','cap');g('.plate h2','h2');g('.meter .counter','counter');
   const m=document.getElementById('menubtn').getBoundingClientRect();o.menubtn=[m.x,m.y,m.width,m.height];return o;},{i:pl.i});
  await p.evaluate(()=>document.querySelectorAll('.plate>*,#menubtn,#hudmark').forEach(e=>e.style.visibility='hidden'));
  const shot=await p.screenshot({type:'png'});
  await p.evaluate(()=>document.querySelectorAll('.plate>*,#menubtn,#hudmark').forEach(e=>e.style.visibility=''));
  await p.evaluate(u=>__mk(u),'data:image/png;base64,'+shot.toString('base64'));
  for(const [k,r] of Object.entries(rects)){ const fg=(k==='menubtn'||k==='h2')?LC:LA;
   const s=await p.evaluate(a=>__s(a.r[0],a.r[1],a.r[2],a.r[3],a.fg),{r,fg}); if(s) rows.push({p:pl.i,f,el:k,...s}); }
 }}
const need=k=>k==='h2'?3:4.5;
const gp={}; rows.forEach(r=>(gp[r.el]??=[]).push(r));
console.log('=== CLEAN sample (Enquire pill hidden, panels verified settled) ===');
for(const [el,rs] of Object.entries(gp)){ rs.sort((a,b)=>a.p95-b.p95); const n=need(el);
 console.log(`\n ${el} (needs ${n}:1)  worst p95=${rs[0].p95} (panel ${rs[0].p}, frame ${rs[0].f})  worst median=${Math.min(...rs.map(r=>r.med))}`);
 console.log(`   fail on p95(brightest 5%): ${rs.filter(r=>r.p95<n).length}/${rs.length}    fail on MEDIAN bg: ${rs.filter(r=>r.med<n).length}/${rs.length}`);
 console.log('   all p95: '+rs.map(r=>`${r.p}.${r.f}=${r.p95}`).join(' '));}
await b.close();
