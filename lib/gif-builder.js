// Minimal animated GIF encoder — background-only (simple palette, no canvas deps)
// Produces GIF89a with pulsing edge-glow animation in the planet's accent color.

'use strict';

// ── LZW encoder ────────────────────────────────────────────────────────────
function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eodCode   = clearCode + 1;
  let codeSize    = minCodeSize + 1;
  let nextCode    = eodCode + 1;
  const dict      = new Map();
  const out       = [];
  let buf = 0, bufBits = 0;

  const emit = (code) => {
    buf |= code << bufBits;
    bufBits += codeSize;
    while (bufBits >= 8) { out.push(buf & 0xFF); buf >>= 8; bufBits -= 8; }
  };

  const resetDict = () => { dict.clear(); nextCode = eodCode + 1; codeSize = minCodeSize + 1; };

  emit(clearCode);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const pixel = indices[i];
    const key   = (prefix << 8) | pixel;
    if (dict.has(key)) {
      prefix = dict.get(key);
    } else {
      emit(prefix);
      if (nextCode < 4096) {
        dict.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clearCode);
        resetDict();
      }
      prefix = pixel;
    }
  }
  emit(prefix);
  emit(eodCode);
  if (bufBits > 0) out.push(buf & 0xFF);
  return Buffer.from(out);
}

function packSubblocks(data) {
  const parts = [];
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.slice(i, i + 255);
    parts.push(Buffer.from([chunk.length]), chunk);
  }
  parts.push(Buffer.from([0x00])); // block terminator
  return Buffer.concat(parts);
}

// ── GIF assembler ──────────────────────────────────────────────────────────
function assembleGif(W, H, palRgb, frames, delayCs) {
  // palRgb: [[r,g,b], ...], length must be power of 2 (≤ 256)
  const nColors  = palRgb.length;
  const palBits  = Math.round(Math.log2(nColors)) - 1; // GCT size field
  const minCS    = Math.max(2, Math.round(Math.log2(nColors)));
  const gct      = Buffer.concat(palRgb.map(c => Buffer.from(c)));

  const parts = [
    Buffer.from('GIF89a'),
    // Logical Screen Descriptor
    (() => {
      const b = Buffer.alloc(7);
      b.writeUInt16LE(W, 0); b.writeUInt16LE(H, 2);
      b[4] = 0x80 | palBits; b[5] = 0; b[6] = 0;
      return b;
    })(),
    gct,
    // NETSCAPE loop extension
    Buffer.from([0x21,0xFF,0x0B,...Buffer.from('NETSCAPE2.0'),0x03,0x01,0x00,0x00,0x00]),
  ];

  for (const indices of frames) {
    // Graphic Control Extension
    const gce = Buffer.alloc(8);
    gce[0] = 0x21; gce[1] = 0xF9; gce[2] = 0x04; gce[3] = 0x04;
    gce.writeUInt16LE(delayCs, 4); gce[6] = 0; gce[7] = 0;
    parts.push(gce);

    // Image Descriptor
    const id = Buffer.alloc(10);
    id[0] = 0x2C;
    id.writeUInt16LE(0,1); id.writeUInt16LE(0,3);
    id.writeUInt16LE(W,5); id.writeUInt16LE(H,7);
    id[9] = 0x00;
    parts.push(id);

    // Image data
    const lzw = lzwEncode(indices, minCS);
    parts.push(Buffer.from([minCS]), packSubblocks(lzw));
  }

  parts.push(Buffer.from([0x3B])); // trailer
  return Buffer.concat(parts);
}

// ── Background frame generator ─────────────────────────────────────────────
// Generates an animated GIF with a pulsing left/right edge glow in pcol.
function makeBgGif(pcol, W, H, nFrames = 12) {
  // Parse pcol (#rrggbb)
  const pr = parseInt(pcol.slice(1,3), 16);
  const pg = parseInt(pcol.slice(3,5), 16);
  const pb = parseInt(pcol.slice(5,7), 16);

  // 16-color palette: dark bg → planet color (power of 2 for clean GCT)
  const N_PAL = 16;
  const palette = Array.from({ length: N_PAL }, (_, i) => {
    const t = i / (N_PAL - 1);
    return [
      Math.round(10 + (pr - 10) * t),
      Math.round(10 + (pg - 10) * t),
      Math.round(18 + (pb - 18) * t),
    ];
  });

  const GLOW_WIDTH = 220; // px from each edge that glow covers

  const frames = Array.from({ length: nFrames }, (_, fi) => {
    const t = fi / nFrames;
    // Sinusoidal intensity: 0.18 … 0.58
    const intensity = 0.18 + 0.40 * (0.5 + 0.5 * Math.sin(2 * Math.PI * t));

    const indices = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const edgeDist = Math.min(x, W - 1 - x);
        if (edgeDist >= GLOW_WIDTH) {
          indices[y * W + x] = 0; // pure background
        } else {
          const factor  = (1 - edgeDist / GLOW_WIDTH) * intensity;
          const palIdx  = Math.min(N_PAL - 1, Math.round(factor * (N_PAL - 1)));
          indices[y * W + x] = palIdx;
        }
      }
    }
    return indices;
  });

  return assembleGif(W, H, palette, frames, 8); // 8 centiseconds = 80ms per frame
}

module.exports = { makeBgGif };
