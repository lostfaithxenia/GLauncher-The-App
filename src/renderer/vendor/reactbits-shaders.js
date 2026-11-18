import { createOpenXmbProgram, resolveOpenXmbBackgroundParams } from './openxmb-shader.js';

// WebGL2 GLSL Shaders adapted from React Bits (https://github.com/DavidHDev/react-bits)
const VERT = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const SILK_FRAG = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform vec2 uMouse;
in vec2 vUv;
out vec4 outColor;

float noise(vec2 texCoord) {
  float G = 2.718281828459045;
  vec2 r = G * sin(G * texCoord);
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

float silkPattern(vec2 uv, float tOffset) {
  vec2 tex = uv * 3.2 + (uMouse - 0.5) * 0.18;
  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);
  return 0.6 + 0.4 * sin(
    5.0 * (tex.x + tex.y + cos(3.0 * tex.x + 5.0 * tex.y) + 0.02 * tOffset) +
    sin(20.0 * (tex.x + tex.y - 0.1 * tOffset))
  );
}

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv - 0.5) * (uResolution / mr) + 0.5;
  float p = silkPattern(uv, uTime * 0.65);
  float gx = silkPattern(uv + vec2(0.004, 0.0), uTime * 0.65) - p;
  float gy = silkPattern(uv + vec2(0.0, 0.004), uTime * 0.65) - p;
  vec3 normal = normalize(vec3(-gx * 24.0, -gy * 24.0, 1.0));
  vec3 toLight = normalize(vec3(0.45, 0.55, 0.85));
  float sheen = pow(max(dot(normal, normalize(toLight + vec3(0.0, 0.0, 1.0))), 0.0), 36.0);
  float n = clamp((p - 0.2) / 0.8, 0.0, 1.0);
  float grain = (noise(gl_FragCoord.xy) - 0.5) * 0.035;
  vec3 base = mix(vec3(0.03, 0.045, 0.08), uColor * 0.58, pow(n, 1.5));
  vec3 col = clamp(base + uColor * sheen * 0.35 + grain, 0.0, 1.0);
  outColor = vec4(col, 0.92);
}`;

const IRIDESCENCE_FRAG = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec3 uColor;
uniform vec2 uMouse;
in vec2 vUv;
out vec4 outColor;

void main() {
  float mr = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv * 2.0 - 1.0) * (uResolution / mr);
  uv += (uMouse - vec2(0.5)) * 0.14;

  float d = -uTime * 0.32;
  float a = 0.0;
  for (int i = 0; i < 8; i++) {
    float fi = float(i);
    a += cos(fi - d - a * uv.x * 0.95);
    d += sin(uv.y * fi + a);
  }
  d += uTime * 0.32;
  vec3 col = vec3(cos(uv * vec2(d, a)) * 0.5 + 0.5, cos(a + d) * 0.45 + 0.45);
  col = cos(col * cos(vec3(d, a, 2.2)) * 0.5 + 0.5) * mix(vec3(0.35, 0.5, 0.85), uColor, 0.65);
  col *= 0.42;
  outColor = vec4(clamp(col, 0.0, 1.0), 0.94);
}`;

function compileShader(gl, type, src) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
  gl.deleteShader(s);
  return null;
}

function createProgram(gl, fragSrc) {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  if (!vs || !fs) return null;
  const prog = gl.createProgram();
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    gl.deleteProgram(prog);
    return null;
  }
  return {
    prog,
    uResolution: gl.getUniformLocation(prog, 'uResolution'),
    uTime: gl.getUniformLocation(prog, 'uTime'),
    uColor: gl.getUniformLocation(prog, 'uColor'),
    uMouse: gl.getUniformLocation(prog, 'uMouse'),
    aPosition: gl.getAttribLocation(prog, 'aPosition')
  };
}

function hexToRgb01(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex || '').trim());
  if (!m) return [0.22, 0.74, 0.97];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export class ReactBitsShaderBackdrop {
  constructor(canvas) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2', { alpha: true, antialias: false, powerPreference: 'high-performance' });
    this.programs = {};
    this.vbo = null;
    this.mouse = [0.5, 0.5];
    if (this.gl) {
      const gl = this.gl;
      this.programs.silk = createProgram(gl, SILK_FRAG);
      this.programs.iridescence = createProgram(gl, IRIDESCENCE_FRAG);
      this.programs['xmb-wave'] = createOpenXmbProgram(gl);
      this.vbo = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    }
  }

  get supported() {
    return Boolean(this.gl && (this.programs.silk || this.programs.iridescence || this.programs['xmb-wave']));
  }

  setMouse(nx, ny) {
    this.mouse[0] += (nx - this.mouse[0]) * 0.1;
    this.mouse[1] += (ny - this.mouse[1]) * 0.1;
  }

  render(mode, time, accentHex) {
    const gl = this.gl;
    const item = this.programs[mode];
    if (!gl || !item) return false;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(item.prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.enableVertexAttribArray(item.aPosition);
    gl.vertexAttribPointer(item.aPosition, 2, gl.FLOAT, false, 0, 0);

    const rgb = hexToRgb01(accentHex);
    if (mode === 'xmb-wave') {
      const { top, bottom, night } = resolveOpenXmbBackgroundParams();
      gl.uniform4f(item.uTopNight, top[0], top[1], top[2], night);
      gl.uniform4f(item.uBottomReserved, bottom[0], bottom[1], bottom[2], 0.0);
      gl.uniform2f(item.uResolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(item.uTime, time);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      return true;
    }

    gl.uniform2f(item.uResolution, this.canvas.width, this.canvas.height);
    gl.uniform1f(item.uTime, time);
    gl.uniform3f(item.uColor, rgb[0], rgb[1], rgb[2]);
    gl.uniform2f(item.uMouse, this.mouse[0], this.mouse[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return true;
  }
}
