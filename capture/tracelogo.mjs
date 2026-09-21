/**
 * Split the brand mark into its two elements (script wordmark, leaf flourish)
 * and emit a clean PBM mask for each, so potrace can vectorise them separately.
 * Separate paths mean each can be recoloured independently in CSS.
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';

const SRC = 'capture/assets/uploads/2022/09/final-LOgo.png';
const SCALE = 4; // trace at 4x for smoother curves, then scale the viewBox back

const img = sharp(SRC).ensureAlpha().resize({ width: 711 * SCALE, kernel: 'lanczos3' });
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels } = info;

function pbm(predicate) {
  // PBM P4: 1 = black (traced). Row-padded to byte boundaries.
  const rowBytes = Math.ceil(W / 8);
  const bytes = Buffer.alloc(rowBytes * H, 0);
  let on = 0;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * channels;
      const a = data[i + 3];
      if (a < 110) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
      const sat = mx === 0 ? 0 : (mx - mn) / mx;
      if (!predicate(sat, r, g, b)) continue;
      bytes[y * rowBytes + (x >> 3)] |= 0x80 >> (x & 7);
      on++;
    }
  }
  const header = Buffer.from(`P4\n${W} ${H}\n`, 'ascii');
  return { buf: Buffer.concat([header, bytes]), on };
}

const script = pbm((sat) => sat < 0.25);
const leaf   = pbm((sat) => sat >= 0.25);
writeFileSync('/tmp/logo-script.pbm', script.buf);
writeFileSync('/tmp/logo-leaf.pbm', leaf.buf);
console.log(`traced at ${W}x${H}  script px ${script.on}  leaf px ${leaf.on}`);
console.log(`viewBox will be 0 0 711 218 (scale ${SCALE})`);
