import { chromium } from 'playwright'; import fs from 'fs';
const D='/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
const AXE=fs.readFileSync('/Users/mayu/Projects/tesserix/beautyandcruor/capture/node_modules/axe-core/axe.min.js','utf8');
const b=await chromium.launch();
const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
const p=await ctx.newPage(); await p.goto('file://'+D+'/wrap.html'); await p.waitForTimeout(1500);
await p.addScriptTag({content:AXE});
const states=[['home',null],['menu','MENU'],['#/about-me/','#/about-me/'],['#/credits/','#/credits/'],['#/contact-us/','#/contact-us/'],['#/blogs/','#/blogs/']];
for(const [label,act] of states){
  if(act==='MENU'){ await p.evaluate(()=>{location.hash='#/'}); await p.waitForTimeout(400); await p.click('#menubtn'); }
  else if(act){ await p.evaluate(h=>location.hash=h,act); }
  else { await p.evaluate(()=>{location.hash='#/'}); }
  await p.waitForTimeout(700);
  const res=await p.evaluate(async()=>{ const r=await axe.run(document,{resultTypes:['violations','incomplete']});
    return {v:r.violations.map(x=>({id:x.id,impact:x.impact,n:x.nodes.length,desc:x.help,ex:x.nodes.slice(0,2).map(n=>n.html.slice(0,110))})),
            i:r.incomplete.map(x=>({id:x.id,n:x.nodes.length,ex:x.nodes.slice(0,3).map(n=>(n.html||'').slice(0,90)+' | '+(n.any[0]&&n.any[0].message||'').slice(0,120))}))};});
  console.log('\n######## STATE: '+label+' ########');
  console.log('VIOLATIONS:'); res.v.forEach(x=>{console.log('  ['+x.impact+'] '+x.id+' x'+x.n+' — '+x.desc); x.ex.forEach(e=>console.log('      '+e));});
  if(!res.v.length) console.log('  none');
  console.log('INCOMPLETE (needs manual check):'); res.i.forEach(x=>{console.log('  '+x.id+' x'+x.n); x.ex.forEach(e=>console.log('      '+e));});
  if(!res.i.length) console.log('  none');
}
await b.close();
