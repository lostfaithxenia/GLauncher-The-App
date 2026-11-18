import * as THREE from './vendor/three.module.js';

function createStudioEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x07090d);

  const panelGeo = new THREE.PlaneGeometry(1, 1);
  const addLightPanel = (color, intensity, pos, rot, scale) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(panelGeo, mat);
    mesh.position.set(...pos);
    mesh.rotation.set(...rot);
    mesh.scale.set(...scale);
    envScene.add(mesh);
  };

  addLightPanel(0xffffff, 3.6, [0, 7.5, 2.5], [Math.PI / 2, 0, 0], [11, 6, 1]);
  addLightPanel(0x93c5fd, 2.5, [-7.5, 2.2, 4], [0, Math.PI / 2.5, 0], [6, 9, 1]);
  addLightPanel(0xf9a8d4, 1.4, [7.5, 1.5, 3.5], [0, -Math.PI / 2.5, 0], [5, 8, 1]);
  addLightPanel(0xe2e8f0, 2.0, [2.5, -4.5, 5], [-Math.PI / 3, 0.2, 0], [10, 4, 1]);
  addLightPanel(0x38bdf8, 1.4, [0, 1.5, -7], [0, 0, 0], [8, 4, 1]);

  const rt = pmrem.fromScene(envScene, 0.03);
  pmrem.dispose();
  panelGeo.dispose();
  return rt.texture;
}

function createGrooveNormalTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);
  const half = size / 2;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x - half) / half;
      const dy = (y - half) / half;
      const r = Math.hypot(dx, dy);
      const idx = (y * size + x) * 4;

      if (r < 0.001) {
        img.data[idx] = 128;
        img.data[idx + 1] = 128;
        img.data[idx + 2] = 255;
        img.data[idx + 3] = 255;
        continue;
      }

      const wave = Math.cos(r * 250) * 0.28 + Math.sin(r * 90) * 0.08;
      const nx = (dx / r) * wave;
      const ny = (dy / r) * wave;

      img.data[idx] = Math.max(0, Math.min(255, Math.round((nx * 0.5 + 0.5) * 255)));
      img.data[idx + 1] = Math.max(0, Math.min(255, Math.round((ny * 0.5 + 0.5) * 255)));
      img.data[idx + 2] = 248;
      img.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createPlasticSleeveNormalTexture() {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const ripple = Math.sin(y * 0.09 + Math.sin(x * 0.05) * 1.6) * 0.05;
      img.data[idx] = 128;
      img.data[idx + 1] = Math.round((ripple * 0.5 + 0.5) * 255);
      img.data[idx + 2] = 254;
      img.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createShrinkWrapNormalTexture() {
  const size = 512;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const u = x / size;
      const v = y / size;
      // Realistic heat-shrunk corner tension creases + cellophane crinkles
      const cornerPull =
        Math.sin((u + v) * 28) * 0.14 * Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) * 1.5) +
        Math.cos((u - v) * 34) * 0.12 +
        Math.sin(u * 60 + Math.cos(v * 22) * 2.5) * 0.08;
      const dx = cornerPull;
      const dy = Math.sin(v * 48 + Math.sin(u * 19) * 2.1) * 0.14;

      img.data[idx] = Math.max(0, Math.min(255, Math.round((dx * 0.5 + 0.5) * 255)));
      img.data[idx + 1] = Math.max(0, Math.min(255, Math.round((dy * 0.5 + 0.5) * 255)));
      img.data[idx + 2] = 242;
      img.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createWoodDeskTexture() {
  const w = 1024;
  const h = 512;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');

  const baseGrad = ctx.createLinearGradient(0, 0, 0, h);
  baseGrad.addColorStop(0, '#3e2719');
  baseGrad.addColorStop(0.5, '#4b2f1e');
  baseGrad.addColorStop(1, '#2d1b11');
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 240; i++) {
    const y = (i / 240) * h;
    const thickness = 1 + (i % 3);
    const alpha = 0.035 + ((i * 17) % 10) * 0.008;
    ctx.strokeStyle = i % 2 === 0 ? `rgba(18, 9, 4, ${alpha})` : `rgba(145, 92, 54, ${alpha * 0.8})`;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 64) {
      const wave = Math.sin(x * 0.007 + i * 0.45) * 4.5;
      ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(15, 8, 4, 0.38)';
  ctx.lineWidth = 2;
  for (const py of [h * 0.33, h * 0.67]) {
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  }

  const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.18, w / 2, h / 2, w * 0.56);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSoftParticleTexture() {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255, 255, 255, 1)');
  g.addColorStop(0.35, 'rgba(186, 230, 253, 0.55)');
  g.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function createRoundedRectShape(w, h, r) {
  const shape = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  shape.moveTo(x + r, y);
  shape.lineTo(x + w - r, y);
  shape.quadraticCurveTo(x + w, y, x + w, y + r);
  shape.lineTo(x + w, y + h - r);
  shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  shape.lineTo(x + r, y + h);
  shape.quadraticCurveTo(x, y + h, x, y + h - r);
  shape.lineTo(x, y + r);
  shape.quadraticCurveTo(x, y, x + r, y);
  return shape;
}

