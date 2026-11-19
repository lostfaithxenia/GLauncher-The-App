// Real Three.js 3D WebGL Profile Passport Effects & Spinning Holographic Disc
import * as THREE from './vendor/three.module.js';

export class Passport3DStage {
  constructor(hostEl) {
    this.host = hostEl;
    this.effectId = 'none';
    this.rafId = null;
    this.t = 0;
    this.lastTs = 0;
    this.mouseX = 0;
    this.mouseY = 0;
    this.meshes = [];

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.domElement.className = 'passport-3d-canvas';
    this.host.innerHTML = '';
    this.host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(42, 2.6, 0.1, 40);
    this.camera.position.set(0, 0, 7.5);

    const amb = new THREE.AmbientLight(0xffffff, 0.85);
    this.scene.add(amb);
    const key = new THREE.DirectionalLight(0x7dd3fc, 2.1);
    key.position.set(4, 5, 6);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xec4899, 1.6);
    rim.position.set(-5, -3, 4);
    this.scene.add(rim);

    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
    });

    this.host.parentElement?.addEventListener('pointermove', (e) => {
      const r = this.host.getBoundingClientRect();
      if (!r.width || !r.height) return;
      this.mouseX = ((e.clientX - r.left) / r.width - 0.5) * 2;
      this.mouseY = ((e.clientY - r.top) / r.height - 0.5) * 2;
    }, { passive: true });
  }

  clearScene() {
    while (this.group.children.length > 0) {
      const ch = this.group.children[0];
      this.group.remove(ch);
      ch.geometry?.dispose?.();
      if (Array.isArray(ch.material)) ch.material.forEach((m) => m.dispose?.());
      else ch.material?.dispose?.();
    }
    this.meshes = [];
  }

  setEffect(effectId) {
    const id = String(effectId || 'none');
    if (id === this.effectId) return;
    this.effectId = id;
    this.clearScene();

    if (id === 'none' || id.startsWith('url:')) {
      this.stop();
      this.renderer.domElement.classList.add('hidden');
      return;
    }

    this.renderer.domElement.classList.remove('hidden');
    this.buildEffect(id);
    this.start();
  }

  buildEffect(id) {
    if (id === 'hydro') {
      const geo = new THREE.SphereGeometry(0.32, 24, 24);
      for (let i = 0; i < 14; i++) {
        const mat = new THREE.MeshPhysicalMaterial({
          color: i % 2 === 0 ? 0x38bdf8 : 0x7dd3fc,
          roughness: 0.08,
          metalness: 0.15,
          transmission: 0.65,
          transparent: true,
          opacity: 0.72,
          clearcoat: 1
        });
        const m = new THREE.Mesh(geo, mat);
        const s = 0.55 + Math.random() * 1.15;
        m.scale.set(s, s * 1.15, s);
        m.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3);
        m.userData = { vy: 0.35 + Math.random() * 0.5, phase: Math.random() * 6.28, rx: 0.4, ry: 0.7 };
        this.group.add(m);
        this.meshes.push(m);
      }
    } else if (id === 'cosmic') {
      const torusGeo = new THREE.TorusGeometry(1.55, 0.06, 16, 64);
      const torusMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0x7e22ce, emissiveIntensity: 1.2, metalness: 0.6, roughness: 0.2 });
      const ring1 = new THREE.Mesh(torusGeo, torusMat);
      ring1.position.set(1.2, 0, -1);
      ring1.userData = { spinX: 0.4, spinY: 0.9 };
      this.group.add(ring1);
      this.meshes.push(ring1);

      const ring2 = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.035, 16, 64), new THREE.MeshStandardMaterial({ color: 0xec4899, emissive: 0xdb2777, emissiveIntensity: 1.1 }));
      ring2.position.set(1.2, 0, -1);
      ring2.rotation.x = 1.1;
      ring2.userData = { spinX: -0.6, spinY: 0.5 };
      this.group.add(ring2);
      this.meshes.push(ring2);

      const starGeo = new THREE.OctahedronGeometry(0.11, 0);
      for (let i = 0; i < 24; i++) {
        const m = new THREE.Mesh(starGeo, new THREE.MeshStandardMaterial({ color: 0xf5d0fe, emissive: 0xa855f7, emissiveIntensity: 1.1 }));
        m.position.set((Math.random() - 0.5) * 13, (Math.random() - 0.5) * 4.5, (Math.random() - 0.5) * 3);
        m.userData = { orbit: true, phase: Math.random() * 6.28, vy: 0.15 };
        this.group.add(m);
        this.meshes.push(m);
      }
    } else if (id === 'crystal') {
      const geo = new THREE.OctahedronGeometry(0.45, 0);
      for (let i = 0; i < 12; i++) {
        const mat = new THREE.MeshPhysicalMaterial({
          color: i % 3 === 0 ? 0x67e8f9 : i % 3 === 1 ? 0xf0abfc : 0xfde047,
          roughness: 0.12,
          metalness: 0.55,
          transparent: true,
          opacity: 0.72,
          clearcoat: 1
        });
        const m = new THREE.Mesh(geo, mat);
        const s = 0.4 + Math.random() * 0.9;
        m.scale.set(s * 0.75, s * 1.45, s * 0.75);
        m.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2.5);
        m.userData = { spinX: 0.6 + Math.random() * 0.6, spinY: 0.9 + Math.random() * 0.8, phase: Math.random() * 6.28, bob: true };
        this.group.add(m);
        this.meshes.push(m);
      }
    } else if (id === 'sakura') {
      const geo = new THREE.PlaneGeometry(0.32, 0.2);
      for (let i = 0; i < 24; i++) {
        const mat = new THREE.MeshStandardMaterial({
          color: i % 2 === 0 ? 0xfbcfe8 : 0xf472b6,
          emissive: 0xf472b6,
          emissiveIntensity: 0.35,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.set((Math.random() - 0.5) * 13, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3);
        m.userData = { fall: 0.45 + Math.random() * 0.55, phase: Math.random() * 6.28, spinX: 1.2, spinY: 1.5 };
        this.group.add(m);
        this.meshes.push(m);
      }
    } else if (id === 'ember' || id === 'gold') {
      const geo = new THREE.OctahedronGeometry(0.14, 0);
      const isGold = id === 'gold';
      for (let i = 0; i < 26; i++) {
        const mat = new THREE.MeshStandardMaterial({
          color: isGold ? 0xfde047 : (i % 2 === 0 ? 0xf97316 : 0xfacc15),
          emissive: isGold ? 0xeab308 : 0xea580c,
          emissiveIntensity: 1.4,
          metalness: 0.7,
          roughness: 0.2
        });
        const m = new THREE.Mesh(geo, mat);
        m.position.set((Math.random() - 0.5) * 13, (Math.random() - 0.5) * 4.5, (Math.random() - 0.5) * 2.5);
        m.userData = { vy: 0.65 + Math.random() * 0.8, phase: Math.random() * 6.28, spinX: 1.5, spinY: 1.8 };
        this.group.add(m);
        this.meshes.push(m);
      }
    } else {
      // Lightning / Aurora / Toxic / Hearts / Comet / Matrix 3D gyroscopic rings + prisms
      const colorMap = {
        lightning: [0x38bdf8, 0x818cf8],
        aurora: [0x2dd4bf, 0xa855f7],
        toxic: [0x4ade80, 0xa3e635],
        hearts: [0xf472b6, 0xc084fc],
        comet: [0x34d399, 0x38bdf8],
        matrix: [0x10b981, 0x34d399]
      };
      const [c1, c2] = colorMap[id] || [0x38bdf8, 0xa855f7];
      for (let i = 0; i < 3; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(1.1 + i * 0.55, 0.03, 14, 60),
          new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c1 : c2, emissive: i % 2 === 0 ? c1 : c2, emissiveIntensity: 1.1, transparent: true, opacity: 0.75 })
        );
        ring.position.set(0.4, 0, -1.2);
        ring.userData = { spinX: (i + 1) * 0.45, spinY: (3 - i) * 0.55 };
        this.group.add(ring);
        this.meshes.push(ring);
      }
      const pGeo = new THREE.IcosahedronGeometry(0.16, 0);
      for (let i = 0; i < 16; i++) {
        const m = new THREE.Mesh(pGeo, new THREE.MeshStandardMaterial({ color: i % 2 === 0 ? c1 : c2, emissive: c1, emissiveIntensity: 0.9 }));
        m.position.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 4.5, (Math.random() - 0.5) * 2.5);
        m.userData = { vy: 0.4 + Math.random() * 0.45, phase: Math.random() * 6.28, spinX: 1.0, spinY: 1.2 };
        this.group.add(m);
        this.meshes.push(m);
      }
    }
  }

  resize() {
    const r = this.host.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width));
    const h = Math.max(1, Math.round(r.height));
    if (w === this._lastW && h === this._lastH) return;
    this._lastW = w;
    this._lastH = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
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

      this.group.rotation.y += (this.mouseX * 0.16 - this.group.rotation.y) * 0.08;
      this.group.rotation.x += (this.mouseY * 0.1 - this.group.rotation.x) * 0.08;

      for (const m of this.meshes) {
        const u = m.userData || {};
        if (u.spinX) m.rotation.x += u.spinX * dt;
        if (u.spinY) m.rotation.y += u.spinY * dt;
        if (u.vy) {
          m.position.y += u.vy * dt;
          m.position.x += Math.sin(this.t * 1.4 + (u.phase || 0)) * 0.28 * dt;
          if (m.position.y > 2.8) m.position.y = -2.8;
        }
        if (u.fall) {
          m.position.y -= u.fall * dt;
          m.position.x += Math.sin(this.t * 1.6 + (u.phase || 0)) * 0.45 * dt;
          if (m.position.y < -2.8) m.position.y = 2.8;
        }
        if (u.bob) {
          m.position.y += Math.sin(this.t * 1.8 + (u.phase || 0)) * 0.18 * dt;
        }
      }
      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(loop);
  }

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
}

