// Tactile Cartoon-Glass UI Sound Effects Engine for Obsidian & Orbit Themes (CC0 uisfx)
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

const VOLUMES = {
  hover: 0.22,
  click: 0.42,
  pop: 0.45,
  tab: 0.36,
  open: 0.44,
  close: 0.38,
  back: 0.38,
  toggleOn: 0.42,
  toggleOff: 0.36,
  success: 0.55,
  unlock: 0.62,
  launch: 0.58,
  error: 0.45,
  notify: 0.48
};

export class ObsidianSfxEngine {
  constructor() {
    this.enabled = true;
    this.pools = new Map();
    this.lastHoverAt = 0;
    this.lastClickAt = 0;
    this.wired = false;
  }

  getAudio(name) {
    const src = SFX_MAP[name];
    if (!src) return null;
    let pool = this.pools.get(name);
    if (!pool) {
      pool = [new Audio(src), new Audio(src)];
      pool.forEach((a) => {
        a.preload = 'auto';
        a.volume = VOLUMES[name] ?? 0.4;
      });
      this.pools.set(name, pool);
    }
    const free = pool.find((a) => a.paused || a.ended) || pool[0];
    free.currentTime = 0;
    free.volume = VOLUMES[name] ?? 0.4;
    return free;
  }

  play(name) {
    if (!this.enabled) return;
    if (name === 'hover') {
      const now = performance.now();
      if (now - this.lastHoverAt < 55) return;
      this.lastHoverAt = now;
    } else if (name === 'click') {
      const now = performance.now();
      if (now - this.lastClickAt < 40) return;
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
      const el = e.target?.closest?.('button, .rail-item, .orbit-game-item, .vault-deco-tile, .effect-tile, .deco-tile, .foil-role-emblem, .color-swatch-orb, .friend-card, .orbit-bubble');
      if (el && !el.disabled) {
        this.play('hover');
      }
    }, true);

    document.addEventListener('click', (e) => {
      if (!this.enabled || !isObsidianLike()) return;
      const el = e.target?.closest?.('button, .rail-item, .orbit-game-item, .vault-deco-tile, .effect-tile, .deco-tile, .foil-role-emblem, .color-swatch-orb, .friend-card, .orbit-bubble, input[type="checkbox"]');
      if (!el || el.disabled) return;
      if (el.matches('input[type="checkbox"]')) {
        this.play(el.checked ? 'toggleOn' : 'toggleOff');
      } else if (el.matches('.pw-nav-btn, .drawer-tab, .vault-cat-pill')) {
        this.play('tab');
      } else if (el.matches('#btnCloseDrawer, .modal-backdrop .icon-btn, #btnRoleCodeCancel, #btnRenameCancel, #btnOrbitLightboxClose, #btnFriendPassportClose')) {
        this.play('close');
      } else if (el.matches('.vault-deco-tile, .effect-tile, .deco-tile, .foil-role-emblem, .color-swatch-orb')) {
        this.play('pop');
      } else {
        this.play('click');
      }
    }, true);
  }
}
