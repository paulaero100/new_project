/* ═══════════════════════════════════════════════════════════════════
   CHAOS & CURIOSITY — Main Page Interactivity
   ═══════════════════════════════════════════════════════════════════ */

// ── PARTICLE SYSTEM (Hero Background) ───────────────────────────
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.mouse = { x: -1000, y: -1000 };
    this.symbols = ['∫', 'Σ', 'θ', '∂', 'π', 'λ', '∞', 'Δ', 'ψ', 'Ω', 'φ', '∇', 'ε', 'μ'];
    this.resize();
    this.init();
    this.bindEvents();
  }

  resize() {
    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.w = this.canvas.offsetWidth;
    this.h = this.canvas.offsetHeight;
  }

  init() {
    const count = Math.min(80, Math.floor(this.w * this.h / 12000));
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.w,
        y: Math.random() * this.h,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        size: Math.random() * 2 + 0.5,
        symbol: this.symbols[Math.floor(Math.random() * this.symbols.length)],
        isSymbol: Math.random() > 0.65,
        alpha: Math.random() * 0.4 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      });
    }
  }

  bindEvents() {
    window.addEventListener('resize', () => { this.resize(); this.init(); });
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });
  }

  update() {
    for (const p of this.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.pulse += 0.02;

      // wrap around
      if (p.x < -20) p.x = this.w + 20;
      if (p.x > this.w + 20) p.x = -20;
      if (p.y < -20) p.y = this.h + 20;
      if (p.y > this.h + 20) p.y = -20;

      // mouse interaction
      const dx = p.x - this.mouse.x;
      const dy = p.y - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 150) {
        const force = (150 - dist) / 150 * 0.02;
        p.vx += dx / dist * force;
        p.vy += dy / dist * force;
      }

      // damping
      p.vx *= 0.999;
      p.vy *= 0.999;
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.w, this.h);

    // connection lines
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const a = this.particles[i];
        const b = this.particles[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 120) {
          const alpha = (1 - dist / 120) * 0.08;
          this.ctx.beginPath();
          this.ctx.moveTo(a.x, a.y);
          this.ctx.lineTo(b.x, b.y);
          this.ctx.strokeStyle = `rgba(212, 168, 67, ${alpha})`;
          this.ctx.lineWidth = 0.5;
          this.ctx.stroke();
        }
      }
    }

    // particles
    for (const p of this.particles) {
      const a = p.alpha + Math.sin(p.pulse) * 0.15;
      if (p.isSymbol) {
        this.ctx.font = `${p.size * 8}px 'JetBrains Mono', monospace`;
        this.ctx.fillStyle = `rgba(79, 195, 247, ${a * 0.6})`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText(p.symbol, p.x, p.y);
      } else {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fillStyle = `rgba(212, 168, 67, ${a})`;
        this.ctx.fill();
      }
    }
  }

  animate() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}


