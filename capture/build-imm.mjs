import { readFileSync, writeFileSync } from 'node:fs';
const S = '/private/tmp/claude-501/-Users-mayu-Projects-tesserix-beautyandcruor/a0481450-8f38-4875-a9b0-8e39b1b5a8cd/scratchpad';
let h = readFileSync(`${S}/immersive-src.html`, 'utf8');
const esc = s => s.replace(/<\//g, '<\\/');
for (const t of ['__IMAGES__','__CREDITS__','__LOGO__']) if (!h.includes(t)) throw new Error('missing ' + t);
h = h.split('__LOGO__').join(readFileSync('brand/logo.min.svg','utf8'));
h = h.replace('__IMAGES__', esc(readFileSync('capture/proto-images.json','utf8')));
h = h.replace('__CREDITS__', esc(readFileSync('capture/credits.json','utf8')));
writeFileSync(`${S}/immersive.html`, h);
writeFileSync(`${S}/immersive-wrapped.html`,
  '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>:root{color-scheme:dark}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' + h + '</body></html>');
console.log('built', (h.length/1048576).toFixed(2), 'MB');
