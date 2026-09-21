/**
 * The brand mark is dark grey script + lime leaf on transparency — unreadable on
 * a dark ground. Produce dark-ground variants without flattening the mark:
 *  A) keep the lime, lift only the desaturated script to chalk
 *  B) full chalk knockout (single-colour, most robust)
 */
import sharp from 'sharp';

const SRC = 'capture/assets/uploads/2022/09/final-LOgo.png';
const CHALK = [239, 233, 225];

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const keep = Buffer.from(data);
const mono = Buffer.from(data);
let lifted = 0, green = 0;

for (let i = 0; i < data.length; i += channels) {
  const a = data[i + 3];
  if (a === 0) continue;
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const sat = mx === 0 ? 0 : (mx - mn) / mx;

  // variant B: everything becomes chalk, alpha carries the shape
  mono[i] = CHALK[0]; mono[i + 1] = CHALK[1]; mono[i + 2] = CHALK[2];

  // variant A: only the near-neutral script is lifted; the leaf keeps its hue
  if (sat < 0.25) { keep[i] = CHALK[0]; keep[i + 1] = CHALK[1]; keep[i + 2] = CHALK[2]; lifted++; }
  else green++;
}

const out = (buf, name) => sharp(buf, { raw: { width, height, channels } }).png().toFile(name);
await out(keep, 'capture/logo-ondark-keepgreen.png');
await out(mono, 'capture/logo-ondark-chalk.png');

console.log(`${width}x${height}  script px lifted ${lifted}  leaf px kept ${green}`);

// preview both on the real ground
const panel = async (src, top, comps) => {
  const b = await sharp(src).resize(520, null, { fit: 'contain' }).png().toBuffer();
  comps.push({ input: b, left: 40, top });
};
const comps = [];
await panel('capture/logo-ondark-keepgreen.png', 40, comps);
await panel('capture/logo-ondark-chalk.png', 220, comps);
await sharp({ create: { width: 600, height: 400, channels: 3, background: '#0E0C0B' } })
  .composite(comps).png().toFile('/tmp/logo-ondark.png');
console.log('preview -> /tmp/logo-ondark.png');
