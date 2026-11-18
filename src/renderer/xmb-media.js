import { setIntroBg } from './vendor/maxmb/wavegl.js';

const SOUND_FILES = {
  coldboot: './assets/maxmb/sounds/coldboot.ogg',
  console_startup: './assets/maxmb/sounds/console_startup.ogg',
  cursor: './assets/maxmb/sounds/cursor.ogg',
  enter: './assets/maxmb/sounds/enter.ogg',
  back: './assets/maxmb/sounds/back.ogg',
  ps4_cursor: './assets/maxmb/sounds/ps4/cursor.wav',
  ps4_enter: './assets/maxmb/sounds/ps4/ok.wav',
  ps4_back: './assets/maxmb/sounds/ps4/back.wav',
  ps4_options: './assets/maxmb/sounds/ps4/options.wav'
};

export class XmbAudio {
  constructor() {
    this.enabled = true;
    this.soundSet = 'ps3'; // 'ps3' | 'ps4'
    this.buffers = {};
    this._loading = {};
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
    } catch {
      this.ctx = null;
    }
    this._keepAlive(true);
    this._preloadAll();
  }

  setSoundSet(set) {
    this.soundSet = set === 'ps4' ? 'ps4' : 'ps3';
  }

  _keepAlive(on) {
    if (!this.ctx) return;
    if (on && !this._alive && typeof this.ctx.createConstantSource === 'function') {
      try {
        const src = this.ctx.createConstantSource();
        src.offset.value = 0.000001;
        src.connect(this.ctx.destination);
        src.start();
        this._alive = src;
      } catch {}
    } else if (!on && this._alive) {
      try {
        this._alive.stop();
        this._alive.disconnect();
      } catch {}
      this._alive = null;
    }
  }

  async _preloadAll() {
    for (const role of Object.keys(SOUND_FILES)) {
      try {
        await this.load(role);
      } catch {}
    }
  }

  load(role) {
    if (this.buffers[role]) return Promise.resolve(this.buffers[role]);
    if (this._loading[role]) return this._loading[role];
    const url = SOUND_FILES[role];
    if (!url || !this.ctx) return Promise.resolve(null);
    this._loading[role] = fetch(url)
      .then((res) => (res.ok ? res.arrayBuffer() : null))
      .then((buf) => (buf ? this.ctx.decodeAudioData(buf) : null))
      .then((decoded) => {
        if (decoded) this.buffers[role] = decoded;
        return decoded;
      })
      .catch(() => null);
    return this._loading[role];
  }

  ready(role, timeoutMs = 2000) {
    return Promise.race([this.load(role), new Promise((r) => setTimeout(() => r(null), timeoutMs))]);
  }

  play(role, volume = 0.72, maxDurationSec = 0) {
    if (!this.enabled || !this.ctx) return null;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    if (role === 'trophy') {
      return this.playTrophyChime(volume);
    }
    if (role === 'notify') {
      return this.playNotifyChime(volume);
    }

    let resolvedRole = role;
    if (this.soundSet === 'ps4') {
      if (role === 'cursor') resolvedRole = 'ps4_cursor';
      else if (role === 'enter') resolvedRole = 'ps4_enter';
      else if (role === 'back') resolvedRole = 'ps4_back';
    }

    const buf = this.buffers[resolvedRole] || this.buffers[role];
    if (!buf) {
      this.load(resolvedRole);
      return null;
    }
    try {
      const src = this.ctx.createBufferSource();
      const gain = this.ctx.createGain();
      src.buffer = buf;
      const clampedVol = Math.max(0, Math.min(1, volume));
      gain.gain.value = clampedVol;
      src.connect(gain);
      gain.connect(this.ctx.destination);
      src.start();
      if (maxDurationSec > 0 && buf.duration > maxDurationSec) {
        const t = this.ctx.currentTime;
        const fadeStart = Math.max(t + 0.1, t + maxDurationSec - 0.45);
        gain.gain.setValueAtTime(clampedVol, fadeStart);
        gain.gain.linearRampToValueAtTime(0.0001, t + maxDurationSec);
        src.stop(t + maxDurationSec + 0.05);
      }
      return {
        fadeOut: (sec = 0.5) => {
          try {
            const t = this.ctx.currentTime;
            gain.gain.setValueAtTime(gain.gain.value, t);
            gain.gain.linearRampToValueAtTime(0.0001, t + sec);
            src.stop(t + sec + 0.04);
          } catch {}
        }
      };
    } catch {
      return null;
    }
  }

  // Authentic PS3 Trophy Unlock Crystal Chime (D6 -> A6 -> D7 -> F#7 harmonic shimmer)
  playTrophyChime(volume = 0.65) {
    if (!this.ctx) return null;
    try {
      const now = this.ctx.currentTime;
      const notes = [
        { freq: 1174.66, delay: 0.0, dur: 0.55 },   // D6
        { freq: 1760.00, delay: 0.085, dur: 0.65 }, // A6
        { freq: 2349.32, delay: 0.175, dur: 0.95 }, // D7
        { freq: 2959.96, delay: 0.255, dur: 1.25 }  // F#7
      ];
      for (const n of notes) {
        const osc = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc2.type = 'triangle';
        osc.frequency.setValueAtTime(n.freq, now + n.delay);
        osc2.frequency.setValueAtTime(n.freq * 2, now + n.delay);

        const gVal = Math.max(0.01, Math.min(1, volume)) * 0.22;
        gain.gain.setValueAtTime(0.0001, now + n.delay);
        gain.gain.exponentialRampToValueAtTime(gVal, now + n.delay + 0.018);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.delay + n.dur);

        const subGain = this.ctx.createGain();
        subGain.gain.value = 0.18;
        osc.connect(gain);
        osc2.connect(subGain);
        subGain.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + n.delay);
        osc2.start(now + n.delay);
        osc.stop(now + n.delay + n.dur + 0.05);
        osc2.stop(now + n.delay + n.dur + 0.05);
      }
    } catch {}
    return null;
  }

  // Modern Discord / Launcher Notification Chime
  playNotifyChime(volume = 0.55) {
    if (!this.ctx) return null;
    try {
      const now = this.ctx.currentTime;
      const notes = [
        { freq: 880.0, delay: 0.0, dur: 0.25 },
        { freq: 1318.5, delay: 0.09, dur: 0.45 }
      ];
      for (const n of notes) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(n.freq, now + n.delay);
        const gVal = Math.max(0.01, Math.min(1, volume)) * 0.18;
        gain.gain.setValueAtTime(0.0001, now + n.delay);
        gain.gain.exponentialRampToValueAtTime(gVal, now + n.delay + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.delay + n.dur);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + n.delay);
        osc.stop(now + n.delay + n.dur + 0.04);
      }
    } catch {}
    return null;
  }
}

