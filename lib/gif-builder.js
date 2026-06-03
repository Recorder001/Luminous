'use strict';

// Seeded deterministic pseudo-random (reproducible star/circle layouts)
function srand(seed) {
  let s = Math.imul((seed + 1) * 1664525 | 0, 0x45d9f3b);
  s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
  return ((s ^ (s >>> 16)) >>> 0) / 0x100000000;
}

// ── LZW encoder ────────────────────────────────────────────────────────────
function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const eodCode   = clearCode + 1;
  let codeSize    = minCodeSize + 1;
  let nextCode    = eodCode + 1;
  const dict      = new Map();
  const out       = [];
  let buf = 0, bits = 0;

  const emit = (code) => {
    buf |= code << bits; bits += codeSize;
    while (bits >= 8) { out.push(buf & 0xFF); buf >>= 8; bits -= 8; }
  };

  emit(clearCode);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const px  = indices[i];
    const key = (prefix << 8) | px;
    if (dict.has(key)) {
      prefix = dict.get(key);
    } else {
      emit(prefix);
      if (nextCode < 4096) {
        dict.set(key, nextCode++);
        if (nextCode > (1 << codeSize) && codeSize < 12) codeSize++;
      } else {
        emit(clearCode); dict.clear();
        nextCode = eodCode + 1; codeSize = minCodeSize + 1;
      }
      prefix = px;
    }
  }
  emit(prefix); emit(eodCode);
  if (bits > 0) out.push(buf & 0xFF);
  return Buffer.from(out);
}

function packBlocks(data) {
  const parts = [];
  for (let i = 0; i < data.length; i += 255) {
    const c = data.slice(i, i + 255);
    parts.push(Buffer.from([c.length]), c);
  }
  parts.push(Buffer.from([0]));
  return Buffer.concat(parts);
}

// ── GIF assembler ──────────────────────────────────────────────────────────
function makeGif(W, H, palette, frames, delayCs) {
  const n       = palette.length;              // power of 2
  const palBits = Math.round(Math.log2(n)) - 1;
  const minCS   = Math.max(2, palBits + 1);
  const gct     = Buffer.concat(palette.map(([r,g,b]) => Buffer.from([r,g,b])));

  const parts = [
    Buffer.from('GIF89a'),
    (() => {
      const b = Buffer.alloc(7);
      b.writeUInt16LE(W,0); b.writeUInt16LE(H,2);
      b[4]=0x80|palBits; b[5]=0; b[6]=0;
      return b;
    })(),
    gct,
    // NETSCAPE loop = 0 (infinite)
    Buffer.from([0x21,0xFF,0x0B,...Buffer.from('NETSCAPE2.0'),0x03,0x01,0x00,0x00,0x00]),
  ];

  for (const idx of frames) {
    // Graphic Control Extension — disposal=1 (leave in place), no transparency
    const gce = Buffer.alloc(8);
    gce[0]=0x21; gce[1]=0xF9; gce[2]=0x04; gce[3]=0x04;
    gce.writeUInt16LE(delayCs,4); gce[6]=0; gce[7]=0;
    parts.push(gce);

    const id = Buffer.alloc(10);
    id[0]=0x2C;
    id.writeUInt16LE(0,1); id.writeUInt16LE(0,3);
    id.writeUInt16LE(W,5); id.writeUInt16LE(H,7);
    id[9]=0x00;
    parts.push(id);

    const lzw = lzwEncode(idx, minCS);
    parts.push(Buffer.from([minCS]), packBlocks(lzw));
  }
  parts.push(Buffer.from([0x3B]));
  return Buffer.concat(parts);
}

