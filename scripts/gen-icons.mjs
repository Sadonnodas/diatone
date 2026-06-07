// Generates app icons (no external deps): an outlined maj7 △ in the accent on
// the --bg canvas, matching the editorial-serif identity (§2.3). Pure zlib PNG.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [0x0a, 0x0c, 0x10, 0xff];
const ACCENT = [0x9b, 0x8c, 0xff, 0xff];

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

function drawIcon(size, safeFraction) {
  const rgba = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * safeFraction; // circumradius of the triangle
  // upward equilateral triangle, nudged down so the optical centre sits centred
  const oy = cy + R * 0.12;
  const v = [
    [cx, oy - R],
    [cx - R * 0.8660254, oy + R * 0.5],
    [cx + R * 0.8660254, oy + R * 0.5],
  ];
  const stroke = Math.max(2, size * 0.052);
  const half = stroke / 2;
  const aa = 1.2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5,
        py = y + 0.5;
      const d = Math.min(
        distSeg(px, py, v[0][0], v[0][1], v[1][0], v[1][1]),
        distSeg(px, py, v[1][0], v[1][1], v[2][0], v[2][1]),
        distSeg(px, py, v[2][0], v[2][1], v[0][0], v[0][1]),
      );
      // anti-aliased coverage of the stroke band
      const cov = Math.max(0, Math.min(1, (half - d) / aa + 0.5));
      const i = (y * size + x) * 4;
      for (let c = 0; c < 4; c++) {
        rgba[i + c] = Math.round(BG[c] * (1 - cov) + ACCENT[c] * cov);
      }
      rgba[i + 3] = 0xff;
    }
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
