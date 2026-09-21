import { chromium } from 'playwright';
const P = 'file:///private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad/direction.html';
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1280, height: 1100 } });
const errs = [];
pg.on('pageerror', e => errs.push('JS: ' + e.message));
pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
await pg.goto(P, { waitUntil: 'load' });
await pg.waitForTimeout(2500);
await pg.screenshot({ path: '/tmp/look-top.png' });
// desktop mode of the prototype
await pg.click('#vw-desk'); await pg.waitForTimeout(700);
await pg.evaluate(() => document.getElementById('stage').scrollIntoView());
await pg.waitForTimeout(400);
await pg.screenshot({ path: '/tmp/look-desk.png' });
await pg.click('#vw-mobile'); await pg.click('#pg-contact'); await pg.waitForTimeout(600);
await pg.screenshot({ path: '/tmp/look-contact.png' });
console.log(errs.length ? errs.join('\n') : 'no console/page errors');
await b.close();
