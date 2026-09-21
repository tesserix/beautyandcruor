import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 760, height: 620 }, deviceScaleFactor: 2 });
await p.goto('file:///tmp/svgcheck.html', { waitUntil: 'load' });
await p.waitForTimeout(400);
await p.screenshot({ path: '/tmp/svgcheck.png', fullPage: true });
await b.close();
console.log('ok');
