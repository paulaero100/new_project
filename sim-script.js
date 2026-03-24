/* ═══════════════════════════════════════════════════════════════════
   CHAOS & CURIOSITY — Interactive Simulation Engine
   Ported from Python (chaos_curiosity_ep1.py) to JavaScript
   ═══════════════════════════════════════════════════════════════════ */

// ── GLOBALS ─────────────────────────────────────────────────────
const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');
const panel = document.getElementById('controlsPanel');
const simLabel = document.getElementById('simLabel');
const fpsDisplay = document.getElementById('fpsDisplay');

let currentSim = 'pendulum';
let animId = null;
let paused = false;
let lastFrameTime = performance.now();
let frameCount = 0;
let fpsTimer = 0;

// ── RESIZE ──────────────────────────────────────────────────────
function resizeCanvas() {
  const rect = canvas.parentElement.getBoundingClientRect();
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  canvas._w = rect.width;
  canvas._h = rect.height;
}
window.addEventListener('resize', resizeCanvas);

// ── COLORS ──────────────────────────────────────────────────────
const C = {
  bg: '#04030d',
  gold: '#d4a843',
  goldLight: '#f0d080',
  cyan: '#4fc3f7',
  cyanLight: '#80e0ff',
  white: '#ddd8c4',
  grey: '#888880',
  greyDim: '#555550',
  red: '#e05555',
  purple: '#9b59b6',
};


