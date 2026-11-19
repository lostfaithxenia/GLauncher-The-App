// 60fps Animated Profile Card Effect Engine (Canvas 2D)
// Renders real particle & motion effects over Discord-style Profile Cards

export class ProfileEffectCanvas {
  constructor(hostEl) {
    this.host = hostEl;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'profile-fx-canvas';
    this.ctx = this.canvas.getContext('2d');
    this.imgOverlay = document.createElement('img');
    this.imgOverlay.className = 'profile-fx-img hidden';
    this.imgOverlay.alt = '';

    this.host.innerHTML = '';
    this.host.appendChild(this.canvas);
    this.host.appendChild(this.imgOverlay);

    this.effectId = 'none';
    this.particles = [];
    this.rafId = null;
    this.t = 0;
    this.lastTs = 0;
    this.boltTimer = 0;
    this.activeBolt = null;
  }

  setEffect(effectId) {
    const next = String(effectId || 'none');
    if (next === this.effectId) return;
    this.effectId = next;
    this.particles = [];
    this.activeBolt = null;

    if (next === 'none') {
      this.stop();
      this.imgOverlay.classList.add('hidden');
      this.canvas.classList.add('hidden');
      return;
    }

    if (next.startsWith('url:')) {
      this.stop();
      this.canvas.classList.add('hidden');
      this.imgOverlay.src = next.slice(4);
      this.imgOverlay.classList.remove('hidden');
      return;
    }

    this.imgOverlay.classList.add('hidden');
    this.canvas.classList.remove('hidden');
    this.seedParticles();
    this.start();
  }