// Authentic MaXMB Boot Intro (measured frame-by-frame curves from MaXMB intro.js)
const INTRO_MS = 7400;
const END_SEC = 7.73;
const MARK_SRC = './assets/maxmb/icons/system/ps_logo.svg';
const WORD_SRC = './assets/maxmb/icons/system/ps3_logo.png';

const BG_CURVE = [
  [0, 0], [1.70, 0], [1.82, 0.05], [2.02, 0.15], [2.22, 0.26], [2.42, 0.38], [2.62, 0.48], [2.82, 0.61],
  [3.02, 0.80], [3.22, 0.95], [3.42, 1.10], [3.62, 1.28], [3.82, 1.43], [4.03, 1.56], [4.23, 1.72], [4.43, 1.86],
  [4.63, 1.99], [4.83, 2.16], [5.03, 2.28], [5.23, 2.41], [5.43, 2.50], [5.63, 2.61], [5.73, 2.63], [5.83, 2.55],
  [5.93, 2.38], [6.03, 2.15], [6.13, 1.88], [6.23, 1.59], [6.33, 1.35], [6.43, 1.10], [6.53, 0.94], [6.63, 0.90],
  [7.03, 0.90], [7.33, 0.93], [7.53, 0.97], [7.73, 1]
];
const WAVE_CURVE = [
  [0, 0], [0.12, 0.03], [0.22, 0.12], [0.32, 0.24], [0.42, 0.32], [0.52, 0.44], [0.62, 0.53], [0.72, 0.59],
  [0.82, 0.69], [0.92, 0.80], [1.02, 0.88], [1.12, 0.97], [1.22, 1.05], [1.32, 1.10], [1.42, 1.15], [1.52, 1.22],
  [1.62, 1.25], [1.72, 1.34], [2.62, 1.36], [2.82, 1.56], [3.02, 1.76], [3.22, 1.88], [3.42, 1.98], [3.62, 2.12],
  [3.82, 2.17], [4.03, 2.29], [4.23, 2.46], [4.43, 2.50], [4.63, 2.54], [4.83, 2.61], [5.03, 2.69], [5.23, 2.76],
  [5.43, 2.86], [5.63, 2.93], [5.73, 2.93], [5.83, 2.80], [5.93, 2.58], [6.03, 2.29], [6.13, 2.02], [6.23, 1.68],
  [6.33, 1.46], [6.43, 1.22], [6.53, 1.08], [6.63, 1.00], [7.73, 1]
];
const WAVE_SAT = [[0, 0], [0.5, 0], [1.2, 0.3], [1.9, 0.4], [2.4, 0.5], [3.2, 0.75], [4.4, 0.85], [5.8, 0.85], [6.6, 1]];
const BG_SAT = [[0, 1], [4.0, 1], [4.6, 0.85], [5.8, 0.85], [6.6, 1]];