// ═══════════════════════════════════════════════════════════════════
//  DOUBLE PENDULUM SIMULATION
// ═══════════════════════════════════════════════════════════════════
const pendulum = {
  G: 9.81,
  L1: 1.0,
  L2: 1.0,
  m1: 1.0,
  m2: 1.0,
  state: [Math.PI * 0.9, 0, Math.PI * 0.6, 0],
  trail: [],
  maxTrail: 600,
  showTrail: true,

  reset() {
    const t1 = parseFloat(document.getElementById('p_theta1')?.value || 162);
    const t2 = parseFloat(document.getElementById('p_theta2')?.value || 108);
    this.G = parseFloat(document.getElementById('p_gravity')?.value || 9.81);
    this.L1 = parseFloat(document.getElementById('p_L1')?.value || 1.0);
    this.L2 = parseFloat(document.getElementById('p_L2')?.value || 1.0);
    this.state = [t1 * Math.PI / 180, 0, t2 * Math.PI / 180, 0];
    this.trail = [];
  },

  derivs(s) {
    const [t1, w1, t2, w2] = s;
    const { G, L1, L2, m1, m2 } = this;
    const d = t1 - t2;
    const den = 2 * m1 + m2 - m2 * Math.cos(2 * d);

    const a1 = (-G * (2 * m1 + m2) * Math.sin(t1)
      - m2 * G * Math.sin(t1 - 2 * t2)
      - 2 * Math.sin(d) * m2 * (w2 * w2 * L2 + w1 * w1 * L1 * Math.cos(d)))
      / (L1 * den);

    const a2 = (2 * Math.sin(d) * (w1 * w1 * L1 * (m1 + m2)
      + G * (m1 + m2) * Math.cos(t1)
      + w2 * w2 * L2 * m2 * Math.cos(d)))
      / (L2 * den);

    return [w1, a1, w2, a2];
  },

  rk4(s, dt) {
    const k1 = this.derivs(s);
    const s2 = s.map((v, i) => v + 0.5 * dt * k1[i]);
    const k2 = this.derivs(s2);
    const s3 = s.map((v, i) => v + 0.5 * dt * k2[i]);
    const k3 = this.derivs(s3);
    const s4 = s.map((v, i) => v + dt * k3[i]);
    const k4 = this.derivs(s4);
    return s.map((v, i) => v + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  },

  step() {
    const dt = 1 / 60;
    const sub = 10;
    const sdt = dt / sub;
    for (let i = 0; i < sub; i++) {
      this.state = this.rk4(this.state, sdt);
    }
  },

  draw() {
    const w = canvas._w, h = canvas._h;
    const scale = Math.min(w, h) * 0.2;
    const cx = w / 2, cy = h * 0.35;
    const [t1, , t2] = this.state;

    const x1 = cx + this.L1 * scale * Math.sin(t1);
    const y1 = cy + this.L1 * scale * Math.cos(t1);
    const x2 = x1 + this.L2 * scale * Math.sin(t2);
    const y2 = y1 + this.L2 * scale * Math.cos(t2);

    // background
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);

    // grid
    this.drawGrid(w, h, cx, cy);

    // trail
    if (this.showTrail) {
      this.trail.push({ x: x2, y: y2 });
      if (this.trail.length > this.maxTrail) this.trail.shift();
      if (this.trail.length > 1) {
        for (let i = 1; i < this.trail.length; i++) {
          const alpha = (i / this.trail.length) * 0.8;
          ctx.beginPath();
          ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y);
          ctx.lineTo(this.trail[i].x, this.trail[i].y);
          ctx.strokeStyle = `rgba(212, 168, 67, ${alpha})`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      }
    }

    // rods
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = 'rgba(221, 216, 196, 0.5)';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = 'rgba(221, 216, 196, 0.4)';
    ctx.lineWidth = 3;
    ctx.stroke();

    // pivot
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(221, 216, 196, 0.6)';
    ctx.fill();

    // joint
    ctx.beginPath();
    ctx.arc(x1, y1, 7, 0, Math.PI * 2);
    ctx.fillStyle = C.white;
    ctx.globalAlpha = 0.6;
    ctx.fill();
    ctx.globalAlpha = 1;

    // bob with glow
    this.drawBob(x2, y2, 12, C.gold);

    // energy display
    this.drawEnergy(w, h);
  },

  drawGrid(w, h, cx, cy) {
    ctx.strokeStyle = 'rgba(255,255,255,0.02)';
    ctx.lineWidth = 1;
    const step = 50;
    for (let x = cx % step; x < w; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = cy % step; y < h; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }
  },

  drawBob(x, y, r, color) {
    // glow
    const grd = ctx.createRadialGradient(x, y, r * 0.2, x, y, r * 2.5);
    grd.addColorStop(0, color + '60');
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(x, y, r * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    // body
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    grad.addColorStop(0, C.goldLight);
    grad.addColorStop(1, C.gold);
    ctx.fillStyle = grad;
    ctx.fill();
  },

  drawEnergy(w, h) {
    const [t1, w1, t2, w2] = this.state;
    const { G, L1, L2, m1, m2 } = this;

    const KE = 0.5 * m1 * (L1 * w1) ** 2
      + 0.5 * m2 * ((L1 * w1) ** 2 + (L2 * w2) ** 2 + 2 * L1 * L2 * w1 * w2 * Math.cos(t1 - t2));
    const PE = -(m1 + m2) * G * L1 * Math.cos(t1) - m2 * G * L2 * Math.cos(t2);
    const TE = KE + PE;

    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    const x = w - 15;
    const y = h - 55;

    ctx.fillStyle = C.greyDim;
    ctx.fillText(`KE  = ${KE.toFixed(2)} J`, x, y);
    ctx.fillStyle = C.cyan + '99';
    ctx.fillText(`PE  = ${PE.toFixed(2)} J`, x, y + 16);
    ctx.fillStyle = C.gold + '99';
    ctx.fillText(`Total = ${TE.toFixed(2)} J`, x, y + 32);
  }
};


// ═══════════════════════════════════════════════════════════════════
//  LORENZ ATTRACTOR SIMULATION
// ═══════════════════════════════════════════════════════════════════
const lorenz = {
  sigma: 10,
  rho: 28,
  beta: 8 / 3,
  state: [1, 1, 1],
  trail: [],
  maxTrail: 3000,
  rotAngle: 0,
  autoRotate: true,
  scale: 8,

  reset() {
    this.sigma = parseFloat(document.getElementById('l_sigma')?.value || 10);
    this.rho = parseFloat(document.getElementById('l_rho')?.value || 28);
    this.beta = parseFloat(document.getElementById('l_beta')?.value || 2.667);
    this.state = [1 + Math.random() * 0.1, 1, 1];
    this.trail = [];
    this.rotAngle = 0;
  },

  step() {
    const dt = 0.005;
    const sub = 6;
    for (let i = 0; i < sub; i++) {
      const [x, y, z] = this.state;
      const dx = this.sigma * (y - x);
      const dy = x * (this.rho - z) - y;
      const dz = x * y - this.beta * z;
      this.state = [x + dx * dt, y + dy * dt, z + dz * dt];
    }
    this.trail.push([...this.state]);
    if (this.trail.length > this.maxTrail) this.trail.shift();
  },

  project(x, y, z) {
    const angle = this.rotAngle;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = x * cos - y * sin;
    const ry = x * sin * 0.3 + y * cos * 0.3 + z * 0.7;
    return { x: rx, y: -ry };
  },

  draw() {
    const w = canvas._w, h = canvas._h;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);

    if (this.autoRotate) this.rotAngle += 0.003;

    const cx = w / 2, cy = h / 2;
    const s = this.scale;

    // draw trail with gradient color
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const t = i / this.trail.length;
        const p1 = this.project(...this.trail[i - 1]);
        const p2 = this.project(...this.trail[i]);

        // color based on z-value
        const z = this.trail[i][2];
        const zNorm = Math.min(1, Math.max(0, z / 50));

        const r = Math.round(79 + (212 - 79) * zNorm);
        const g = Math.round(195 + (168 - 195) * zNorm);
        const b = Math.round(247 + (67 - 247) * zNorm);

        ctx.beginPath();
        ctx.moveTo(cx + p1.x * s, cy + p1.y * s);
        ctx.lineTo(cx + p2.x * s, cy + p2.y * s);
        ctx.strokeStyle = `rgba(${r},${g},${b}, ${t * 0.85})`;
        ctx.lineWidth = 1 + t * 1;
        ctx.stroke();
      }
    }

    // current point glow
    if (this.trail.length > 0) {
      const cur = this.project(...this.state);
      const px = cx + cur.x * s;
      const py = cy + cur.y * s;

      const grd = ctx.createRadialGradient(px, py, 2, px, py, 20);
      grd.addColorStop(0, C.gold + 'aa');
      grd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(px, py, 20, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fillStyle = C.goldLight;
      ctx.fill();
    }

    // axes hints
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = C.greyDim;
    ctx.textAlign = 'right';
    ctx.fillText(`σ=${this.sigma}  ρ=${this.rho}  β=${this.beta.toFixed(2)}`, w - 15, h - 15);
  }
};