export class PassportMiniDisc3D {
  constructor(hostEl) {
    this.host = hostEl;
    this.rafId = null;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(64, 64, false);
    this.renderer.domElement.style.width = '64px';
    this.renderer.domElement.style.height = '64px';
    this.host.innerHTML = '';
    this.host.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 20);
    this.camera.position.set(0, 0, 3.6);

    this.scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const l1 = new THREE.DirectionalLight(0x38bdf8, 2.4);
    l1.position.set(3, 4, 5);
    this.scene.add(l1);
    const l2 = new THREE.DirectionalLight(0xec4899, 2.0);
    l2.position.set(-4, -2, 3);
    this.scene.add(l2);

    const discGeo = new THREE.RingGeometry(0.28, 1.05, 48);
    const discMat = new THREE.MeshPhysicalMaterial({
      color: 0xdbeafe,
      metalness: 0.92,
      roughness: 0.14,
      iridescence: 1.0,
      iridescenceIOR: 1.35,
      clearcoat: 1.0,
      side: THREE.DoubleSide
    });
    this.disc = new THREE.Mesh(discGeo, discMat);
    const hub = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.28, 32),
      new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 0.1, side: THREE.DoubleSide })
    );
    this.disc.add(hub);
    this.scene.add(this.disc);
    this.start();
  }

  start() {
    if (this.rafId) return;
    let t = 0;
    const loop = () => {
      this.rafId = requestAnimationFrame(loop);
      if (document.hidden || this.host.offsetParent === null) return;
      t += 0.025;
      this.disc.rotation.y = Math.sin(t * 0.7) * 0.48;
      this.disc.rotation.x = Math.cos(t * 0.5) * 0.22;
      this.disc.rotation.z -= 0.03;
      this.renderer.render(this.scene, this.camera);
    };
    this.rafId = requestAnimationFrame(loop);
  }
}
