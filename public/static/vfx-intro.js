/**
 * PLAZION VFX Intro — Variant 3 "Voxel Materialize"
 * Ported from the design handoff (variant3.jsx / variant3_landscape.jsx / common.jsx)
 * into a single dependency-free vanilla JS module for production use.
 *
 * Spec source: design_handoff_plazion_vfx_intro/README.md
 *  - Duration: 3.0s looping
 *  - Landscape: 1920x1080 (cell 14px, logo sample width 1200px)
 *  - Portrait:  1080x1920 (cell 11px, logo sample width 620px)
 *  - Deterministic PRNG (mulberry32) so the render is frame-reproducible
 */

// ---------- Easing ----------
const Easing = {
  easeOutBack: (t) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
};

// ---------- Deterministic PRNG ----------
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- Procedural WebAudio SFX ----------
let __audioCtx = null;
function getAudioCtx() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!__audioCtx) __audioCtx = new AC();
  return __audioCtx;
}

function playImpact(when = 0, opts = {}) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime + when;

    const master = ctx.createGain();
    master.gain.value = opts.gain ?? 0.9;
    master.connect(ctx.destination);

    // Sub boom
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(120, t0);
    sub.frequency.exponentialRampToValueAtTime(32, t0 + 0.6);
    subGain.gain.setValueAtTime(0.0001, t0);
    subGain.gain.exponentialRampToValueAtTime(1.0, t0 + 0.015);
    subGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.1);
    sub.connect(subGain).connect(master);
    sub.start(t0); sub.stop(t0 + 1.2);

    // Noise sweep
    const bufDur = 1.4;
    const buf = ctx.createBuffer(1, ctx.sampleRate * bufDur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nFilt = ctx.createBiquadFilter();
    nFilt.type = 'lowpass';
    nFilt.frequency.setValueAtTime(1800, t0);
    nFilt.frequency.exponentialRampToValueAtTime(180, t0 + 0.9);
    nFilt.Q.value = 0.7;
    const nGain = ctx.createGain();
    nGain.gain.setValueAtTime(0.0001, t0);
    nGain.gain.exponentialRampToValueAtTime(0.7, t0 + 0.01);
    nGain.gain.exponentialRampToValueAtTime(0.001, t0 + 1.0);
    noise.connect(nFilt).connect(nGain).connect(master);
    noise.start(t0); noise.stop(t0 + 1.3);

    // Transient click
    const click = ctx.createOscillator();
    click.type = 'triangle';
    click.frequency.setValueAtTime(2200, t0);
    click.frequency.exponentialRampToValueAtTime(400, t0 + 0.08);
    const cGain = ctx.createGain();
    cGain.gain.setValueAtTime(0.0001, t0);
    cGain.gain.exponentialRampToValueAtTime(0.35, t0 + 0.005);
    cGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
    click.connect(cGain).connect(master);
    click.start(t0); click.stop(t0 + 0.15);
  } catch (e) { /* silent */ }
}

function playWhoosh(when = 0, opts = {}) {
  try {
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    const t0 = ctx.currentTime + when;
    const dur = opts.dur ?? 0.9;

    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.setValueAtTime(400, t0);
    filt.frequency.exponentialRampToValueAtTime(3200, t0 + dur * 0.9);
    filt.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    noise.connect(filt).connect(g).connect(ctx.destination);
    noise.start(t0); noise.stop(t0 + dur + 0.05);
  } catch (e) { /* silent */ }
}

// ---------- Voxel Materialize Intro ----------
const ASPECTS = {
  landscape: { w: 1920, h: 1080, cell: 14, logoW: 1200 },
  portrait: { w: 1080, h: 1920, cell: 11, logoW: 620 },
};

const DURATION = 3.0;