const MARK_A = [
  [0, 0], [1.70, 0], [1.82, 0.04], [1.92, 0.1], [2.06, 0.26], [2.19, 0.39], [2.39, 0.49], [2.49, 0.68],
  [2.59, 0.92], [2.86, 0.99], [3.0, 1], [4.09, 1], [4.23, 0.91], [4.36, 0.66], [4.49, 0.38], [4.63, 0.18],
  [4.81, 0.07], [5.01, 0.02], [5.16, 0]
];
const P_A = [
  [0, 0], [1.92, 0], [2.06, 0.06], [2.19, 0.19], [2.32, 0.48], [2.46, 0.90], [2.66, 0.99], [3.0, 1],
  [4.23, 1], [4.39, 0.89], [4.53, 0.59], [4.69, 0.23], [4.91, 0.06], [5.16, 0]
];
const S_A = [
  [0, 0], [1.96, 0], [2.16, 0.06], [2.29, 0.16], [2.42, 0.55], [2.56, 0.98], [3.0, 1],
  [4.26, 1], [4.43, 0.89], [4.59, 0.55], [4.76, 0.21], [4.96, 0.04], [5.16, 0]
];
const T_A = [
  [0, 0], [2.09, 0], [2.29, 0.06], [2.42, 0.29], [2.59, 0.95], [3.0, 1],
  [4.05, 1], [4.29, 0.86], [4.49, 0.55], [4.73, 0.30], [4.96, 0.07], [5.41, 0]
];
const SUB_A = [
  [0, 0], [2.45, 0], [2.59, 0.26], [2.79, 0.57], [3.0, 0.71], [3.6, 0.92], [4.0, 1],
  [4.2, 1], [4.39, 0.77], [4.56, 0.41], [4.76, 0.08], [5.16, 0]
];
const XP = 17.2;
const XS = 43.8;
const X3 = 81.2;

function sampleCurve(tab, s) {
  if (s <= tab[0][0]) return tab[0][1];
  for (let i = 1; i < tab.length; i++) {
    const [t1, v1] = tab[i];
    if (s <= t1) {
      const [t0, v0] = tab[i - 1];
      return v0 + (v1 - v0) * ((s - t0) / (t1 - t0 || 1));
    }
  }
  return tab[tab.length - 1][1];
}

