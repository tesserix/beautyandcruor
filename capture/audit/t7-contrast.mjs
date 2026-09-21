import { chromium } from 'playwright'; import fs from 'fs'; import zlib from 'zlib';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
// minimal PNG decoder (RGBA, 8-bit, non-interlaced)
function decodePNG(buf){
  let p=8,w,h,idat=[];
  while(p<buf.length){ const len=buf.readUInt32BE(p); const type=buf.toString('ascii',p+4,p+8);
    if(type==='IHDR'){w=buf.readUInt32BE(p+8);h=buf.readUInt32BE(p+12);}
    if(type==='IDAT') idat.push(buf.slice(p+8,p+8+len));
    p+=12+len; }
  const raw=zlib.inflateSync(Buffer.concat(idat)); const bpp=4, stride=w*bpp;
  const out=Buffer.alloc(h*stride); let o=0;
  for(let y=0;y<h;y++){ const ft=raw[y*(stride+1)]; const line=raw.slice(y*(stride+1)+1,(y+1)*(stride+1));
    for(let x=0;x<stride;x++){ const a=x>=bpp?out[o+x-bpp]:0, b=y>0?out[o-stride+x]:0, c=(x>=bpp&&y>0)?out[o-stride+x-bpp]:0; let v=line[x];
      if(ft===1)v+=a; else if(ft===2)v+=b; else if(ft===3)v+=(a+b)>>1; else if(ft===4){const pa=Math.abs(b-c),pb=Math.abs(a-c),pc=Math.abs(a+b-2*c); v+= (pa<=pb&&pa<=pc)?a:(pb<=pc?b:c);}
      out[o+x]=v&255; } o+=stride; }
  return {w,h,data:out};
}
const lin=v=>{v/=255; return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4);};
const L=(r,g,b)=>0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b);
const CR=(a,b)=>{const x=Math.max(a,b)+0.05,y=Math.min(a,b)+0.05;return x/y;};
const hexL=h=>{const n=parseInt(h.slice(1),16);return L((n>>16)&255,(n>>8)&255,n&255);};

const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1500);

const TEXTCOL={ 'plate .cap':'#8C8780','plate .lab':'#8C8780','plate h2':'#F2EFEA','meter counter':'#8C8780','menubtn':'#F2EFEA','hudmark':'#7AC943','cue':'#8C8780' };
const results=[];
// iterate every panel & every frame
const plan = await p.evaluate(()=>[...document.querySelectorAll('.panel')].map((s,i)=>({i,frames:s.querySelectorAll('.frame').length, open:!!s.querySelector('.open-plate')})));
for(const pl of plan){
  for(let f=0; f<pl.frames; f++){
    await p.evaluate((ARG)=>{ var i=ARG.i, f=ARG.f; const d=document.getElementById('deck'); d.scrollTop=i*d.clientHeight;
      const r=document.querySelectorAll('.panel')[i].querySelector('.reel'); r.scrollLeft=f*r.clientWidth; r.dispatchEvent(new Event('scroll'));}, {i:pl.i, f:f});
    await p.waitForTimeout(260);
    // measure text rects, then hide text and shoot
    const rects=await p.evaluate((ARG)=>{ var i=ARG.i;
      const s=document.querySelectorAll('.panel')[i]; const o={};
      const g=(sel,key)=>{const e=s.querySelector(sel); if(e){const r=e.getBoundingClientRect(); if(r.width>1&&r.height>1) o[key]=[r.x,r.y,r.width,r.height];}};
      g('.plate .cap','cap'); g('.plate .lab','lab'); g('.plate h2','h2'); g('.meter .counter','counter'); g('.cue','cue');
      const mb=document.getElementById('menubtn').getBoundingClientRect(); o['menubtn']=[mb.x,mb.y,mb.width,mb.height];
      const hm=document.getElementById('hudmark').getBoundingClientRect(); o['hudmark']=[hm.x,hm.y,hm.width,hm.height];
      return o;}, {i:pl.i});
    await p.evaluate(()=>{ document.querySelectorAll('.plate>*,.open-plate>*,#menubtn,#hudmark').forEach(e=>e.style.visibility='hidden'); });
    const shot=await p.screenshot({type:'png'});
    await p.evaluate(()=>{ document.querySelectorAll('.plate>*,.open-plate>*,#menubtn,#hudmark').forEach(e=>e.style.visibility=''); });
    const img=decodePNG(shot);
    for(const [k,[x,y,w,h]] of Object.entries(rects)){
      const col = k==='menubtn'?'#F2EFEA':k==='hudmark'?'#7AC943':k==='h2'?'#F2EFEA':'#8C8780';
      let worst=1e9, worstpx=null, sum=0,n=0;
      for(let yy=Math.max(0,Math.round(y)); yy<Math.min(img.h,Math.round(y+h)); yy+=1)
        for(let xx=Math.max(0,Math.round(x)); xx<Math.min(img.w,Math.round(x+w)); xx+=1){
          const o=(yy*img.w+xx)*4; const l=L(img.data[o],img.data[o+1],img.data[o+2]);
          sum+=l;n++; const cr=CR(hexL(col),l); if(cr<worst){worst=cr;worstpx=[img.data[o],img.data[o+1],img.data[o+2]];}
        }
      if(n) results.push({panel:pl.i,frame:f,el:k,col,worstCR:Math.round(worst*100)/100, avgCR:Math.round(CR(hexL(col),sum/n)*100)/100, worstpx});
    }
  }
}
// report worst per element
const byEl={};
results.forEach(r=>{ if(!byEl[r.el]||r.worstCR<byEl[r.el].worstCR) byEl[r.el]=r; });
console.log('=== WORST-CASE contrast per text element (sampled actual rendered pixels behind glyph box) ===');
Object.values(byEl).sort((a,b)=>a.worstCR-b.worstCR).forEach(r=>{
  const need = (r.el==='h2')?3.0:4.5;
  console.log(`  ${r.el.padEnd(9)} colour ${r.col}  worstCR ${String(r.worstCR).padStart(5)}:1  (needs ${need})  ${r.worstCR<need?'*** FAIL ***':'pass'}   panel ${r.panel} frame ${r.frame}  bg rgb(${r.worstpx})`);
});
console.log('\n=== all samples below 4.5:1 (non-large text) ===');
results.filter(r=>r.worstCR<4.5&&r.el!=='h2'&&r.el!=='hudmark').sort((a,b)=>a.worstCR-b.worstCR).slice(0,25)
 .forEach(r=>console.log(`  panel ${r.panel} frame ${r.frame} ${r.el.padEnd(9)} ${r.worstCR}:1  avg ${r.avgCR}:1  bg rgb(${r.worstpx})`));
console.log('\n total samples', results.length);
// static contrasts inside sheets
console.log('\n=== sheet text on solid #07070A ===');
[['--ash #8C8780 body copy','#8C8780','#07070A'],['chip label #8C8780 on #07070A','#8C8780','#07070A'],['chip active #07070A on #F2EFEA','#07070A','#F2EFEA'],['leaf #7AC943 on #07070A','#7AC943','#07070A'],['chalk #F2EFEA on #07070A','#F2EFEA','#07070A'],['enquire #F2EFEA on #B3111D','#F2EFEA','#B3111D'],['hair border #232329 on #07070A','#232329','#07070A']]
 .forEach(([n,f,g])=>console.log('  '+n.padEnd(34)+ Math.round(CR(hexL(f),hexL(g))*100)/100+':1'));
await b.close();