// ── Background GIF generator ───────────────────────────────────────────────
//
// Animation (24 frames, 80ms each = ~1.9s loop):
//   • Stars   : 40 dots, each twinkling at its own phase/speed
//   • Circles : 5 circles, fade-in → slow drift → fade-out (staggered phases)
//   • Edge glow: very subtle left/right pulse (1 full sine cycle per loop)
//
function makeBgGif(pcol, W, H) {
  const pr = parseInt(pcol.slice(1,3), 16);
  const pg = parseInt(pcol.slice(3,5), 16);
  const pb = parseInt(pcol.slice(5,7), 16);

  // 32-colour palette (power of 2):
  //  0       = pure bg (#0a0a12)
  //  1-15    = bg → planet colour  (circles + glow)
  //  16-23   = bg → bright white   (stars)
  //  24-31   = spare bg
  const PP = 16, PS = 8, TOTAL = 32;
  const palette = [
    ...Array.from({ length: PP }, (_, i) => {
      const t = i / (PP - 1);
      return [Math.round(10+(pr-10)*t), Math.round(10+(pg-10)*t), Math.round(18+(pb-18)*t)];
    }),
    ...Array.from({ length: PS }, (_, i) => {
      const t = i / (PS - 1);
      return [Math.round(10+230*t), Math.round(10+226*t), Math.round(18+210*t)];
    }),
    ...Array.from({ length: TOTAL-PP-PS }, () => [10,10,18]),
  ];

  const NF = 24; // frames
  const DCS = 8; // 80ms per frame

  // ── Fixed star layout (seeded) ──────────────────────────────
  const NSTARS = 40;
  const stars = Array.from({ length: NSTARS }, (_, i) => ({
    x:     Math.round(srand(i*7+0) * W),
    y:     Math.round(srand(i*7+1) * H),
    cross: srand(i*7+2) < 0.35,          // 35% are 3-px crosses, rest 1-px
    phase: srand(i*7+3) * Math.PI * 2,
    speed: 0.4 + srand(i*7+4) * 2.0,
  }));

  // ── Circle layout (seeded, staggered phases) ─────────────────
  const NC = 5;
  const circles = Array.from({ length: NC }, (_, i) => ({
    cx:    Math.round(srand(i*11+0) * W),
    cy:    Math.round(srand(i*11+1) * H),
    r:     60 + Math.round(srand(i*11+2) * 80),   // 60-140 px base radius
    dx:    (srand(i*11+3)-0.5) * 40,              // ±20 px drift
    dy:    (srand(i*11+4)-0.5) * 24,
    start: i / NC,                                 // evenly spread entry points
    dur:   0.40 + srand(i*11+5) * 0.25,           // active 40-65% of cycle
  }));

  // ── Frame render ─────────────────────────────────────────────
  const frames = Array.from({ length: NF }, (_, fi) => {
    const t   = fi / NF;
    const pix = new Uint8Array(W * H); // all 0 = bg

    // ── Circles: expand throughout + fade-in/out bell ────────
    for (const c of circles) {
      const cyclePos = ((t - c.start + 1) % 1);
      if (cyclePos > c.dur) continue;
      const lifeT = cyclePos / c.dur;                           // 0…1
      const alpha = Math.sin(Math.PI * lifeT);                  // smooth bell 0→1→0
      const palIdx = Math.max(1, Math.min(13, Math.round(alpha * 11) + 1));

      // Radius grows continuously from r to 1.8×r over full lifetime
      const expansion = 1.0 + lifeT * 0.8;
      const cx = Math.round(c.cx + c.dx * lifeT);
      const cy = Math.round(c.cy + c.dy * lifeT);
      const r  = Math.round(c.r * expansion);
      const riSq = (r-1)*(r-1), roSq = (r+1)*(r+1);

      const yMin = Math.max(0, cy-r-2), yMax = Math.min(H-1, cy+r+2);
      const xMin = Math.max(0, cx-r-2), xMax = Math.min(W-1, cx+r+2);
      for (let y = yMin; y <= yMax; y++) {
        const dy2 = (y-cy)*(y-cy);
        for (let x = xMin; x <= xMax; x++) {
          const dSq = (x-cx)*(x-cx)+dy2;
          if (dSq >= riSq && dSq <= roSq)
            pix[y*W+x] = Math.max(pix[y*W+x], palIdx);
        }
      }
    }

    // ── Edge glow (very subtle, 1 full sine per loop) ────────
    const gs = 0.008 + 0.010 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t));
    const GW = 190;
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < GW; x++) {
        const gi = Math.min(7, Math.round((1 - x/GW) * gs * 200));
        if (gi > 0) {
          pix[y*W+x]       = Math.max(pix[y*W+x], gi);
          pix[y*W+(W-1-x)] = Math.max(pix[y*W+(W-1-x)], gi);
        }
      }
    }

    // ── Stars ────────────────────────────────────────────────
    for (const s of stars) {
      if (s.x < 0 || s.x >= W || s.y < 0 || s.y >= H) continue;
      const brightness = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(s.phase + 2*Math.PI*t*s.speed));
      const si = PP + Math.min(PS-1, Math.round(brightness*(PS-1)));
      pix[s.y*W+s.x] = si;
      if (s.cross) {
        const dim = PP + Math.max(0, Math.round(brightness*(PS-1))-2);
        if (s.x>0)   pix[s.y*W+s.x-1] = Math.max(pix[s.y*W+s.x-1], dim);
        if (s.x<W-1) pix[s.y*W+s.x+1] = Math.max(pix[s.y*W+s.x+1], dim);
        if (s.y>0)   pix[(s.y-1)*W+s.x] = Math.max(pix[(s.y-1)*W+s.x], dim);
        if (s.y<H-1) pix[(s.y+1)*W+s.x] = Math.max(pix[(s.y+1)*W+s.x], dim);
      }
    }

    return pix;
  });

  return makeGif(W, H, palette, frames, DCS);
}

module.exports = { makeBgGif };
