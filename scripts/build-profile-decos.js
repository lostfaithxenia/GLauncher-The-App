const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, '..', 'src', 'renderer', 'assets', 'profile-fx');
fs.mkdirSync(outDir, { recursive: true });

const decos = {
  'deco-headphones.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="hp" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <path d="M18 62 C18 24, 102 24, 102 62" fill="none" stroke="url(#hp)" stroke-width="7" stroke-linecap="round" filter="url(#glow)"/>
  <path d="M24 58 C24 30, 96 30, 96 58" fill="none" stroke="#e0f2fe" stroke-width="2" opacity="0.65"/>
  <rect x="8" y="48" width="14" height="30" rx="7" fill="#0f172a" stroke="url(#hp)" stroke-width="3" filter="url(#glow)">
    <animate attributeName="opacity" values="0.85;1;0.85" dur="2s" repeatCount="indefinite"/>
  </rect>
  <rect x="98" y="48" width="14" height="30" rx="7" fill="#0f172a" stroke="url(#hp)" stroke-width="3" filter="url(#glow)">
    <animate attributeName="opacity" values="0.85;1;0.85" dur="2s" repeatCount="indefinite"/>
  </rect>
  <circle cx="15" cy="63" r="3" fill="#38bdf8"><animate attributeName="r" values="2.5;4;2.5" dur="1.4s" repeatCount="indefinite"/></circle>
  <circle cx="105" cy="63" r="3" fill="#ec4899"><animate attributeName="r" values="2.5;4;2.5" dur="1.4s" repeatCount="indefinite"/></circle>
</svg>`,

  'deco-halo.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="hl" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#fef9c3"/>
    </linearGradient>
    <filter id="g"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#g)">
    <ellipse cx="60" cy="14" rx="34" ry="8" fill="none" stroke="url(#hl)" stroke-width="5">
      <animate attributeName="cy" values="14;11;14" dur="2.6s" repeatCount="indefinite"/>
    </ellipse>
    <circle cx="24" cy="18" r="2.2" fill="#fef9c3"><animate attributeName="opacity" values="0.2;1;0.2" dur="1.8s" repeatCount="indefinite"/></circle>
    <circle cx="96" cy="16" r="2.5" fill="#fde047"><animate attributeName="opacity" values="1;0.2;1" dur="2.1s" repeatCount="indefinite"/></circle>
    <circle cx="60" cy="60" r="50" fill="none" stroke="#fde047" stroke-width="2" stroke-dasharray="6 10" opacity="0.6">
      <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="14s" repeatCount="indefinite"/>
    </circle>
  </g>
</svg>`,

  'deco-sakura.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="sk" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fbcfe8"/>
      <stop offset="100%" stop-color="#f472b6"/>
    </linearGradient>
  </defs>
  <circle cx="60" cy="60" r="49" fill="none" stroke="url(#sk)" stroke-width="3.5" opacity="0.85"/>
  <g>
    <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="22s" repeatCount="indefinite"/>
    <g transform="translate(60 11)"><circle r="6" fill="#fbcfe8"/><circle cx="4" cy="3" r="4.5" fill="#f472b6"/><circle cx="-4" cy="3" r="4.5" fill="#f9a8d4"/><circle r="2.2" fill="#fde047"/></g>
    <g transform="translate(107 48)"><circle r="5.5" fill="#f9a8d4"/><circle cx="3" cy="3" r="4" fill="#f472b6"/><circle r="2" fill="#fef08a"/></g>
    <g transform="translate(92 98)"><circle r="6" fill="#fbcfe8"/><circle cx="-4" cy="-2" r="4.5" fill="#f472b6"/><circle r="2.2" fill="#fde047"/></g>
    <g transform="translate(22 92)"><circle r="5.5" fill="#f9a8d4"/><circle cx="3" cy="-3" r="4" fill="#ec4899"/><circle r="2" fill="#fef08a"/></g>
    <g transform="translate(14 42)"><circle r="5.5" fill="#fbcfe8"/><circle cx="3" cy="2" r="4" fill="#f472b6"/><circle r="2" fill="#fde047"/></g>
  </g>
</svg>`,

  'deco-flame.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="fl" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="55%" stop-color="#f97316"/>
      <stop offset="100%" stop-color="#fde047"/>
    </linearGradient>
    <filter id="fg"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#fg)">
    <circle cx="60" cy="60" r="48" fill="none" stroke="url(#fl)" stroke-width="5">
      <animate attributeName="stroke-width" values="4.5;6.5;4.5" dur="1.1s" repeatCount="indefinite"/>
    </circle>
    <circle cx="60" cy="60" r="52" fill="none" stroke="#fb923c" stroke-width="2.5" stroke-dasharray="14 8 6 10">
      <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="5s" repeatCount="indefinite"/>
    </circle>
    <path d="M54 14 Q60 2 66 14 Q62 11 60 16 Q58 11 54 14 Z" fill="#fde047">
      <animate attributeName="opacity" values="0.7;1;0.7" dur="0.8s" repeatCount="indefinite"/>
    </path>
  </g>
</svg>`,

  'deco-crown.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="cr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fef08a"/>
      <stop offset="50%" stop-color="#facc15"/>
      <stop offset="100%" stop-color="#d97706"/>
    </linearGradient>
    <filter id="cg"><feGaussianBlur stdDeviation="1.8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <circle cx="60" cy="60" r="49" fill="none" stroke="url(#cr)" stroke-width="3.5"/>
  <g filter="url(#cg)">
    <path d="M36 26 L42 10 L53 19 L60 6 L67 19 L78 10 L84 26 Z" fill="url(#cr)" stroke="#fef9c3" stroke-width="1.5">
      <animateTransform attributeName="transform" type="translate" values="0 0;0 -2.5;0 0" dur="2.4s" repeatCount="indefinite"/>
    </path>
    <circle cx="60" cy="18" r="2.5" fill="#38bdf8"/>
    <circle cx="46" cy="21" r="2" fill="#ec4899"/>
    <circle cx="74" cy="21" r="2" fill="#ec4899"/>
  </g>
</svg>`,

  'deco-void.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="vd" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c084fc"/>
      <stop offset="50%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#ec4899"/>
    </linearGradient>
    <filter id="vg"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#vg)">
    <circle cx="60" cy="60" r="48" fill="none" stroke="url(#vd)" stroke-width="4.5" stroke-dasharray="28 10">
      <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="6s" repeatCount="indefinite"/>
    </circle>
    <circle cx="60" cy="60" r="53" fill="none" stroke="#e879f9" stroke-width="2" stroke-dasharray="6 14">
      <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="9s" repeatCount="indefinite"/>
    </circle>
  </g>
</svg>`,

  'deco-crystal.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="cy" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#67e8f9"/>
      <stop offset="50%" stop-color="#f0abfc"/>
      <stop offset="100%" stop-color="#fde047"/>
    </linearGradient>
  </defs>
  <polygon points="60,6 106,33 106,87 60,114 14,87 14,33" fill="none" stroke="url(#cy)" stroke-width="3.2" opacity="0.9">
    <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="16s" repeatCount="indefinite"/>
  </polygon>
  <polygon points="60,10 103,35 103,85 60,110 17,85 17,35" fill="none" stroke="#ffffff" stroke-width="1.2" opacity="0.55">
    <animateTransform attributeName="transform" type="rotate" from="360 60 60" to="0 60 60" dur="12s" repeatCount="indefinite"/>
  </polygon>
</svg>`,

  'deco-emerald.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="em" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#4ade80"/>
      <stop offset="100%" stop-color="#06b6d4"/>
    </linearGradient>
    <filter id="eg"><feGaussianBlur stdDeviation="2.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#eg)">
    <circle cx="60" cy="60" r="49" fill="none" stroke="url(#em)" stroke-width="4" stroke-dasharray="18 8"/>
    <g>
      <animateTransform attributeName="transform" type="rotate" from="0 60 60" to="360 60 60" dur="7s" repeatCount="indefinite"/>
      <circle cx="60" cy="11" r="4" fill="#4ade80"/>
      <circle cx="60" cy="109" r="4" fill="#22d3ee"/>
    </g>
  </g>
</svg>`,

  'deco-catears.svg': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <defs>
    <linearGradient id="ce" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f472b6"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <filter id="ceg"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#ceg)">
    <circle cx="60" cy="62" r="47" fill="none" stroke="url(#ce)" stroke-width="3.5"/>
    <path d="M22 40 L24 10 L48 24 Z" fill="#0f172a" stroke="#f472b6" stroke-width="3" stroke-linejoin="round"/>
    <path d="M27 33 L28 18 L41 25 Z" fill="#f472b6" opacity="0.8">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
    </path>
    <path d="M98 40 L96 10 L72 24 Z" fill="#0f172a" stroke="#38bdf8" stroke-width="3" stroke-linejoin="round"/>
    <path d="M93 33 L92 18 L79 25 Z" fill="#38bdf8" opacity="0.8">
      <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite"/>
    </path>
  </g>
</svg>`
};

for (const [name, svg] of Object.entries(decos)) {
  fs.writeFileSync(path.join(outDir, name), svg, 'utf8');
}
console.log(`Generated ${Object.keys(decos).length} animated SVG avatar decorations in ${outDir}`);