function loadImageElement(src) {
  return new Promise((resolve) => {
    if (!src) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function upscaleImageHD(img, targetW, targetH) {
  if (!img || img.width >= targetW * 0.75) return img;
  let curr = img;
  let cw = img.width;
  let ch = img.height;
  while (cw * 1.8 < targetW && ch * 1.8 < targetH) {
    const nw = Math.round(cw * 1.8);
    const nh = Math.round(ch * 1.8);
    const step = document.createElement('canvas');
    step.width = nw;
    step.height = nh;
    const sctx = step.getContext('2d');
    sctx.imageSmoothingEnabled = true;
    sctx.imageSmoothingQuality = 'high';
    sctx.filter = 'contrast(1.04) saturate(1.04)';
    sctx.drawImage(curr, 0, 0, nw, nh);
    curr = step;
    cw = nw;
    ch = nh;
  }
  return curr;
}

function wrapLines(ctx, text, maxW, maxLines = 5) {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
      if (lines.length >= maxLines) break;
    } else {
      line = test;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function drawEnhancedCoverForCase(ctx, rawImg, w, h, secondary) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const img = upscaleImageHD(rawImg, w, h);
  const imgRatio = img.width / img.height;
  const headerH = 98;
  const bodyH = h - headerH;
  const bodyRatio = w / bodyH;

  if (imgRatio > 1.18) {
    ctx.save();
    ctx.filter = 'blur(26px) brightness(0.58) saturate(1.25)';
    ctx.drawImage(img, -40, 0, w + 80, h);
    ctx.restore();

    const grad = ctx.createLinearGradient(0, headerH, 0, h);
    grad.addColorStop(0, 'rgba(6,8,13,0.45)');
    grad.addColorStop(0.55, 'rgba(6,8,13,0.2)');
    grad.addColorStop(1, 'rgba(5,7,11,0.95)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, headerH, w, bodyH);

    const targetW = w - 64;
    const targetH = Math.min(bodyH * 0.58, targetW / imgRatio);
    const dx = (w - targetW) / 2;
    const dy = headerH + 92;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.75)';
    ctx.shadowBlur = 32;
    ctx.beginPath();
    ctx.roundRect(dx, dy, targetW, targetH, 16);
    ctx.clip();
    ctx.filter = 'contrast(1.08) saturate(1.1)';
    ctx.drawImage(img, dx, dy, targetW, targetH);
    ctx.restore();

    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.roundRect(dx, dy, targetW, targetH, 16);
    ctx.stroke();
    return true;
  }

  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > bodyRatio) {
    sw = img.height * bodyRatio;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / bodyRatio;
    sy = (img.height - sh) * 0.25;
  }

  ctx.fillStyle = secondary || '#080a0f';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.filter = 'contrast(1.08) saturate(1.1)';
  ctx.drawImage(img, sx, sy, sw, sh, 0, headerH, w, bodyH);
  ctx.restore();

  const bottomVig = ctx.createLinearGradient(0, h * 0.72, 0, h);
  bottomVig.addColorStop(0, 'transparent');
  bottomVig.addColorStop(1, 'rgba(5, 7, 11, 0.85)');
  ctx.fillStyle = bottomVig;
  ctx.fillRect(0, h * 0.72, w, h * 0.28);

  return false;
}

function drawEnhancedCoverForDisc(ctx, rawImg, size) {
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const img = upscaleImageHD(rawImg, size, size);
  const imgRatio = img.width / img.height;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;

  if (imgRatio > 1) {
    sw = img.height;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width;
    sy = (img.height - sh) * 0.22;
  }

  ctx.save();
  ctx.filter = 'contrast(1.08) saturate(1.12)';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, size, size);
  ctx.restore();

  const cx = size / 2;
  const cy = size / 2;
  const vig = ctx.createRadialGradient(cx, cy, size * 0.16, cx, cy, size * 0.5);
  vig.addColorStop(0, 'rgba(0,0,0,0.48)');
  vig.addColorStop(0.55, 'rgba(0,0,0,0.08)');
  vig.addColorStop(1, 'rgba(0,0,0,0.54)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, size, size);
}

function createDiscLabelTexture(game, artImg) {
  const size = 1024;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;
  const accent = game.accent || '#38bdf8';
  const secondary = game.secondary || '#151926';

  ctx.fillStyle = '#0d1017';
  ctx.fillRect(0, 0, size, size);

  if (artImg) {
    drawEnhancedCoverForDisc(ctx, artImg, size);
  } else {
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, secondary);
    bg.addColorStop(0.55, '#0c1019');
    bg.addColorStop(1, '#06080d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    const glow1 = ctx.createRadialGradient(size * 0.28, size * 0.24, 18, size * 0.28, size * 0.24, size * 0.56);
    glow1.addColorStop(0, `${accent}e0`);
    glow1.addColorStop(0.45, `${accent}44`);
    glow1.addColorStop(1, 'transparent');
    ctx.fillStyle = glow1;
    ctx.fillRect(0, 0, size, size);

    const glow2 = ctx.createRadialGradient(size * 0.78, size * 0.76, 12, size * 0.78, size * 0.76, size * 0.45);
    glow2.addColorStop(0, `${accent}66`);
    glow2.addColorStop(1, 'transparent');
    ctx.fillStyle = glow2;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(255,255,255,0.11)';
    ctx.lineWidth = 2;
    for (const r of [0.22, 0.29, 0.36, 0.44, 0.475]) {
      ctx.beginPath();
      ctx.arc(cx, cy, size * r, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.strokeStyle = accent;
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, size * 0.415, -0.65, 1.15);
    ctx.stroke();
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const plat = (game.platform || 'PC DVD').toUpperCase();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.68)';
  ctx.beginPath();
  ctx.roundRect(cx - 94, size * 0.145 - 18, 188, 36, 18);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.28)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '700 20px "Segoe UI", sans-serif';
  ctx.fillText(plat, cx, size * 0.145);

  ctx.fillStyle = 'rgba(8, 10, 15, 0.78)';
  ctx.beginPath();
  ctx.roundRect(cx - 245, size * 0.745 - 34, 490, 68, 14);
  ctx.fill();
  ctx.strokeStyle = `${accent}66`;
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 35px "Segoe UI", sans-serif';
  const titleText = game.title.length > 22 ? `${game.title.slice(0, 21)}…` : game.title;
  ctx.fillText(titleText, cx, size * 0.732);

  ctx.fillStyle = 'rgba(226, 232, 240, 0.8)';
  ctx.font = '600 17px "Segoe UI", sans-serif';
  const meta = [game.genre || 'OPTICAL DISC', game.year || '2026'].filter(Boolean).join('  •  ');
  ctx.fillText(meta.toUpperCase(), cx, size * 0.732 + 27);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '600 13px monospace';
  ctx.fillText('PRESSED OPTICAL ROM  •  ALL RIGHTS RESERVED', cx, size * 0.295);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createFrontCoverTexture(game, artImg) {
  const w = 1024;
  const h = 1440;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const accent = game.accent || '#38bdf8';
  const secondary = game.secondary || '#151926';

  let showFullFooterTitle = true;
  if (artImg) {
    showFullFooterTitle = drawEnhancedCoverForCase(ctx, artImg, w, h, secondary);
  } else {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, secondary);
    bg.addColorStop(0.5, '#0d1018');
    bg.addColorStop(1, '#06070b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    const g1 = ctx.createRadialGradient(w * 0.3, h * 0.34, 24, w * 0.3, h * 0.34, w * 0.85);
    g1.addColorStop(0, `${accent}dd`);
    g1.addColorStop(0.4, `${accent}44`);
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, h * 0.62);
    ctx.lineTo(w * 0.36, h * 0.52);
    ctx.lineTo(w * 0.72, h * 0.59);
    ctx.lineTo(w, h * 0.49);
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = `${accent}66`;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(w * 0.64, h * 0.38, 250, 0, Math.PI * 2);
    ctx.stroke();
  }

  const crease = ctx.createLinearGradient(0, 0, 38, 0);
  crease.addColorStop(0, 'rgba(0,0,0,0.68)');
  crease.addColorStop(0.4, 'rgba(255,255,255,0.08)');
  crease.addColorStop(1, 'transparent');
  ctx.fillStyle = crease;
  ctx.fillRect(0, 0, 38, h);

  ctx.fillStyle = 'rgba(9, 11, 16, 0.92)';
  ctx.fillRect(0, 0, w, 98);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 94, w, 5);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 32px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText((game.platform || 'PC DVD').toUpperCase(), 48, 48);

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.textAlign = 'right';
  ctx.font = '700 24px "Segoe UI", sans-serif';
  ctx.fillText(game.year || '', w - 48, 48);

  if (showFullFooterTitle) {
    ctx.textAlign = 'left';
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 72px "Segoe UI", sans-serif';
    const words = game.title.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width > w - 160 && current) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    const lineHeight = 82;
    const startY = h - 185 - (lines.length - 1) * lineHeight;
    lines.forEach((line, i) => {
      ctx.fillText(line, 56, startY + i * lineHeight);
    });

    ctx.fillStyle = accent;
    ctx.font = '700 26px "Segoe UI", sans-serif';
    ctx.fillText((game.genre || 'PC EDITION').toUpperCase(), 56, h - 102);
  }

  ctx.fillStyle = 'rgba(8, 10, 15, 0.72)';
  ctx.fillRect(w - 144, h - 156, 88, 94);
  ctx.strokeStyle = 'rgba(255,255,255,0.48)';
  ctx.lineWidth = 3;
  ctx.strokeRect(w - 144, h - 156, 88, 94);
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.textAlign = 'center';
  ctx.font = '800 26px "Segoe UI", sans-serif';
  ctx.fillText('PC', w - 100, h - 120);
  ctx.font = '600 15px "Segoe UI", sans-serif';
  ctx.fillText('ROM', w - 100, h - 84);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createBackCoverTexture(game, frontImg, backImg) {
  const w = 1024;
  const h = 1440;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const accent = game.accent || '#38bdf8';
  const secondary = game.secondary || '#151926';

  // If user supplied a custom full back-cover scan/image or screenshot, build rich retail back cover
  const bgSource = backImg || frontImg;
  if (bgSource) {
    ctx.save();
    ctx.filter = 'blur(24px) brightness(0.32) saturate(1.25)';
    ctx.drawImage(bgSource, -40, -40, w + 80, h + 80);
    ctx.restore();

    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(8,10,16,0.75)');
    grad.addColorStop(0.5, 'rgba(10,13,20,0.86)');
    grad.addColorStop(1, 'rgba(6,8,12,0.97)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  } else {
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, secondary);
    bg.addColorStop(0.5, '#0b0e15');
    bg.addColorStop(1, '#07090d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }

  // Top Back Banner
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.fillRect(0, 0, w, 128);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 124, w, 5);

  ctx.fillStyle = '#ffffff';
  ctx.font = '800 42px "Segoe UI", sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(game.title.toUpperCase(), 56, 64);

  // Back Cover Feature Visual Panel (Screenshot or Enhanced Key Art)
  const panelX = 56;
  const panelY = 166;
  const panelW = w - 112;
  const panelH = 380;

  ctx.save();
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.clip();
  if (bgSource) {
    const hdImg = upscaleImageHD(bgSource, panelW, panelH);
    const ratio = hdImg.width / hdImg.height;
    const boxRatio = panelW / panelH;
    let sx = 0, sy = 0, sw = hdImg.width, sh = hdImg.height;
    if (ratio > boxRatio) {
      sw = hdImg.height * boxRatio;
      sx = (hdImg.width - sw) / 2;
    } else {
      sh = hdImg.width / boxRatio;
      sy = (hdImg.height - sh) * 0.3;
    }
    ctx.filter = 'contrast(1.06) saturate(1.1)';
    ctx.drawImage(hdImg, sx, sy, sw, sh, panelX, panelY, panelW, panelH);
  } else {
    const g = ctx.createLinearGradient(panelX, panelY, panelX + panelW, panelY + panelH);
    g.addColorStop(0, `${accent}55`);
    g.addColorStop(1, 'rgba(255,255,255,0.05)');
    ctx.fillStyle = g;
    ctx.fillRect(panelX, panelY, panelW, panelH);
  }
  ctx.restore();

  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(panelX, panelY, panelW, panelH, 16);
  ctx.stroke();

  // Synopsis / Back Cover Blurb
  const synopsis =
    game.synopsis ||
    `Experience ${game.title} in physical optical media presentation. Features custom HD fitted disc artwork, interactive instruction manual, and instant console drive launch.`;

  ctx.fillStyle = accent;
  ctx.font = '800 22px "Segoe UI", sans-serif';
  ctx.fillText('OVERVIEW', 56, 594);

  ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
  ctx.font = '500 25px "Segoe UI", sans-serif';
  const blurbLines = wrapLines(ctx, synopsis, w - 112, 5);
  blurbLines.forEach((line, i) => {
    ctx.fillText(line, 56, 638 + i * 36);
  });

  // Technical Specs Table
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.beginPath();
  ctx.roundRect(56, 855, w - 112, 315, 16);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.12)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const rows = [
    ['FORMAT', game.platform || 'PC DVD'],
    ['GENRE', game.genre || 'Game'],
    ['RELEASE', game.year || '2026'],
    ['PLAYS RECORDED', String(game.playCount || 0)],
    ['MEDIA STATUS', game.trailer ? 'TRAILER + DISC READY' : game.executable ? 'EXECUTABLE LINKED' : 'SHOWCASE DISC']
  ];

  rows.forEach(([k, v], idx) => {
    const ry = 910 + idx * 52;
    ctx.fillStyle = 'rgba(148, 163, 184, 0.85)';
    ctx.font = '700 21px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(k, 88, ry);

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'right';
    ctx.fillText(String(v).toUpperCase(), w - 88, ry);
  });

  // Barcode & Rating
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(w - 310, h - 180, 250, 115, 8);
  ctx.fill();
  ctx.fillStyle = '#090b10';
  let bx = w - 285;
  for (let i = 0; i < 34; i++) {
    const bw = i % 3 === 0 ? 5 : i % 2 === 0 ? 2 : 3;
    ctx.fillRect(bx, h - 162, bw, 74);
    bx += bw + (i % 4 === 0 ? 5 : 3);
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = 'rgba(148,163,184,0.75)';
  ctx.font = '600 18px "Segoe UI", sans-serif';
  ctx.fillText('OPTICAL MEDIA ARCHIVE  •  SINGLE PLAYER', 56, h - 110);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createManualPageTexture(game, pageIndex, artImg) {
  const w = 720;
  const h = 1024;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const accent = game.accent || '#38bdf8';

  // Glossy paper stock texture
  ctx.fillStyle = pageIndex === 0 ? '#111622' : '#f4f1ea';
  ctx.fillRect(0, 0, w, h);

  if (pageIndex === 0) {
    // Manual Cover Page
    if (artImg) {
      ctx.save();
      ctx.globalAlpha = 0.25;
      drawEnhancedCoverForDisc(ctx, artImg, w);
      ctx.restore();
    }
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 26, h);
    ctx.fillRect(26, 0, w - 26, 78);

    ctx.fillStyle = '#090c12';
    ctx.font = '800 24px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('OFFICIAL INSTRUCTION BOOKLET', 52, 39);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 52px "Segoe UI", sans-serif';
    const lines = wrapLines(ctx, game.title, w - 110, 3);
    lines.forEach((ln, i) => ctx.fillText(ln, 52, 220 + i * 64));

    ctx.fillStyle = accent;
    ctx.font = '700 24px "Segoe UI", sans-serif';
    ctx.fillText(`${game.platform || 'PC DVD'}  •  ${game.year || '2026'}`, 52, 440);

    ctx.fillStyle = 'rgba(226, 232, 240, 0.72)';
    ctx.font = '500 22px "Segoe UI", sans-serif';
    ctx.fillText('Click page edges or use arrows to flip pages', 52, h - 85);
  } else {
    // Cream paper manual interior pages
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, w, 16);

    ctx.fillStyle = '#1e293b';
    ctx.font = '800 28px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    const pageTitles = [
      '',
      '1. OVERVIEW & STORY',
      '2. GETTING STARTED',
      '3. CONTROLS & SHORTCUTS',
      '4. DISC & SYSTEM NOTES',
      '5. ARCHIVE & CREDITS'
    ];
    ctx.fillText(pageTitles[pageIndex] || `PAGE ${pageIndex}`, 48, 72);

    ctx.strokeStyle = 'rgba(30, 41, 59, 0.2)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(48, 102);
    ctx.lineTo(w - 48, 102);
    ctx.stroke();

    ctx.fillStyle = '#334155';
    ctx.font = '500 23px "Segoe UI", sans-serif';

    if (pageIndex === 1) {
      const syn =
        game.synopsis ||
        `${game.title} brings classic physical media presentation to your desktop library. Inspect the case, slip the optical disc into the console drive, and jump straight into gameplay.`;
      const lines = wrapLines(ctx, syn, w - 96, 12);
      lines.forEach((ln, i) => ctx.fillText(ln, 48, 152 + i * 38));

      ctx.fillStyle = '#0f172a';
      ctx.font = '700 22px "Segoe UI", sans-serif';
      ctx.fillText(`GENRE: ${game.genre || 'Game'}`, 48, 700);
      ctx.fillText(`RELEASED: ${game.year || '2026'}`, 48, 745);
    } else if (pageIndex === 2) {
      const steps = [
        '1. Open the retail keep-case and verify the optical disc is seated on the 6-prong center hub.',
        '2. Press Play to place the console on the desk and feed the disc into the illuminated drive.',
        '3. Watch the system boot splash verify the title while your linked executable starts.',
        '4. Customize HD cover artwork, trailers, and graphics profiles inside the Options drawer.'
      ];
      let y = 152;
      steps.forEach((st) => {
        const lns = wrapLines(ctx, st, w - 96, 4);
        lns.forEach((ln) => {
          ctx.fillText(ln, 48, y);
          y += 35;
        });
        y += 28;
      });
    } else if (pageIndex === 3) {
      const keys = [
        ['V', 'Switch Game CDs / Game Cases'],
        ['3 / D', 'Toggle 3D Models / 2D Shelf'],
        ['O', 'Open / Close 3D Game Case'],
        ['E', 'Eject / Seat Disc inside Case'],
        ['F', 'Flip 3D Optical Disc'],
        ['Enter', 'Insert Disc & Launch Game'],
        ['Drag', 'Orbit 360° around Case or CD']
      ];
      keys.forEach(([k, desc], idx) => {
        const y = 165 + idx * 78;
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(48, y - 20, 110, 40);
        ctx.fillStyle = '#ffffff';
        ctx.font = '800 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(k, 103, y);
        ctx.textAlign = 'left';
        ctx.fillStyle = '#334155';
        ctx.font = '500 22px "Segoe UI", sans-serif';
        ctx.fillText(desc, 182, y);
      });
    } else if (pageIndex === 4) {
      const info = [
        `TITLE: ${game.title}`,
        `EDITION: ${game.platform || 'PC DVD'}`,
        `PLAY COUNT: ${game.playCount || 0}`,
        `EXECUTABLE: ${game.executable ? 'Linked Local Binary' : 'Not Linked Yet'}`,
        `TRAILER: ${game.trailer ? 'Downloaded & Ready' : 'Not Fetched Yet'}`
      ];
      info.forEach((line, i) => {
        ctx.fillText(line, 48, 165 + i * 56);
      });
    } else {
      ctx.fillText('Thank you for keeping physical game media alive.', 48, 170);
      ctx.fillText('Handle discs by the outer edge and center hub.', 48, 224);
      ctx.fillStyle = '#64748b';
      ctx.font = '600 18px monospace';
      ctx.fillText('PRINTED FOR ARCHIVAL LAUNCHER EDITION', 48, h - 110);
    }

    // Page number footer
    ctx.fillStyle = '#64748b';
    ctx.font = '700 19px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`— ${pageIndex} —`, w / 2, h - 48);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function createSpineTexture(game) {
  const w = 160;
  const h = 1440;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  const accent = game.accent || '#38bdf8';

  ctx.fillStyle = game.secondary || '#131722';
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, w, 98);
  ctx.fillRect(0, h - 74, w, 74);

  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 46px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(game.title.toUpperCase(), 0, 0);
  ctx.restore();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export class Stage3D {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.localClippingEnabled = true;
    this.container.appendChild(this.renderer.domElement);

    this.renderer.domElement.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.stop();
    });
    this.renderer.domElement.addEventListener('webglcontextrestored', () => {
      try {
        this.envTexture?.dispose?.();
        this.envTexture = createStudioEnvironment(this.renderer);
        this.scene.environment = this.envTexture;
        this.renderer.setClearColor(0x000000, 0);
        this.resize();
        this.start();
        this.callbacks?.onContextRestored?.();
      } catch {}
    });

    this.scene = new THREE.Scene();
    this.envTexture = createStudioEnvironment(this.renderer);
    this.scene.environment = this.envTexture;

    this.camera = new THREE.PerspectiveCamera(34, 1, 0.1, 40);
    this.camera.position.set(0, 0.28, 4.15);
    this.camera.lookAt(0, 0, 0);

    this.grooveNormalMap = createGrooveNormalTexture();
    this.sleeveNormalMap = createPlasticSleeveNormalTexture();
    this.shrinkNormalMap = createShrinkWrapNormalTexture();
    this.woodTexture = createWoodDeskTexture();
    this.particleTex = createSoftParticleTexture();
    this.raycaster = new THREE.Raycaster();
    this._accentTarget = new THREE.Color('#38bdf8');
    this.sharedAssets = [];
    this.shared = this.buildSharedAssets();

    this.setupLights();
    this.setupPedestal();
    this.particles = this.buildAmbientParticles();
    this.scene.add(this.particles);

    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.deskGroup = this.buildWoodenDesk();
    this.deskGroup.visible = false;
    this.scene.add(this.deskGroup);

    this.consoleParts = this.buildConsoleAssembly();
    this.consoleGroup = this.consoleParts.group;
    this.consoleGroup.visible = false;
    this.scene.add(this.consoleGroup);

    this.targetRotX = 0.12;
    this.targetRotY = -0.26;
    this.currentRotX = 0.12;
    this.currentRotY = -0.26;
    this.targetZoom = 4.1;
    this.currentZoom = 4.1;
    this.targetRootX = 0;
    this.targetRootY = 0.04;
    this.targetRootZ = 0;
    this.targetCamX = 0;
    this.currentCamX = 0;
    this.targetCamY = 0.28;
    this.currentCamY = 0.28;
    this._lookTarget = new THREE.Vector3(0, 0, 0);
    this._desiredLookTarget = new THREE.Vector3(0, 0, 0);

    this.isDragging = false;
    this.pointerDownPos = { x: 0, y: 0 };
    this.lastPointer = { x: 0, y: 0 };

    this.mode = 'cd';
    this.isFlipped = false;
    this.isCaseOpen = false;
    this.isDiscEjected = false;
    this.spinVelocity = 0.3;
    this.discAngle = 0;

    // Sub-modes: 'showcase' | 'manual' | 'unwrap' | 'shelf'
    this.subMode = 'showcase';
    this.manualState = null;
    this.unwrapState = null;
    this.shelfState = null;
    this.consoleSequence = null;
    this.slotClipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.755);
    this._tmpVec = new THREE.Vector3();

    this.activeAssembly = null;
    this.frontHinge = null;
    this.discPivot = null;
    this.discMeshGroup = null;
    this.manualHotspot = null;
    this.spinAuraMat = null;
    this.disposables = [];

    this.clock = new THREE.Clock();
    this.rafId = null;
    this.running = false;
    this.quality = 'high';

    this.setQuality('high');
    this.bindInput();
    this.resize();
  }

  trackShared(res) {
    this.sharedAssets.push(res);
    return res;
  }

  buildSharedAssets() {
    // Reusable CD geometries + static optical/polycarbonate materials (massive perf win on Spindle & quick switching)
    const innerR = 0.078;
    const hubR = 0.185;
    const mirrorR = 0.215;
    const outerR = 0.62;
    const halfT = 0.008;

    const pts = [
      new THREE.Vector2(innerR, -halfT * 0.78),
      new THREE.Vector2(innerR + 0.006, -halfT),
      new THREE.Vector2(outerR - 0.01, -halfT),
      new THREE.Vector2(outerR, -halfT * 0.42),
      new THREE.Vector2(outerR, halfT * 0.42),
      new THREE.Vector2(outerR - 0.01, halfT),
      new THREE.Vector2(innerR + 0.006, halfT),
      new THREE.Vector2(innerR, halfT * 0.78),
      new THREE.Vector2(innerR, -halfT * 0.78)
    ];

    const bodyGeo = this.trackShared(new THREE.LatheGeometry(pts, 72));
    const clampGeo = this.trackShared(new THREE.TorusGeometry(hubR * 0.78, 0.0045, 10, 48));
    const mirrorGeo = this.trackShared(new THREE.RingGeometry(hubR, mirrorR, 64));

    const labelGeo = this.trackShared(new THREE.RingGeometry(mirrorR, outerR - 0.013, 72, 1));
    const pos = labelGeo.attributes.position;
    const uv = labelGeo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / (outerR * 2) + 0.5, pos.getY(i) / (outerR * 2) + 0.5);
    }

    const bottomGeo = this.trackShared(new THREE.RingGeometry(hubR * 0.94, outerR - 0.01, 72, 1));
    const bPos = bottomGeo.attributes.position;
    const bUv = bottomGeo.attributes.uv;
    for (let i = 0; i < bPos.count; i++) {
      bUv.setXY(i, bPos.getX(i) / (outerR * 2) + 0.5, bPos.getY(i) / (outerR * 2) + 0.5);
    }

    const auraGeo = this.trackShared(new THREE.RingGeometry(outerR + 0.004, outerR + 0.045, 72));

    const polyMat = this.trackShared(
      new THREE.MeshPhysicalMaterial({
        color: 0xdbeafe,
        metalness: 0.14,
        roughness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.04,
        transparent: true,
        opacity: 0.45
      })
    );
    const mirrorMat = this.trackShared(
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.98, roughness: 0.08 })
    );
    const bottomMat = this.trackShared(
      new THREE.MeshPhysicalMaterial({
        color: 0xdbeafe,
        metalness: 0.96,
        roughness: 0.12,
        normalMap: this.grooveNormalMap,
        normalScale: new THREE.Vector2(0.58, 0.58),
        iridescence: 1.0,
        iridescenceIOR: 1.44,
        iridescenceThicknessRange: [180, 620],
        clearcoat: 1.0,
        clearcoatRoughness: 0.04
      })
    );

    // Reusable Game Case shell & sleeve geometries
    const W = 1.42;
    const H = 1.92;
    const D = 0.148;
    const plateCore = 0.014;
    const bevel = 0.004;
    const plateTotal = plateCore + bevel * 2;
    const innerSpanZ = D - plateTotal * 2;
    const artW = W - 0.058;
    const artH = H - 0.058;
    const wallT = 0.018;
    const spineR = D / 2 - 0.004;

    const shellShape = createRoundedRectShape(W - bevel * 2, H - bevel * 2, 0.036);
    const backGeo = this.trackShared(
      new THREE.ExtrudeGeometry(shellShape, {
        depth: plateCore,
        bevelEnabled: true,
        bevelThickness: bevel,
        bevelSize: bevel,
        bevelSegments: 3
      })
    );
    backGeo.center();

    const artGeo = this.trackShared(this.createRoundedArtGeometry(artW, artH, 0.024));
    const hRailGeo = this.trackShared(new THREE.BoxGeometry(W - 0.022, wallT, innerSpanZ + 0.002));
    const rightRailGeo = this.trackShared(new THREE.BoxGeometry(wallT, H - 0.024, innerSpanZ + 0.002));
    const latchGeo = this.trackShared(new THREE.BoxGeometry(0.008, 0.24, 0.036));
    const spineGeo = this.trackShared(
      new THREE.CylinderGeometry(spineR, spineR, H - 0.016, 18, 1, false, Math.PI, Math.PI)
    );
    const spineArtGeo = this.trackShared(
      new THREE.CylinderGeometry(spineR + 0.0018, spineR + 0.0018, H - 0.058, 16, 1, true, Math.PI + 0.18, Math.PI - 0.36)
    );
    const wellOuterGeo = this.trackShared(new THREE.RingGeometry(0.585, 0.618, 48));
    const wellRimGeo = this.trackShared(new THREE.TorusGeometry(0.595, 0.013, 10, 48));
    const hubRingGeo = this.trackShared(new THREE.CylinderGeometry(0.07, 0.076, 0.032, 20));
    const prongGeo = this.trackShared(new THREE.BoxGeometry(0.017, 0.044, 0.022));
    const bookletGeo = this.trackShared(new THREE.BoxGeometry(W * 0.74, H * 0.82, 0.012));
    const clipGeo = this.trackShared(new THREE.BoxGeometry(0.06, 0.13, 0.018));

    const smokePolyMat = this.trackShared(
      new THREE.MeshPhysicalMaterial({
        color: 0x141822,
        roughness: 0.2,
        metalness: 0.06,
        clearcoat: 0.95,
        clearcoatRoughness: 0.08
      })
    );
    const sleeveFilmMat = this.trackShared(
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.14,
        roughness: 0.07,
        metalness: 0.06,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        normalMap: this.sleeveNormalMap,
        normalScale: new THREE.Vector2(0.16, 0.16),
        depthWrite: false
      })
    );
    const wellOuterMat = this.trackShared(
      new THREE.MeshStandardMaterial({ color: 0x0a0c10, roughness: 0.55 })
    );

    return {
      disc: { innerR, hubR, mirrorR, outerR, halfT, bodyGeo, clampGeo, mirrorGeo, labelGeo, bottomGeo, auraGeo, polyMat, mirrorMat, bottomMat },
      caseBox: { W, H, D, plateTotal, wallT, backGeo, artGeo, hRailGeo, rightRailGeo, latchGeo, spineGeo, spineArtGeo, wellOuterGeo, wellRimGeo, hubRingGeo, prongGeo, bookletGeo, clipGeo, smokePolyMat, sleeveFilmMat, wellOuterMat }
    };
  }

  setQuality(quality) {
    this.quality = quality || 'high';
    const dpr = window.devicePixelRatio || 1;
    if (quality === 'performance') {
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.scene.environment = null;
      if (this.particles) this.particles.visible = false;
    } else if (quality === 'balanced') {
      this.renderer.setPixelRatio(Math.min(dpr, 1.25));
      this.renderer.shadowMap.enabled = true;
      this.scene.environment = this.envTexture;
      if (this.particles) this.particles.visible = true;
      if (this.keyLight) {
        this.keyLight.shadow.mapSize.set(512, 512);
        this.keyLight.shadow.map?.dispose();
        this.keyLight.shadow.map = null;
      }
    } else {
      this.renderer.setPixelRatio(Math.min(dpr, 1.75));
      this.renderer.shadowMap.enabled = true;
      this.scene.environment = this.envTexture;
      if (this.particles) this.particles.visible = true;
      if (this.keyLight) {
        this.keyLight.shadow.mapSize.set(1024, 1024);
        this.keyLight.shadow.map?.dispose();
        this.keyLight.shadow.map = null;
      }
    }
    this.resize();
  }

  setupLights() {
    const ambient = new THREE.HemisphereLight(0xe2e8f0, 0x090b10, 0.82);
    this.scene.add(ambient);

    const key = new THREE.DirectionalLight(0xffffff, 2.35);
    key.position.set(3.4, 5.2, 4.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.bias = -0.0005;
    this.scene.add(key);
    this.keyLight = key;

    const rim = new THREE.DirectionalLight(0x38bdf8, 1.45);
    rim.position.set(-4.2, 2.2, -3.5);
    this.scene.add(rim);
    this.rimLight = rim;

    const fill = new THREE.PointLight(0xf472b6, 0.72, 12);
    fill.position.set(3.2, -1.6, 2.8);
    this.scene.add(fill);
  }

  setupPedestal() {
    const floorGeo = new THREE.CircleGeometry(2.8, 48);
    const floorMat = new THREE.ShadowMaterial({ opacity: 0.42 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -1.2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Subtle accent halo ring beneath showcase model
    const ringGeo = this.trackShared(new THREE.RingGeometry(1.12, 1.155, 72));
    const ringMat = this.trackShared(
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.24,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -1.19;
    this.scene.add(ringMesh);
    this.stageRingMat = ringMat;
  }

  buildAmbientParticles() {
    const count = 64;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 6.5;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 3.8;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 4.5 - 0.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.055,
      map: this.particleTex,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    return new THREE.Points(geo, mat);
  }

  buildWoodenDesk() {
    const deskGroup = new THREE.Group();
    const slabGeo = new THREE.BoxGeometry(6.8, 0.14, 3.6);
    const slabMat = new THREE.MeshPhysicalMaterial({
      map: this.woodTexture,
      roughness: 0.45,
      metalness: 0.04,
      clearcoat: 0.32,
      clearcoatRoughness: 0.25
    });
    const slab = new THREE.Mesh(slabGeo, slabMat);
    slab.receiveShadow = true;
    deskGroup.add(slab);

    const edgeGeo = new THREE.BoxGeometry(6.82, 0.035, 0.04);
    const edgeMat = new THREE.MeshStandardMaterial({ color: 0x1e110a, roughness: 0.55 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(0, 0.055, 1.8);
    deskGroup.add(edge);

    return deskGroup;
  }

  buildConsoleAssembly() {
    const group = new THREE.Group();

    const chassisShape = createRoundedRectShape(2.15, 1.48, 0.09);
    const chassisGeo = new THREE.ExtrudeGeometry(chassisShape, {
      depth: 0.32,
      bevelEnabled: true,
      bevelThickness: 0.025,
      bevelSize: 0.025,
      bevelSegments: 3
    });
    chassisGeo.center();

    const chassisMat = new THREE.MeshPhysicalMaterial({
      color: 0x11151e,
      metalness: 0.44,
      roughness: 0.34,
      clearcoat: 0.55,
      clearcoatRoughness: 0.22
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.rotation.x = Math.PI / 2;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    const trimGeo = new THREE.BoxGeometry(2.16, 0.042, 1.49);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x2b3345, metalness: 0.85, roughness: 0.26 });
    const trim = new THREE.Mesh(trimGeo, trimMat);
    trim.position.y = 0.075;
    group.add(trim);

    const bezelGeo = new THREE.BoxGeometry(1.42, 0.075, 0.04);
    const bezelMat = new THREE.MeshStandardMaterial({ color: 0x040508, roughness: 0.65, metalness: 0.2 });
    const bezel = new THREE.Mesh(bezelGeo, bezelMat);
    bezel.position.set(0, 0.025, 0.755);
    group.add(bezel);

    const slotGeo = new THREE.BoxGeometry(1.3, 0.024, 0.045);
    const slotMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const slotGlow = new THREE.Mesh(slotGeo, slotMat);
    slotGlow.position.set(0, 0.025, 0.762);
    group.add(slotGlow);

    const beamGeo = new THREE.PlaneGeometry(1.34, 0.26);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.0,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const slotBeam = new THREE.Mesh(beamGeo, beamMat);
    slotBeam.rotation.x = Math.PI / 2;
    slotBeam.position.set(0, 0.025, 0.9);
    group.add(slotBeam);

    const ledGeo = new THREE.BoxGeometry(0.42, 0.016, 0.02);
    const ledMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const ledBar = new THREE.Mesh(ledGeo, ledMat);
    ledBar.position.set(0, -0.075, 0.765);
    group.add(ledBar);

    // Motorized Optical Disc Tray Drawer (slides out of front bezel, holds flat disc inside cradle, retracts into console)
    const trayGroup = new THREE.Group();
    trayGroup.position.set(0, 0.012, 0);
    trayGroup.visible = false;

    const trayBedMat = new THREE.MeshPhysicalMaterial({
      color: 0x0b0f17,
      roughness: 0.42,
      metalness: 0.22,
      clearcoat: 0.35
    });
    const trayRimMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
      side: THREE.DoubleSide
    });
    const trayFaceMat = new THREE.MeshPhysicalMaterial({
      color: 0x161d2b,
      roughness: 0.25,
      metalness: 0.65,
      clearcoat: 0.8
    });

    const trayBedGeo = new THREE.BoxGeometry(1.38, 0.024, 1.36);
    const trayBed = new THREE.Mesh(trayBedGeo, trayBedMat);
    trayBed.position.set(0, -0.008, 0);
    trayBed.castShadow = true;
    trayBed.receiveShadow = true;
    trayGroup.add(trayBed);

    const cradleRingGeo = new THREE.RingGeometry(0.59, 0.635, 64);
    const cradleRing = new THREE.Mesh(cradleRingGeo, trayRimMat);
    cradleRing.rotation.x = -Math.PI / 2;
    cradleRing.position.set(0, 0.006, 0);
    trayGroup.add(cradleRing);

    const traySpindleGeo = new THREE.CylinderGeometry(0.068, 0.074, 0.024, 24);
    const traySpindle = new THREE.Mesh(traySpindleGeo, trayFaceMat);
    traySpindle.position.set(0, 0.014, 0);
    trayGroup.add(traySpindle);

    const trayFrontGeo = new THREE.BoxGeometry(1.42, 0.056, 0.032);
    const trayFront = new THREE.Mesh(trayFrontGeo, trayFaceMat);
    trayFront.position.set(0, 0.004, 0.69);
    trayGroup.add(trayFront);

    group.add(trayGroup);

    // Holographic Console Startup Boot Screen (rises cleanly above console after disc inserts!)
    const screenCanvas = document.createElement('canvas');
    screenCanvas.width = 768;
    screenCanvas.height = 420;
    const screenCtx = screenCanvas.getContext('2d');
    const screenTex = new THREE.CanvasTexture(screenCanvas);
    screenTex.colorSpace = THREE.SRGBColorSpace;

    const screenGeo = new THREE.PlaneGeometry(1.86, 1.02);
    const screenMat = new THREE.MeshBasicMaterial({
      map: screenTex,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0.78, 0.05);
    screenMesh.visible = false;
    group.add(screenMesh);

    const trayMats = [trayBedMat, trayRimMat, trayFaceMat];
    return {
      group,
      slotMat,
      ledMat,
      beamMat,
      trayGroup,
      trayRimMat,
      trayMats,
      screenMesh,
      screenMat,
      screenCanvas,
      screenCtx,
      screenTex
    };
  }

  drawConsoleBootScreen(progress, gameTitle, accentColor) {
    const { screenCtx: ctx, screenCanvas: c, screenTex } = this.consoleParts;
    const w = c.width;
    const h = c.height;
    const accent = accentColor || '#38bdf8';

    ctx.clearRect(0, 0, w, h);

    // Translucent dark OLED boot panel
    ctx.fillStyle = 'rgba(7, 10, 17, 0.94)';
    ctx.beginPath();
    ctx.roundRect(12, 12, w - 24, h - 24, 24);
    ctx.fill();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Animated concentric optical ring emblem
    const cx = w / 2;
    const cy = 154;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, 62, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = accent;
    ctx.lineWidth = 7;
    const spin = progress * Math.PI * 6;
    ctx.beginPath();
    ctx.arc(cx, cy, 62, spin, spin + Math.PI * 1.25);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx, cy, 18, 0, Math.PI * 2);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(148, 163, 184, 0.9)';
    ctx.font = '700 20px monospace';
    ctx.fillText(progress < 0.7 ? 'SYSTEM BOOT // READING OPTICAL DISC' : 'DISC VERIFIED // STARTING APPLICATION', cx, 255);

    ctx.fillStyle = '#ffffff';
    ctx.font = '800 34px "Segoe UI", sans-serif';
    const title = (gameTitle || 'GAME').slice(0, 28);
    ctx.fillText(title, cx, 305);

    // Progress bar
    const barW = 520;
    const barX = cx - barW / 2;
    const barY = 355;
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    ctx.beginPath();
    ctx.roundRect(barX, barY, barW, 14, 7);
    ctx.fill();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.roundRect(barX, barY, Math.max(16, barW * Math.min(1, progress)), 14, 7);
    ctx.fill();

    screenTex.needsUpdate = true;
  }

  bindInput() {
    const dom = this.renderer.domElement;

    this._onPointerDown = (e) => {
      if (this.consoleSequence) return;
      if (this.subMode === 'unwrap' && this.unwrapState) {
        this.setUnwrapHolding(true);
        return;
      }
      this.isDragging = true;
      this.pointerDownPos = { x: e.clientX, y: e.clientY };
      this.lastPointer = { x: e.clientX, y: e.clientY };
      dom.setPointerCapture(e.pointerId);
    };

    this._onPointerMove = (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastPointer.x;
      const dy = e.clientY - this.lastPointer.y;
      this.lastPointer = { x: e.clientX, y: e.clientY };
      this.targetRotY += dx * 0.0085;
      this.targetRotX = Math.max(-1.35, Math.min(1.35, this.targetRotX + dy * 0.0085));
    };

    this._onPointerUp = (e) => {
      if (this.subMode === 'unwrap' && this.unwrapState) {
        this.setUnwrapHolding(false);
        return;
      }
      const moved = Math.hypot(e.clientX - this.pointerDownPos.x, e.clientY - this.pointerDownPos.y);
      this.isDragging = false;
      try {
        dom.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }

      if (moved < 6 && !this.consoleSequence && this.activeAssembly) {
        this.handleDirectClick(e);
      }
    };

    this._onWheel = (e) => {
      e.preventDefault();
      if (this.consoleSequence || this.subMode === 'unwrap') return;
      this.targetZoom = Math.max(2.7, Math.min(6.4, this.targetZoom + e.deltaY * 0.0024));
    };

    dom.addEventListener('pointerdown', this._onPointerDown);
    dom.addEventListener('pointermove', this._onPointerMove);
    dom.addEventListener('pointerup', this._onPointerUp);
    dom.addEventListener('pointercancel', this._onPointerUp);
    dom.addEventListener('wheel', this._onWheel, { passive: false });
  }

  handleDirectClick(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);

    if (this.subMode === 'manual' && this.manualState) {
      if (ndc.x >= 0) this.flipManualPage(1);
      else this.flipManualPage(-1);
      this.callbacks.onStateChange?.();
      return;
    }

    if (this.subMode === 'shelf' && this.shelfState) {
      const hits = this.raycaster.intersectObjects(this.shelfState.items.map((i) => i.group), true);
      if (hits.length > 0) {
        let obj = hits[0].object;
        while (obj && !obj.userData?.gameId) obj = obj.parent;
        if (obj?.userData?.gameId) {
          this.callbacks.onSelectGame?.(obj.userData.gameId);
          return;
        }
      }
      return;
    }

    if (this.mode === 'case') {
      if (this.discMeshGroup && this.isCaseOpen) {
        const discHits = this.raycaster.intersectObject(this.discMeshGroup, true);
        if (discHits.length > 0) {
          this.toggleDiscEject();
          this.callbacks.onStateChange?.();
          return;
        }
      }
      const caseHits = this.raycaster.intersectObject(this.activeAssembly, true);
      if (caseHits.length > 0) {
        this.toggleCaseOpen();
        this.callbacks.onStateChange?.();
      }
    } else if (this.mode === 'cd') {
      const hits = this.raycaster.intersectObject(this.activeAssembly, true);
      if (hits.length > 0) {
        this.triggerSpinBurst();
      }
    }
  }

  track(resource) {
    this.disposables.push(resource);
    return resource;
  }

  clearModel() {
    if (this.activeAssembly) {
      this.rootGroup.remove(this.activeAssembly);
      this.activeAssembly = null;
    }
    this.frontHinge = null;
    this.discPivot = null;
    this.discMeshGroup = null;
    this.manualHotspot = null;
    this.spinAuraMat = null;
    this.manualState = null;
    this.unwrapState = null;
    this.shelfState = null;
    for (const item of this.disposables) {
      item?.dispose?.();
    }
    this.disposables = [];
  }

  buildDiscAssembly(game, artImg) {
    const d = this.shared.disc;
    const discGroup = new THREE.Group();

    const bodyMesh = new THREE.Mesh(d.bodyGeo, d.polyMat);
    bodyMesh.castShadow = true;
    discGroup.add(bodyMesh);

    const clampMesh = new THREE.Mesh(d.clampGeo, d.polyMat);
    clampMesh.rotation.x = Math.PI / 2;
    clampMesh.position.y = d.halfT + 0.0012;
    discGroup.add(clampMesh);

    const mirrorMesh = new THREE.Mesh(d.mirrorGeo, d.mirrorMat);
    mirrorMesh.rotation.x = -Math.PI / 2;
    mirrorMesh.position.y = d.halfT + 0.0014;
    discGroup.add(mirrorMesh);

    const labelTex = this.track(createDiscLabelTexture(game, artImg));
    const labelMat = this.track(
      new THREE.MeshPhysicalMaterial({
        map: labelTex,
        roughness: 0.34,
        metalness: 0.14,
        clearcoat: 0.58,
        clearcoatRoughness: 0.2
      })
    );
    const labelMesh = new THREE.Mesh(d.labelGeo, labelMat);
    labelMesh.rotation.x = -Math.PI / 2;
    labelMesh.position.y = d.halfT + 0.0016;
    labelMesh.castShadow = true;
    discGroup.add(labelMesh);

    const bottomMesh = new THREE.Mesh(d.bottomGeo, d.bottomMat);
    bottomMesh.rotation.x = Math.PI / 2;
    bottomMesh.position.y = -d.halfT - 0.0014;
    discGroup.add(bottomMesh);

    const auraMat = this.track(
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(game.accent || '#38bdf8'),
        transparent: true,
        opacity: 0.0,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
      })
    );
    const auraMesh = new THREE.Mesh(d.auraGeo, auraMat);
    auraMesh.rotation.x = -Math.PI / 2;
    discGroup.add(auraMesh);
    this.spinAuraMat = auraMat;

    return discGroup;
  }

  createRoundedArtGeometry(w, h, r) {
    const shape = createRoundedRectShape(w, h, r);
    const geo = new THREE.ShapeGeometry(shape, 8);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      uv.setXY(i, pos.getX(i) / w + 0.5, pos.getY(i) / h + 0.5);
    }
    return geo;
  }

  buildCaseAssembly(game, frontImg, backImg) {
    const c = this.shared.caseBox;
    const { W, H, D, plateTotal, wallT } = c;
    const caseRoot = new THREE.Group();

    const trayColor = new THREE.Color(game.secondary || '#151922').lerp(new THREE.Color('#0c0f15'), 0.65);
    const trayMat = this.track(
      new THREE.MeshPhysicalMaterial({
        color: trayColor,
        roughness: 0.38,
        metalness: 0.08,
        clearcoat: 0.45,
        clearcoatRoughness: 0.25
      })
    );

    const backShell = new THREE.Mesh(c.backGeo, c.smokePolyMat);
    backShell.position.z = -D / 2 + plateTotal / 2;
    backShell.castShadow = true;
    backShell.receiveShadow = true;
    caseRoot.add(backShell);

    const backTex = this.track(createBackCoverTexture(game, frontImg, backImg));
    const backArtMat = this.track(new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.34 }));
    const backArt = new THREE.Mesh(c.artGeo, backArtMat);
    backArt.rotation.y = Math.PI;
    backArt.position.z = -D / 2 - 0.0012;
    caseRoot.add(backArt);

    const backFilm = new THREE.Mesh(c.artGeo, c.sleeveFilmMat);
    backFilm.rotation.y = Math.PI;
    backFilm.position.z = -D / 2 - 0.0024;
    caseRoot.add(backFilm);

    const topRail = new THREE.Mesh(c.hRailGeo, c.smokePolyMat);
    topRail.position.set(0, H / 2 - wallT / 2 - 0.002, 0);
    caseRoot.add(topRail);

    const botRail = new THREE.Mesh(c.hRailGeo, c.smokePolyMat);
    botRail.position.set(0, -H / 2 + wallT / 2 + 0.002, 0);
    caseRoot.add(botRail);

    const rightRail = new THREE.Mesh(c.rightRailGeo, c.smokePolyMat);
    rightRail.position.set(W / 2 - wallT / 2 - 0.002, 0, 0);
    caseRoot.add(rightRail);

    for (const ly of [-0.25, 0.25]) {
      const latch = new THREE.Mesh(c.latchGeo, trayMat);
      latch.position.set(W / 2 - 0.002, ly, 0);
      caseRoot.add(latch);
    }

    const spineMesh = new THREE.Mesh(c.spineGeo, c.smokePolyMat);
    spineMesh.position.set(-W / 2 + 0.002, 0, 0);
    spineMesh.castShadow = true;
    caseRoot.add(spineMesh);

    const spineTex = this.track(createSpineTexture(game));
    const spineArtMat = this.track(new THREE.MeshPhysicalMaterial({ map: spineTex, roughness: 0.28, clearcoat: 0.85 }));
    const spineArt = new THREE.Mesh(c.spineArtGeo, spineArtMat);
    spineArt.position.set(-W / 2 + 0.002, 0, 0);
    caseRoot.add(spineArt);

    const wellX = 0.02;
    const wellY = -0.04;
    const wellPlate = new THREE.Mesh(c.wellOuterGeo, c.wellOuterMat);
    wellPlate.position.set(wellX, wellY, -D / 2 + plateTotal + 0.002);
    caseRoot.add(wellPlate);

    const wellRim = new THREE.Mesh(c.wellRimGeo, trayMat);
    wellRim.position.set(wellX, wellY, -D / 2 + plateTotal + 0.006);
    caseRoot.add(wellRim);

    const hubGroup = new THREE.Group();
    hubGroup.position.set(wellX, wellY, -D / 2 + plateTotal + 0.014);
    const hubRing = new THREE.Mesh(c.hubRingGeo, trayMat);
    hubRing.rotation.x = Math.PI / 2;
    hubGroup.add(hubRing);

    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const prong = new THREE.Mesh(c.prongGeo, c.smokePolyMat);
      prong.position.set(Math.cos(a) * 0.042, Math.sin(a) * 0.042, 0.011);
      prong.rotation.z = a + Math.PI / 2;
      hubGroup.add(prong);
    }
    caseRoot.add(hubGroup);

    const discPivot = new THREE.Group();
    discPivot.position.set(wellX, wellY, -D / 2 + plateTotal + 0.022);
    const disc = this.buildDiscAssembly(game, frontImg);
    disc.scale.setScalar(0.92);
    disc.rotation.x = Math.PI / 2;
    discPivot.add(disc);
    caseRoot.add(discPivot);
    this.discPivot = discPivot;
    this.discMeshGroup = disc;

    const hinge = new THREE.Group();
    hinge.position.set(-W / 2 + 0.002, 0, D / 2 - plateTotal / 2);

    const frontPanel = new THREE.Mesh(c.backGeo, c.smokePolyMat);
    frontPanel.position.x = W / 2 - 0.002;
    frontPanel.castShadow = true;
    hinge.add(frontPanel);

    const frontTex = this.track(createFrontCoverTexture(game, frontImg));
    const frontArtMat = this.track(new THREE.MeshStandardMaterial({ map: frontTex, roughness: 0.34 }));
    const frontArt = new THREE.Mesh(c.artGeo, frontArtMat);
    frontArt.position.set(W / 2 - 0.002, 0, plateTotal / 2 + 0.0012);
    hinge.add(frontArt);

    const frontFilm = new THREE.Mesh(c.artGeo, c.sleeveFilmMat);
    frontFilm.position.set(W / 2 - 0.002, 0, plateTotal / 2 + 0.0024);
    hinge.add(frontFilm);

    const manualTex = this.track(createManualPageTexture(game, 0, frontImg));
    const bookletMat = this.track(new THREE.MeshStandardMaterial({ map: manualTex, roughness: 0.45 }));
    const booklet = new THREE.Mesh(c.bookletGeo, bookletMat);
    booklet.position.set(W * 0.5, 0, -plateTotal / 2 - 0.009);
    hinge.add(booklet);
    this.manualHotspot = booklet;

    for (const cy of [-0.46, 0.46]) {
      const clip = new THREE.Mesh(c.clipGeo, c.smokePolyMat);
      clip.position.set(W - 0.14, cy, -plateTotal / 2 - 0.011);
      hinge.add(clip);
    }

    caseRoot.add(hinge);
    this.frontHinge = hinge;

    return caseRoot;
  }

  // =========================================================
  // WORKING 3D MANUAL WITH FLOPPY PAGE TURNING PHYSICS
  // =========================================================
  async openManualMode() {
    if (!this.currentGame) return;
    this.subMode = 'manual';
    const game = this.currentGame;
    const frontImg = await loadImageElement(game.artwork);

    this.clearModel();
    this.subMode = 'manual';

    const pageW = 0.96;
    const pageH = 1.38;

    const pageTextures = [];
    const officialUrls = Array.isArray(game.manualPages) ? game.manualPages : [];
    if (officialUrls.length >= 2) {
      const loadedImgs = await Promise.all(officialUrls.map((u) => loadImageElement(u)));
      for (const pImg of loadedImgs) {
        if (!pImg) continue;
        const c = document.createElement('canvas');
        c.width = 720;
        c.height = 1024;
        const pctx = c.getContext('2d');
        pctx.fillStyle = '#f8f6f0';
        pctx.fillRect(0, 0, c.width, c.height);
        pctx.imageSmoothingEnabled = true;
        pctx.imageSmoothingQuality = 'high';
        pctx.drawImage(pImg, 0, 0, c.width, c.height);
        const tex = new THREE.CanvasTexture(c);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = 4;
        pageTextures.push(this.track(tex));
      }
      if (pageTextures.length % 2 === 1) {
        pageTextures.push(this.track(createManualPageTexture(game, 5, frontImg)));
      }
    }

    if (pageTextures.length < 2) {
      const totalPages = 6;
      for (let i = 0; i < totalPages; i++) {
        pageTextures.push(this.track(createManualPageTexture(game, i, frontImg)));
      }
    }

    const maxSpread = Math.max(0, Math.floor(pageTextures.length / 2) - 1);

    const bookGroup = new THREE.Group();

    // Left stack & right stack static pages
    const baseGeo = this.track(new THREE.PlaneGeometry(pageW, pageH, 16, 12));
    // Curve the resting open book pages slightly outward for realism
    const basePos = baseGeo.attributes.position;
    for (let i = 0; i < basePos.count; i++) {
      const x = basePos.getX(i);
      const u = (x + pageW / 2) / pageW;
      basePos.setZ(i, Math.sin(u * Math.PI) * 0.032);
    }
    baseGeo.computeVertexNormals();

    const leftMat = this.track(new THREE.MeshStandardMaterial({ map: pageTextures[0], roughness: 0.48 }));
    const leftMesh = new THREE.Mesh(baseGeo, leftMat);
    leftMesh.position.x = -pageW / 2 - 0.01;
    bookGroup.add(leftMesh);

    const rightMat = this.track(new THREE.MeshStandardMaterial({ map: pageTextures[1], roughness: 0.48 }));
    const rightMesh = new THREE.Mesh(baseGeo, rightMat);
    rightMesh.position.x = pageW / 2 + 0.01;
    bookGroup.add(rightMesh);

    // Center spine binding strip
    const spineGeo = this.track(new THREE.CylinderGeometry(0.025, 0.025, pageH, 12));
    const spineMat = this.track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 }));
    const spineMesh = new THREE.Mesh(spineGeo, spineMat);
    spineMesh.position.z = -0.015;
    bookGroup.add(spineMesh);

    // Active floppy turning leaf (pivoted at spine x = 0; separate front/back geometries prevent mirrored text)
    const leafFrontGeo = this.track(new THREE.PlaneGeometry(pageW, pageH, 24, 14));
    leafFrontGeo.translate(pageW / 2, 0, 0);
    const restFront = new Float32Array(leafFrontGeo.attributes.position.array);

    const leafBackGeo = this.track(new THREE.PlaneGeometry(pageW, pageH, 24, 14));
    leafBackGeo.rotateY(Math.PI);
    leafBackGeo.translate(pageW / 2, 0, 0);
    const restBack = new Float32Array(leafBackGeo.attributes.position.array);

    const leafFrontMat = this.track(
      new THREE.MeshStandardMaterial({ map: pageTextures[1], roughness: 0.44, side: THREE.FrontSide })
    );
    const leafBackMat = this.track(
      new THREE.MeshStandardMaterial({ map: pageTextures[2], roughness: 0.44, side: THREE.FrontSide })
    );
    const leafFrontMesh = new THREE.Mesh(leafFrontGeo, leafFrontMat);
    const leafBackMesh = new THREE.Mesh(leafBackGeo, leafBackMat);
    const leafPivot = new THREE.Group();
    leafPivot.position.z = 0.018;
    leafPivot.add(leafFrontMesh, leafBackMesh);
    leafPivot.visible = false;
    bookGroup.add(leafPivot);

    this.activeAssembly = bookGroup;
    this.rootGroup.add(bookGroup);

    this.manualState = {
      spreadIndex: 0,
      maxSpread,
      totalPages: pageTextures.length,
      pageTextures,
      leftMat,
      rightMat,
      leafPivot,
      leafFrontGeo,
      leafBackGeo,
      restFront,
      restBack,
      leafFrontMat,
      leafBackMat,
      flipping: false,
      flipDir: 1,
      flipProgress: 0
    };

    this.targetRootX = 0;
    this.targetRootY = 0.02;
    this.targetRootZ = 0;
    this.targetRotX = -0.14;
    this.targetRotY = 0;
    this.targetZoom = 3.6;
  }

  flipManualPage(dir) {
    const ms = this.manualState;
    if (!ms || ms.flipping) return false;
    const nextSpread = ms.spreadIndex + dir;
    if (nextSpread < 0 || nextSpread > ms.maxSpread) return false;

    const curL = ms.spreadIndex * 2;
    const curR = curL + 1;
    const nextL = nextSpread * 2;
    const nextR = nextL + 1;

    ms.flipping = true;
    ms.flipDir = dir;
    ms.flipProgress = 0;
    ms.nextSpread = nextSpread;
    ms.leafFrontGeo.attributes.position.array.set(ms.restFront);
    ms.leafBackGeo.attributes.position.array.set(ms.restBack);
    ms.leafPivot.rotation.y = dir > 0 ? 0 : -Math.PI;
    ms.leafPivot.visible = true;

    if (dir > 0) {
      // Turning right page leftward
      ms.leafFrontMat.map = ms.pageTextures[curR];
      ms.leafBackMat.map = ms.pageTextures[nextL];
      ms.rightMat.map = ms.pageTextures[nextR];
      ms.leftMat.map = ms.pageTextures[curL];
    } else {
      // Turning left page rightward
      ms.leafFrontMat.map = ms.pageTextures[nextR];
      ms.leafBackMat.map = ms.pageTextures[curL];
      ms.leftMat.map = ms.pageTextures[nextL];
      ms.rightMat.map = ms.pageTextures[curR];
    }
    ms.leafFrontMat.needsUpdate = true;
    ms.leafBackMat.needsUpdate = true;
    ms.leftMat.needsUpdate = true;
    ms.rightMat.needsUpdate = true;
    return true;
  }

  updateManualAnimation(dt, time) {
    const ms = this.manualState;
    if (!ms) return;
    if (!ms.flipping) return;

    ms.flipProgress = Math.min(1, ms.flipProgress + dt * 0.88);
    const p = ms.flipProgress;
    const eased = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
    const angle = ms.flipDir > 0 ? -eased * Math.PI : -(1 - eased) * Math.PI;
    ms.leafPivot.rotation.y = angle;

    // Floppy paper vertex curl & corner flutter applied symmetrically to front and back page faces
    const frontPos = ms.leafFrontGeo.attributes.position;
    const backPos = ms.leafBackGeo.attributes.position;
    const restF = ms.restFront;
    const restB = ms.restBack;
    const bendStrength = Math.sin(p * Math.PI);
    const pageW = 0.96;

    for (let i = 0; i < frontPos.count; i++) {
      const rx = restF[i * 3];
      const ry = restF[i * 3 + 1];
      const u = rx / pageW;
      const v = (ry + 0.69) / 1.38;
      const archZ = Math.sin(u * Math.PI) * 0.14 * bendStrength;
      const cornerFlutter =
        Math.pow(u, 1.6) *
        Math.sin(p * Math.PI * 2.5 + v * 3.2) *
        0.045 *
        bendStrength;
      const droopY = -Math.pow(u, 2.0) * (1 - v) * 0.055 * bendStrength;
      frontPos.setXYZ(i, rx, ry + droopY, archZ + cornerFlutter + 0.0012);
    }

    for (let i = 0; i < backPos.count; i++) {
      const rx = restB[i * 3];
      const ry = restB[i * 3 + 1];
      const u = rx / pageW;
      const v = (ry + 0.69) / 1.38;
      const archZ = Math.sin(u * Math.PI) * 0.14 * bendStrength;
      const cornerFlutter =
        Math.pow(u, 1.6) *
        Math.sin(p * Math.PI * 2.5 + v * 3.2) *
        0.045 *
        bendStrength;
      const droopY = -Math.pow(u, 2.0) * (1 - v) * 0.055 * bendStrength;
      backPos.setXYZ(i, rx, ry + droopY, archZ + cornerFlutter - 0.0012);
    }

    frontPos.needsUpdate = true;
    backPos.needsUpdate = true;
    ms.leafFrontGeo.computeVertexNormals();
    ms.leafBackGeo.computeVertexNormals();

    if (ms.flipProgress >= 1) {
      ms.flipping = false;
      ms.leafPivot.visible = false;
      frontPos.array.set(ms.restFront);
      backPos.array.set(ms.restBack);
      frontPos.needsUpdate = true;
      backPos.needsUpdate = true;
      ms.leafFrontGeo.computeVertexNormals();
      ms.leafBackGeo.computeVertexNormals();

      ms.spreadIndex = ms.nextSpread;
      ms.leftMat.map = ms.pageTextures[ms.spreadIndex * 2];
      ms.rightMat.map = ms.pageTextures[ms.spreadIndex * 2 + 1];
      ms.leftMat.needsUpdate = true;
      ms.rightMat.needsUpdate = true;
      this.callbacks.onStateChange?.();
    }
  }

  // =========================================================
  // SEALED PLASTIC-WRAPPED NEW GAME CASE + HOLD TO UNWRAP
  // =========================================================
  async startUnwrapMode(onUnwrapComplete) {
    this.subMode = 'unwrap';
    this.clearModel();
    this.subMode = 'unwrap';

    const placeholderGame = {
      title: 'NEW EDITION',
      platform: 'PC DVD',
      genre: 'SEALED COPY',
      year: String(new Date().getFullYear()),
      accent: '#38bdf8',
      secondary: '#182032'
    };

    const caseAssembly = this.buildCaseAssembly(placeholderGame, null, null);
    this.activeAssembly = caseAssembly;
    this.rootGroup.add(caseAssembly);

    // Realistic shrink-wrap outer sleeves (Top half + Bottom half + Tear-Strip Pull Ribbon)
    const W = 1.365;
    const H = 1.905;
    const D = 0.162;

    const wrapMat = this.track(
      new THREE.MeshPhysicalMaterial({
        color: 0xeef6ff,
        transparent: true,
        opacity: 0.42,
        roughness: 0.07,
        metalness: 0.08,
        clearcoat: 1.0,
        clearcoatRoughness: 0.03,
        normalMap: this.shrinkNormalMap,
        normalScale: new THREE.Vector2(0.55, 0.55),
        side: THREE.DoubleSide
      })
    );

    const topWrapGeo = this.track(new THREE.BoxGeometry(W, H * 0.72, D));
    const topWrap = new THREE.Mesh(topWrapGeo, wrapMat);
    topWrap.position.y = H * 0.14;
    caseAssembly.add(topWrap);

    const botWrapGeo = this.track(new THREE.BoxGeometry(W, H * 0.28, D));
    const botWrap = new THREE.Mesh(botWrapGeo, wrapMat);
    botWrap.position.y = -H * 0.36;
    caseAssembly.add(botWrap);

    // Factory tear-strip ribbon at the seam between top & bottom shrink-wrap
    const stripGeo = this.track(new THREE.BoxGeometry(W + 0.015, 0.042, D + 0.014));
    const stripMat = this.track(
      new THREE.MeshPhysicalMaterial({
        color: 0xf8fafc,
        transparent: true,
        opacity: 0.85,
        roughness: 0.15,
        metalness: 0.25,
        iridescence: 0.9
      })
    );
    const tearStrip = new THREE.Mesh(stripGeo, stripMat);
    tearStrip.position.y = -H * 0.22;
    caseAssembly.add(tearStrip);

    this.unwrapState = {
      holding: false,
      progress: 0,
      completed: false,
      topWrap,
      botWrap,
      tearStrip,
      wrapMat,
      stripMat,
      onUnwrapComplete
    };

    this.targetRootX = 0;
    this.targetRootY = 0.03;
    this.targetRootZ = 0;
    this.targetRotX = 0.08;
    this.targetRotY = -0.28;
    this.targetZoom = 3.95;
  }

  setUnwrapHolding(isHolding) {
    if (!this.unwrapState || this.unwrapState.completed) return;
    this.unwrapState.holding = Boolean(isHolding);
  }

  updateUnwrapAnimation(dt) {
    const us = this.unwrapState;
    if (!us || us.completed) return;

    if (us.holding) {
      us.progress = Math.min(1, us.progress + dt * 0.56);
    } else {
      us.progress = Math.max(0, us.progress - dt * 0.9);
    }

    const p = us.progress;
    this.callbacks.onUnwrapProgress?.(p);

    // Phase 1 (0 -> 0.35): Tear-strip peels cleanly across front
    const stripP = Math.min(1, p / 0.35);
    us.tearStrip.scale.x = Math.max(0.01, 1 - stripP);
    us.tearStrip.position.x = -0.68 * stripP;
    us.tearStrip.rotation.z = stripP * 0.35;
    us.stripMat.opacity = 0.85 * (1 - stripP * 0.6);

    // Phase 2 (0.35 -> 1.0): Top & bottom plastic sleeves crinkle, stretch & slide off!
    const peelP = Math.max(0, (p - 0.35) / 0.65);
    const eased = peelP * peelP;
    us.topWrap.position.y = 1.905 * 0.14 + eased * 1.65;
    us.botWrap.position.y = -1.905 * 0.36 - eased * 1.35;
    us.topWrap.scale.set(1 + eased * 0.12, 1 - eased * 0.25, 1 + eased * 0.2);
    us.botWrap.scale.set(1 + eased * 0.12, 1 - eased * 0.25, 1 + eased * 0.2);
    us.wrapMat.opacity = 0.42 * (1 - eased);

    // Gentle tactile tilt wobble while tearing plastic
    if (us.holding) {
      this.targetRotY = -0.28 + Math.sin(p * 18) * 0.05;
    }

    if (p >= 1 && !us.completed) {
      us.completed = true;
      us.topWrap.visible = false;
      us.botWrap.visible = false;
      us.tearStrip.visible = false;
      us.onUnwrapComplete?.();
    }
  }

  async setItem(game, mode) {
    if (this.consoleSequence?.discCarrier) {
      this.scene.remove(this.consoleSequence.discCarrier);
    }
    this.subMode = 'showcase';
    this.currentGame = game;
    this.mode = mode === 'case' ? 'case' : 'cd';
    this.isFlipped = false;
    this.isCaseOpen = false;
    this.isDiscEjected = false;
    this.consoleSequence = null;
    this.setDiscSlotClipping(false);
    this.setTrayClipping(false);
    this.deskGroup.visible = false;
    this.consoleGroup.visible = false;
    this.consoleParts.trayGroup.visible = false;
    this.consoleParts.trayGroup.position.set(0, 0.012, 0);
    this.targetCamY = 0.28;
    this._desiredLookTarget.set(0, 0, 0);
    this.consoleParts.beamMat.opacity = 0;
    this.consoleParts.screenMesh.visible = false;

    const [frontImg, backImg] = await Promise.all([
      loadImageElement(game?.artwork),
      loadImageElement(game?.backArtwork)
    ]);
    this.clearModel();

    if (!game) return;

    if (this.mode === 'cd') {
      const discPivot = new THREE.Group();
      const disc = this.buildDiscAssembly(game, frontImg);
      disc.rotation.x = Math.PI / 2;
      discPivot.add(disc);
      this.discPivot = discPivot;
      this.discMeshGroup = disc;
      this.activeAssembly = discPivot;
      this.targetRotX = 0.12;
      this.targetRotY = -0.22;
      this.targetZoom = 3.25;
      this.targetRootX = 0;
      this.targetRootY = 0.03;
      this.targetRootZ = 0;
      this.targetCamX = 0;
      this.spinVelocity = 0.35;
    } else {
      const caseAssembly = this.buildCaseAssembly(game, frontImg, backImg);
      this.activeAssembly = caseAssembly;
      this.targetRotX = 0.08;
      this.targetRotY = -0.32;
      this.targetZoom = 4.05;
      this.targetRootX = 0;
      this.targetRootY = 0.03;
      this.targetRootZ = 0;
      this.targetCamX = 0;
      this.spinVelocity = 0.25;
    }

    this.activeAssembly.visible = true;
    this.activeAssembly.scale.setScalar(0.86);
    this.rootGroup.add(this.activeAssembly);
  }

  flipDisc() {
    if (this.mode !== 'cd' || this.consoleSequence || (this.subMode !== 'showcase' && this.subMode !== 'shelf')) return false;
    this.isFlipped = !this.isFlipped;
    this.targetRotY = this.isFlipped ? Math.PI - 0.25 : -0.22;
    this.targetRotX = this.isFlipped ? -0.18 : 0.12;
    return this.isFlipped;
  }

  toggleCaseOpen(forceState = null) {
    if (this.mode !== 'case' || this.consoleSequence || (this.subMode !== 'showcase' && this.subMode !== 'shelf')) return false;
    this.isCaseOpen = forceState !== null ? forceState : !this.isCaseOpen;
    if (this.subMode === 'shelf') {
      if (!this.isCaseOpen) this.isDiscEjected = false;
      this.targetZoom = this.isCaseOpen ? 4.35 : 4.65;
      return this.isCaseOpen;
    }
    if (!this.isCaseOpen) {
      this.isDiscEjected = false;
      this.targetRootX = 0;
      this.targetZoom = 4.05;
      this.targetRotY = -0.32;
    } else {
      this.targetRootX = 0.36;
      this.targetZoom = 4.55;
      this.targetRotY = 0.22;
      this.targetRotX = 0.08;
    }
    return this.isCaseOpen;
  }

  toggleDiscEject(forceState = null) {
    if (this.mode !== 'case' || this.consoleSequence || (this.subMode !== 'showcase' && this.subMode !== 'shelf')) return false;
    const next = forceState !== null ? forceState : !this.isDiscEjected;
    if (next && !this.isCaseOpen) {
      this.toggleCaseOpen(true);
    }
    this.isDiscEjected = next;
    if (this.isDiscEjected) {
      this.spinVelocity = 0.9;
    }
    return this.isDiscEjected;
  }

  setAnglePreset(preset) {
    if (this.consoleSequence || (this.subMode !== 'showcase' && this.subMode !== 'shelf')) return;
    if (preset === 'front') {
      this.targetRotX = this.subMode === 'shelf' ? 0.16 : 0.08;
      this.targetRotY = this.mode === 'case' ? (this.isCaseOpen ? 0.22 : -0.32) : -0.22;
      this.isFlipped = false;
    } else if (preset === 'spine') {
      this.targetRotX = 0.04;
      this.targetRotY = Math.PI / 2 - 0.1;
    } else if (preset === 'back') {
      this.targetRotX = 0.06;
      this.targetRotY = Math.PI + 0.25;
    }
  }

  triggerSpinBurst() {
    this.spinVelocity = Math.max(this.spinVelocity, 16);
  }

  orbitBy(dx, dy) {
    if (this.consoleSequence) return;
    this.targetRotY += dx;
    this.targetRotX = Math.max(-1.35, Math.min(1.35, this.targetRotX + dy));
  }

  zoomBy(dz) {
    if (this.consoleSequence) return;
    this.targetZoom = Math.max(2.1, Math.min(7.8, this.targetZoom + dz));
  }

  setDiscSlotClipping(enabled) {
    if (!this.discMeshGroup) return;
    this.slotClipPlane.constant = -0.775;
    this.discMeshGroup.traverse((obj) => {
      if (obj.isMesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const mat of mats) {
          mat.clippingPlanes = enabled ? [this.slotClipPlane] : [];
          mat.needsUpdate = true;
        }
      }
    });
  }

  setTrayClipping(enabled) {
    if (!this.consoleParts?.trayMats) return;
    this.slotClipPlane.constant = -0.775;
    for (const mat of this.consoleParts.trayMats) {
      mat.clippingPlanes = enabled ? [this.slotClipPlane] : [];
      mat.needsUpdate = true;
    }
  }

  // =========================================================
  // 3D DOMINO CASE SHELF & DISC SPINDLE TOWER
  // =========================================================
  async setShelfMode(games, selectedId, mode) {
    if (this.consoleSequence?.discCarrier) {
      this.scene.remove(this.consoleSequence.discCarrier);
    }
    this.clearModel();
    this.subMode = 'shelf';
    this.mode = mode === 'case' ? 'case' : 'cd';
    this.consoleSequence = null;
    this.setDiscSlotClipping(false);
    this.setTrayClipping(false);
    this.deskGroup.visible = false;
    this.consoleGroup.visible = false;
    this.consoleParts.trayGroup.visible = false;
    this.consoleParts.trayGroup.position.set(0, 0.012, 0);
    this.targetCamY = 0.28;
    this._desiredLookTarget.set(0, 0, 0);

    const list = Array.isArray(games) ? games : [];
    const shelfRoot = new THREE.Group();
    const items = [];

    if (!list.length) {
      this.activeAssembly = shelfRoot;
      this.rootGroup.add(shelfRoot);
      return;
    }

    const artPairs = await Promise.all(
      list.map(async (g) => {
        const [f, b] = await Promise.all([
          loadImageElement(g.artwork),
          this.mode === 'case' ? loadImageElement(g.backArtwork) : Promise.resolve(null)
        ]);
        return { front: f, back: b };
      })
    );

    // Guard against async race if mode switched away mid-load
    if (this.subMode !== 'shelf') return;

    const selectedIdx = Math.max(
      0,
      list.findIndex((g) => g.id === selectedId)
    );
    this.currentGame = list[selectedIdx];

    if (this.mode === 'case') {
      // Domino Case Shelf: warm brushed walnut shelf + angled upright cases lined like dominoes
      const spacing = 0.44;
      const shelfWidth = Math.max(4.6, list.length * spacing + 1.8);
      const shelfMat = this.track(
        new THREE.MeshStandardMaterial({
          map: this.deskWoodTex,
          roughness: 0.44,
          metalness: 0.08
        })
      );
      const plankGeo = this.track(new THREE.BoxGeometry(shelfWidth, 0.12, 2.2));
      const plank = new THREE.Mesh(plankGeo, shelfMat);
      plank.position.set(0, -1.04, 0.08);
      plank.receiveShadow = true;
      shelfRoot.add(plank);

      const trimGeo = this.track(new THREE.BoxGeometry(shelfWidth + 0.04, 0.036, 0.05));
      const trimMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.65, roughness: 0.28 })
      );
      const trim = new THREE.Mesh(trimGeo, trimMat);
      trim.position.set(0, -1.0, 1.19);
      shelfRoot.add(trim);

      list.forEach((game, idx) => {
        const pair = artPairs[idx];
        const caseObj = this.buildCaseAssembly(game, pair.front, pair.back);
        const targetX = (idx - selectedIdx) * spacing;
        caseObj.position.set(targetX, 0, idx === selectedIdx ? 0.85 : 0);
        caseObj.rotation.set(0, idx === selectedIdx ? -0.22 : -0.62, 0);
        caseObj.traverse((child) => {
          child.userData.gameId = game.id;
        });
        shelfRoot.add(caseObj);
        items.push({
          game,
          index: idx,
          group: caseObj,
          discPivot: this.discPivot,
          discMeshGroup: this.discMeshGroup,
          frontHinge: this.frontHinge
        });
      });

      this.shelfState = {
        mode: 'case',
        selectedId: list[selectedIdx].id,
        selectedIdx,
        spacing,
        items
      };

      const selItem = items[selectedIdx];
      this.discPivot = selItem.discPivot;
      this.discMeshGroup = selItem.discMeshGroup;
      this.frontHinge = selItem.frontHinge;

      this.targetRootX = 0;
      this.targetRootY = 0.14;
      this.targetRootZ = 0;
      this.targetRotX = 0.16;
      this.targetRotY = 0.08;
      this.targetZoom = 4.65;
      this.targetCamX = 0;
    } else {
      // Disc Spindle Tower: heavy brushed alloy base + tall chrome center spindle post
      const baseMat = this.track(
        new THREE.MeshPhysicalMaterial({
          color: 0x1e293b,
          metalness: 0.82,
          roughness: 0.26,
          clearcoat: 0.6
        })
      );
      const basePlateGeo = this.track(new THREE.CylinderGeometry(0.88, 0.96, 0.11, 48));
      const basePlate = new THREE.Mesh(basePlateGeo, baseMat);
      basePlate.position.y = -0.96;
      basePlate.receiveShadow = true;
      shelfRoot.add(basePlate);

      const spindleHeight = Math.max(1.25, list.length * 0.068 + 0.55);
      const poleMat = this.track(
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.94, roughness: 0.12 })
      );
      const poleGeo = this.track(new THREE.CylinderGeometry(0.062, 0.066, spindleHeight, 24));
      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = -0.9 + spindleHeight / 2;
      shelfRoot.add(pole);

      const capGeo = this.track(new THREE.SphereGeometry(0.068, 20, 16));
      const cap = new THREE.Mesh(capGeo, poleMat);
      cap.position.y = -0.9 + spindleHeight;
      shelfRoot.add(cap);

      const spacingY = 0.056;
      list.forEach((game, idx) => {
        const pair = artPairs[idx];
        const discPivot = new THREE.Group();
        const disc = this.buildDiscAssembly(game, pair.front);
        disc.rotation.x = Math.PI / 2;
        discPivot.add(disc);
        const yBase = -0.84 + idx * spacingY;
        const isSel = idx === selectedIdx;
        discPivot.position.set(0, isSel ? yBase + 0.25 : yBase, isSel ? 1.12 : 0);
        discPivot.rotation.set(isSel ? 0.52 : -Math.PI / 2, 0, 0);
        discPivot.traverse((child) => {
          child.userData.gameId = game.id;
        });
        shelfRoot.add(discPivot);
        items.push({
          game,
          index: idx,
          group: discPivot,
          discPivot,
          discMeshGroup: disc,
          yBase
        });
      });

      this.shelfState = {
        mode: 'cd',
        selectedId: list[selectedIdx].id,
        selectedIdx,
        spacingY,
        items
      };

      const selItem = items[selectedIdx];
      this.discPivot = selItem.discPivot;
      this.discMeshGroup = selItem.discMeshGroup;

      this.targetRootX = 0;
      this.targetRootY = 0.15;
      this.targetRootZ = 0;
      this.targetRotX = 0.18;
      this.targetRotY = -0.18;
      this.targetZoom = 4.25;
      this.targetCamX = 0;
    }

    this.activeAssembly = shelfRoot;
    this.rootGroup.add(shelfRoot);
  }

  selectShelfGame(gameId) {
    const ss = this.shelfState;
    if (!ss || !ss.items.length) return;
    const idx = ss.items.findIndex((it) => it.game.id === gameId);
    if (idx === -1) return;
    if (ss.selectedId !== gameId) {
      this.isCaseOpen = false;
      this.isDiscEjected = false;
    }
    ss.selectedIdx = idx;
    ss.selectedId = gameId;
    const sel = ss.items[idx];
    this.currentGame = sel.game;
    this.discPivot = sel.discPivot;
    this.discMeshGroup = sel.discMeshGroup;
    if (sel.frontHinge) this.frontHinge = sel.frontHinge;
  }

  updateShelfMode(dt, t) {
    const ss = this.shelfState;
    if (!ss || !ss.items.length) return;
    const selIdx = ss.selectedIdx;
    const shelfEase = 1 - Math.exp(-dt * 4.8);
    const hingeEase = 1 - Math.exp(-dt * 4.2);

    if (ss.mode === 'case') {
      const spacing = ss.spacing;
      for (const item of ss.items) {
        const offset = item.index - selIdx;
        const isSel = item.index === selIdx;
        // Domino shelf: selected case slides cleanly forward and can swing open via X / Square!
        const extraSpread = isSel && this.isCaseOpen ? 0.36 : 0;
        const tx =
          offset * spacing + (offset < 0 ? -0.22 - extraSpread : offset > 0 ? 0.22 + extraSpread : extraSpread);
        const tz = isSel ? (this.isCaseOpen ? 1.05 : 0.88) : -Math.min(0.45, Math.abs(offset) * 0.08);
        const ty = isSel ? 0.12 + Math.sin(t * 1.15) * 0.02 : -0.02;
        const trotY = isSel ? (this.isCaseOpen ? 0.18 : -0.16) : -0.64;

        item.group.position.x += (tx - item.group.position.x) * shelfEase;
        item.group.position.y += (ty - item.group.position.y) * shelfEase;
        item.group.position.z += (tz - item.group.position.z) * shelfEase;
        item.group.rotation.y += (trotY - item.group.rotation.y) * shelfEase;
        if (item.frontHinge) {
          const targetHinge = isSel && this.isCaseOpen ? -2.32 : 0;
          item.frontHinge.rotation.y += (targetHinge - item.frontHinge.rotation.y) * hingeEase;
        }
        if (item.discPivot && item.discMeshGroup) {
          const ejecting = isSel && this.isDiscEjected;
          const tdz = ejecting ? 0.62 : -0.03;
          const tdx = ejecting ? 0.16 : 0.02;
          item.discPivot.position.z += (tdz - item.discPivot.position.z) * hingeEase;
          item.discPivot.position.x += (tdx - item.discPivot.position.x) * hingeEase;
          if (ejecting) item.discMeshGroup.rotation.y += dt * 1.1;
          else item.discMeshGroup.rotation.y *= 0.88;
        }
      }
    } else {
      for (const item of ss.items) {
        const isSel = item.index === selIdx;
        const aboveSel = item.index > selIdx;
        const ty = isSel
          ? Math.max(0.28, item.yBase + 0.36) + Math.sin(t * 1.15) * 0.018
          : aboveSel
            ? item.yBase + 0.18
            : item.yBase;
        const tz = isSel ? 1.18 : 0;
        const trotX = isSel ? -Math.PI / 2 + 0.35 : -Math.PI / 2;

        item.group.position.y += (ty - item.group.position.y) * shelfEase;
        item.group.position.z += (tz - item.group.position.z) * shelfEase;
        item.group.rotation.x += (trotX - item.group.rotation.x) * shelfEase;
        if (isSel) {
          item.discMeshGroup.rotation.y += dt * 0.72;
        } else {
          item.discMeshGroup.rotation.y *= 0.88;
        }
      }
    }
  }

  playConsoleSequence(onInsertLaunch, onStatus, opts = {}) {
    if (!this.activeAssembly || !this.discPivot || this.consoleSequence) {
      onInsertLaunch?.();
      return;
    }

    const xmbLaunch = Boolean(opts?.xmbLaunch);
    const wasShelf = !xmbLaunch && this.subMode === 'shelf' && Boolean(this.shelfState);
    if (wasShelf && this.shelfState?.items) {
      for (const it of this.shelfState.items) {
        if (it.game?.id !== this.currentGame?.id && it.group) {
          it.group.visible = false;
        }
      }
    }
    this.subMode = 'showcase';
    this.rootGroup.position.set(0, 0.03, 0);
    this.deskGroup.visible = true;
    this.deskGroup.position.set(0, -1.8, 0.1);
    this.deskGroup.rotation.set(0, 0, 0);

    this.consoleGroup.visible = true;
    const consoleX = 0.0;
    this.consoleGroup.position.set(consoleX, -1.62, 0.02);
    this.consoleGroup.rotation.set(0, 0, 0);
    this.consoleParts.slotMat.color.setHex(0x38bdf8);
    this.consoleParts.ledMat.color.setHex(0x38bdf8);
    this.consoleParts.trayRimMat.color.setHex(0x38bdf8);
    this.consoleParts.beamMat.color.setHex(0x38bdf8);
    this.consoleParts.beamMat.opacity = 0.18;
    this.consoleParts.trayGroup.visible = true;
    this.consoleParts.trayGroup.position.set(0, 0.012, 0);
    this.consoleParts.screenMesh.visible = false;
    this.consoleParts.screenMat.opacity = 0;

    this.setDiscSlotClipping(false);
    this.setTrayClipping(true);
    const prevScale = this.discMeshGroup.scale.x;

    const discCarrier = new THREE.Group();
    const discWorldPos = new THREE.Vector3(0, 0.18, 0.36);
    if (!xmbLaunch) {
      this.discMeshGroup.getWorldPosition(discWorldPos);
    }

    discCarrier.position.copy(discWorldPos);
    this.scene.add(discCarrier);

    // Separate tilt wrapper avoids Euler XYZ gimbal wobble when flattening the spinning disc onto the tray
    const discTiltPivot = new THREE.Group();
    discTiltPivot.rotation.set(Math.PI / 2, 0, 0);
    discCarrier.add(discTiltPivot);

    this.discMeshGroup.visible = true;
    this.discMeshGroup.position.set(0, 0, 0);
    this.discMeshGroup.rotation.set(0, this.discAngle, 0);
    discTiltPivot.add(this.discMeshGroup);

    if (this.mode === 'case') {
      this.isCaseOpen = false;
      this.isDiscEjected = false;
    }
    if (xmbLaunch) {
      this.activeAssembly.visible = false;
    }

    this.consoleSequence = {
      elapsed: 0,
      launched: false,
      waitingForGame: Boolean(opts?.holdUntilRelease),
      wasShelf,
      xmbLaunch,
      prevScale,
      startPos: discWorldPos.clone(),
      consoleX,
      discCarrier,
      discTiltPivot,
      clipActive: false,
      onInsertLaunch,
      onStatus
    };
    onStatus?.('Ejecting console disc tray...');
  }

  releaseConsoleWait() {
    if (this.consoleSequence) {
      this.consoleSequence.waitingForGame = false;
    }
  }

  updateConsoleSequence(dt) {
    const seq = this.consoleSequence;
    if (!seq) return;
    seq.elapsed += dt * 0.56;
    const t = seq.elapsed;
    const { consoleX, discCarrier, discTiltPivot, startPos } = seq;

    const smooth01 = (a, b) => {
      const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
      return u * u * (3 - 2 * u);
    };

    const trayOpenZ = 1.44;
    const trayWorldZ = 0.02 + trayOpenZ; // 1.46
    const discSeatY = -0.541; // exact height inside tray circular disc cradle

    // Isometric downward camera tilt so user clearly sees desk, open disc tray & horizontal insertion
    this.targetCamY = 0.66;
    this.targetCamX = 0;
    this._desiredLookTarget.set(0, -0.34, 0.45);

    // Phase 1 (0.0 -> 1.15s): Desk & console glide up; motorized tray slides out; disc lifts & levels horizontal
    if (t < 1.15) {
      const pDesk = smooth01(0.0, 0.85);
      const pTray = smooth01(0.2, 1.1);
      const pTilt = smooth01(0.25, 1.12);

      this.deskGroup.position.y = -1.8 + (-0.82 - -1.8) * pDesk;
      this.consoleGroup.position.y = -1.62 + (-0.565 - -1.62) * pDesk;
      this.consoleParts.trayGroup.position.z = pTray * trayOpenZ;
      this.targetZoom = 4.75;

      const s = seq.prevScale + (1.0 - seq.prevScale) * pTilt;
      this.discMeshGroup.scale.setScalar(s);
      discTiltPivot.rotation.set((Math.PI / 2) * (1 - pTilt), 0, 0);

      if (seq.xmbLaunch) {
        this.activeAssembly.visible = false;
        discCarrier.position.lerpVectors(startPos, this._tmpVec.set(consoleX, -0.06, trayWorldZ), pTilt);
        discCarrier.position.y += Math.sin(pTilt * Math.PI) * 0.42;
      } else if (seq.wasShelf) {
        this.targetRootX = -4.8;
        this.targetRootY = -2.2;
        if (this.rootGroup.position.x < -2.4) this.activeAssembly.visible = false;
        discCarrier.position.lerpVectors(startPos, this._tmpVec.set(consoleX, -0.06, trayWorldZ), pTilt);
        discCarrier.position.y += Math.sin(pTilt * Math.PI) * 0.36;
      } else if (this.mode === 'case') {
        this.targetRootX = -1.42;
        this.targetRootY = -0.67;
        this.targetRootZ = 0.22;
        this.targetRotX = -Math.PI / 2;
        this.targetRotY = 0;
        this.isCaseOpen = true;
        discCarrier.position.lerpVectors(startPos, this._tmpVec.set(consoleX - 0.15, -0.05, trayWorldZ), pTilt);
        discCarrier.position.y += Math.sin(pTilt * Math.PI) * 0.34;
      } else {
        this.targetRootX = 0;
        this.targetRootY = 0.28;
        this.targetRootZ = 0;
        this.targetRotX = 0.08;
        this.targetRotY = 0;
        discCarrier.position.lerpVectors(startPos, this._tmpVec.set(consoleX, -0.06, trayWorldZ), pTilt);
        discCarrier.position.y += Math.sin(pTilt * Math.PI) * 0.38;
      }
      this.spinVelocity = 0.8 + pTilt * 4.5;
    }
    // Phase 2 (1.15 -> 2.10s): Case glides away; horizontal flat disc lowers smoothly into the open tray cradle
    else if (t < 2.1) {
      if (t - dt * 0.56 < 1.15) seq.onStatus?.('Seating disc in tray...');
      this.deskGroup.position.y = -0.82;
      this.consoleGroup.position.y = -0.565;
      this.consoleParts.trayGroup.position.z = trayOpenZ;

      if (seq.xmbLaunch) {
        this.activeAssembly.visible = false;
      } else if (this.mode === 'case' || seq.wasShelf) {
        this.targetRootX = -4.8;
        if (this.rootGroup.position.x < -2.2) {
          this.activeAssembly.visible = false;
        }
      }

      const pDrop = smooth01(1.15, 2.02);
      this.targetZoom = 4.35;
      this.consoleParts.ledMat.color.setHex(0xf59e0b);
      this.consoleParts.slotMat.color.setHex(0xf59e0b);
      this.consoleParts.trayRimMat.color.setHex(0xf59e0b);
      this.consoleParts.beamMat.color.setHex(0xf59e0b);
      this.consoleParts.beamMat.opacity = 0.32;
      this.spinVelocity = 6 + pDrop * 8;

      this.discMeshGroup.scale.setScalar(1.0);
      discTiltPivot.rotation.set(0, 0, 0);
      const curX = (!seq.xmbLaunch && this.mode === 'case' && !seq.wasShelf ? -0.15 : 0) * (1 - smooth01(1.15, 1.55));
      const curY = -0.06 + (discSeatY - -0.06) * pDrop;
      discCarrier.position.set(consoleX + curX, curY, trayWorldZ);
    }
    // Phase 3 (2.10 -> 3.15s): Tray + seated horizontal disc retract TOGETHER smoothly inside console drive bay
    else if (t < 3.15) {
      this.activeAssembly.visible = !seq.xmbLaunch && this.mode === 'cd' && !seq.wasShelf;
      if (t - dt * 0.56 < 2.1) seq.onStatus?.('Loading disc into drive...');
      if (!seq.clipActive) {
        seq.clipActive = true;
        this.setDiscSlotClipping(true);
      }

      const pRetract = smooth01(2.15, 3.08);
      const curTrayZ = trayOpenZ * (1 - pRetract);

      this.spinVelocity = 22;
      this.consoleParts.ledMat.color.setHex(0x22c55e);
      this.consoleParts.slotMat.color.setHex(0x22c55e);
      this.consoleParts.trayRimMat.color.setHex(0x22c55e);
      this.consoleParts.beamMat.color.setHex(0x22c55e);
      this.consoleParts.beamMat.opacity = 0.45 * (1 - pRetract * 0.5);

      this.discMeshGroup.scale.setScalar(1.0);
      discTiltPivot.rotation.set(0, 0, 0);
      this.consoleParts.trayGroup.position.z = curTrayZ;
      discCarrier.position.set(consoleX, discSeatY, 0.02 + curTrayZ);

      if (curTrayZ < 0.08) {
        this.discMeshGroup.visible = false;
        this.consoleParts.trayGroup.visible = false;
      }
    }
    // Phase 4 (3.15 -> 4.95s): OLED Console Startup Boot Screen fills the wait before launching the game
    else if (t < 4.95) {
      this.discMeshGroup.visible = false;
      this.consoleParts.trayGroup.visible = false;
      if (t - dt * 0.56 < 3.15) seq.onStatus?.('Console booting game...');
      const bootP = Math.min(1, (t - 3.15) / 1.55);
      this.consoleParts.screenMesh.visible = true;
      this.consoleParts.screenMat.opacity = smooth01(3.15, 3.55);
      this.consoleParts.beamMat.opacity = 0.16 + 0.14 * Math.sin(t * 8);
      this.drawConsoleBootScreen(bootP, this.currentGame?.title, this.currentGame?.accent);

      if (!seq.launched && bootP >= 0.96) {
        seq.launched = true;
        seq.onInsertLaunch?.();
      }
      if (seq.waitingForGame && seq.elapsed >= 4.9) {
        seq.elapsed = 4.65;
      }
    }
    // Phase 5 (4.95 -> 5.75s): Smooth fade-out & retraction back to Showcase / Domino Shelf / Spindle
    else if (t < 5.75) {
      const pOut = smooth01(4.95, 5.7);
      this.consoleParts.screenMat.opacity = 1 - pOut;
      this.deskGroup.position.y = -0.82 + (-2.2 - -0.82) * pOut;
      this.consoleGroup.position.y = -0.565 + (-1.9 - -0.565) * pOut;
      this.consoleParts.beamMat.opacity = 0;
      this.targetCamY = 0.28;
      this._desiredLookTarget.set(0, 0, 0);
    } else {
      this.setDiscSlotClipping(false);
      this.setTrayClipping(false);
      this.deskGroup.visible = false;
      this.consoleGroup.visible = false;
      this.consoleParts.trayGroup.visible = false;
      this.consoleParts.trayGroup.position.set(0, 0.012, 0);
      this.consoleParts.screenMesh.visible = false;
      this.consoleParts.beamMat.opacity = 0;

      this.activeAssembly.visible = !seq.xmbLaunch;
      if (seq.wasShelf && this.shelfState?.items) {
        for (const it of this.shelfState.items) {
          if (it.group) it.group.visible = true;
        }
      }
      this.discMeshGroup.visible = true;
      this.discMeshGroup.position.set(0, 0, 0);
      this.discMeshGroup.scale.setScalar(seq.prevScale || 1.0);
      this.discMeshGroup.rotation.set(Math.PI / 2, 0, 0);
      this.discPivot.add(this.discMeshGroup);
      this.scene.remove(discCarrier);

      this.subMode = seq.wasShelf ? 'shelf' : 'showcase';
      this.consoleSequence = null;
      this.isCaseOpen = false;
      this.isDiscEjected = false;
      this.targetRootX = 0;
      this.targetRootY = seq.wasShelf ? 0.14 : 0.03;
      this.targetRootZ = 0;
      this.targetCamY = 0.28;
      this._desiredLookTarget.set(0, 0, 0);
      if (seq.wasShelf) {
        this.targetRotX = this.mode === 'case' ? 0.16 : 0.18;
        this.targetRotY = this.mode === 'case' ? 0.08 : -0.18;
        this.targetZoom = this.mode === 'case' ? 4.65 : 4.25;
      } else {
        this.targetRotX = this.mode === 'case' ? 0.08 : 0.12;
        this.targetRotY = this.mode === 'case' ? -0.32 : -0.22;
        this.targetZoom = this.mode === 'case' ? 4.05 : 3.25;
      }
      seq.onStatus?.('');
      this.callbacks.onStateChange?.();
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const tick = () => {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(tick);
      if (document.hidden) return;
      this.update();
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  stop() {
    this.running = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  update() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    if (this.consoleSequence) {
      this.updateConsoleSequence(dt);
    } else if (this.subMode === 'manual') {
      this.updateManualAnimation(dt, t);
    } else if (this.subMode === 'unwrap') {
      this.updateUnwrapAnimation(dt);
    } else if (this.subMode === 'shelf') {
      this.updateShelfMode(dt, t);
    }

    if (this.particles && this.particles.visible) {
      this.particles.rotation.y = t * 0.035;
      this.particles.position.y = Math.sin(t * 0.5) * 0.06;
    }

    // Subtle atmospheric rim-light & stage floor halo tinting toward active game accent
    const targetHex = this.currentGame?.accent || '#38bdf8';
    this._accentTarget.set(targetHex);
    if (this.rimLight) {
      this.rimLight.color.lerp(this._accentTarget, 0.06);
    }
    if (this.stageRingMat) {
      this.stageRingMat.color.lerp(this._accentTarget, 0.06);
      this.stageRingMat.opacity = this.consoleSequence ? 0.08 : 0.22 + 0.06 * Math.sin(t * 2.0);
    }

    const camEase = 1 - Math.exp(-dt * 4.8);
    const hingeEase = 1 - Math.exp(-dt * 4.1);

    this.currentRotX += (this.targetRotX - this.currentRotX) * camEase;
    this.currentRotY += (this.targetRotY - this.currentRotY) * camEase;
    this.currentZoom += (this.targetZoom - this.currentZoom) * camEase;
    this.currentCamX += (this.targetCamX - this.currentCamX) * camEase;
    this.currentCamY += (this.targetCamY - this.currentCamY) * camEase;
    this._lookTarget.lerp(this._desiredLookTarget, camEase);

    this.rootGroup.position.x += (this.targetRootX - this.rootGroup.position.x) * camEase;
    this.rootGroup.position.y += (this.targetRootY - this.rootGroup.position.y) * camEase;
    this.rootGroup.position.z += (this.targetRootZ - this.rootGroup.position.z) * camEase;

    this.camera.position.set(this.currentCamX, this.currentCamY, this.currentZoom);
    this.camera.lookAt(this._lookTarget);
    this.rootGroup.rotation.x = this.currentRotX;
    this.rootGroup.rotation.y = this.currentRotY;

    if (this.activeAssembly) {
      if (!this.consoleSequence && this.subMode === 'showcase') {
        this.activeAssembly.position.y = Math.sin(t * 1.1) * 0.022;
      } else {
        this.activeAssembly.position.y += (0 - this.activeAssembly.position.y) * camEase;
      }

      const s = this.activeAssembly.scale.x;
      if (s < 0.999) {
        this.activeAssembly.scale.setScalar(s + (1 - s) * camEase);
      }
    }

    if (this.subMode !== 'showcase') return;

    const targetIdleSpin = this.mode === 'cd' || this.isDiscEjected || this.consoleSequence ? 0.35 : 0;
    this.spinVelocity += (targetIdleSpin - this.spinVelocity) * (1 - Math.exp(-dt * 2.5));

    if (this.spinAuraMat) {
      const auraTarget = Math.min(0.45, Math.max(0.03, (this.spinVelocity - 0.3) * 0.022));
      this.spinAuraMat.opacity += (auraTarget - this.spinAuraMat.opacity) * camEase;
    }

    if (this.discPivot && this.discMeshGroup) {
      if (this.mode === 'cd') {
        this.discAngle += this.spinVelocity * dt;
        this.discMeshGroup.rotation.y = this.discAngle;
      } else if (this.mode === 'case') {
        if (this.frontHinge) {
          const targetHinge = this.isCaseOpen ? -2.32 : 0;
          this.frontHinge.rotation.y += (targetHinge - this.frontHinge.rotation.y) * hingeEase;
        }

        if (!this.consoleSequence) {
          const targetZ = this.isDiscEjected ? 0.62 : -0.03;
          const targetY = this.isDiscEjected ? 0.02 : -0.04;
          const targetX = this.isDiscEjected ? 0.16 : 0.02;
          this.discPivot.position.z += (targetZ - this.discPivot.position.z) * hingeEase;
          this.discPivot.position.y += (targetY - this.discPivot.position.y) * hingeEase;
          this.discPivot.position.x += (targetX - this.discPivot.position.x) * hingeEase;

          if (this.isDiscEjected) {
            this.discAngle += this.spinVelocity * dt;
            this.discMeshGroup.rotation.y = this.discAngle;
          } else {
            this.discMeshGroup.rotation.y *= 0.88;
          }
        } else {
          this.discAngle += this.spinVelocity * dt;
          this.discMeshGroup.rotation.y = this.discAngle;
        }
      }
    }
  }

  resize() {
    const rect = this.container.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  dispose() {
    this.stop();
    this.clearModel();
    this.grooveNormalMap?.dispose();
    this.sleeveNormalMap?.dispose();
    this.shrinkNormalMap?.dispose();
    this.woodTexture?.dispose();
    this.particleTex?.dispose();
    this.particles?.geometry?.dispose();
    this.particles?.material?.dispose();
    this.consoleParts?.screenTex?.dispose();
    this.envTexture?.dispose();
    for (const s of this.sharedAssets || []) {
      s?.dispose?.();
    }
    this.sharedAssets = [];
    this.renderer.dispose();
  }
}