// ═══════════════════════════════════════════════════════════════════
//  CHAOS COMPARISON SIMULATION
// ═══════════════════════════════════════════════════════════════════
const chaos = {
  G: 9.81,
  L: 1.0,
  stateA: [Math.PI * 0.9, 0, Math.PI * 0.6, 0],
  stateB: [Math.PI * 0.9 + 0.005, 0, Math.PI * 0.6, 0],
  trailA: [],
  trailB: [],
  maxTrail: 500,
  delta: 0.005,
  time: 0,
  divergence: [],

  reset() {
    const t1 = parseFloat(document.getElementById('c_theta1')?.value || 162);
    const delta = parseFloat(document.getElementById('c_delta')?.value || 0.005);
    this.delta = delta;
    this.G = parseFloat(document.getElementById('c_gravity')?.value || 9.81);
    this.stateA = [t1 * Math.PI / 180, 0, Math.PI * 0.6, 0];
    this.stateB = [(t1 + delta) * Math.PI / 180, 0, Math.PI * 0.6, 0];
    this.trailA = [];
    this.trailB = [];
    this.time = 0;
    this.divergence = [];
  },

  derivs(s) {
    const [t1, w1, t2, w2] = s;
    const d = t1 - t2;
    const D = 2 - Math.cos(d) ** 2;
    const a1 = (-2 * this.G * Math.sin(t1) - this.G * Math.sin(t1 - 2 * t2)
      - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) / (this.L * D);
    const a2 = (2 * Math.sin(d) * (2 * w1 * w1 + 2 * this.G * Math.cos(t1)
      + w2 * w2 * Math.cos(d))) / (this.L * D);
    return [w1, a1, w2, a2];
  },

  rk4(s, dt) {
    const k1 = this.derivs(s);
    const s2 = s.map((v, i) => v + 0.5 * dt * k1[i]);
    const k2 = this.derivs(s2);
    const s3 = s.map((v, i) => v + 0.5 * dt * k2[i]);
    const k3 = this.derivs(s3);
    const s4 = s.map((v, i) => v + dt * k3[i]);
    const k4 = this.derivs(s4);
    return s.map((v, i) => v + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  },

  step() {
    const dt = 1 / 60;
    const sub = 10;
    const sdt = dt / sub;
    for (let i = 0; i < sub; i++) {
      this.stateA = this.rk4(this.stateA, sdt);
      this.stateB = this.rk4(this.stateB, sdt);
    }
    this.time += dt;

    // track divergence
    const dTheta = Math.abs(this.stateA[0] - this.stateB[0]);
    this.divergence.push({ t: this.time, d: dTheta });
    if (this.divergence.length > 600) this.divergence.shift();
  },

  draw() {
    const w = canvas._w, h = canvas._h;
    const halfW = w / 2;
    const scale = Math.min(halfW, h) * 0.2;

    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);

    // divider line
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, h * 0.65);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // labels
    ctx.font = 'bold 11px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = C.gold;
    ctx.fillText('PENDULUM A', halfW * 0.5, 25);
    ctx.fillStyle = C.cyan;
    ctx.fillText('PENDULUM B', halfW * 1.5, 25);
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = C.greyDim;
    ctx.fillText(`θ₁ = ${(this.stateA[0] * 180 / Math.PI).toFixed(1)}°`, halfW * 0.5, 42);
    ctx.fillText(`θ₁ = ${(this.stateB[0] * 180 / Math.PI).toFixed(1)}°`, halfW * 1.5, 42);

    // draw both pendulums
    this.drawPendulumSide(this.stateA, this.trailA, halfW * 0.5, h * 0.3, scale, C.gold, 0.85);
    this.drawPendulumSide(this.stateB, this.trailB, halfW * 1.5, h * 0.3, scale, C.cyan, 0.85);

    // divergence plot
    this.drawDivergencePlot(w, h);

    // time
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = C.greyDim;
    ctx.fillText(`t = ${this.time.toFixed(1)}s  |  Δθ₀ = ${this.delta.toFixed(4)}°`, w - 15, h - 10);
  },

  drawPendulumSide(state, trail, cx, cy, scale, color, alpha) {
    const [t1, , t2] = state;
    const x1 = cx + this.L * scale * Math.sin(t1);
    const y1 = cy + this.L * scale * Math.cos(t1);
    const x2 = x1 + this.L * scale * Math.sin(t2);
    const y2 = y1 + this.L * scale * Math.cos(t2);

    trail.push({ x: x2, y: y2 });
    if (trail.length > this.maxTrail) trail.shift();

    // trail
    if (trail.length > 1) {
      for (let i = 1; i < trail.length; i++) {
        const a = (i / trail.length) * alpha * 0.6;
        ctx.beginPath();
        ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
        ctx.lineTo(trail[i].x, trail[i].y);
        ctx.strokeStyle = color.replace(')', `, ${a})`).replace('rgb', 'rgba').replace('#', '');
        // use hex->rgba
        ctx.strokeStyle = hexToRgba(color, a);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }

    // rods
    ctx.beginPath();
    ctx.moveTo(cx, cy); ctx.lineTo(x1, y1);
    ctx.strokeStyle = `rgba(221,216,196,${alpha * 0.4})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
    ctx.strokeStyle = `rgba(221,216,196,${alpha * 0.3})`;
    ctx.lineWidth = 2;
    ctx.stroke();

    // pivot
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(221,216,196,0.4)`;
    ctx.fill();

    // joint
    ctx.beginPath();
    ctx.arc(x1, y1, 4, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(221,216,196,0.5)`;
    ctx.fill();

    // bob
    const grd = ctx.createRadialGradient(x2, y2, 2, x2, y2, 18);
    grd.addColorStop(0, hexToRgba(color, 0.4));
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.arc(x2, y2, 18, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x2, y2, 8, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.globalAlpha = alpha;
    ctx.fill();
    ctx.globalAlpha = 1;
  },

  drawDivergencePlot(w, h) {
    if (this.divergence.length < 2) return;

    const plotX = 40;
    const plotY = h * 0.7;
    const plotW = w - 80;
    const plotH = h * 0.25;

    // background
    ctx.fillStyle = 'rgba(10, 9, 24, 0.7)';
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(plotX - 10, plotY - 10, plotW + 20, plotH + 30, 8);
    ctx.fill();
    ctx.stroke();

    // title
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillStyle = C.red;
    ctx.textAlign = 'left';
    ctx.fillText('DIVERGENCE |Δθ₁|', plotX, plotY - 15);

    // axes
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(plotX, plotY);
    ctx.lineTo(plotX, plotY + plotH);
    ctx.lineTo(plotX + plotW, plotY + plotH);
    ctx.stroke();

    // find max for scaling
    let maxD = 0.01;
    for (const p of this.divergence) maxD = Math.max(maxD, p.d);
    maxD = Math.max(maxD, 0.1);

    // plot
    ctx.beginPath();
    for (let i = 0; i < this.divergence.length; i++) {
      const px = plotX + (i / this.divergence.length) * plotW;
      const py = plotY + plotH - (Math.min(this.divergence[i].d, maxD) / maxD) * plotH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = C.red;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // labels
    ctx.font = '9px "JetBrains Mono", monospace';
    ctx.fillStyle = C.greyDim;
    ctx.textAlign = 'left';
    ctx.fillText(maxD.toFixed(3) + ' rad', plotX + 5, plotY + 10);
    ctx.fillText('0', plotX + 5, plotY + plotH - 3);
    ctx.textAlign = 'right';
    ctx.fillText('time →', plotX + plotW, plotY + plotH + 15);
  }
};


// ── HELPER ──────────────────────────────────────────────────────
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}


// ═══════════════════════════════════════════════════════════════════
//  REACTION-DIFFUSION SIMULATION (Gray-Scott Model)
// ═══════════════════════════════════════════════════════════════════
const diffusion = {
  N: 200,
  dA: 0.16,
  dB: 0.08,
  f: 0.035,
  k: 0.065,
  speed: 8,       // steps per frame
  A: null,
  B: null,
  imageData: null,
  // Colormap LUT (256 entries) — dark → purple → gold → bright
  colorLUT: null,
  mouseDown: false,
  mouseX: -1,
  mouseY: -1,

  buildColorLUT() {
    this.colorLUT = new Uint8Array(256 * 3);
    // Stops: 0:#04030d  0.25:#1a0a2a  0.5:#4a1a6a  0.75:#d4a843  1.0:#fff8e0
    const stops = [
      [0.00, 4, 3, 13],
      [0.25, 26, 10, 42],
      [0.50, 74, 26, 106],
      [0.75, 212, 168, 67],
      [1.00, 255, 248, 224],
    ];
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      let s0 = stops[0], s1 = stops[1];
      for (let s = 0; s < stops.length - 1; s++) {
        if (t >= stops[s][0] && t <= stops[s + 1][0]) {
          s0 = stops[s]; s1 = stops[s + 1]; break;
        }
      }
      const local = (t - s0[0]) / (s1[0] - s0[0]);
      this.colorLUT[i * 3]     = Math.round(s0[1] + (s1[1] - s0[1]) * local);
      this.colorLUT[i * 3 + 1] = Math.round(s0[2] + (s1[2] - s0[2]) * local);
      this.colorLUT[i * 3 + 2] = Math.round(s0[3] + (s1[3] - s0[3]) * local);
    }
  },

  initGrid() {
    const N = this.N;
    const len = N * N;
    this.A = new Float32Array(len);
    this.B = new Float32Array(len);
    this.A.fill(1.0);
    // Seed center region
    const r = Math.floor(N / 8);
    const cx = Math.floor(N / 2);
    const cy = Math.floor(N / 2);
    for (let y = cy - r; y < cy + r; y++) {
      for (let x = cx - r; x < cx + r; x++) {
        const idx = y * N + x;
        this.A[idx] = 0.50 + (Math.random() - 0.5) * 0.2;
        this.B[idx] = 0.25 + (Math.random() - 0.5) * 0.2;
      }
    }
    // Also seed a few random small spots
    for (let s = 0; s < 5; s++) {
      const sx = Math.floor(Math.random() * (N - 20)) + 10;
      const sy = Math.floor(Math.random() * (N - 20)) + 10;
      const sr = 3 + Math.floor(Math.random() * 4);
      for (let dy = -sr; dy <= sr; dy++) {
        for (let dx = -sr; dx <= sr; dx++) {
          if (dx * dx + dy * dy <= sr * sr) {
            const idx = (sy + dy) * N + (sx + dx);
            if (idx >= 0 && idx < len) {
              this.A[idx] = 0.50 + (Math.random() - 0.5) * 0.2;
              this.B[idx] = 0.25 + (Math.random() - 0.5) * 0.2;
            }
          }
        }
      }
    }
  },

  reset() {
    this.dA = parseFloat(document.getElementById('rd_dA')?.value || 0.16);
    this.dB = parseFloat(document.getElementById('rd_dB')?.value || 0.08);
    this.f  = parseFloat(document.getElementById('rd_f')?.value || 0.035);
    this.k  = parseFloat(document.getElementById('rd_k')?.value || 0.065);
    this.speed = parseInt(document.getElementById('rd_speed')?.value || 8);
    if (!this.colorLUT) this.buildColorLUT();
    this.initGrid();
  },

  seedAt(gridX, gridY, radius) {
    const N = this.N;
    const r = radius || 5;
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx * dx + dy * dy <= r * r) {
          const x = (gridX + dx + N) % N;
          const y = (gridY + dy + N) % N;
          const idx = y * N + x;
          this.A[idx] = 0.50 + (Math.random() - 0.5) * 0.1;
          this.B[idx] = 0.25 + (Math.random() - 0.5) * 0.1;
        }
      }
    }
  },

  step() {
    const N = this.N;
    const { dA, dB, f, k, A, B } = this;
    const newA = new Float32Array(A.length);
    const newB = new Float32Array(B.length);

    for (let steps = 0; steps < this.speed; steps++) {
      const srcA = steps === 0 ? A : newA;
      const srcB = steps === 0 ? B : newB;
      const dstA = (steps === this.speed - 1) ? this.A : newA;
      const dstB = (steps === this.speed - 1) ? this.B : newB;

      for (let y = 0; y < N; y++) {
        const yN = y * N;
        const yUp = ((y - 1 + N) % N) * N;
        const yDn = ((y + 1) % N) * N;
        for (let x = 0; x < N; x++) {
          const idx = yN + x;
          const xL = (x - 1 + N) % N;
          const xR = (x + 1) % N;

          const a = srcA[idx];
          const b = srcB[idx];

          // Discrete Laplacian (5-point stencil)
          const lapA = srcA[yUp + x] + srcA[yDn + x] + srcA[yN + xL] + srcA[yN + xR] - 4 * a;
          const lapB = srcB[yUp + x] + srcB[yDn + x] + srcB[yN + xL] + srcB[yN + xR] - 4 * b;

          const abb = a * b * b;
          dstA[idx] = a + dA * lapA - abb + f * (1 - a);
          dstB[idx] = b + dB * lapB + abb - (f + k) * b;
        }
      }

      // If not last step, copy dst back to src for next iteration
      if (steps < this.speed - 1) {
        this.A.set(newA);
        this.B.set(newB);
      }
    }

    // Handle mouse seeding
    if (this.mouseDown && this.mouseX >= 0) {
      this.seedAt(this.mouseX, this.mouseY, 5);
    }
  },

  draw() {
    const w = canvas._w, h = canvas._h;
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, w, h);

    const N = this.N;
    // Determine display size (square, centered)
    const displaySize = Math.min(w * 0.85, h * 0.85);
    const ox = (w - displaySize) / 2;
    const oy = (h - displaySize) / 2;

    // Create ImageData at grid resolution, then draw scaled
    if (!this.imageData || this.imageData.width !== N) {
      this.imageData = ctx.createImageData(N, N);
    }
    const data = this.imageData.data;
    const lut = this.colorLUT;

    for (let i = 0; i < N * N; i++) {
      const val = Math.min(1, Math.max(0, this.B[i])) * 2.5; // scale for visibility
      const ci = Math.min(255, Math.floor(Math.min(1, val) * 255));
      const i4 = i * 4;
      data[i4]     = lut[ci * 3];
      data[i4 + 1] = lut[ci * 3 + 1];
      data[i4 + 2] = lut[ci * 3 + 2];
      data[i4 + 3] = 255;
    }

    // Draw to offscreen canvas at grid resolution, then scale up
    if (!this._offCanvas) {
      this._offCanvas = document.createElement('canvas');
      this._offCtx = this._offCanvas.getContext('2d');
    }
    this._offCanvas.width = N;
    this._offCanvas.height = N;
    this._offCtx.putImageData(this.imageData, 0, 0);

    // Scale up with smooth interpolation
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this._offCanvas, ox, oy, displaySize, displaySize);

    // Border glow
    ctx.strokeStyle = 'rgba(212, 168, 67, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(ox, oy, displaySize, displaySize);

    // Corner decorations
    const cornerLen = 15;
    ctx.strokeStyle = C.gold;
    ctx.lineWidth = 2;
    // top-left
    ctx.beginPath(); ctx.moveTo(ox, oy + cornerLen); ctx.lineTo(ox, oy); ctx.lineTo(ox + cornerLen, oy); ctx.stroke();
    // top-right
    ctx.beginPath(); ctx.moveTo(ox + displaySize - cornerLen, oy); ctx.lineTo(ox + displaySize, oy); ctx.lineTo(ox + displaySize, oy + cornerLen); ctx.stroke();
    // bottom-left
    ctx.beginPath(); ctx.moveTo(ox, oy + displaySize - cornerLen); ctx.lineTo(ox, oy + displaySize); ctx.lineTo(ox + cornerLen, oy + displaySize); ctx.stroke();
    // bottom-right
    ctx.beginPath(); ctx.moveTo(ox + displaySize - cornerLen, oy + displaySize); ctx.lineTo(ox + displaySize, oy + displaySize); ctx.lineTo(ox + displaySize, oy + displaySize - cornerLen); ctx.stroke();

    // Info text
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = C.greyDim;
    ctx.fillText(`f=${this.f.toFixed(4)}  k=${this.k.toFixed(4)}  dA=${this.dA.toFixed(2)}  dB=${this.dB.toFixed(2)}`, w - 15, h - 15);
    ctx.fillText(`Grid: ${N}×${N}  |  ${this.speed} steps/frame`, w - 15, h - 30);

    // Store display mapping for mouse interaction
    this._displayOx = ox;
    this._displayOy = oy;
    this._displaySize = displaySize;
  },

  handleMouseDown(e) {
    if (currentSim !== 'diffusion') return;
    this.mouseDown = true;
    this.updateMousePos(e);
  },

  handleMouseMove(e) {
    if (currentSim !== 'diffusion' || !this.mouseDown) return;
    this.updateMousePos(e);
  },

  handleMouseUp() {
    this.mouseDown = false;
    this.mouseX = -1;
    this.mouseY = -1;
  },

  updateMousePos(e) {
    const rect = canvas.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    const ox = this._displayOx || 0;
    const oy = this._displayOy || 0;
    const size = this._displaySize || 1;
    const gx = Math.floor((px - ox) / size * this.N);
    const gy = Math.floor((py - oy) / size * this.N);
    if (gx >= 0 && gx < this.N && gy >= 0 && gy < this.N) {
      this.mouseX = gx;
      this.mouseY = gy;
    } else {
      this.mouseX = -1;
      this.mouseY = -1;
    }
  },

  bindMouseEvents() {
    canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('mouseup', () => this.handleMouseUp());
    canvas.addEventListener('mouseleave', () => this.handleMouseUp());
  }
};

// Preset loader for diffusion
function loadPreset(name) {
  const presets = {
    spots:     { f: 0.035, k: 0.065, dA: 0.16, dB: 0.08 },
    stripes:   { f: 0.030, k: 0.055, dA: 0.16, dB: 0.08 },
    labyrinth: { f: 0.025, k: 0.050, dA: 0.20, dB: 0.10 },
    chaos:     { f: 0.055, k: 0.062, dA: 0.16, dB: 0.08 },
  };
  const p = presets[name];
  if (!p) return;
  diffusion.f = p.f; diffusion.k = p.k; diffusion.dA = p.dA; diffusion.dB = p.dB;
  // Update sliders
  const sF = document.getElementById('rd_f'); if (sF) sF.value = p.f;
  const sK = document.getElementById('rd_k'); if (sK) sK.value = p.k;
  const sDA = document.getElementById('rd_dA'); if (sDA) sDA.value = p.dA;
  const sDB = document.getElementById('rd_dB'); if (sDB) sDB.value = p.dB;
  updateVal('v_rd_f', p.f.toFixed(4));
  updateVal('v_rd_k', p.k.toFixed(4));
  updateVal('v_rd_dA', p.dA.toFixed(2));
  updateVal('v_rd_dB', p.dB.toFixed(2));
  // Update active preset button
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.preset-btn[data-preset="${name}"]`)?.classList.add('active');
  diffusion.initGrid();
}


// ═══════════════════════════════════════════════════════════════════
//  CONTROLS RENDERING
// ═══════════════════════════════════════════════════════════════════
function renderControls(sim) {
  const configs = {
    pendulum: `
      <div class="controls-section">
        <div class="controls-section-title">⚙ Playback</div>
        <div class="btn-group">
          <button class="ctrl-btn active" id="playBtn" onclick="togglePause()">⏸ Pause</button>
          <button class="ctrl-btn danger" onclick="resetSim()">↺ Reset</button>
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">📐 Initial Conditions</div>
        <div class="control-group">
          <div class="control-label"><span>θ₁ (angle 1)</span><span class="value" id="v_theta1">162°</span></div>
          <input type="range" id="p_theta1" min="0" max="360" value="162" step="1" oninput="updateVal('v_theta1', this.value+'°')">
        </div>
        <div class="control-group">
          <div class="control-label"><span>θ₂ (angle 2)</span><span class="value" id="v_theta2">108°</span></div>
          <input type="range" id="p_theta2" min="0" max="360" value="108" step="1" oninput="updateVal('v_theta2', this.value+'°')">
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">🔧 Parameters</div>
        <div class="control-group">
          <div class="control-label"><span>Gravity (g)</span><span class="value" id="v_gravity">9.81</span></div>
          <input type="range" id="p_gravity" min="1" max="25" value="9.81" step="0.1" oninput="updateVal('v_gravity', parseFloat(this.value).toFixed(1))">
        </div>
        <div class="control-group">
          <div class="control-label"><span>Rod 1 Length</span><span class="value" id="v_L1">1.0</span></div>
          <input type="range" id="p_L1" min="0.3" max="2.0" value="1.0" step="0.1" oninput="updateVal('v_L1', parseFloat(this.value).toFixed(1))">
        </div>
        <div class="control-group">
          <div class="control-label"><span>Rod 2 Length</span><span class="value" id="v_L2">1.0</span></div>
          <input type="range" id="p_L2" min="0.3" max="2.0" value="1.0" step="0.1" oninput="updateVal('v_L2', parseFloat(this.value).toFixed(1))">
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">📝 Equation</div>
        <div class="equation-display">
          <div class="eq-line"><span class="highlight">θ̈₁</span> = f(θ₁, θ₂, θ̇₁, θ̇₂, g, m, L)</div>
          <div class="eq-line">Method: <span class="cyan">4th order Runge-Kutta</span></div>
          <div class="eq-line">Substeps: <span class="cyan">10</span> per frame</div>
        </div>
      </div>
    `,
    lorenz: `
      <div class="controls-section">
        <div class="controls-section-title">⚙ Playback</div>
        <div class="btn-group">
          <button class="ctrl-btn active" id="playBtn" onclick="togglePause()">⏸ Pause</button>
          <button class="ctrl-btn danger" onclick="resetSim()">↺ Reset</button>
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">🦋 Lorenz Parameters</div>
        <div class="control-group">
          <div class="control-label"><span>σ (sigma)</span><span class="value" id="v_sigma">10</span></div>
          <input type="range" id="l_sigma" min="1" max="30" value="10" step="0.5" oninput="updateVal('v_sigma', parseFloat(this.value).toFixed(1)); lorenz.sigma=parseFloat(this.value);">
        </div>
        <div class="control-group">
          <div class="control-label"><span>ρ (rho)</span><span class="value" id="v_rho">28</span></div>
          <input type="range" id="l_rho" min="0" max="50" value="28" step="0.5" oninput="updateVal('v_rho', parseFloat(this.value).toFixed(1)); lorenz.rho=parseFloat(this.value);">
        </div>
        <div class="control-group">
          <div class="control-label"><span>β (beta)</span><span class="value" id="v_beta">2.67</span></div>
          <input type="range" id="l_beta" min="0.1" max="8" value="2.667" step="0.01" oninput="updateVal('v_beta', parseFloat(this.value).toFixed(2)); lorenz.beta=parseFloat(this.value);">
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">🔧 View</div>
        <div class="control-group">
          <div class="control-label"><span>Zoom</span><span class="value" id="v_zoom">8</span></div>
          <input type="range" id="l_zoom" min="3" max="15" value="8" step="0.5" oninput="updateVal('v_zoom', this.value); lorenz.scale=parseFloat(this.value);">
        </div>
        <div class="btn-group" style="margin-top:0.5rem">
          <button class="ctrl-btn active" id="rotateBtn" onclick="lorenz.autoRotate=!lorenz.autoRotate; this.classList.toggle('active')">🔄 Auto Rotate</button>
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">📝 System</div>
        <div class="equation-display">
          <div class="eq-line"><span class="highlight">dx/dt</span> = σ(y − x)</div>
          <div class="eq-line"><span class="highlight">dy/dt</span> = x(ρ − z) − y</div>
          <div class="eq-line"><span class="highlight">dz/dt</span> = xy − βz</div>
          <div class="eq-line" style="margin-top:0.4rem;color:var(--cyan)">→ Strange Attractor</div>
        </div>
      </div>
    `,
    chaos: `
      <div class="controls-section">
        <div class="controls-section-title">⚙ Playback</div>
        <div class="btn-group">
          <button class="ctrl-btn active" id="playBtn" onclick="togglePause()">⏸ Pause</button>
          <button class="ctrl-btn danger" onclick="resetSim()">↺ Reset</button>
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">⚡ Initial Conditions</div>
        <div class="control-group">
          <div class="control-label"><span>θ₁ (base angle)</span><span class="value" id="v_c_theta1">162°</span></div>
          <input type="range" id="c_theta1" min="30" max="350" value="162" step="1" oninput="updateVal('v_c_theta1', this.value+'°')">
        </div>
        <div class="control-group">
          <div class="control-label"><span>Δθ (perturbation)</span><span class="value" id="v_c_delta">0.005°</span></div>
          <input type="range" id="c_delta" min="0.001" max="2" value="0.005" step="0.001" oninput="updateVal('v_c_delta', parseFloat(this.value).toFixed(3)+'°')">
        </div>
        <div class="control-group">
          <div class="control-label"><span>Gravity</span><span class="value" id="v_c_gravity">9.81</span></div>
          <input type="range" id="c_gravity" min="1" max="25" value="9.81" step="0.1" oninput="updateVal('v_c_gravity', parseFloat(this.value).toFixed(1))">
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">🔍 Legend</div>
        <div class="legend">
          <div class="legend-item">
            <span class="legend-dot" style="background:var(--gold)"></span>
            Pendulum A (θ₁ = base)
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background:var(--cyan)"></span>
            Pendulum B (θ₁ = base + Δθ)
          </div>
          <div class="legend-item">
            <span class="legend-dot" style="background:var(--red)"></span>
            Divergence |Δθ₁(t)|
          </div>
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">📝 Chaos Principle</div>
        <div class="equation-display">
          <div class="eq-line"><span class="highlight">Sensitivity to</span></div>
          <div class="eq-line"><span class="highlight">initial conditions</span></div>
          <div class="eq-line" style="margin-top:0.3rem">Divergence ~ <span class="cyan">e<sup>λt</sup></span></div>
          <div class="eq-line">where <span class="cyan">λ > 0</span> (Lyapunov)</div>
        </div>
      </div>
    `,
    diffusion: `
      <div class="controls-section">
        <div class="controls-section-title">⚙ Playback</div>
        <div class="btn-group">
          <button class="ctrl-btn active" id="playBtn" onclick="togglePause()">⏸ Pause</button>
          <button class="ctrl-btn danger" onclick="resetSim()">↺ Reset</button>
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">🎨 Presets</div>
        <div class="btn-group" style="flex-wrap:wrap">
          <button class="ctrl-btn preset-btn active" data-preset="spots" onclick="loadPreset('spots')">🐆 Spots</button>
          <button class="ctrl-btn preset-btn" data-preset="stripes" onclick="loadPreset('stripes')">🦓 Stripes</button>
          <button class="ctrl-btn preset-btn" data-preset="labyrinth" onclick="loadPreset('labyrinth')">🧠 Labyrinth</button>
          <button class="ctrl-btn preset-btn" data-preset="chaos" onclick="loadPreset('chaos')">🌀 Chaos</button>
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">🧪 Gray-Scott Parameters</div>
        <div class="control-group">
          <div class="control-label"><span>Feed rate (f)</span><span class="value" id="v_rd_f">0.0350</span></div>
          <input type="range" id="rd_f" min="0.01" max="0.08" value="0.035" step="0.001" oninput="updateVal('v_rd_f', parseFloat(this.value).toFixed(4)); diffusion.f=parseFloat(this.value);">
        </div>
        <div class="control-group">
          <div class="control-label"><span>Kill rate (k)</span><span class="value" id="v_rd_k">0.0650</span></div>
          <input type="range" id="rd_k" min="0.03" max="0.08" value="0.065" step="0.001" oninput="updateVal('v_rd_k', parseFloat(this.value).toFixed(4)); diffusion.k=parseFloat(this.value);">
        </div>
        <div class="control-group">
          <div class="control-label"><span>D_A (activator diff.)</span><span class="value" id="v_rd_dA">0.16</span></div>
          <input type="range" id="rd_dA" min="0.05" max="0.30" value="0.16" step="0.01" oninput="updateVal('v_rd_dA', parseFloat(this.value).toFixed(2)); diffusion.dA=parseFloat(this.value);">
        </div>
        <div class="control-group">
          <div class="control-label"><span>D_B (inhibitor diff.)</span><span class="value" id="v_rd_dB">0.08</span></div>
          <input type="range" id="rd_dB" min="0.02" max="0.20" value="0.08" step="0.01" oninput="updateVal('v_rd_dB', parseFloat(this.value).toFixed(2)); diffusion.dB=parseFloat(this.value);">
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">⚡ Performance</div>
        <div class="control-group">
          <div class="control-label"><span>Steps per frame</span><span class="value" id="v_rd_speed">8</span></div>
          <input type="range" id="rd_speed" min="1" max="20" value="8" step="1" oninput="updateVal('v_rd_speed', this.value); diffusion.speed=parseInt(this.value);">
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">🖱️ Interaction</div>
        <div class="equation-display">
          <div class="eq-line"><span class="highlight">Click & drag</span> on the canvas</div>
          <div class="eq-line">to seed new chemical B</div>
        </div>
      </div>
      <div class="controls-section">
        <div class="controls-section-title">📝 Equations</div>
        <div class="equation-display">
          <div class="eq-line"><span class="highlight">∂A/∂t</span> = D_A∇²A − AB² + f(1−A)</div>
          <div class="eq-line"><span class="highlight">∂B/∂t</span> = D_B∇²B + AB² − (f+k)B</div>
          <div class="eq-line" style="margin-top:0.4rem;color:var(--cyan)">→ Gray-Scott (Turing 1952)</div>
        </div>
      </div>
    `
  };

  panel.innerHTML = configs[sim] || '';
}


// ── INTERACTIONS ────────────────────────────────────────────────
function updateVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function togglePause() {
  paused = !paused;
  const btn = document.getElementById('playBtn');
  if (btn) {
    btn.textContent = paused ? '▶ Play' : '⏸ Pause';
    btn.classList.toggle('active', !paused);
  }
}

function resetSim() {
  paused = false;
  const btn = document.getElementById('playBtn');
  if (btn) { btn.textContent = '⏸ Pause'; btn.classList.add('active'); }

  if (currentSim === 'pendulum') pendulum.reset();
  else if (currentSim === 'lorenz') lorenz.reset();
  else if (currentSim === 'chaos') chaos.reset();
  else if (currentSim === 'diffusion') diffusion.reset();
}

function switchSim(sim) {
  currentSim = sim;
  paused = false;

  // update tabs
  document.querySelectorAll('.sim-tab').forEach(t => t.classList.remove('active'));
  document.querySelector(`.sim-tab[data-sim="${sim}"]`)?.classList.add('active');

  // update label
  const labels = { pendulum: 'DOUBLE PENDULUM', lorenz: 'LORENZ ATTRACTOR', chaos: 'CHAOS COMPARISON', diffusion: 'REACTION DIFFUSION' };
  simLabel.textContent = labels[sim];

  renderControls(sim);
  resetSim();
}


// ── MAIN LOOP ───────────────────────────────────────────────────
function mainLoop(timestamp) {
  // FPS counter
  frameCount++;
  fpsTimer += timestamp - lastFrameTime;
  lastFrameTime = timestamp;
  if (fpsTimer >= 1000) {
    fpsDisplay.textContent = `${frameCount} FPS`;
    frameCount = 0;
    fpsTimer = 0;
  }

  if (!paused) {
    if (currentSim === 'pendulum') { pendulum.step(); pendulum.draw(); }
    else if (currentSim === 'lorenz') { lorenz.step(); lorenz.draw(); }
    else if (currentSim === 'chaos') { chaos.step(); chaos.draw(); }
    else if (currentSim === 'diffusion') { diffusion.step(); diffusion.draw(); }
  }

  animId = requestAnimationFrame(mainLoop);
}


// ── TAB EVENTS ──────────────────────────────────────────────────
document.querySelectorAll('.sim-tab').forEach(tab => {
  tab.addEventListener('click', () => switchSim(tab.dataset.sim));
});


// ── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  resizeCanvas();
  diffusion.buildColorLUT();
  diffusion.bindMouseEvents();
  switchSim('pendulum');
  mainLoop(performance.now());
});