function preloadImage(src) {
  return new Promise((resolve) => {
    const im = new Image();
    im.onload = () => (im.decode ? im.decode() : Promise.resolve()).then(resolve, resolve);
    im.onerror = resolve;
    im.src = src;
  });
}

let activeIntroCancel = null;

export function cancelPs3Intro() {
  activeIntroCancel?.();
}

export async function runPs3Intro({
  audio,
  rootEl,
  waveEls = [],
  bgEls = [],
  playSound = true,
  bgTint = ''
}) {
  if (!rootEl) return;
  cancelPs3Intro();

  let cancelled = false;
  let raf = 0;
  let finishTimer = 0;
  let bootHandle = null;

  await Promise.all([
    Promise.race([Promise.all([preloadImage(MARK_SRC), preloadImage(WORD_SRC)]), new Promise((r) => setTimeout(r, 1500))]),
    playSound && audio ? audio.ready('coldboot', 1500) : Promise.resolve()
  ]);
  if (cancelled) return;

  rootEl.classList.remove('hidden', 'gone');
  rootEl.style.background = bgTint
    ? `radial-gradient(ellipse at 50% 45%, ${bgTint}44 0%, transparent 72%)`
    : '';
  rootEl.innerHTML = `
    <div class="intro-logo">
      <img class="il-mark" src="${MARK_SRC}" alt="" />
      <img class="il-word" src="${WORD_SRC}" alt="" />
      <img class="il-sub" src="${WORD_SRC}" alt="" />
    </div>
  `;

  const mark = rootEl.querySelector('.il-mark');
  const word = rootEl.querySelector('.il-word');
  const sub = rootEl.querySelector('.il-sub');

  document.body.classList.add('intro-run', 'intro-hold');
  for (const el of [...waveEls, ...bgEls].filter(Boolean)) {
    el.style.transition = 'none';
  }

  let hiB = 0;
  let hiK = 0;
  const clampHi = (v, isWave) => {
    const c = Math.min(1, v);
    if (isWave) {
      hiK = Math.max(hiK, c);
      return hiK;
    }
    hiB = Math.max(hiB, c);
    return hiB;
  };

  if (playSound && audio) {
    bootHandle = audio.play('coldboot', 0.85);
  }

  const cleanupVisuals = () => {
    cancelAnimationFrame(raf);
    setIntroBg(1);
    for (const el of [...waveEls, ...bgEls].filter(Boolean)) {
      el.style.filter = '';
      el.style.transition = '';
    }
    document.body.classList.remove('intro-run');
    rootEl.classList.add('gone');
  };

  const finishIntro = () => {
    if (cancelled) return;
    cancelled = true;
    clearTimeout(finishTimer);
    window.removeEventListener('keydown', onSkip);
    window.removeEventListener('pointerdown', onSkip);
    activeIntroCancel = null;
    document.body.classList.remove('intro-hold');
    cleanupVisuals();
    setTimeout(() => {
      if (!document.body.classList.contains('intro-run')) {
        rootEl.classList.add('hidden');
      }
    }, 750);
  };

  const onSkip = (e) => {
    // Allow clicking window Close/Minimize/Options buttons without swallowing
    if (e?.target?.closest?.('.titlebar')) return;
    if (bootHandle) bootHandle.fadeOut(0.45);
    finishIntro();
  };

  activeIntroCancel = () => {
    if (cancelled) return;
    cancelled = true;
    clearTimeout(finishTimer);
    window.removeEventListener('keydown', onSkip);
    window.removeEventListener('pointerdown', onSkip);
    if (bootHandle) bootHandle.fadeOut(0.25);
    activeIntroCancel = null;
    document.body.classList.remove('intro-hold', 'intro-run');
    cleanupVisuals();
    rootEl.classList.add('hidden');
  };

  window.addEventListener('keydown', onSkip);
  window.addEventListener('pointerdown', onSkip);

  const t0 = performance.now();
  const step = (now) => {
    if (cancelled) return;
    const s = (now - t0) / 1000;
    const B = clampHi(sampleCurve(BG_CURVE, s), false);
    const K = Math.max(clampHi(sampleCurve(WAVE_CURVE, s), true), B);
    setIntroBg(K > 0 ? B / K : 0);

    const fw = `brightness(${K.toFixed(3)}) saturate(${sampleCurve(WAVE_SAT, s).toFixed(3)})`;
    const fb = `brightness(${B.toFixed(3)}) saturate(${sampleCurve(BG_SAT, s).toFixed(3)})`;
    for (const el of waveEls) if (el) el.style.filter = fw;
    for (const el of bgEls) if (el) el.style.filter = fb;

    mark.style.opacity = sampleCurve(MARK_A, s).toFixed(3);
    const alphaStop = (v) => `rgba(0,0,0,${v.toFixed(3)})`;
    const p = sampleCurve(P_A, s);
    const q = sampleCurve(S_A, s);
    const r = sampleCurve(T_A, s);
    const maskGrad = `linear-gradient(90deg, ${alphaStop(p)} 0%, ${alphaStop(p)} ${XP}%, ${alphaStop(q)} ${XS}%, ${alphaStop(r)} ${X3}%, ${alphaStop(r)} 100%)`;
    word.style.webkitMaskImage = maskGrad;
    word.style.maskImage = maskGrad;
    sub.style.opacity = sampleCurve(SUB_A, s).toFixed(3);

    if (s >= END_SEC) {
      cleanupVisuals();
      rootEl.classList.add('hidden');
      return;
    }
    raf = requestAnimationFrame(step);
  };

  step(t0);
  finishTimer = setTimeout(() => {
    document.body.classList.remove('intro-hold');
  }, INTRO_MS);
}