// ── MINI PENDULUM (Lab Preview) ─────────────────────────────────
class MiniPendulum {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize();
    this.L = 0.35; // normalized length
    this.G = 9.81;
    // State: [θ1, ω1, θ2, ω2]
    this.stateA = [Math.PI * 0.9, 0, Math.PI * 0.6, 0];
    this.stateB = [Math.PI * 0.9 + 0.005, 0, Math.PI * 0.6, 0];
    this.trailA = [];
    this.trailB = [];
    this.maxTrail = 300;
    this.time = 0;
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.w = this.canvas.offsetWidth;
    this.h = this.canvas.offsetHeight;
    this.cx = this.w / 2;
    this.cy = this.h * 0.3;
    this.scale = Math.min(this.w, this.h) * 0.28;
  }

  derivs(s) {
    const [t1, w1, t2, w2] = s;
    const d = t1 - t2;
    const D = 2 - Math.cos(d) ** 2;
    const a1 = (-2 * this.G * Math.sin(t1) - this.G * Math.sin(t1 - 2 * t2)
      - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) / D;
    const a2 = (2 * Math.sin(d) * (2 * w1 * w1 + 2 * this.G * Math.cos(t1)
      + w2 * w2 * Math.cos(d))) / D;
    return [w1, a1, w2, a2];
  }

  rk4(s, dt) {
    const k1 = this.derivs(s);
    const s2 = s.map((v, i) => v + 0.5 * dt * k1[i]);
    const k2 = this.derivs(s2);
    const s3 = s.map((v, i) => v + 0.5 * dt * k2[i]);
    const k3 = this.derivs(s3);
    const s4 = s.map((v, i) => v + dt * k3[i]);
    const k4 = this.derivs(s4);
    return s.map((v, i) => v + dt * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) / 6);
  }

  step() {
    const dt = 1 / 60;
    const sub = 8;
    const sdt = dt / sub;
    for (let i = 0; i < sub; i++) {
      this.stateA = this.rk4(this.stateA, sdt);
      this.stateB = this.rk4(this.stateB, sdt);
    }
    this.time += dt;
  }

  getPositions(state) {
    const [t1, , t2] = state;
    const x1 = this.cx + this.scale * Math.sin(t1);
    const y1 = this.cy + this.scale * Math.cos(t1);
    const x2 = x1 + this.scale * Math.sin(t2);
    const y2 = y1 + this.scale * Math.cos(t2);
    return { x1, y1, x2, y2 };
  }

  draw() {
    this.ctx.clearRect(0, 0, this.w, this.h);

    const posA = this.getPositions(this.stateA);
    const posB = this.getPositions(this.stateB);

    this.trailA.push({ x: posA.x2, y: posA.y2 });
    this.trailB.push({ x: posB.x2, y: posB.y2 });
    if (this.trailA.length > this.maxTrail) { this.trailA.shift(); this.trailB.shift(); }

    // draw trails
    this.drawTrail(this.trailA, '#d4a843', 0.7);
    this.drawTrail(this.trailB, '#4fc3f7', 0.5);

    // draw pendulum A
    this.drawPendulum(posA, '#d4a843', 0.8);
    // draw pendulum B
    this.drawPendulum(posB, '#4fc3f7', 0.5);

    // pivot
    this.ctx.beginPath();
    this.ctx.arc(this.cx, this.cy, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(221, 216, 196, 0.5)';
    this.ctx.fill();
  }

  drawTrail(trail, color, alpha) {
    if (trail.length < 2) return;
    this.ctx.beginPath();
    this.ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) {
      this.ctx.lineTo(trail[i].x, trail[i].y);
    }
    this.ctx.strokeStyle = color;
    this.ctx.globalAlpha = alpha;
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;
  }

  drawPendulum(pos, color, alpha) {
    // rods
    this.ctx.beginPath();
    this.ctx.moveTo(this.cx, this.cy);
    this.ctx.lineTo(pos.x1, pos.y1);
    this.ctx.lineTo(pos.x2, pos.y2);
    this.ctx.strokeStyle = `rgba(221, 216, 196, ${alpha * 0.3})`;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();

    // joint
    this.ctx.beginPath();
    this.ctx.arc(pos.x1, pos.y1, 3, 0, Math.PI * 2);
    this.ctx.fillStyle = `rgba(221, 216, 196, ${alpha * 0.5})`;
    this.ctx.fill();

    // bob
    this.ctx.beginPath();
    this.ctx.arc(pos.x2, pos.y2, 6, 0, Math.PI * 2);
    this.ctx.fillStyle = color;
    this.ctx.globalAlpha = alpha;
    this.ctx.fill();
    this.ctx.globalAlpha = 1;

    // glow
    this.ctx.beginPath();
    this.ctx.arc(pos.x2, pos.y2, 12, 0, Math.PI * 2);
    const glow = this.ctx.createRadialGradient(pos.x2, pos.y2, 3, pos.x2, pos.y2, 12);
    glow.addColorStop(0, color.replace(')', ', 0.3)').replace('rgb', 'rgba'));
    glow.addColorStop(1, 'transparent');
    this.ctx.fillStyle = glow;
    this.ctx.fill();
  }

  animate() {
    this.step();
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}


// ── SCROLL REVEAL ───────────────────────────────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}


// ── NAVBAR SCROLL ───────────────────────────────────────────────
function initNavbar() {
  const navbar = document.getElementById('navbar');
  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;
    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScroll = currentScroll;
  });

  // hamburger
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
  });

  // close menu on link click
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      navLinks.classList.remove('open');
    });
  });
}


// ── FLOATING EQUATIONS (decorative background) ──────────────────
function spawnFloatingEquations() {
  const equations = [
    'F = ma', 'E = mc²', '∇·B = 0', 'ΔS ≥ 0', 'i ℏ ∂ψ/∂t',
    'λ > 0', 'dx/dt = σ(y−x)', '∂²u/∂t²', 'Σ F = 0', 'ω = dθ/dt'
  ];

  function spawn() {
    const eq = document.createElement('div');
    eq.className = 'floating-eq';
    eq.textContent = equations[Math.floor(Math.random() * equations.length)];
    eq.style.left = `${Math.random() * 100}%`;
    eq.style.animationDuration = `${15 + Math.random() * 20}s`;
    eq.style.fontSize = `${0.8 + Math.random() * 0.6}rem`;
    document.body.appendChild(eq);

    setTimeout(() => eq.remove(), 35000);
  }

  setInterval(spawn, 4000);
  // spawn a few immediately
  for (let i = 0; i < 3; i++) setTimeout(spawn, i * 800);
}


// ── SMOOTH ANCHOR SCROLL ────────────────────────────────────────
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}


// ── INIT ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Hero particle system
  const heroCanvas = document.getElementById('heroCanvas');
  if (heroCanvas) {
    const ps = new ParticleSystem(heroCanvas);
    ps.animate();
  }

  // Lab preview pendulum
  const labCanvas = document.getElementById('labPreviewCanvas');
  if (labCanvas) {
    const mp = new MiniPendulum(labCanvas);
    mp.animate();
  }

  initScrollReveal();
  initNavbar();
  initSmoothScroll();
  spawnFloatingEquations();
});
