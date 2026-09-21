import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
const SRC = 'capture/assets/uploads/2022/09/final-LOgo.png';
const scale = Number(process.argv[2]);
const img = sharp(SRC).ensureAlpha().resize({ width: Math.round(711 * scale), kernel: 'lanczos3' });
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels } = info;
function pbm(pred) {
  const rb = Math.ceil(W / 8); const b = Buffer.alloc(rb * H, 0);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * channels; if (data[i+3] < 110) continue;
    const r=data[i],g=data[i+1],bl=data[i+2];
    const mx=Math.max(r,g,bl),mn=Math.min(r,g,bl); const sat = mx===0?0:(mx-mn)/mx;
    if (!pred(sat)) continue;
    b[y*rb+(x>>3)] |= 0x80 >> (x&7);
  }
  return Buffer.concat([Buffer.from(`P4\n${W} ${H}\n`,'ascii'), b]);
}
writeFileSync(`/tmp/sc-script.pbm`, pbm(s => s < 0.25));
writeFileSync(`/tmp/sc-leaf.pbm`, pbm(s => s >= 0.25));
console.log(`${W}x${H}`);