// Authentic PS3 Firmware Game Launch Splash ("PLAYSTATION 3" swooshing boot screen)
export function runPs3GameLaunchSplash({ audio, rootEl, gameTitle = '', bgTint = '', playSound = true, holdUntilRelease = false, onComplete }) {
  if (!rootEl) {
    onComplete?.();
    return { finish: () => {} };
  }
  cancelPs3Intro();
  rootEl.classList.remove('hidden', 'gone');
  rootEl.style.background = bgTint
    ? `radial-gradient(ellipse at 50% 50%, ${bgTint}cc 0%, #050811 85%)`
    : 'radial-gradient(ellipse at 50% 50%, #102a56 0%, #04070e 85%)';
  const safeTitle = String(gameTitle || 'Software').replace(/</g, '&lt;');
  rootEl.innerHTML = `
    <div class="ps3-game-boot-splash">
      <div class="ps3-boot-swoosh">
        <img class="ps3-boot-word" src="${WORD_SRC}" alt="PLAYSTATION 3" />
        <div class="ps3-boot-game-sub waiting">Starting ${safeTitle}…</div>
      </div>
    </div>
  `;
  if (playSound && audio) {
    audio.play('console_startup', 0.52, 1.7);
  }

  let finished = false;
  let minElapsed = false;
  let releaseRequested = false;

  const closeSplash = () => {
    if (finished) return;
    finished = true;
    rootEl.classList.add('gone');
    setTimeout(() => {
      rootEl.classList.add('hidden');
      rootEl.style.background = '';
    }, 320);
  };

  setTimeout(() => {
    minElapsed = true;
    onComplete?.();
    if (!holdUntilRelease || releaseRequested) {
      closeSplash();
    } else {
      const subEl = rootEl.querySelector('.ps3-boot-game-sub');
      if (subEl) subEl.textContent = `Loading ${safeTitle}…`;
    }
  }, 1650);

  return {
    finish: () => {
      releaseRequested = true;
      if (minElapsed) closeSplash();
    }
  };
}
