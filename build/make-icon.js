const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const SIZE = 256;
const raw = Buffer.alloc((SIZE * 4 + 1) * SIZE);

function clamp(v) {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

for (let y = 0; y < SIZE; y++) {
  const rowStart = y * (SIZE * 4 + 1);
  raw[rowStart] = 0;
  for (let x = 0; x < SIZE; x++) {
    const dx = x - SIZE / 2 + 0.5;
    const dy = y - SIZE / 2 + 0.5;
    const r = Math.hypot(dx, dy);
    const angle = Math.atan2(dy, dx);
    const px = rowStart + 1 + x * 4;

    // Soft drop shadow slightly offset down-right
    const sdx = dx - 2;
    const sdy = dy - 5;
    const sr = Math.hypot(sdx, sdy);

    if (r > 121) {
      // Subtle outer drop shadow
      if (sr <= 123 && sr > 114) {
        const sa = (1 - smoothstep(116, 123, sr)) * 70;
        raw[px] = 10;
        raw[px + 1] = 12;
        raw[px + 2] = 24;
        raw[px + 3] = clamp(sa);
      } else {
        raw[px] = 0;
        raw[px + 1] = 0;
        raw[px + 2] = 0;
        raw[px + 3] = 0;
      }
      continue;
    }

    // Center spindle hole
    if (r < 19) {
      raw[px] = 0;
      raw[px + 1] = 0;
      raw[px + 2] = 0;
      raw[px + 3] = 0;
      continue;
    }

    let alpha = 255;
    if (r > 119) alpha = clamp((121 - r) / 2 * 255);
    if (r < 21) alpha = Math.min(alpha, clamp((r - 19) / 2 * 255));

    // Inner clear polycarbonate clamping hub (r 19..43)
    if (r < 43) {
      const innerRim = Math.exp(-Math.pow((r - 22) / 1.4, 2)) * 90;
      const clampRing = Math.exp(-Math.pow((r - 36.5) / 1.6, 2)) * 110;
      const hubBorder = Math.exp(-Math.pow((r - 42.5) / 1.2, 2)) * 95;
      const sheen = Math.pow(Math.max(0, Math.cos(angle + 0.7)), 3) * 45;
      const base = 175 + innerRim + clampRing + hubBorder + sheen;
      raw[px] = clamp(base * 0.92);
      raw[px + 1] = clamp(base * 0.96);
      raw[px + 2] = clamp(base * 1.04);
      raw[px + 3] = Math.min(alpha, clamp(135 + clampRing * 0.7 + hubBorder * 0.5));
      continue;
    }

    // Mirror / data ring transition (r 43..48)
    const dataBand = smoothstep(43, 47, r);

    // Pretty iridescent holographic CD rainbow (cyan -> lavender -> rose -> gold -> mint)
    const phase = angle * 2.0 + r * 0.022;
    const iridR = 145 + 85 * Math.sin(phase + 0.2) + 25 * Math.sin(angle * 4 - 0.5);
    const iridG = 165 + 75 * Math.sin(phase + 2.3) + 20 * Math.cos(angle * 3 + 0.4);
    const iridB = 205 + 50 * Math.sin(phase + 4.2) + 30 * Math.sin(angle * 2 + 1.1);

    // Dual diagonal glossy specular highlights (classic pretty CD reflection)
    const spec1 = Math.pow(Math.max(0, Math.cos(angle + 0.75)), 7) * 115;
    const spec2 = Math.pow(Math.max(0, Math.cos(angle - 2.39)), 9) * 80;
    const spec = spec1 + spec2;

    // Fine optical track micro-grooves
    const groove = Math.sin(r * 1.15) * 4.5;

    // Silver-pearl base blended with iridescent rainbow
    const silver = 212;
    let outR = silver * (1 - dataBand * 0.55) + iridR * (dataBand * 0.55) + spec + groove;
    let outG = silver * (1 - dataBand * 0.55) + iridG * (dataBand * 0.55) + spec + groove;
    let outB = (silver + 10) * (1 - dataBand * 0.55) + iridB * (dataBand * 0.55) + spec + groove;

    // Crisp outer jewel rim highlight & subtle bevel
    if (r > 115) {
      const rim = Math.exp(-Math.pow((r - 117.5) / 1.4, 2)) * 55;
      const edgeDark = smoothstep(117.5, 121, r) * 55;
      outR = outR + rim - edgeDark;
      outG = outG + rim - edgeDark;
      outB = outB + rim - edgeDark;
    }

    raw[px] = clamp(outR);
    raw[px + 1] = clamp(outG);
    raw[px + 2] = clamp(outB);
    raw[px + 3] = alpha;
  }
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);
ihdr.writeUInt32BE(SIZE, 4);
ihdr[8] = 8;
ihdr[9] = 6;
ihdr[10] = 0;
ihdr[11] = 0;
ihdr[12] = 0;

const idat = zlib.deflateSync(raw, { level: 9 });
const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0))
]);

fs.writeFileSync(path.join(__dirname, 'icon.png'), png);
console.log('Generated pretty CD build/icon.png');
