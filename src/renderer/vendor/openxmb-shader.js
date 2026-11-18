// Ported verbatim from phenom64/OpenXMB (https://github.com/phenom64/OpenXMB):
// - src/xmb/presentation/background.cpp (kMonthAnchors, kJulyBottom, night_day_blend, hsv_to_rgb)
// - shaders/monthly_background.frag (day/night envelope, value_envelope, xmb_web_composite)
// - shaders/original.frag (5-layer ribbon_curve / ribbon_mask waves, fbm crossing & dust_layer)

const OPENXMB_MONTH_ANCHORS = [
  [58.6, 0.630, 0.785],
  [88.9, 0.650, 0.593],
  [339.8, 0.562, 0.708],
  [118.1, 0.713, 0.277],
  [270.7, 0.475, 0.440],
  [166.5, 0.723, 0.632],
  [196.0, 0.620, 0.585],
  [288.0, 0.600, 0.672],
  [47.6, 0.705, 0.816],
  [33.2, 0.590, 0.314],
  [0.9, 0.668, 0.621],
  [0.0, 0.000, 0.808]
];

const JULY_BOTTOM = [242.0, 0.900, 0.230];
const VALUE_PRECOMPENSATION = 1.30;

function hsvToRgb([hueDeg, sat, val]) {
  let hue = hueDeg % 360;
  if (hue < 0) hue += 360;
  const s = Math.max(0, Math.min(1, sat));
  const v = Math.max(val * VALUE_PRECOMPENSATION, 0);
  const chroma = v * s;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const match = v - chroma;
  let rgb = [0, 0, 0];
  if (hue < 60) rgb = [chroma, x, 0];
  else if (hue < 120) rgb = [x, chroma, 0];
  else if (hue < 180) rgb = [0, chroma, x];
  else if (hue < 240) rgb = [0, x, chroma];
  else if (hue < 300) rgb = [x, 0, chroma];
  else rgb = [chroma, 0, x];
  return [rgb[0] + match, rgb[1] + match, rgb[2] + match];
}

function nightDayBlend(localHour) {
  let h = localHour % 24;
  if (h < 0) h += 24;
  if (h >= 16.5 && h <= 20.5) return (h - 16.5) / 4.0;
  if (h > 20.5 || h < 4.5) return 1.0;
  if (h >= 4.5 && h <= 7.0) return 1.0 - (h - 4.5) / 2.5;
  return 0.0;
}

export function resolveOpenXmbBackgroundParams() {
  const now = new Date();
  const month = now.getMonth() % 12;
  const localHour = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
  const top = hsvToRgb(OPENXMB_MONTH_ANCHORS[month]);
  const bottom = month === 6 ? hsvToRgb(JULY_BOTTOM) : top;
  const night = nightDayBlend(localHour);
  return { top, bottom, night };
}

