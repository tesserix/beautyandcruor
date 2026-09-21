import { chromium } from 'playwright';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); const cdp=await ctx.newCDPSession(p);
await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1500);

const state=()=>p.evaluate(()=>{const d=document.getElementById('deck');
  const reels=[...document.querySelectorAll('.reel')].map(r=>Math.round(r.scrollLeft/ (r.clientWidth||1)*100)/100);
  return {panel:+(d.scrollTop/d.clientHeight).toFixed(2), reelFrac:reels};});
const reset=async(panel,frame)=>{ await p.evaluate(a=>{const d=document.getElementById('deck');d.scrollTo({top:a.panel*d.clientHeight,behavior:'auto'});
  const r=document.querySelectorAll('.reel')[a.panel]; r.scrollTo({left:a.frame*r.clientWidth,behavior:'auto'});},{panel,frame}); await p.waitForTimeout(800); };
const swipe=async(dx,dy,speed=1400)=>{ await cdp.send('Input.synthesizeScrollGesture',
  {x:195,y:420,xDistance:dx,yDistance:dy,gestureSourceType:'touch',speed,preventFling:false,repeatCount:0});
  await p.waitForTimeout(1600); };

const cases=[
  ['pure horizontal  (→ next frame)',        -320,    0],
  ['pure vertical    (↓ next panel)',            0, -600],
  ['diagonal 20deg off horizontal',           -320, -116],
  ['diagonal 35deg off horizontal',           -320, -224],
  ['diagonal 45deg  (ambiguous)',             -320, -320],
  ['diagonal 55deg  (mostly vertical)',       -224, -320],
  ['diagonal 70deg  (mostly vertical)',       -116, -320],
  ['thumb arc: vertical w/ 40px sideways',     -40, -600],
  ['fast vertical fling (2 panels worth)',       0,-1400],
  ['slow vertical (short, 120px)',               0, -120],
  ['slow horizontal (short, 80px)',            -80,    0],
];
console.log('start each case at panel 1, frame 0.  "panel" = deck position in viewport units, reelFrac[1] = frame index of panel 1\n');
for(const [name,dx,dy] of cases){
  await reset(1,0);
  const a=await state();
  await swipe(dx,dy);
  const c=await state();
  const dP=+(c.panel-a.panel).toFixed(2), dF=+(c.reelFrac[1]-a.reelFrac[1]).toFixed(2);
  let verdict='';
  if(Math.abs(dP)>0.02 && Math.abs(dF)>0.02) verdict=' <<< BOTH AXES MOVED';
  if(Math.abs(dP)%1>0.03 && Math.abs(dP)%1<0.97 && Math.abs(dP)>0.02) verdict+=' <<< DECK LEFT OFF-SNAP';
  if(Math.abs(dF)%1>0.03 && Math.abs(dF)%1<0.97 && Math.abs(dF)>0.02) verdict+=' <<< REEL LEFT OFF-SNAP';
  if(Math.abs(dP)>1.5) verdict+=' <<< SKIPPED A PANEL';
  console.log(`  ${name.padEnd(36)} dPanel ${String(dP).padStart(6)}  dFrame ${String(dF).padStart(6)}${verdict}`);
}
console.log('\n=== consecutive diagonal swipes (real thumb, 25deg off horizontal, x6) ===');
await reset(1,0);
for(let i=0;i<6;i++){ await swipe(-320,-150); const s=await state();
  console.log(`   swipe ${i+1}: panel ${s.panel}  frames ${JSON.stringify(s.reelFrac)}`); }
console.log('\n=== consecutive diagonal swipes (25deg off VERTICAL, x5) ===');
await reset(1,0);
for(let i=0;i<5;i++){ await swipe(-150,-600); const s=await state();
  console.log(`   swipe ${i+1}: panel ${s.panel}  frames ${JSON.stringify(s.reelFrac)}`); }
console.log('\n=== overscroll-behavior config ===');
console.log(await p.evaluate(()=>{const d=getComputedStyle(document.getElementById('deck')),r=getComputedStyle(document.querySelector('.reel')),bd=getComputedStyle(document.body);
 return `deck: ${d.overscrollBehavior} | reel: ${r.overscrollBehavior} | body: ${bd.overscrollBehavior} overflow:${bd.overflow} | html: ${getComputedStyle(document.documentElement).overscrollBehavior}`;}));
console.log('\n=== can you reach the LAST frame of the longest reel by swiping? ===');
await reset(1,0);
for(let i=0;i<10;i++){ await swipe(-340,0); }
console.log('  panel1 after 10 horizontal swipes:', JSON.stringify(await state()));
await b.close();