  resize() {
    const rect = this.host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  seedParticles() {
    const id = this.effectId;
    const count =
      id === 'sakura' ? 22 :
      id === 'hydro' ? 18 :
      id === 'ember' ? 32 :
      id === 'cosmic' ? 42 :
      id === 'hearts' ? 16 :
      id === 'toxic' ? 20 :
      id === 'gold' ? 28 :
      id === 'comet' ? 7 :
      id === 'matrix' ? 26 : 18;

    this.particles = Array.from({ length: count }, (_, i) => ({
      x: Math.random(),
      y: Math.random(),
      vx: (Math.random() - 0.5) * 0.14,
      vy: 0.08 + Math.random() * 0.22,
      size: 4 + Math.random() * 14,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 2.2,
      phase: Math.random() * Math.PI * 2,
      hue: (i * 29) % 360
    }));
  }

  start() {
    if (this.rafId) return;
    this.lastTs = performance.now();
    const loop = (now) => {
      this.rafId = requestAnimationFrame(loop);
      if (document.hidden || this.host.offsetParent === null) return;
      const dt = Math.min(0.05, (now - this.lastTs) / 1000);
      this.lastTs = now;
      this.t += dt;
      this.resize();
      this.draw(dt);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.ctx?.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  draw(dt) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    const id = this.effectId;
    if (id === 'hydro') {
      for (const p of this.particles) {
        p.y -= p.vy * dt * 0.45;
        p.x += Math.sin(this.t * 1.6 + p.phase) * 0.04 * dt;
        if (p.y < -0.1) { p.y = 1.1; p.x = Math.random(); }
        const px = p.x * w;
        const py = p.y * h;
        const r = p.size * 0.9;
        const g = ctx.createRadialGradient(px - r * 0.3, py - r * 0.3, 1, px, py, r);
        g.addColorStop(0, 'rgba(224, 242, 254, 0.92)');
        g.addColorStop(0.45, 'rgba(56, 189, 248, 0.55)');
        g.addColorStop(1, 'rgba(2, 132, 199, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(px, py, r, r * 1.25, Math.sin(this.t + p.phase) * 0.35, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'sakura') {
      for (const p of this.particles) {
        p.y += p.vy * dt * 0.55;
        p.x += Math.sin(this.t * 1.4 + p.phase) * 0.08 * dt;
        p.rot += p.vrot * dt;
        if (p.y > 1.08) { p.y = -0.08; p.x = Math.random(); }
        ctx.save();
        ctx.translate(p.x * w, p.y * h);
        ctx.rotate(p.rot);
        ctx.fillStyle = 'rgba(251, 207, 232, 0.85)';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.55, p.size * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(244, 114, 182, 0.65)';
        ctx.beginPath();
        ctx.ellipse(2, 1, p.size * 0.35, p.size * 0.18, 0.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    } else if (id === 'ember') {
      for (const p of this.particles) {
        p.y -= p.vy * dt * 0.9;
        p.x += Math.sin(this.t * 2.5 + p.phase) * 0.09 * dt;
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        const px = p.x * w;
        const py = p.y * h;
        const r = Math.max(1.8, p.size * 0.28);
        const alpha = Math.max(0, Math.min(1, p.y * 1.2));
        const g = ctx.createRadialGradient(px, py, 0.5, px, py, r * 2.5);
        g.addColorStop(0, `rgba(254, 240, 138, ${alpha})`);
        g.addColorStop(0.5, `rgba(249, 115, 22, ${alpha * 0.8})`);
        g.addColorStop(1, 'rgba(239, 68, 68, 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r * 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'cosmic') {
      const cx = w * 0.5;
      const cy = h * 0.36;
      const neb = ctx.createRadialGradient(cx, cy, 8, cx, cy, w * 0.65);
      neb.addColorStop(0, 'rgba(192, 132, 252, 0.32)');
      neb.addColorStop(0.5, 'rgba(236, 72, 153, 0.14)');
      neb.addColorStop(1, 'transparent');
      ctx.fillStyle = neb;
      ctx.fillRect(0, 0, w, h);

      for (const p of this.particles) {
        p.rot += dt * (0.25 + (p.size % 3) * 0.12);
        const rad = (0.08 + p.x * 0.48) * Math.min(w, h);
        const px = cx + Math.cos(p.rot + p.phase) * rad;
        const py = cy + Math.sin(p.rot + p.phase) * rad * 0.72;
        const tw = 0.4 + 0.6 * Math.sin(this.t * 3 + p.phase);
        ctx.fillStyle = `rgba(245, 208, 254, ${tw})`;
        ctx.beginPath();
        ctx.arc(px, py, Math.max(1, p.size * 0.15), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'lightning') {
      this.boltTimer -= dt;
      if (this.boltTimer <= 0) {
        this.boltTimer = 1.2 + Math.random() * 1.8;
        const pts = [];
        let bx = (0.2 + Math.random() * 0.6) * w;
        let by = 0;
        pts.push([bx, by]);
        while (by < h) {
          by += 24 + Math.random() * 30;
          bx += (Math.random() - 0.5) * 44;
          pts.push([bx, by]);
        }
        this.activeBolt = { pts, life: 0.35 };
      }
      if (this.activeBolt) {
        this.activeBolt.life -= dt;
        const a = Math.max(0, this.activeBolt.life / 0.35);
        ctx.save();
        ctx.strokeStyle = `rgba(125, 211, 252, ${a})`;
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 16;
        ctx.lineWidth = 3;
        ctx.beginPath();
        this.activeBolt.pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 255, 255, ${a})`;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
        if (this.activeBolt.life <= 0) this.activeBolt = null;
      }
    } else if (id === 'hearts') {
      for (const p of this.particles) {
        p.y -= p.vy * dt * 0.5;
        p.x += Math.sin(this.t * 1.8 + p.phase) * 0.05 * dt;
        if (p.y < -0.1) { p.y = 1.1; p.x = Math.random(); }
        const s = p.size * 0.55;
        ctx.save();
        ctx.translate(p.x * w, p.y * h);
        ctx.fillStyle = `rgba(244, 114, 182, ${0.45 + 0.35 * Math.sin(this.t * 2 + p.phase)})`;
        ctx.beginPath();
        ctx.moveTo(0, s * 0.35);
        ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.5, -s * 1.1, 0, -s * 0.4);
        ctx.bezierCurveTo(s * 0.5, -s * 1.1, s, -s * 0.4, 0, s * 0.35);
        ctx.fill();
        ctx.restore();
      }
    } else if (id === 'toxic') {
      for (const p of this.particles) {
        p.y -= p.vy * dt * 0.5;
        if (p.y < -0.1) { p.y = 1.1; p.x = Math.random(); }
        const px = p.x * w;
        const py = p.y * h;
        const r = p.size * 1.1;
        const g = ctx.createRadialGradient(px, py, 1, px, py, r);
        g.addColorStop(0, 'rgba(134, 239, 172, 0.75)');
        g.addColorStop(0.5, 'rgba(34, 197, 94, 0.35)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (id === 'crystal') {
      // Rotating wireframe crystal + 4-point sparkles (like reference screenshot 5)
      const cx = w * 0.5;
      const cy = h * 0.56;
      const rx = 44;
      const ry = 66;
      const spin = this.t * 0.7;
      ctx.save();
      ctx.strokeStyle = 'rgba(253, 224, 71, 0.32)';
      ctx.lineWidth = 1.4;
      const top = [cx, cy - ry];
      const bot = [cx, cy + ry];
      const ring = [0, 1, 2, 3].map((k) => {
        const ang = spin + (k * Math.PI) / 2;
        return [cx + Math.cos(ang) * rx, cy + Math.sin(ang) * 14];
      });
      ring.forEach((pt, idx) => {
        const nxt = ring[(idx + 1) % 4];
        ctx.beginPath();
        ctx.moveTo(...top); ctx.lineTo(...pt); ctx.lineTo(...bot);
        ctx.moveTo(...pt); ctx.lineTo(...nxt);
        ctx.stroke();
      });
      for (const p of this.particles.slice(0, 12)) {
        const a = 0.25 + 0.75 * Math.abs(Math.sin(this.t * 2.2 + p.phase));
        const sx = p.x * w;
        const sy = p.y * h;
        const r = 4 + (p.size % 5);
        ctx.fillStyle = `rgba(255, 255, 255, ${a})`;
        ctx.beginPath();
        ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.25, sy - r * 0.25);
        ctx.lineTo(sx + r, sy); ctx.lineTo(sx + r * 0.25, sy + r * 0.25);
        ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.25, sy + r * 0.25);
        ctx.lineTo(sx - r, sy); ctx.lineTo(sx - r * 0.25, sy - r * 0.25);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (id === 'comet') {
      for (const p of this.particles) {
        p.x += dt * 0.45;
        p.y += dt * 0.35;
        if (p.x > 1.2 || p.y > 1.2) {
          p.x = -0.15 + Math.random() * 0.7;
          p.y = -0.15;
        }
        const x1 = p.x * w;
        const y1 = p.y * h;
        const g = ctx.createLinearGradient(x1, y1, x1 - 46, y1 - 34);
        g.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        g.addColorStop(0.35, 'rgba(52, 211, 153, 0.7)');
        g.addColorStop(1, 'transparent');
        ctx.strokeStyle = g;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x1 - 46, y1 - 34);
        ctx.stroke();
      }
    } else if (id === 'aurora') {
      for (let i = 0; i < 3; i++) {
        const y0 = h * (0.22 + i * 0.22);
        const g = ctx.createLinearGradient(0, y0 - 40, w, y0 + 40);
        g.addColorStop(0, 'transparent');
        g.addColorStop(0.35, i === 0 ? 'rgba(45, 212, 191, 0.32)' : i === 1 ? 'rgba(56, 189, 248, 0.28)' : 'rgba(168, 85, 247, 0.28)');
        g.addColorStop(1, 'transparent');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 20) {
          ctx.lineTo(x, y0 + Math.sin(x * 0.02 + this.t * (1.1 + i * 0.3) + i) * 24);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
    } else if (id === 'gold') {
      for (const p of this.particles) {
        p.y -= p.vy * dt * 0.35;
        if (p.y < -0.05) { p.y = 1.05; p.x = Math.random(); }
        const a = 0.3 + 0.7 * Math.abs(Math.sin(this.t * 2.5 + p.phase));
        const sx = p.x * w;
        const sy = p.y * h;
        const r = 3 + (p.size % 4);
        ctx.fillStyle = `rgba(250, 204, 21, ${a})`;
        ctx.beginPath();
        ctx.moveTo(sx, sy - r); ctx.lineTo(sx + r * 0.5, sy);
        ctx.lineTo(sx, sy + r); ctx.lineTo(sx - r * 0.5, sy);
        ctx.closePath();
        ctx.fill();
      }
    } else if (id === 'matrix') {
      ctx.font = 'bold 12px monospace';
      for (const p of this.particles) {
        p.y += p.vy * dt * 1.1;
        if (p.y > 1.05) { p.y = -0.05; p.x = Math.random(); }
        ctx.fillStyle = `rgba(52, 211, 153, ${0.4 + 0.5 * Math.sin(this.t * 3 + p.phase)})`;
        const ch = String.fromCharCode(0x30A0 + ((Math.floor(this.t * 8 + p.hue)) % 64));
        ctx.fillText(ch, p.x * w, p.y * h);
      }
    }
  }
}