const VERT = `#version 300 es
in vec2 aPosition;
out vec2 in_uv;
void main() {
  vec2 uv = aPosition * 0.5 + 0.5;
  // OpenXMB screen_y runs top (0.0) to bottom (1.0)
  in_uv = vec2(uv.x, 1.0 - uv.y);
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
in vec2 in_uv;
out vec4 out_color;

uniform vec4 uTopNight;
uniform vec4 uBottomReserved;
uniform vec2 uResolution;
uniform float uTime;

vec3 xmb_web_composite(vec3 scene) {
  const float exposure = 1.05;
  const float white_level = 0.899181;
  return vec3(1.0) - exp(-max(scene, vec3(0.0)) * (exposure / white_level));
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise2(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.82, -0.57, 0.57, 0.82);
  for (int i = 0; i < 4; ++i) {
    v += a * noise2(p);
    p = r * p * 2.03 + vec2(11.7, 4.2);
    a *= 0.5;
  }
  return v;
}

float ribbon_curve(float x, float seed, float t) {
  float slow = t * (0.045 + seed * 0.011);
  float y = sin(x * (1.15 + seed * 0.07) + slow + seed * 3.1) * 0.115;
  y += sin(x * (2.05 + seed * 0.11) - slow * 1.45 + seed * 6.4) * 0.045;
  y += sin(x * (3.10 + seed * 0.19) + slow * 0.72 + seed * 2.4) * 0.018;
  return y;
}

float ribbon_mask(vec2 p, float seed, float t, float width, out float glow) {
  float y = ribbon_curve(p.x, seed, t) + seed * 0.045 - 0.055;
  float d = abs(p.y - y);
  float core = 1.0 - smoothstep(width * 0.12, width, d);
  glow = 1.0 - smoothstep(width, width * 7.0, d);
  return core;
}

float dust_layer(vec2 uv, float scale, float drift, float threshold) {
  vec2 p = uv * scale + vec2(drift * 0.07, -drift * 0.035);
  vec2 cell = floor(p);
  vec2 f = fract(p) - 0.5;
  float id = hash12(cell);
  float star = smoothstep(threshold, 1.0, id);
  float size = mix(0.012, 0.055, hash12(cell + 7.31));
  float sparkle = 1.0 - smoothstep(size * 0.25, size, length(f));
  float twinkle = 0.55 + 0.45 * sin(uTime * (0.6 + id * 1.7) + id * 12.0);
  return star * sparkle * twinkle;
}

void main() {
  // 1) OpenXMB monthly_background.frag calibrated color envelope
  float screen_y = clamp(in_uv.y, 0.0, 1.0);
  float bottom_mix = smoothstep(0.70, 1.0, screen_y);
  vec3 bg = mix(uTopNight.rgb, uBottomReserved.rgb, bottom_mix);

  float luma = dot(bg, vec3(0.299, 0.587, 0.114));
  bg = max(vec3(luma) + (bg - vec3(luma)) * 1.25, vec3(0.0));

  float dip = exp(-pow((screen_y - 0.68) / 0.14, 2.0));
  float value_envelope = 1.05 - 0.26 * dip;
  value_envelope *= 1.0 + 0.05 * smoothstep(0.30, 0.0, screen_y);
  value_envelope *= 1.0 + 0.06 * smoothstep(0.85, 1.0, screen_y);
  bg *= value_envelope;

  luma = dot(bg, vec3(0.299, 0.587, 0.114));
  bg = vec3(luma) + (bg - vec3(luma)) * (1.0 + 0.22 * dip);

  float dx = in_uv.x - 0.52;
  bg *= 1.0 - 0.30 * dx * dx * (dx < 0.0 ? 1.6 : 1.0);

  dx = in_uv.x - 0.5;
  float bottom_edge = clamp(screen_y * abs(dx) * 2.0, 0.0, 1.0);
  float bottom_side = mix(0.847, 0.925, smoothstep(-0.5, 0.5, dx));
  bg *= mix(1.0, bottom_side, bottom_edge);

  float top_corner = clamp(pow(1.0 - screen_y, 1.5) * (abs(dx) * 2.0), 0.0, 1.0);
  float top_side = mix(0.88, 1.0, smoothstep(0.0, 0.5, dx));
  bg *= 1.0 - 0.40 * top_corner * top_side;

  float night = clamp(uTopNight.a, 0.0, 1.0);
  float exponent = mix(1.15, 3.4, night);
  float vertical = pow(screen_y, exponent);
  float top_multiplier = mix(0.30, 0.02, night);
  bg *= mix(top_multiplier, 1.0, vertical);

  bg *= 1.05;
  float input_luma = dot(bg, vec3(0.299, 0.587, 0.114));
  float output_luma = input_luma / (1.0 + input_luma * 0.30);
  if (input_luma > 0.0001) {
    bg *= output_luma / input_luma;
  }
  vec3 color = clamp(xmb_web_composite(bg), 0.0, 1.0);

  // 2) OpenXMB original.frag 5-ribbon wave curves + dust sparkle layer
  vec2 safeRes = max(uResolution, vec2(1.0));
  vec2 glUv = vec2(in_uv.x, 1.0 - in_uv.y);
  vec2 p = glUv * 2.0 - 1.0;
  p.x *= safeRes.x / safeRes.y;

  float t = uTime;
  float glow0;
  float core0 = ribbon_mask(p + vec2(0.00, 0.012), 0.2, t, 0.022, glow0);
  float glow1;
  float core1 = ribbon_mask(p + vec2(0.16, -0.018), 1.1, t, 0.017, glow1);
  float glow2;
  float core2 = ribbon_mask(p + vec2(-0.12, 0.030), 2.0, t, 0.013, glow2);
  float glow3;
  float core3 = ribbon_mask(p + vec2(0.08, -0.048), 3.0, t, 0.010, glow3);
  float glow4;
  float core4 = ribbon_mask(p + vec2(-0.22, 0.056), 3.8, t, 0.018, glow4);

  float core = core0 * 0.42 + core1 * 0.34 + core2 * 0.26 + core3 * 0.18 + core4 * 0.12;
  float totalGlow = glow0 * 0.20 + glow1 * 0.18 + glow2 * 0.14 + glow3 * 0.10 + glow4 * 0.08;

  float crossing = smoothstep(0.05, 0.75, fbm(vec2(p.x * 0.74, p.y * 1.8 + t * 0.018)));
  core *= mix(0.78, 1.26, crossing);

  vec3 baseTint = mix(uTopNight.rgb, uBottomReserved.rgb, 0.5);
  vec3 waveColor = mix(vec3(0.83, 0.88, 1.0), baseTint + vec3(0.28), 0.34);

  color += waveColor * totalGlow * 0.26;
  color = mix(color, vec3(0.92, 0.96, 1.0), clamp(core * 0.48, 0.0, 0.62));
  color += vec3(0.80, 0.88, 1.0) * pow(clamp(core, 0.0, 1.0), 2.2) * 0.28;

  vec2 dustUv = vec2(glUv.x * (safeRes.x / safeRes.y), glUv.y);
  float dust = dust_layer(dustUv, 42.0, t, 0.986);
  dust += dust_layer(dustUv + vec2(13.1, 4.7), 76.0, t * 0.7, 0.992) * 0.65;
  float dustGate = 0.28 + totalGlow * 1.45;
  color += vec3(0.90, 0.96, 1.0) * dust * dustGate;

  out_color = vec4(clamp(color, 0.0, 1.0), 1.0);
}`;

function compile(gl, type, src) {
  const s = gl.createShader(type);
  if (!s) return null;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
  gl.deleteShader(s);
  return null;
}

export function createOpenXmbProgram(gl) {
  const vs = compile(gl, gl.VERTEX_SHADER, VERT);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
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
    aPosition: gl.getAttribLocation(prog, 'aPosition'),
    uTopNight: gl.getUniformLocation(prog, 'uTopNight'),
    uBottomReserved: gl.getUniformLocation(prog, 'uBottomReserved'),
    uResolution: gl.getUniformLocation(prog, 'uResolution'),
    uTime: gl.getUniformLocation(prog, 'uTime')
  };
}
