import { ReactBitsShaderBackdrop } from './vendor/reactbits-shaders.js';
import { RealWave, COMPLEX_EXTRA_DEFAULTS, setIntroBg } from './vendor/maxmb/wavegl.js';
import { OriginalWave } from './vendor/maxmb/ps3wave/original.js';

export const XMB_BG_COLORS = {
  auto: { label: 'Original (Month)', mode: 'auto' },
  blue: { label: 'Blue', top: [0, 6, 74], bot: [50, 78, 179], wave: [111, 135, 217], dot: [205, 216, 255], angle: 97, curve: 0.65, span: 1 },
  'royal-blue': { label: 'Royal Blue', top: [28, 44, 148], bot: [50, 84, 238], wave: [109, 140, 253], dot: [196, 208, 255], angle: 97, curve: 0.8, span: 1 },
  purple: { label: 'Purple', top: [57, 0, 73], bot: [155, 22, 159], wave: [197, 96, 208], dot: [240, 200, 244], angle: 97, curve: 0.65, span: 1 },
  red: { label: 'Red', top: [89, 0, 0], bot: [232, 38, 63], wave: [254, 135, 152], dot: [255, 208, 216], angle: 97, curve: 0.6, span: 1 },
  pink: { label: 'Pink', top: [88, 18, 46], bot: [222, 110, 129], wave: [255, 182, 198], dot: [255, 224, 232], angle: 97, curve: 0.65, span: 1 },
  orange: { label: 'Orange', top: [76, 39, 0], bot: [154, 102, 21], wave: [184, 143, 77], dot: [240, 220, 176], angle: 97, curve: 0.65, span: 1 },
  olive: { label: 'Olive', top: [105, 106, 18], bot: [157, 163, 43], wave: [196, 199, 94], dot: [232, 234, 180], angle: 97, curve: 0.7, span: 1 },
  green: { label: 'Green', top: [0, 66, 0], bot: [34, 162, 10], wave: [98, 197, 83], dot: [196, 240, 188], angle: 97, curve: 0.6, span: 1 },
  turquoise: { label: 'Turquoise', top: [0, 91, 73], bot: [44, 164, 146], wave: [92, 194, 177], dot: [196, 236, 230], angle: 97, curve: 0.7, span: 1 },
  brown: { label: 'Brown', top: [23, 7, 0], bot: [112, 79, 65], wave: [159, 136, 111], dot: [232, 220, 204], angle: 97, curve: 0.55, span: 1 },
  silver: { label: 'Silver', top: [104, 104, 104], bot: [152, 152, 152], wave: [178, 178, 178], dot: [238, 238, 238], angle: 97, curve: 0.65, span: 1 },
  black: { label: 'Black', top: [24, 24, 24], bot: [0, 0, 0], wave: [103, 103, 103], dot: [216, 216, 216], angle: 270, curve: 2, span: 0.35 }
};

function applyXmbWaveColor(wave, colorId) {
  if (!wave) return;
  const key = String(colorId || 'auto');
  if (key.startsWith('month:')) {
    const m = Number.parseInt(key.slice(6), 10);
    if (Number.isFinite(m) && m >= 0 && m <= 11) {
      wave.setMonthMode(true);
      wave.setThemeMonth(m);
      wave.setBaseColor(null, true);
      wave.setWaveColor(null);
      wave.setDotColor(null);
      wave._lpDirty = true;
      return;
    }
  }
  const preset = XMB_BG_COLORS[key];
  if (!preset || preset.mode === 'auto') {
    wave.setMonthMode(true);
    wave.setThemeMonth(null);
    wave.setBaseColor(null, true);
    wave.setWaveColor(null);
    wave.setDotColor(null);
    wave._lpDirty = true;
    return;
  }

  wave.setMonthMode(false);
  wave.setThemeMonth(null);
  wave.setBaseColor({ r: preset.bot[0], g: preset.bot[1], b: preset.bot[2] }, false);
  wave.autoColor = true;
  wave.settings.gradientPreset = 0;
  wave.settings.bgTopR = preset.top[0];
  wave.settings.bgTopG = preset.top[1];
  wave.settings.bgTopB = preset.top[2];
  wave.settings.bgBotR = preset.bot[0];
  wave.settings.bgBotG = preset.bot[1];
  wave.settings.bgBotB = preset.bot[2];
  wave.settings.bgAngle = preset.angle ?? COMPLEX_EXTRA_DEFAULTS.bgAngle;
  wave.settings.bgCurve = preset.curve ?? COMPLEX_EXTRA_DEFAULTS.bgCurve;
  wave.settings.bgSpan = preset.span ?? 1;
  wave.setWaveColor({ r: preset.wave[0], g: preset.wave[1], b: preset.wave[2] });
  wave.setDotColor({ r: preset.dot[0], g: preset.dot[1], b: preset.dot[2] });
  wave._lpDirty = true;
}

