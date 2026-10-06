import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  chunk.writeUInt32BE(crc32(typeAndData), 8 + len);
  return chunk;
}

function generatePng(width, height, isMaskable = false) {
  // Raw RGBA scanlines: (width * 4 + 1) * height
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * (isMaskable ? 0.38 : 0.44);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    raw[rowOffset] = 0; // Filter type 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Background gradient (deep indigo to purple)
      const gradRatio = (x + y) / (width + height);
      let r = Math.round(79 + (99 - 79) * gradRatio);   // #4f46e5 to #6366f1
      let g = Math.round(70 + (102 - 70) * gradRatio);
      let b = Math.round(229 + (241 - 229) * gradRatio);
      let a = 255;

      // Draw rounded emblem / icon in center
      if (dist < radius) {
        // Subtle gold/cyan accent circle
        const ringDist = Math.abs(dist - radius * 0.88);
        if (ringDist < width * 0.02) {
          r = 245; g = 158; b = 11; // amber ring
        }

        // Letter "M" or clock motif in center
        const relX = (x - cx) / radius;
        const relY = (y - cy) / radius;

        // Draw "M" shape
        const inM = (
          (Math.abs(relX) < 0.55 && relY > -0.45 && relY < 0.45) &&
          (
            Math.abs(relX - 0.4) < 0.12 ||
            Math.abs(relX + 0.4) < 0.12 ||
            (relY > -0.45 && relY < 0.15 && Math.abs(Math.abs(relX) - (0.45 - relY * 0.6)) < 0.12)
          )
        );

        if (inM) {
          r = 255; g = 255; b = 255; // White letter M
        }
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // Color type 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const header = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', zlib.deflateSync(raw, { level: 9 }));
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.resolve('public');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

// 1. pwa-192x192.png
fs.writeFileSync(path.join(outDir, 'pwa-192x192.png'), generatePng(192, 192, false));
console.log('✓ Generated pwa-192x192.png');

// 2. pwa-512x512.png
fs.writeFileSync(path.join(outDir, 'pwa-512x512.png'), generatePng(512, 512, false));
console.log('✓ Generated pwa-512x512.png');

// 3. pwa-maskable-512x512.png
fs.writeFileSync(path.join(outDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
console.log('✓ Generated pwa-maskable-512x512.png');

// 4. apple-touch-icon.png (180x180)
fs.writeFileSync(path.join(outDir, 'apple-touch-icon.png'), generatePng(180, 180, false));
console.log('✓ Generated apple-touch-icon.png');

// 5. favicon.ico
fs.writeFileSync(path.join(outDir, 'favicon.ico'), generatePng(64, 64, false));
console.log('✓ Generated favicon.ico');

// 6. icon.svg
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5" />
      <stop offset="100%" stop-color="#6366f1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="128" fill="url(#bgGrad)" />
  <circle cx="256" cy="256" r="190" fill="none" stroke="#f59e0b" stroke-width="8" opacity="0.9" />
  <path d="M 160 360 L 160 160 L 256 280 L 352 160 L 352 360" fill="none" stroke="#ffffff" stroke-width="40" stroke-linecap="round" stroke-linejoin="round" />
  <circle cx="256" cy="380" r="12" fill="#34d399" />
</svg>`;
fs.writeFileSync(path.join(outDir, 'icon.svg'), svg, 'utf-8');
console.log('✓ Generated icon.svg');