class PlazionIntro {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{logoSrc: string, aspect: 'landscape'|'portrait', onLoop?: () => void}} opts
   */
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.logoSrc = opts.logoSrc;
    this.aspect = opts.aspect || 'landscape';
    this.onLoop = opts.onLoop || (() => {});
    this.soundOn = false;
    this.logo = null;
    this.voxelData = null;
    this.startTime = null;
    this.rafId = null;
    this.impactPlayed = false;
    this.glitchPlayed = false;
    this._loadLogo();
  }

  _loadLogo() {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.logo = img;
      this._buildVoxels();
      this._applyAspect();
      this._start();
    };
    img.src = this.logoSrc;
  }

  setAspect(aspect) {
    if (this.aspect === aspect) return;
    this.aspect = aspect;
    this._buildVoxels();
    this._applyAspect();
    this.restart();
  }

  _applyAspect() {
    const cfg = ASPECTS[this.aspect];
    this.canvas.width = cfg.w;
    this.canvas.height = cfg.h;
  }

  _buildVoxels() {
    if (!this.logo) return;
    const cfg = ASPECTS[this.aspect];
    const img = this.logo;
    const targetW = cfg.logoW;
    const ratio = img.naturalHeight / img.naturalWidth;
    const targetH = targetW * ratio;
    const off = document.createElement('canvas');
    off.width = targetW;
    off.height = Math.max(1, Math.round(targetH));
    const octx = off.getContext('2d', { willReadFrequently: true });
    octx.drawImage(img, 0, 0, targetW, targetH);
    const data = octx.getImageData(0, 0, off.width, off.height).data;

    const cell = cfg.cell;
    const vox = [];
    for (let y = 0; y < off.height; y += cell) {
      for (let x = 0; x < off.width; x += cell) {
        const cx = Math.min(off.width - 1, x + (cell >> 1));
        const cy = Math.min(off.height - 1, y + (cell >> 1));
        const i = (cy * off.width + cx) * 4;
        const a = data[i + 3];
        if (a > 40) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          vox.push({
            x: x - off.width / 2 + cell / 2,
            y: y - off.height / 2 + cell / 2,
            r, g, b, a: a / 255,
          });
        }
      }
    }
    const rand = mulberry32(4242);
    const maxDist = Math.hypot(off.width / 2, off.height / 2);
    for (const v of vox) {
      const d = Math.hypot(v.x, v.y);
      v.delay = Math.min(1, d / maxDist) * 0.8 + rand() * 0.25;
    }
    this.voxelData = { vox, cell, logoW: targetW, logoH: targetH };
  }

  _start() {
    this.startTime = performance.now();
    this.impactPlayed = false;
    this.glitchPlayed = false;
    this._loop();
  }

  restart() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this._start();
  }

  setSound(on) {
    this.soundOn = on;
  }

  _loop() {
    const now = performance.now();
    let t = (now - this.startTime) / 1000;
    if (t >= DURATION) {
      this.startTime = now;
      t = 0;
      this.impactPlayed = false;
      this.glitchPlayed = false;
      this.onLoop();
    }
    if (this.soundOn) {
      if (!this.glitchPlayed && t > 1.42) {
        this.glitchPlayed = true;
        playWhoosh(0, { dur: 0.35 });
      }
      if (!this.impactPlayed && t > 1.85) {
        this.impactPlayed = true;
        playImpact(0, { gain: 1.0 });
      }
    }
    this._draw(t);
    this.rafId = requestAnimationFrame(() => this._loop());
  }

  destroy() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  _draw(t) {
    const cfg = ASPECTS[this.aspect];
    const w = cfg.w, h = cfg.h;
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    ctx.fillStyle = '#020009';
    ctx.fillRect(0, 0, w, h);
    const vg = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.6);
    vg.addColorStop(0, 'rgba(40, 15, 80, 0.35)');
    vg.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(w / 2, h / 2);

    const revealClean = Math.min(1, Math.max(0, (t - 1.9) / 0.3));
    const idleT = Math.min(1, Math.max(0, (t - 2.15) / 0.85));
    const impactFlash = t > 1.85 && t < 2.05 ? 1 - (t - 1.85) / 0.2 : 0;

    // Voxel pop-in
    const vd = this.voxelData;
    if (vd && revealClean < 1) {
      const { vox, cell } = vd;
      for (let i = 0; i < vox.length; i++) {
        const v = vox[i];
        const localT = Math.min(1, Math.max(0, (t - 0.15 - v.delay * 1.1) / 0.35));
        if (localT <= 0) continue;
        const s = localT < 0.7 ? Easing.easeOutBack(localT / 0.7) : 1;
        const sz = cell * 0.9 * Math.min(1.15, Math.max(0, s));
        const alpha = Math.min(1, localT * 1.8) * (1 - revealClean);
        ctx.fillStyle = `rgba(${v.r}, ${v.g}, ${v.b}, ${v.a * alpha})`;
        ctx.fillRect(v.x - sz / 2, v.y - sz / 2, sz, sz);
        if (localT < 0.9) {
          ctx.strokeStyle = `rgba(200, 170, 255, ${(1 - localT) * 0.6 * alpha})`;
          ctx.lineWidth = 1;
          ctx.strokeRect(v.x - sz / 2, v.y - sz / 2, sz, sz);
        }
      }
    }

    // Glitch bars
    if (t > 1.42 && t < 1.9) {
      const gt = (t - 1.42) / 0.48;
      const rand = mulberry32(Math.floor(t * 30));
      const barCount = 4;
      for (let i = 0; i < barCount; i++) {
        if (rand() < 0.7) {
          const by = (rand() - 0.5) * (h * 0.7);
          const bh = 8 + rand() * 40;
          const shift = (rand() - 0.5) * 80 * (1 - gt);
          ctx.save();
          ctx.beginPath();
          ctx.rect(-w / 2, by, w, bh);
          ctx.clip();
          ctx.translate(shift, 0);
          const img = this.logo;
          if (img && vd) {
            ctx.globalAlpha = 0.85;
            ctx.drawImage(img, -vd.logoW / 2, -vd.logoH / 2, vd.logoW, vd.logoH);
          }
          ctx.restore();
          ctx.fillStyle = `rgba(180, 130, 255, ${0.15 + rand() * 0.2})`;
          ctx.fillRect(-w / 2, by, w, bh);
        }
      }
    }

    // Shockwave
    if (t > 1.85) {
      const rt = (t - 1.85) / 0.9;
      if (rt < 1) {
        const maxRad = Math.hypot(w, h) * 0.6;
        const rad = rt * maxRad;
        ctx.strokeStyle = `rgba(190, 140, 255, ${(1 - rt) * 0.9})`;
        ctx.lineWidth = 2 + (1 - rt) * 10;
        ctx.beginPath(); ctx.arc(0, 0, rad, 0, Math.PI * 2); ctx.stroke();
        ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - rt) * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(0, 0, rad * 0.9, 0, Math.PI * 2); ctx.stroke();
      }
    }

    // Clean logo reveal
    const img = this.logo;
    if (img && vd && revealClean > 0) {
      const flicker = idleT > 0 ? (0.94 + 0.06 * Math.sin(t * 30 + Math.sin(t * 3) * 4)) : 1;
      ctx.save();
      ctx.globalAlpha = revealClean * flicker;
      ctx.shadowColor = 'rgba(170, 110, 255, 0.9)';
      ctx.shadowBlur = 45;
      ctx.drawImage(img, -vd.logoW / 2, -vd.logoH / 2, vd.logoW, vd.logoH);
      ctx.restore();
    }

    if (impactFlash > 0.01) {
      ctx.restore();
      ctx.fillStyle = `rgba(230, 210, 255, ${impactFlash * 0.55})`;
      ctx.fillRect(0, 0, w, h);
      ctx.save();
      ctx.translate(w / 2, h / 2);
    }

    ctx.restore();

    // Hologram scanlines
    ctx.save();
    const scanIntensity = 0.06 + idleT * 0.08;
    for (let y = 0; y < h; y += 3) {
      ctx.fillStyle = `rgba(180, 140, 255, ${scanIntensity * 0.35})`;
      ctx.fillRect(0, y, w, 1);
    }
    const sy = (t * 320) % (h + 100) - 50;
    const grd = ctx.createLinearGradient(0, sy - 40, 0, sy + 40);
    grd.addColorStop(0, 'rgba(180, 130, 255, 0)');
    grd.addColorStop(0.5, `rgba(210, 170, 255, ${0.12 + idleT * 0.1})`);
    grd.addColorStop(1, 'rgba(180, 130, 255, 0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, sy - 40, w, 80);
    ctx.restore();

    // expose progress for UI (loop badge etc.)
    if (this._onFrame) this._onFrame(t / DURATION);
  }
}

window.PlazionIntro = PlazionIntro;
window.__plazionAudio = { getAudioCtx };
