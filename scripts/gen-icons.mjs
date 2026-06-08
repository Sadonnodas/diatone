// Generates app icons (no external deps): a rounded, gradient-filled maj7 △ with
// a soft accent halo over a glowing dark canvas, matching the editorial identity
// (§1.5 / §2.3). Supersampled for crisp edges. Pure zlib PNG.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x0a, 0x0c, 0x10]; // app canvas
const GRAD_TOP = [0xc2, 0xb8, 0xff]; // light periwinkle (triangle top)
const GRAD_BOT = [0x7e, 0x6e, 0xf0]; // accent-deep (triangle bottom)
const ACCENT = [0x9b, 0x8c, 0xff]; // halo / glow

// CRC32
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // raw with filter byte 0 per scanline
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Distance from point to segment
function distSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax,
    dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx,
    cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Winding sign for point-in-triangle.
function sign(px, py, ax, ay, bx, by) {
  return (px - bx) * (ay - by) - (ax - bx) * (py - by);
}
function inTriangle(px, py, v) {
  const d1 = sign(px, py, v[0][0], v[0][1], v[1][0], v[1][1]);
  const d2 = sign(px, py, v[1][0], v[1][1], v[2][0], v[2][1]);
  const d3 = sign(px, py, v[2][0], v[2][1], v[0][0], v[0][1]);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}
const mix = (a, b, t) => a + (b - a) * t;
const FRET = [0x92, 0x9a, 0xa7]; // faint fret/string lines

// A triad of note-dots (an upward triangle) on a faint fret grid: the maj7 △
// identity, now reading as scale degrees on a fretboard.
function drawIcon(size, safeFraction) {
  const SS = 4; // supersample factor
  const S = size * SS;
  const acc = new Float64Array(size * size * 3);

  const cx = S / 2;
  const cy = S / 2;
  const dotR = S * 0.105;
  const R = (S / 2) * safeFraction - dotR; // triangle circumradius (dots stay inside)
  const oy = cy + R * 0.08; // nudge down for optical centre
  const v = [
    [cx, oy - R],
    [cx - R * 0.8660254, oy + R * 0.5],
    [cx + R * 0.8660254, oy + R * 0.5],
  ];
  const gradTopY = oy - R - dotR;
  const gradBotY = oy + R * 0.5 + dotR;
  const edgeHalf = S * 0.016; // thin connecting lines between dots
  const aa = SS * 0.6;

  // Faint vertical fret lines spanning the mark's height.
  const fretXs = [cx - R * 0.74, cx - R * 0.25, cx + R * 0.25, cx + R * 0.74];
  const fretHalf = S * 0.006;
  const fretTopY = oy - R - dotR * 0.7;
  const fretBotY = oy + R * 0.5 + dotR * 0.7;

  // Background radial glow centred a touch above the mark.
  const glowR = S * 0.62;
  const glowCx = cx;
  const glowCy = oy - R * 0.15;
  const glowMax = 0.4;

  const grad = (py, ch) => {
    const t = Math.max(0, Math.min(1, (py - gradTopY) / (gradBotY - gradTopY)));
    return mix(GRAD_TOP[ch], GRAD_BOT[ch], t);
  };

  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const px = x + 0.5,
        py = y + 0.5;

      // background + radial glow
      const gd = Math.hypot(px - glowCx, py - glowCy) / glowR;
      const glow = glowMax * Math.exp(-(gd * gd) * 1.6);
      const col = [mix(BG[0], ACCENT[0], glow), mix(BG[1], ACCENT[1], glow), mix(BG[2], ACCENT[2], glow)];

      // faint fret lines
      if (py > fretTopY && py < fretBotY) {
        for (const fx of fretXs) {
          const cov = Math.max(0, Math.min(1, (fretHalf - Math.abs(px - fx)) / aa + 0.5));
          if (cov > 0) for (let c = 0; c < 3; c++) col[c] = mix(col[c], FRET[c], 0.22 * cov);
        }
      }

      // connecting triangle edges
      const edge = Math.min(
        distSeg(px, py, v[0][0], v[0][1], v[1][0], v[1][1]),
        distSeg(px, py, v[1][0], v[1][1], v[2][0], v[2][1]),
        distSeg(px, py, v[2][0], v[2][1], v[0][0], v[0][1]),
      );
      const eCov = Math.max(0, Math.min(1, (edgeHalf - edge) / aa + 0.5));
      if (eCov > 0) for (let c = 0; c < 3; c++) col[c] = mix(col[c], grad(py, c), eCov);

      // note dots at the vertices
      const dd = Math.min(
        Math.hypot(px - v[0][0], py - v[0][1]),
        Math.hypot(px - v[1][0], py - v[1][1]),
        Math.hypot(px - v[2][0], py - v[2][1]),
      );
      const dCov = Math.max(0, Math.min(1, (dotR - dd) / aa + 0.5));
      if (dCov > 0) for (let c = 0; c < 3; c++) col[c] = mix(col[c], grad(py, c), dCov);

      const ox = (x / SS) | 0;
      const oyy = (y / SS) | 0;
      const oi = (oyy * size + ox) * 3;
      acc[oi] += col[0];
      acc[oi + 1] += col[1];
      acc[oi + 2] += col[2];
    }
  }

  const rgba = Buffer.alloc(size * size * 4);
  const n = SS * SS;
  for (let i = 0; i < size * size; i++) {
    rgba[i * 4] = Math.round(acc[i * 3] / n);
    rgba[i * 4 + 1] = Math.round(acc[i * 3 + 1] / n);
    rgba[i * 4 + 2] = Math.round(acc[i * 3 + 2] / n);
    rgba[i * 4 + 3] = 0xff;
  }
  return encodePNG(size, size, rgba);
}

// Minimal ICO wrapping a single PNG image.
function encodeICO(png, size) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type icon
  header.writeUInt16LE(1, 4); // count
  const entry = Buffer.alloc(16);
  entry[0] = size >= 256 ? 0 : size; // width
  entry[1] = size >= 256 ? 0 : size; // height
  entry[2] = 0; // palette
  entry[3] = 0;
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bpp
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(6 + 16, 12); // offset
  return Buffer.concat([header, entry, png]);
}

mkdirSync('public/icons', { recursive: true });

writeFileSync('public/icons/icon-192.png', drawIcon(192, 0.74));
writeFileSync('public/icons/icon-512.png', drawIcon(512, 0.74));
// maskable: keep glyph inside the central ~80% safe zone (smaller fraction)
writeFileSync('public/icons/icon-512-maskable.png', drawIcon(512, 0.58));
writeFileSync('public/apple-touch-icon.png', drawIcon(180, 0.74));
writeFileSync('public/favicon.ico', encodeICO(drawIcon(32, 0.8), 32));

console.log('Icons generated.');
