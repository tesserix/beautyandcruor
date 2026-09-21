import sharp from 'sharp';
const L = [
  ['final-LOgo (711x218)',        'capture/assets/uploads/2022/09/final-LOgo.png'],
  ['mobile-logo (450x138)',       'capture/assets/uploads/2022/09/mobile-logo.png'],
  ['logo-1 (1000sq)',             'capture/assets/uploads/2022/08/logo-1.png'],
  ['logo (500sq)',                'capture/assets/uploads/2022/08/logo.png'],
  ['cropped-final-LOgo (512sq)',  'capture/assets/uploads/2022/09/cropped-final-LOgo.png'],
];
const W = 640, ROW = 190;
const rows = [];
for (const [name, p] of L) {
  for (const [bg, hex] of [['dark', '#0E0C0B'], ['light', '#EFE9E1']]) {
    const fit = await sharp(p).resize(W / 2 - 40, ROW - 40, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } }).png().toBuffer();
    rows.push({ name, bg, hex, fit });
  }
}
const H = ROW * L.length;
const comps = [];
rows.forEach((r, i) => {
  const rowI = Math.floor(i / 2), col = i % 2;
  comps.push({ input: { create: { width: W/2, height: ROW, channels: 3, background: r.hex } }, left: col*(W/2), top: rowI*ROW });
});
rows.forEach((r, i) => {
  const rowI = Math.floor(i / 2), col = i % 2;
  comps.push({ input: r.fit, left: col*(W/2)+20, top: rowI*ROW+20 });
});
await sharp({ create: { width: W, height: H, channels: 3, background: '#333' } })
  .composite(comps).png().toFile('/tmp/logos.png');
console.log('ok', W, H, L.map(l=>l[0]).join(' | '));
