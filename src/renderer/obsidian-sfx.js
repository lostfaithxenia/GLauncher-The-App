// Silky, Warm & Whisper-Soft UI Sound Effects Engine for Obsidian & Orbit Themes (CC0 uisfx soft/zen/dreamy)
const SFX_MAP = {
  hover: './assets/sfx/obsidian/hover.mp3',
  click: './assets/sfx/obsidian/click.mp3',
  pop: './assets/sfx/obsidian/pop.mp3',
  tab: './assets/sfx/obsidian/tab.mp3',
  open: './assets/sfx/obsidian/open.mp3',
  close: './assets/sfx/obsidian/close.mp3',
  back: './assets/sfx/obsidian/back.mp3',
  toggleOn: './assets/sfx/obsidian/toggle-on.mp3',
  toggleOff: './assets/sfx/obsidian/toggle-off.mp3',
  success: './assets/sfx/obsidian/success.mp3',
  unlock: './assets/sfx/obsidian/unlock.mp3',
  launch: './assets/sfx/obsidian/launch.mp3',
  error: './assets/sfx/obsidian/error.mp3',
  notify: './assets/sfx/obsidian/notify.mp3'
};

// Gentle relative gains — scaled by masterVolume (default 0.22 = soft & non-fatiguing!)
const REL_GAINS = {
  hover: 0.26,
  click: 0.65,
  pop: 0.68,
  tab: 0.55,
  open: 0.62,
  close: 0.52,
  back: 0.52,
  toggleOn: 0.6,
  toggleOff: 0.5,
  success: 0.8,
  unlock: 0.88,
  launch: 0.8,
  error: 0.55,
  notify: 0.72
};

export class ObsidianSfxEngine {
  constructor() {
    this.enabled = true;
    this.masterVolume = 0.22;
    this.pools = new Map();
    this.lastHoverAt = 0;
    this.lastClickAt = 0;
    this.wired = false;
  }

  setVolume(v) {
    const num = Number(v);
    if (Number.isFinite(num)) {
      this.masterVolume = Math.max(0, Math.min(1, num));
    }
  }

  getAudio(name) {
    const src = SFX_MAP[name];
    if (!src) return null;
    let pool = this.pools.get(name);
    if (!pool) {
      pool = [new Audio(src), new Audio(src)];
      pool.forEach((a) => {
        a.preload = 'auto';
      });
      this.pools.set(name, pool);
    }
    const free = pool.find((a) => a.paused || a.ended) || pool[0];
    free.currentTime = 0;
    free.volume = Math.max(0, Math.min(1, this.masterVolume * (REL_GAINS[name] ?? 0.6)));
    return free;
  }

  play(name) {
    if (!this.enabled || this.masterVolume <= 0.005) return;
    if (name === 'hover') {
      const now = performance.now();
      if (now - this.lastHoverAt < 95) return;
      this.lastHoverAt = now;
    } else if (name === 'click') {
      const now = performance.now();
      if (now - this.lastClickAt < 55) return;
      this.lastClickAt = now;
    }
    try {
      const audio = this.getAudio(name);
      audio?.play().catch(() => {});
    } catch {}
  }

  wireGlobalUiSounds(getThemeFn) {
    if (this.wired) return;
    this.wired = true;
    const isObsidianLike = () => {
      const t = typeof getThemeFn === 'function' ? getThemeFn() : 'obsidian';
      return t !== 'xmb';
    };

    document.addEventListener('pointerenter', (e) => {
      if (!this.enabled || !isObsidianLike()) return;
      const el = e.target?.closest?.('button, .rail-item, .orbit-row, .vault-deco-tile, .effect-tile, .deco-tile, .foil-role-emblem, .color-swatch-orb, .orbit-bubble-3d');
      if (el && !el.disabled) {
        this.play('hover');
      }
    }, true);

    document.addEventListener('click', (e) => {
      if (!this.enabled || !isObsidianLike()) return;
      const el = e.target?.closest?.('button, .rail-item, .orbit-row, .vault-deco-tile, .effect-tile, .deco-tile, .foil-role-emblem, .color-swatch-orb, .orbit-bubble-3d, input[type="checkbox"]');
      if (!el || el.disabled) return;
      if (el.matches('input[type="checkbox"]')) {
        this.play(el.checked ? 'toggleOn' : 'toggleOff');
      } else if (el.matches('.pw-nav-btn, .drawer-tab, .vault-cat-pill, .orbit-cat-btn')) {
        this.play('tab');
      } else if (el.matches('#btnCloseDrawer, .modal-backdrop .icon-btn, #btnRoleCodeCancel, #btnRenameCancel, #btnOrbitLightboxClose, #btnFriendPassportClose, #btnCloseStore, #btnCloseFeedback')) {
        this.play('close');
      } else if (el.matches('.vault-deco-tile, .effect-tile, .deco-tile, .foil-role-emblem, .color-swatch-orb')) {
        this.play('pop');
      } else {
        this.play('click');
      }
    }, true);
  }
}
