import { chromium } from 'playwright';
const P='file:///private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad/questions-wrapped.html';
const b=await chromium.launch(); const errs=[];
const p=await (await b.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2})).newPage();
p.on('pageerror',e=>errs.push('JS: '+e.message));
p.on('console',c=>{if(c.type()==='error')errs.push('console: '+c.text());});
await p.goto(P,{waitUntil:'load'}); await p.waitForTimeout(1500);
await p.screenshot({path:'/tmp/q-390-top.png'});
await p.evaluate(()=>document.querySelector('.credits').scrollIntoView()); await p.waitForTimeout(500);
await p.screenshot({path:'/tmp/q-390-credits.png'});
const st=await p.evaluate(()=>({fields:document.querySelectorAll('[data-q]').length, tally:document.getElementById('tally').textContent, rows:document.querySelectorAll('.crow').length}));
console.log(JSON.stringify(st));
// fill one and check persistence + copy formatting
await p.fill('input[data-q="Correct spelling of your name"]','Parimiti');
await p.waitForTimeout(300);
console.log('tally after 1:', await p.evaluate(()=>document.getElementById('tally').textContent));
console.log('saved to localStorage:', await p.evaluate(()=>!!localStorage.getItem('bac-questions-v1')));
console.log(errs.length?errs.join('\n'):'no errors');
await b.close();