export class BackdropRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = 'aurora';
    this.accent = '#38bdf8';
    this.quality = 'high';
    this.running = false;
    this.rafId = null;
    this.time = 0;
    this.lastTs = 0;
    this.hasWallpaper = false;
    this.xmbBgColor = 'auto';
    this.xmbWaveStyle = 'original'; // 'original' (lines.qrc) or 'complex' (linkev RealWave)

    // WebGL2 canvas for React Bits Silk / Iridescence shaders
    this.shaderCanvas = document.createElement('canvas');
    this.shaderCanvas.className = 'backdrop-canvas hidden';
    this.shaderCanvas.style.pointerEvents = 'none';
    this.canvas.parentElement.insertBefore(this.shaderCanvas, this.canvas);
    this.reactBits = new ReactBitsShaderBackdrop(this.shaderCanvas);

    // Authentic PS3 Firmware lines.qrc OriginalWave + MaXMB RealWave fallback
    this.xmbWaveCanvas = null;
    this.maxmbWave = null;
    this._initWaveEngine('original');

    window.addEventListener(
      'pointermove',
      (e) => {
        if (this.reactBits) {
          const nx = e.clientX / Math.max(1, window.innerWidth);
          const ny = 1 - e.clientY / Math.max(1, window.innerHeight);
          this.reactBits.setMouse(nx, ny);
        }
        if (this.maxmbWave && !this.maxmbWave.failed && this.mode === 'xmb-wave') {
          const mx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 0.14;
          const my = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 0.08;
          this.maxmbWave.setMotion(mx, my);
        }
      },
      { passive: true }
    );

    this.stars = Array.from({ length: 90 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: 0.2 + Math.random() * 0.8,
      r: 0.6 + Math.random() * 1.4
    }));

    this.xmbMotes = Array.from({ length: 42 }, () => ({
      x: Math.random(),
      y: 0.25 + Math.random() * 0.55,
      vx: 0.012 + Math.random() * 0.025,
      phase: Math.random() * Math.PI * 2,
      r: 1.0 + Math.random() * 2.2
    }));

    this.resize();
  }

  _createFreshWaveCanvas() {
    const oldCanvas = this.xmbWaveCanvas;
    const c = document.createElement('canvas');
    c.className = 'backdrop-canvas' + (this.mode === 'xmb-wave' && !this.hasWallpaper ? '' : ' hidden');
    c.style.pointerEvents = 'none';
    if (this.canvas) {
      c.width = this.canvas.width || window.innerWidth;
      c.height = this.canvas.height || window.innerHeight;
    }
    this.canvas.parentElement.insertBefore(c, this.canvas);
    if (oldCanvas && oldCanvas.parentElement) {
      oldCanvas.parentElement.removeChild(oldCanvas);
    }
    this.xmbWaveCanvas = c;
    return c;
  }

  _initWaveEngine(style = 'original') {
    this.xmbWaveStyle = style;
    if (this.maxmbWave) {
      try {
        if (typeof this.maxmbWave.destroy === 'function') this.maxmbWave.destroy();
        else if (typeof this.maxmbWave.stop === 'function') this.maxmbWave.stop();
      } catch (_) {}
      this.maxmbWave = null;
    }

    const c = this._createFreshWaveCanvas();

    if (style === 'original') {
      try {
        const orig = new OriginalWave(c);
        this.maxmbWave = orig;
        orig.setMonthMode(true);
        orig.setBaseColor(null, true);
        orig.setWaveColor(null);
        orig.setDotColor(null);
        orig.setWavesEnabled(true);
        orig.setDotsEnabled(true);
        applyXmbWaveColor(orig, this.xmbBgColor || 'auto');

        orig.onFail = () => {
          if (this.maxmbWave === orig) {
            this._initWaveEngine('complex');
          }
        };
        orig.ready
          ?.then(() => {
            if (this.maxmbWave !== orig) return;
            applyXmbWaveColor(orig, this.xmbBgColor || 'auto');
            if (!document.body.classList.contains('intro-run')) {
              setIntroBg(1);
            }
            if (this.mode === 'xmb-wave' && !this.hasWallpaper) {
              this.xmbWaveCanvas.classList.remove('hidden');
              orig.setHidden(false);
              orig._lpDirty = true;
              if (this.running) orig.start();
              this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }
          })
          .catch(() => {
            if (this.maxmbWave === orig) {
              this._initWaveEngine('complex');
            }
          });
        return;
      } catch (_) {
        // Fall through to RealWave
      }
    }

    const rw = new RealWave(c, { style: 'complex' });
    this.maxmbWave = rw;
    if (rw?.ok) {
      rw.setMonthMode(true);
      rw.setBaseColor(null, true);
      rw.setWaveColor(null);
      rw.setDotColor(null);
      rw.setWavesEnabled(true);
      rw.setDotsEnabled(true);
      rw.setHidden?.(false);
      applyXmbWaveColor(rw, this.xmbBgColor || 'auto');
      rw.resize?.();
      rw._lpDirty = true;
      if (!document.body.classList.contains('intro-run')) {
        setIntroBg(1);
      }
      if (this.mode === 'xmb-wave' && !this.hasWallpaper) {
        this.xmbWaveCanvas.classList.remove('hidden');
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.running) rw.start();
      }
    } else {
      rw.failed = true;
      this.xmbWaveCanvas.classList.add('hidden');
    }
  }

  setConfig({ mode, accent, quality, hasWallpaper, xmbBgColor, xmbWaveStyle }) {
    if (mode) this.mode = mode;
    if (accent) this.accent = accent;
    if (quality) this.quality = quality;
    if (hasWallpaper !== undefined) this.hasWallpaper = Boolean(hasWallpaper);
    if (xmbBgColor !== undefined) this.xmbBgColor = xmbBgColor;
    if (xmbWaveStyle && xmbWaveStyle !== this.xmbWaveStyle) {
      this._initWaveEngine(xmbWaveStyle);
    }

    // When a custom wallpaper (MP4/Image) is active in PS3 XMB, remove the original wave completely
    if (this.mode === 'xmb-wave' && this.hasWallpaper) {
      this.xmbWaveCanvas.classList.add('hidden');
      if (this.maxmbWave?.running) this.maxmbWave.stop();
      this.shaderCanvas.classList.add('hidden');
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    const waveAvailable = this.maxmbWave && !this.maxmbWave.failed;
    const useMaxmbWave = this.mode === 'xmb-wave' && Boolean(waveAvailable);
    if (useMaxmbWave) {
      if (!document.body.classList.contains('intro-run')) {
        setIntroBg(1);
      }
      this.xmbWaveCanvas.classList.remove('hidden');
      this.shaderCanvas.classList.add('hidden');
      if (this.maxmbWave.ok) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      this.maxmbWave.setHidden?.(false);
      this.maxmbWave.setWallpaper(false);
      applyXmbWaveColor(this.maxmbWave, this.xmbBgColor || 'auto');
      this.maxmbWave.setLowPower(this.quality === 'performance' ? 2 : 0);
      this.maxmbWave.setStill(false);
      this.maxmbWave._lpDirty = true;
      if (this.running) this.maxmbWave.start();
      return;
    }

    this.xmbWaveCanvas.classList.add('hidden');
    if (this.maxmbWave?.running) this.maxmbWave.stop();

    const isShader =
      (this.mode === 'silk' || this.mode === 'iridescence' || this.mode === 'xmb-wave') &&
      this.reactBits?.supported &&
      this.quality !== 'performance';
    this.shaderCanvas.classList.toggle('hidden', !isShader);
    if (this.mode === 'clean' || this.quality === 'performance') {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  resize() {
    const scale = this.quality === 'performance' ? 0.5 : 0.75;
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width * scale));
    const h = Math.max(1, Math.floor(rect.height * scale));
    this.canvas.width = w;
    this.canvas.height = h;
    this.shaderCanvas.width = w;
    this.shaderCanvas.height = h;
    if (this.maxmbWave && !this.maxmbWave.failed && typeof this.maxmbWave._resize === 'function') {
      this.maxmbWave._resize();
    }
  }

  start() {
    if (this.mode === 'xmb-wave' && !this.hasWallpaper && this.maxmbWave && !this.maxmbWave.failed) {
      this.maxmbWave.start();
    }
    if (this.running) return;
    this.running = true;
    this.lastTs = performance.now();
    this.lastDrawTs = 0;
    const loop = (now) => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(loop);
      if (document.hidden || this.mode === 'clean' || this.quality === 'performance') return;
      if (this.mode === 'xmb-wave' && this.maxmbWave?.ok && !this.maxmbWave?.failed) return;
      const dt = Math.min((now - this.lastTs) / 1000, 0.05);
      this.lastTs = now;
      this.time += dt;
      if (this.quality === 'balanced' && now - this.lastDrawTs < 32) return;
      this.lastDrawTs = now;
      this.draw();
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.maxmbWave?.running) this.maxmbWave.stop();
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  drawXmbWave(ctx, w, h, time) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';

    const ribbons = [
      { yOff: 0.52, amp: 0.11, freq: 0.0036, speed: 0.55, alpha: 0.19, blur: 1.0 },
      { yOff: 0.56, amp: 0.085, freq: 0.0044, speed: 0.42, alpha: 0.14, blur: 0.7 },
      { yOff: 0.49, amp: 0.13, freq: 0.0029, speed: 0.34, alpha: 0.11, blur: 1.2 }
    ];

    for (const rb of ribbons) {
      const grad = ctx.createLinearGradient(0, h * (rb.yOff - rb.amp), 0, h * (rb.yOff + rb.amp * 1.4));
      grad.addColorStop(0, `rgba(255, 255, 255, ${rb.alpha})`);
      grad.addColorStop(0.28, `${this.accent}44`);
      grad.addColorStop(1, 'transparent');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 20) {
        const y =
          h * rb.yOff +
          Math.sin(x * rb.freq + time * rb.speed) * h * rb.amp +
          Math.cos(x * rb.freq * 0.65 - time * rb.speed * 0.7) * h * (rb.amp * 0.45);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 255, 255, ${rb.alpha * 1.6})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 20) {
        const y =
          h * rb.yOff +
          Math.sin(x * rb.freq + time * rb.speed) * h * rb.amp +
          Math.cos(x * rb.freq * 0.65 - time * rb.speed * 0.7) * h * (rb.amp * 0.45);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#ffffff';
    for (const m of this.xmbMotes) {
      m.x = (m.x + m.vx * 0.016) % 1.05;
      const mx = m.x * w;
      const my = (m.y + Math.sin(time * 0.9 + m.phase) * 0.04) * h;
      ctx.globalAlpha = 0.14 + 0.16 * (0.5 + 0.5 * Math.sin(time * 1.4 + m.phase));
      ctx.beginPath();
      ctx.arc(mx, my, m.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  draw() {
    const { ctx, canvas, time } = this;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if ((this.mode === 'silk' || this.mode === 'iridescence' || this.mode === 'xmb-wave') && this.reactBits?.supported) {
      if (this.reactBits.render(this.mode, time, this.accent)) return;
    }

    if (this.mode === 'xmb-wave') {
      this.drawXmbWave(ctx, w, h, time);
      return;
    }

    if (this.mode === 'aurora') {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < 3; i++) {
        const yBase = h * (0.28 + i * 0.14);
        const amp = h * (0.09 + i * 0.02);
        const grad = ctx.createLinearGradient(0, yBase - amp, w, yBase + amp);
        if (i === 0) {
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(0.35, `${this.accent}24`);
          grad.addColorStop(0.7, 'rgba(168, 85, 247, 0.16)');
          grad.addColorStop(1, 'transparent');
        } else if (i === 1) {
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(0.45, 'rgba(34, 211, 238, 0.14)');
          grad.addColorStop(0.8, `${this.accent}1f`);
          grad.addColorStop(1, 'transparent');
        } else {
          grad.addColorStop(0, 'transparent');
          grad.addColorStop(0.5, 'rgba(236, 72, 153, 0.11)');
          grad.addColorStop(1, 'transparent');
        }

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 28) {
          const wave = Math.sin(x * 0.0045 + time * (0.45 + i * 0.15) + i * 1.4) * amp;
          ctx.lineTo(x, yBase + wave);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else if (this.mode === 'starfield') {
      ctx.fillStyle = '#e2e8f0';
      for (const s of this.stars) {
        s.y = (s.y + 0.018 * s.z * 0.35) % 1;
        const sx = s.x * w;
        const sy = s.y * h;
        ctx.globalAlpha = 0.22 + s.z * 0.45;
        ctx.beginPath();
        ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (this.mode === 'cybergrid') {
      const horizonY = h * 0.58;
      const hGlow = ctx.createLinearGradient(0, horizonY - 26, 0, horizonY + 34);
      hGlow.addColorStop(0, 'transparent');
      hGlow.addColorStop(0.5, `${this.accent}36`);
      hGlow.addColorStop(1, 'transparent');
      ctx.fillStyle = hGlow;
      ctx.fillRect(0, horizonY - 26, w, 60);

      ctx.strokeStyle = `${this.accent}33`;
      ctx.lineWidth = 1;

      const offset = (time * 0.35) % 1;
      for (let i = 0; i < 12; i++) {
        const p = (i + offset) / 12;
        const y = horizonY + Math.pow(p, 2.1) * (h - horizonY);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const cx = w / 2;
      for (let j = -10; j <= 10; j++) {
        ctx.beginPath();
        ctx.moveTo(cx + j * (w * 0.025), horizonY);
        ctx.lineTo(cx + j * (w * 0.14), h);
        ctx.stroke();
      }
    }
  }
}
