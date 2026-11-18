const { app, BrowserWindow, ipcMain, dialog, shell, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { pathToFileURL } = require('url');
const { execFile, spawn } = require('child_process');

const USER_DATA_DIR = app.getPath('userData');
const LEGACY_LIBRARY_PATH = path.join(USER_DATA_DIR, 'library.json');
const PROFILES_PATH = path.join(USER_DATA_DIR, 'profiles.json');
const MANUALS_DIR = path.join(USER_DATA_DIR, 'manuals');

function resolveLauncherMainDir() {
  const base = app.isPackaged ? path.dirname(process.execPath) : path.join(__dirname, '..');
  try {
    fs.accessSync(base, fs.constants.W_OK);
    return base;
  } catch {
    return USER_DATA_DIR;
  }
}

const LAUNCHER_MAIN_DIR = resolveLauncherMainDir();
const PS3_PIC_DIR = path.join(LAUNCHER_MAIN_DIR, 'ps3_pic');
const PS3_VIDEO_DIR = path.join(LAUNCHER_MAIN_DIR, 'ps3_video');
const PS3_AUDIO_DIR = path.join(LAUNCHER_MAIN_DIR, 'ps3_audio');
// Redirect all customization assets (pfps, gifs, covers, trailers, audio) into ps3_pic / ps3_video / ps3_audio inside launcher main folder
const ARTWORK_DIR = PS3_PIC_DIR;
const AVATARS_DIR = PS3_PIC_DIR;
const TRAILERS_DIR = PS3_VIDEO_DIR;

const DEFAULT_SETTINGS = {
  launcherName: '',
  viewMode: 'cd', // 'cd' | 'case'
  renderMode: '3d', // '3d' | 'shelf3d' | '2d'
  discSize: 'md', // 'sm' | 'md' | 'lg'
  spinOnHover: true,
  showTitlesOnMedia: true,
  graphicsQuality: 'high', // 'high' | 'balanced' | 'performance'
  theme: 'obsidian', // 'obsidian' | 'cyber' | 'walnut' | 'arctic' | 'xmb'
  backdropMode: 'aurora', // 'aurora' | 'starfield' | 'cybergrid' | 'xmb-wave' | 'clean'
  glassStyle: 'liquid', // 'liquid' | 'carbon' | 'matte'
  pfpFrame: 'neon', // 'neon' | 'prismatic' | 'void' | 'holo' | 'gold' | 'minimal'
  uiAccent: '#38bdf8',
  xmbWallpaper: '',
  xmbBgColor: 'auto',
  xmbWaveStyle: 'original', // 'original' (lines.qrc) | 'complex'
  xmbIconSet: 'default', // 'default' | 'flat' | 'vice'
  xmbSoundSet: 'ps3', // 'ps3' | 'ps4'
  xmbHoverVideo: true,
  xmbHoverAudio: false,
  xmbSounds: true,
  xmbIntro: true,
  customHomeButton: -1, // user-bound raw gamepad button index (-1 = auto)
  notificationsEnabled: true,
  achievementSoundEnabled: true,
  ps3FoldersPrompted: false
};

const DEFAULT_ROLES = [
  { id: 'role-founder', name: '★ Founder', color: '#38bdf8', tier: 'super' },
  { id: 'role-ps3', name: 'PS3 Veteran', color: '#a855f7', tier: 'mythic' },
  { id: 'role-collector', name: 'Collector', color: '#f59e0b', tier: 'standard' }
];

function createDefaultStore(legacyData = null) {
  const settings = { ...DEFAULT_SETTINGS, ...(legacyData?.settings || {}), renderMode: '3d', theme: 'obsidian' };
  const games = Array.isArray(legacyData?.games)
    ? legacyData.games.filter((g) => !g.isDemo)
    : [];

  return {
    schemaVersion: 8,
    tutorialCompleted: false,
    activeProfileId: 'profile-default',
    profiles: [
      {
        id: 'profile-default',
        name: 'Player 1',
        handle: '@player1',
        color: '#38bdf8',
        avatar: './assets/maxmb/icons/avatars/firmware/000.png',
        banner: 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #ec4899 100%)',
        status: 'online', // 'online' | 'idle' | 'dnd' | 'invisible'
        customStatus: 'Playing on Physical Media Stage',
        bio: 'Collector of physical discs, PS3 XMB enthusiast & achievement hunter.',
        vfx: 'prismatic', // 'prismatic' | 'neon' | 'void' | 'holo' | 'gold' | 'none'
        roles: [...DEFAULT_ROLES],
        psnCardColor: '#1d4ed8',
        psnComment: 'Welcome to my PS3 XMB Profile!',
        psPlus: true,
        achievements: [],
        notifications: [],
        createdAt: new Date().toISOString(),
        settings,
        games
      }
    ]
  };
}

let mainWindow = null;
let overlayWindow = null;
let gamepadProcess = null;
let lastOverlayTrigger = 0;
let runningGame = null; // { title, target, pid, exeName, startedAt }

function ensureDirs() {
  for (const dir of [USER_DATA_DIR, MANUALS_DIR, PS3_PIC_DIR, PS3_VIDEO_DIR, PS3_AUDIO_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

function getBinPath(exeName) {
  const packagedPath = path.join(process.resourcesPath || '', 'bin', exeName);
  if (fs.existsSync(packagedPath)) return packagedPath;
  const devPath = path.join(__dirname, '..', 'build', 'bin', exeName);
  if (fs.existsSync(devPath)) return devPath;
  return null;
}

function sanitizeStore(parsed) {
  const needsV2Upgrade = !parsed?.schemaVersion || parsed.schemaVersion < 2;
  const needsFakeCleanup = !parsed?.schemaVersion || parsed.schemaVersion < 6;
  const profiles = Array.isArray(parsed?.profiles) && parsed.profiles.length > 0
    ? parsed.profiles.map((p, idx) => {
        const mergedSettings = { ...DEFAULT_SETTINGS, ...(p.settings || {}) };
        if (needsV2Upgrade) {
          mergedSettings.renderMode = '3d';
        }
        const rawGames = Array.isArray(p.games) ? p.games : [];
        const withoutBogus = rawGames.filter((g) => !/spike\s+video\s+game\s+awards/i.test(String(g?.title || '')));
        const cleanGames = needsFakeCleanup ? withoutBogus.filter((g) => !g.isDemo) : withoutBogus;
        const cleanRoles = Array.isArray(p.roles) && p.roles.length > 0 ? p.roles : [...DEFAULT_ROLES];
        return {
          id: String(p.id || `profile-${idx + 1}`),
          name: String(p.name || `Player ${idx + 1}`).slice(0, 28),
          handle: String(p.handle || `@${String(p.name || `player${idx + 1}`).toLowerCase().replace(/[^a-z0-9_]/g, '')}`),
          color: String(p.color || '#38bdf8'),
          avatar: String(p.avatar || './assets/maxmb/icons/avatars/firmware/000.png'),
          banner: String(p.banner || 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #ec4899 100%)'),
          profilePrimaryColor: String(p.profilePrimaryColor || '#1e1b4b'),
          profileAccentColor: String(p.profileAccentColor || p.color || '#38bdf8'),
          badges: Array.isArray(p.badges) ? p.badges.slice(0, 12) : ['alpha-pioneer'],
          friends: Array.isArray(p.friends)
            ? p.friends
                .filter((f) => f && f.handle)
                .map((f) => ({
                  handle: String(f.handle).startsWith('@') ? String(f.handle).toLowerCase() : `@${String(f.handle).toLowerCase()}`,
                  nickname: String(f.nickname || '').slice(0, 28),
                  addedAt: f.addedAt || new Date().toISOString()
                }))
                .slice(0, 60)
            : [],
          status: String(p.status || 'online'),
          customStatus: String(p.customStatus ?? 'Playing on Physical Media Stage').slice(0, 80),
          bio: String(p.bio ?? 'Collector of physical discs, PS3 XMB enthusiast & achievement hunter.').slice(0, 240),
          vfx: String(p.vfx === 'nitro' ? 'prismatic' : (p.vfx || 'prismatic')),
          roles: cleanRoles,
          psnCardColor: String(p.psnCardColor || '#1d4ed8'),
          psnComment: String(p.psnComment ?? 'Welcome to my PS3 XMB Profile!').slice(0, 90),
          psPlus: p.psPlus !== undefined ? Boolean(p.psPlus) : true,
          achievements: Array.isArray(p.achievements) ? p.achievements : [],
          notifications: Array.isArray(p.notifications) ? p.notifications.slice(0, 60) : [],
          createdAt: p.createdAt || new Date().toISOString(),
          settings: mergedSettings,
          games: cleanGames
        };
      })
    : createDefaultStore().profiles;

  const hasActive = profiles.some((p) => p.id === parsed?.activeProfileId);
  return {
    schemaVersion: 7,
    tutorialCompleted: Boolean(parsed?.tutorialCompleted),
    activeProfileId: hasActive ? parsed.activeProfileId : profiles[0].id,
    profiles
  };
}

function readProfilesStore() {
  ensureDirs();
  if (!fs.existsSync(PROFILES_PATH)) {
    let legacy = null;
    if (fs.existsSync(LEGACY_LIBRARY_PATH)) {
      try {
        legacy = JSON.parse(fs.readFileSync(LEGACY_LIBRARY_PATH, 'utf8'));
      } catch {
        legacy = null;
      }
    }
    const initial = createDefaultStore(legacy);
    writeProfilesStore(initial);
    return initial;
  }

  try {
    const raw = fs.readFileSync(PROFILES_PATH, 'utf8');
    return sanitizeStore(JSON.parse(raw));
  } catch {
    return createDefaultStore();
  }
}

function writeProfilesStore(data) {
  ensureDirs();
  const sanitized = sanitizeStore(data);
  const tmpPath = `${PROFILES_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(sanitized, null, 2), 'utf8');
  fs.renameSync(tmpPath, PROFILES_PATH);
  return sanitized;
}

async function fetchWithTimeout(url, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'GameLauncher/0.3 (Desktop Metadata Fetcher)'
      }
    });
  } finally {
    clearTimeout(timer);
  }
}

async function downloadToFile(url, targetDir, fallbackExt = '.jpg', timeoutMs = 12000, customName = null) {
  const res = await fetchWithTimeout(url, timeoutMs);
  if (!res.ok) return null;
  const contentType = res.headers.get('content-type') || '';
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1500) return null;

  let ext = fallbackExt;
  if (contentType.includes('png')) ext = '.png';
  else if (contentType.includes('webp')) ext = '.webp';
  else if (contentType.includes('mp4')) ext = '.mp4';
  else if (contentType.includes('webm')) ext = '.webm';
  else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = '.jpg';

  ensureDirs();
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
  const fileName = customName ? `${customName}${ext}` : `${crypto.randomUUID()}${ext}`;
  const destPath = path.join(targetDir, fileName);
  fs.writeFileSync(destPath, buf);
  return `file:///${destPath.replace(/\\/g, '/')}`;
}

const ROMAN_NUM_MAP = {
  i: '1',
  ii: '2',
  ll: '2',
  iii: '3',
  iv: '4',
  v: '5',
  vi: '6',
  vii: '7',
  viii: '8',
  ix: '9',
  x: '10'
};

function expandTitleVariants(raw) {
  const base = String(raw || '').trim();
  if (!base) return [];
  const variants = [base];
  const withArabic = base.replace(/\b(viii|vii|iii|vi|iv|ix|ii|ll|i|v|x)\b/gi, (m) => ROMAN_NUM_MAP[m.toLowerCase()] || m);
  if (withArabic.toLowerCase() !== base.toLowerCase()) variants.push(withArabic);
  const withRoman = base
    .replace(/\bll\b/gi, 'II')
    .replace(/\b2\b/g, 'II')
    .replace(/\b3\b/g, 'III')
    .replace(/\b4\b/g, 'IV');
  if (!variants.some((v) => v.toLowerCase() === withRoman.toLowerCase())) variants.push(withRoman);
  return variants;
}

function normalizeTitleTokens(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/['’`®™]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => ROMAN_NUM_MAP[t] || t);
}

function isReasonableTitleMatch(query, candidate) {
  const qTokens = normalizeTitleTokens(query);
  const cTokens = normalizeTitleTokens(candidate);
  if (qTokens.length === 0 || cTokens.length === 0) return false;
  const qNums = qTokens.filter((t) => /^\d+$/.test(t));
  for (const num of qNums) {
    if (!cTokens.includes(num)) return false;
  }
  const matches = qTokens.filter((t) => cTokens.includes(t)).length;
  return matches / qTokens.length >= 0.6;
}

async function searchGameMetadata(rawTitle) {
  const query = String(rawTitle || '').trim();
  if (!query) return { ok: false, error: 'EMPTY_TITLE' };
  const queryVariants = expandTitleVariants(query);

  const meta = {
    ok: false,
    matchedTitle: query,
    artwork: '',
    backArtwork: '',
    synopsis: '',
    genre: '',
    year: '',
    steamTrailerUrl: ''
  };

  // Source 1: Steam Store Search + AppDetails
  for (const qTry of queryVariants) {
    if (meta.artwork) break;
    try {
      const steamUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(qTry)}&l=english&cc=US`;
      const res = await fetchWithTimeout(steamUrl, 6000);
      if (res.ok) {
        const json = await res.json();
        const match = (json?.items || []).find((item) => isReasonableTitleMatch(qTry, item.name));
        if (match?.id) {
        const appId = match.id;
        meta.matchedTitle = match.name || query;

        const coverCandidates = [
          `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`,
          `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900.jpg`,
          `https://cdn.akamai.steamstatic.com/steam/apps/${appId}/library_600x900_2x.jpg`,
          `https://shared.fastly.steamstatic.com/store_item_assets/steam/apps/${appId}/header.jpg`,
          match.tiny_image
        ].filter(Boolean);

        for (const imgUrl of coverCandidates) {
          try {
            const localUrl = await downloadToFile(imgUrl, ARTWORK_DIR, '.jpg');
            if (localUrl) {
              meta.artwork = localUrl;
              meta.ok = true;
              break;
            }
          } catch {
            // next
          }
        }

        try {
          const detRes = await fetchWithTimeout(`https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`, 6500);
          if (detRes.ok) {
            const detJson = await detRes.json();
            const d = detJson?.[String(appId)]?.data;
            if (d) {
              meta.synopsis = (d.short_description || '').replace(/<[^>]+>/g, '').trim();
              meta.genre = d.genres?.[0]?.description || '';
              const yearMatch = String(d.release_date?.date || '').match(/\b(19|20)\d{2}\b/);
              if (yearMatch) meta.year = yearMatch[0];
              const mov = d.movies?.[0];
              meta.steamTrailerUrl =
                mov?.mp4?.max || mov?.mp4?.['480'] || mov?.webm?.max || mov?.webm?.['480'] || '';

              const backCandidates = [
                d.screenshots?.[0]?.path_full,
                d.screenshots?.[1]?.path_full,
                d.background_raw,
                d.background
              ].filter(Boolean);
              for (const shotUrl of backCandidates) {
                try {
                  const backLocal = await downloadToFile(shotUrl, ARTWORK_DIR, '.jpg');
                  if (backLocal) {
                    meta.backArtwork = backLocal;
                    break;
                  }
                } catch {}
              }
            }
          }
        } catch {
          // optional details
        }
      }
    }
    } catch {
      // Continue to next variant or GOG & Wikipedia
    }
  }

  // Source 2: GOG Catalog API (fills missing cover, back cover screenshot, genre, year)
  if (!meta.artwork || !meta.backArtwork || !meta.genre) {
    try {
      const gogUrl = `https://catalog.gog.com/v1/catalog?limit=6&query=like:${encodeURIComponent(query)}&productType=in:game,pack`;
      const gRes = await fetchWithTimeout(gogUrl, 6000);
      if (gRes.ok) {
        const gJson = await gRes.json();
        const products = gJson?.products || [];
        const bestGog = products.find((p) => isReasonableTitleMatch(query, p.title));
        if (bestGog) {
          if (!meta.ok) meta.matchedTitle = bestGog.title || meta.matchedTitle;
          if (!meta.genre && bestGog.genres?.[0]?.name) meta.genre = bestGog.genres[0].name;
          if (!meta.year && bestGog.releaseDate) {
            const ym = String(bestGog.releaseDate).match(/\b(19|20)\d{2}\b/);
            if (ym) meta.year = ym[0];
          }
          if (!meta.artwork && bestGog.coverVertical) {
            const covUrl = bestGog.coverVertical.startsWith('http') ? bestGog.coverVertical : `https:${bestGog.coverVertical}`;
            const localCov = await downloadToFile(covUrl, ARTWORK_DIR, '.jpg').catch(() => null);
            if (localCov) {
              meta.artwork = localCov;
              meta.ok = true;
            }
          }
          if (!meta.backArtwork && Array.isArray(bestGog.screenshots) && bestGog.screenshots.length > 0) {
            const rawShot = String(bestGog.screenshots[0] || '').replace('{formatter}', 'glx_bg_top_1280');
            const shotUrl = rawShot.startsWith('http') ? rawShot : `https:${rawShot}`;
            const backLocal = await downloadToFile(shotUrl, ARTWORK_DIR, '.jpg').catch(() => null);
            if (backLocal) meta.backArtwork = backLocal;
          }
        }
      }
    } catch {
      // Continue to Wikipedia
    }
  }

  // Source 3: Wikipedia Infobox Cover, Summary Synopsis & Gameplay Screenshot
  if (!meta.artwork || !meta.backArtwork || !meta.synopsis) {
    const wikiQueries = [query, `${query} video game`];
    for (const wq of wikiQueries) {
      try {
        const sUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(wq)}&srlimit=4&format=json`;
        const sRes = await fetchWithTimeout(sUrl, 6000);
        if (!sRes.ok) continue;
        const sJson = await sRes.json();
        const hits = sJson?.query?.search || [];
        const bestHit = hits.find((h) => isReasonableTitleMatch(query, h.title));
        if (!bestHit?.title) continue;

        if (!meta.ok) meta.matchedTitle = bestHit.title;

        if (!meta.synopsis || !meta.year) {
          try {
            const sumUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestHit.title)}`;
            const sumRes = await fetchWithTimeout(sumUrl, 5000);
            if (sumRes.ok) {
              const sumJson = await sumRes.json();
              if (!meta.synopsis && sumJson?.extract) {
                meta.synopsis = sumJson.extract.slice(0, 380);
              }
              if (!meta.year && sumJson?.extract) {
                const ym = sumJson.extract.match(/\b(19|20)\d{2}\b/);
                if (ym) meta.year = ym[0];
              }
            }
          } catch {}
        }

        const pUrl = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(bestHit.title)}&prop=images|text&section=0&format=json`;
        const pRes = await fetchWithTimeout(pUrl, 6000);
        if (!pRes.ok) continue;
        const pJson = await pRes.json();
        const rawImages = pJson?.parse?.images || [];
        const infoboxHtml = pJson?.parse?.text?.['*'] || '';

        const validImgs = rawImages
          .filter((name) => /\.(jpg|jpeg|png|webp)$/i.test(name))
          .filter((name) => !/logo|icon|symbol|flag|commons|shackle|edit-ltr|featured|support_vote|ambox/i.test(name));

        if (!meta.artwork) {
          const rankedCover = validImgs
            .map((name) => {
              let score = 0;
              if (/box_?art|boxshot|cover|packshot|front/i.test(name)) score += 100;
              if (infoboxHtml.includes(encodeURIComponent(name.replace(/ /g, '_'))) || infoboxHtml.includes(name.replace(/ /g, '_'))) score += 30;
              if (/gameplay|screenshot|portrait|headshot/i.test(name)) score -= 50;
              return { name, score };
            })
            .sort((a, b) => b.score - a.score);

          for (const candidate of rankedCover.slice(0, 3)) {
            const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${candidate.name}`)}&prop=imageinfo&iiprop=url&format=json`;
            const infoRes = await fetchWithTimeout(infoUrl, 6000);
            if (!infoRes.ok) continue;
            const infoJson = await infoRes.json();
            const page = Object.values(infoJson?.query?.pages || {})[0];
            const imgUrl = page?.imageinfo?.[0]?.url;
            if (!imgUrl) continue;
            const localUrl = await downloadToFile(imgUrl, ARTWORK_DIR, '.jpg').catch(() => null);
            if (localUrl) {
              meta.artwork = localUrl;
              meta.ok = true;
              break;
            }
          }
        }

        if (!meta.backArtwork) {
          const rankedShot = validImgs
            .map((name) => {
              let score = 0;
              if (/gameplay|screenshot|screen|combat|back/i.test(name)) score += 80;
              if (/box_?art|cover/i.test(name)) score -= 40;
              return { name, score };
            })
            .sort((a, b) => b.score - a.score);

          for (const candidate of rankedShot.slice(0, 2)) {
            const infoUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(`File:${candidate.name}`)}&prop=imageinfo&iiprop=url&format=json`;
            const infoRes = await fetchWithTimeout(infoUrl, 6000);
            if (!infoRes.ok) continue;
            const infoJson = await infoRes.json();
            const page = Object.values(infoJson?.query?.pages || {})[0];
            const imgUrl = page?.imageinfo?.[0]?.url;
            if (!imgUrl) continue;
            const backUrl = await downloadToFile(imgUrl, ARTWORK_DIR, '.jpg').catch(() => null);
            if (backUrl) {
              meta.backArtwork = backUrl;
              break;
            }
          }
        }

        if (meta.artwork && meta.backArtwork) break;
      } catch {
        // next wiki query
      }
    }
  }

  // Fallback: if front artwork exists but back artwork is still empty, reuse a distinct copy or front art so back cover never appears broken
  if (meta.artwork && !meta.backArtwork) {
    meta.backArtwork = meta.artwork;
  }

  return meta;
}

// Fetch Official Scanned Game Manual Pages from Internet Archive
async function fetchOfficialManualPages(rawTitle) {
  const cleanTitle = String(rawTitle || '').replace(/['’]/g, ' ').trim();
  if (!cleanTitle) return { ok: false, pages: [] };

  const queries = [
    `title:("${cleanTitle}") AND (manual OR booklet OR instruction) AND mediatype:(texts)`,
    `title:(${cleanTitle}) AND collection:(videogamemanuals OR consolemanuals OR xbox360manuals OR folkscanomy_games OR manuals) AND mediatype:(texts)`
  ];

  for (const q of queries) {
    try {
      const searchUrl = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier,title,collection&rows=10&output=json`;
      const res = await fetchWithTimeout(searchUrl, 7000);
      if (!res.ok) continue;
      const json = await res.json();
      const docs = json?.response?.docs || [];

      const rankedDocs = docs
        .filter((d) => d?.identifier && d?.title)
        .filter((d) => !/parasound|amplifier|receiver|dishwasher|refrigerator|tractor|printer|camera|router/i.test(d.title))
        .map((d) => {
          let score = 0;
          const tLower = d.title.toLowerCase();
          const cols = Array.isArray(d.collection) ? d.collection.join(' ') : String(d.collection || '');
          if (isReasonableTitleMatch(cleanTitle, d.title)) score += 60;
          if (/manual|booklet|instruction/i.test(tLower)) score += 45;
          if (/videogamemanuals|consolemanuals|xbox360manuals|folkscanomy_games/i.test(cols)) score += 40;
          if (/wii|xbox|ps3|ps2|ps4|pc|nintendo|playstation|game/i.test(tLower)) score += 20;
          if (/deutsche|german|french|spanish|italian/i.test(tLower)) score -= 25;
          if (/storyboard/i.test(tLower)) score -= 40;
          return { ...d, score };
        })
        .sort((a, b) => b.score - a.score);

      for (const doc of rankedDocs.slice(0, 2)) {
        const manualFolder = path.join(MANUALS_DIR, crypto.randomUUID());
        const pages = [];
        // Download first 8 official scanned pages (0..7)
        for (let i = 0; i < 8; i++) {
          const pageUrl = `https://archive.org/download/${encodeURIComponent(doc.identifier)}/page/n${i}_w700.jpg`;
          try {
            const saved = await downloadToFile(pageUrl, manualFolder, '.jpg', 8000, `page_${i}`);
            if (!saved) break;
            pages.push(saved);
          } catch {
            break;
          }
        }
        if (pages.length >= 2) {
          return {
            ok: true,
            identifier: doc.identifier,
            manualTitle: doc.title,
            pages
          };
        }
      }
    } catch {
      // try next query
    }
  }

  return { ok: false, pages: [] };
}

function runYtDlpSearch(ytDlp, query, outTpl) {
  return new Promise((resolve) => {
    execFile(
      ytDlp,
      [
        query,
        '-f',
        '18/22/b[ext=mp4]/b[ext=webm]/b',
        '--no-playlist',
        '--no-check-certificates',
        '--no-warnings',
        '--socket-timeout',
        '15',
        '--max-filesize',
        '80M',
        '-o',
        outTpl
      ],
      { timeout: 60000, windowsHide: true },
      (err) => {
        const dir = path.dirname(outTpl);
        const prefix = path.basename(outTpl).replace('.%(ext)s', '');
        const found = fs.existsSync(dir)
          ? fs.readdirSync(dir).find((f) => f.startsWith(prefix) && !f.endsWith('.part') && !f.endsWith('.ytdl'))
          : null;
        if (found) {
          const full = path.join(dir, found);
          resolve({ ok: true, url: pathToFileURL(full).href, source: 'YouTube' });
        } else {
          resolve({ ok: false, error: err?.message || 'TRAILER_NOT_FOUND' });
        }
      }
    );
  });
}

async function fetchAndDownloadTrailer(title, steamTrailerUrl = '', preferGameplay = false) {
  ensureDirs();

  if (steamTrailerUrl && !preferGameplay) {
    try {
      const fallbackExt = steamTrailerUrl.includes('.webm') ? '.webm' : '.mp4';
      const localVideo = await downloadToFile(steamTrailerUrl, TRAILERS_DIR, fallbackExt, 25000);
      if (localVideo) {
        return { ok: true, url: localVideo, source: 'Steam' };
      }
    } catch {
      // fallback to YouTube
    }
  }

  const ytDlp = getBinPath('yt-dlp.exe');
  if (!ytDlp) {
    return { ok: false, error: 'YT_DLP_MISSING' };
  }

  const cleanTitle = String(title || '').trim();
  const id = crypto.randomUUID();
  const outTpl = path.join(TRAILERS_DIR, `${id}.%(ext)s`);

  const q1 = preferGameplay
    ? `ytsearch1:${cleanTitle} gameplay`
    : `ytsearch1:${cleanTitle} official trailer`;
  const res1 = await runYtDlpSearch(ytDlp, q1, outTpl);
  if (res1.ok) return res1;

  const q2 = `ytsearch1:${cleanTitle} game trailer`;
  return runYtDlpSearch(ytDlp, q2, outTpl);
}

function createMainWindow(query = null) {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1340,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    fullscreen: !query?.updateGate,
    frame: false,
    backgroundColor: '#090b10',
    icon: fs.existsSync(iconPath) ? iconPath : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'), query ? { query } : undefined);
  mainWindow.once('ready-to-show', () => {
    if (!query?.updateGate) {
      mainWindow?.setFullScreen(true);
    }
  });

  mainWindow.on('maximize', () => mainWindow?.webContents.send('window:maximized-changed', true));
  mainWindow.on('unmaximize', () => mainWindow?.webContents.send('window:maximized-changed', false));
  mainWindow.on('closed', () => {
    mainWindow = null;
    if (overlayWindow && !overlayWindow.isDestroyed()) overlayWindow.close();
  });
}

function createOverlayWindow() {
  overlayWindow = new BrowserWindow({
    width: 410,
    height: 490,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  overlayWindow.loadFile(path.join(__dirname, 'renderer', 'overlay.html'));
  overlayWindow.on('blur', () => {
    // Keep subtle responsiveness, allow Escape/Resume to hide cleanly
  });
}

let activeOverlayTheme = 'obsidian';
let gameWatchTimer = null;
let gameWindowWaitTimer = null;

function clearGameWaitTimer() {
  if (gameWindowWaitTimer) {
    clearInterval(gameWindowWaitTimer);
    gameWindowWaitTimer = null;
  }
}

function suspendLauncherForGame() {
  clearGameWaitTimer();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('launcher:suspended', true);
    mainWindow.hide();
  }
}

function waitForGameWindowAndSuspend(exeName, pid) {
  clearGameWaitTimer();
  const startedAt = Date.now();
  const stem = exeName ? path.basename(exeName, path.extname(exeName)) : '';
  const minDelayMs = 1500;
  const maxWaitMs = 4500;
  let checking = false;

  gameWindowWaitTimer = setInterval(() => {
    if (!runningGame) {
      clearGameWaitTimer();
      return;
    }
    const elapsed = Date.now() - startedAt;
    if (elapsed >= maxWaitMs) {
      suspendLauncherForGame();
      return;
    }
    if (elapsed < minDelayMs || checking) return;
    checking = true;

    const safeStem = stem.replace(/'/g, "''");
    const psCmd = [
      `Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win32Fg { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); [DllImport("user32.dll")] public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow); }' -ErrorAction SilentlyContinue;`,
      `$procs = @();`,
      pid ? `$procs += Get-Process -Id ${Number(pid)} -ErrorAction SilentlyContinue;` : '',
      pid ? `$childIds = (Get-CimInstance Win32_Process -Filter "ParentProcessId=${Number(pid)}" -ErrorAction SilentlyContinue).ProcessId; if ($childIds) { $procs += Get-Process -Id $childIds -ErrorAction SilentlyContinue }` : '',
      safeStem ? `$procs += Get-Process -Name '${safeStem}*' -ErrorAction SilentlyContinue;` : '',
      `$win = $procs | Where-Object { $_ -and $_.MainWindowHandle -ne 0 } | Select-Object -First 1;`,
      `if ($win) { [Win32Fg]::ShowWindowAsync($win.MainWindowHandle, 9) | Out-Null; [Win32Fg]::SetForegroundWindow($win.MainWindowHandle) | Out-Null; 'READY' }`
    ].filter(Boolean).join(' ');

    execFile('powershell', ['-NoProfile', '-Command', psCmd], { windowsHide: true, timeout: 1500 }, (_err, stdout) => {
      checking = false;
      if (!runningGame) {
        clearGameWaitTimer();
        return;
      }
      if (String(stdout || '').includes('READY')) {
        suspendLauncherForGame();
      }
    });
  }, 400);
}

function resumeLauncherFromGame() {
  clearGameWaitTimer();
  if (gameWatchTimer) {
    clearInterval(gameWatchTimer);
    gameWatchTimer = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    try {
      mainWindow.setBackgroundColor('#090b10');
      mainWindow.setOpacity(0.08);
    } catch {
      // ignore on platforms without opacity
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.webContents.send('launcher:suspended', false);

    let step = 0;
    const steps = 14;
    const fadeTimer = setInterval(() => {
      step++;
      if (!mainWindow || mainWindow.isDestroyed()) {
        clearInterval(fadeTimer);
        return;
      }
      try {
        mainWindow.setOpacity(Math.min(1, step / steps));
      } catch {
        clearInterval(fadeTimer);
      }
      if (step >= steps) clearInterval(fadeTimer);
    }, 20);
  }
}

function startProcessWatch(exeName) {
  if (gameWatchTimer) clearInterval(gameWatchTimer);
  if (!exeName) return;
  gameWatchTimer = setInterval(() => {
    if (!runningGame) {
      clearInterval(gameWatchTimer);
      gameWatchTimer = null;
      return;
    }
    execFile('tasklist', ['/FI', `IMAGENAME eq ${exeName}`, '/NH'], { windowsHide: true }, (_err, stdout) => {
      if (!runningGame) return;
      const out = String(stdout || '').toLowerCase();
      if (!out.includes(exeName.toLowerCase())) {
        runningGame = null;
        sendOverlayState();
        resumeLauncherFromGame();
      }
    });
  }, 2500);
}

let activeVcState = { active: false, roomId: '', participants: [] };
let vcHudWindow = null;

function createVcHudWindow() {
  if (vcHudWindow && !vcHudWindow.isDestroyed()) return vcHudWindow;
  vcHudWindow = new BrowserWindow({
    width: 280,
    height: 260,
    x: 18,
    y: 18,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    focusable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  vcHudWindow.setIgnoreMouseEvents(true, { forward: true });
  vcHudWindow.setAlwaysOnTop(true, 'screen-saver');
  vcHudWindow.loadFile(path.join(__dirname, 'renderer', 'vc-hud.html'));
  vcHudWindow.on('closed', () => { vcHudWindow = null; });
  return vcHudWindow;
}

function syncVcHudWindow() {
  const showHud = Boolean(runningGame && activeVcState.active && Array.isArray(activeVcState.participants) && activeVcState.participants.length > 0);
  if (!showHud) {
    if (vcHudWindow && !vcHudWindow.isDestroyed() && vcHudWindow.isVisible()) {
      vcHudWindow.hide();
    }
    return;
  }
  const win = createVcHudWindow();
  if (!win.isVisible()) win.showInactive();
  if (!win.webContents.isLoading()) {
    win.webContents.send('vc:state', activeVcState);
  } else {
    win.webContents.once('did-finish-load', () => {
      win.webContents.send('vc:state', activeVcState);
    });
  }
}

function sendOverlayState() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('game:runningChanged', runningGame);
  }
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.webContents.send('overlay:state', { runningGame, theme: activeOverlayTheme, vcState: activeVcState });
  }
  syncVcHudWindow();
}

function togglePowerOverlay(forceShow = null) {
  const now = Date.now();
  if (forceShow === null && now - lastOverlayTrigger < 280) return;
  lastOverlayTrigger = now;

  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow();
  }

  const shouldShow = forceShow !== null ? forceShow : !overlayWindow.isVisible();
  if (shouldShow) {
    sendOverlayState();
    overlayWindow.setAlwaysOnTop(true, 'screen-saver');
    overlayWindow.center();
    overlayWindow.show();
    overlayWindow.focus();
  } else {
    overlayWindow.hide();
  }
}

function startGamepadGuideWatcher() {
  const watcherPath = getBinPath('gamepad-guide.exe');
  if (!watcherPath) return;
  try {
    gamepadProcess = spawn(watcherPath, [], { windowsHide: true, stdio: ['ignore', 'pipe', 'ignore'] });
    let stdoutBuf = '';
    gamepadProcess.stdout.on('data', (chunk) => {
      stdoutBuf += chunk.toString('utf8');
      const lines = stdoutBuf.split(/\r?\n/);
      stdoutBuf = lines.pop() || '';
      for (const raw of lines) {
        const line = raw.trim();
        if (!line) continue;
        if (line === 'GUIDE') {
          togglePowerOverlay();
        } else if (
          line.startsWith('NAV:') &&
          overlayWindow &&
          !overlayWindow.isDestroyed() &&
          overlayWindow.isVisible()
        ) {
          overlayWindow.webContents.send('overlay:nav', line.slice(4));
        }
      }
    });
    gamepadProcess.on('error', () => {
      gamepadProcess = null;
    });
  } catch {
    gamepadProcess = null;
  }
}

async function launchTarget(target, title = '') {
  if (!target || typeof target !== 'string' || !target.trim()) {
    return { ok: false, error: 'NO_TARGET' };
  }
  const trimmed = target.trim();

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
    try {
      await shell.openExternal(trimmed);
      runningGame = { title: title || trimmed, target: trimmed, pid: null, exeName: null, startedAt: Date.now() };
      sendOverlayState();
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err?.message || 'FAILED_TO_OPEN_URI' };
    }
  }

  if (!fs.existsSync(trimmed)) {
    return { ok: false, error: 'FILE_NOT_FOUND' };
  }

  const ext = path.extname(trimmed).toLowerCase();
  const baseLower = path.basename(trimmed).toLowerCase();
  const isRobloxBeta = baseLower === 'robloxplayerbeta.exe';
  const isRobloxLauncher = baseLower === 'robloxplayerlauncher.exe';
  const spawnArgs = isRobloxBeta ? ['--app'] : [];
  const watchExeName = isRobloxLauncher ? 'RobloxPlayerBeta.exe' : path.basename(trimmed);

  if (ext === '.exe') {
    try {
      const child = spawn(trimmed, spawnArgs, {
        cwd: path.dirname(trimmed),
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      const exeName = watchExeName;
      runningGame = {
        title: title || path.basename(trimmed, ext),
        target: trimmed,
        pid: child.pid || null,
        exeName,
        startedAt: Date.now()
      };
      child.on('exit', () => {
        if (runningGame?.pid === child.pid && !isRobloxLauncher) {
          runningGame = null;
          sendOverlayState();
          resumeLauncherFromGame();
        }
      });
      sendOverlayState();
      waitForGameWindowAndSuspend(exeName, isRobloxLauncher ? null : child.pid);
      startProcessWatch(exeName);
      return { ok: true };
    } catch {
      // Fallback to shell.openPath (e.g. if UAC elevation is required)
    }
  }

  const errMsg = await shell.openPath(trimmed);
  if (errMsg) {
    return { ok: false, error: errMsg };
  }
  const fallbackExe = ext === '.exe' ? path.basename(trimmed) : null;
  runningGame = {
    title: title || path.basename(trimmed, ext),
    target: trimmed,
    pid: null,
    exeName: fallbackExe,
    startedAt: Date.now()
  };
  sendOverlayState();
  if (fallbackExe) {
    waitForGameWindowAndSuspend(fallbackExe, null);
    startProcessWatch(fallbackExe);
  }
  return { ok: true };
}

function killRunningGame() {
  return new Promise((resolve) => {
    if (!runningGame) {
      resolve(false);
      return;
    }
    const { pid, exeName } = runningGame;
    runningGame = null;
    sendOverlayState();

    if (pid) {
      execFile('taskkill', ['/PID', String(pid), '/T', '/F'], { windowsHide: true }, () => {
        if (exeName) {
          execFile('taskkill', ['/IM', exeName, '/F'], { windowsHide: true }, () => resolve(true));
        } else {
          resolve(true);
        }
      });
    } else if (exeName) {
      execFile('taskkill', ['/IM', exeName, '/F'], { windowsHide: true }, () => resolve(true));
    } else {
      resolve(false);
    }
  });
}

const UPDATE_CONFIG_PATH = path.join(USER_DATA_DIR, 'update-config.json');
const WHATS_NEW_PATH = path.join(USER_DATA_DIR, 'whats-new.json');

function getPackageMeta() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
  } catch {
    return { version: app.getVersion(), updateFeedUrl: '' };
  }
}

function readUpdateConfig() {
  const pkg = getPackageMeta();
  let saved = {};
  try {
    if (fs.existsSync(UPDATE_CONFIG_PATH)) {
      saved = JSON.parse(fs.readFileSync(UPDATE_CONFIG_PATH, 'utf8'));
    }
  } catch {
    saved = {};
  }
  return {
    feedUrl: String(saved.feedUrl || pkg.updateFeedUrl || '').trim(),
    currentVersion: app.getVersion()
  };
}

function writeUpdateConfig(cfg) {
  ensureDirs();
  fs.writeFileSync(UPDATE_CONFIG_PATH, JSON.stringify({ feedUrl: String(cfg.feedUrl || '').trim() }, null, 2), 'utf8');
  return readUpdateConfig();
}

function parseSemver(v) {
  const clean = String(v || '0.0.0').trim().replace(/^v/i, '');
  const [core, pre = ''] = clean.split('-', 2);
  const nums = core.split('.').map((n) => parseInt(n, 10) || 0);
  return {
    major: nums[0] || 0,
    minor: nums[1] || 0,
    patch: nums[2] || 0,
    pre: pre.toLowerCase()
  };
}

function compareSemver(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  const fields = ['major', 'minor', 'patch'];
  for (const f of fields) {
    if (pa[f] > pb[f]) return 1;
    if (pa[f] < pb[f]) return -1;
  }
  if (!pa.pre && pb.pre) return 1;
  if (pa.pre && !pb.pre) return -1;
  if (pa.pre !== pb.pre) return pa.pre.localeCompare(pb.pre, undefined, { numeric: true });
  return 0;
}

async function fetchRemoteManifest(feedUrl, timeoutMs = 4500) {
  const clean = String(feedUrl || '').trim();
  if (!clean) return null;
  if (clean.startsWith('file:///') || /^[a-zA-Z]:[\\/]/.test(clean)) {
    const localPath = clean.startsWith('file:///') ? decodeURIComponent(clean.slice(8)).replace(/\//g, '\\') : clean;
    if (!fs.existsSync(localPath)) return null;
    return JSON.parse(fs.readFileSync(localPath, 'utf8'));
  }
  const sep = clean.includes('?') ? '&' : '?';
  const res = await fetchWithTimeout(`${clean}${sep}_t=${Date.now()}`, timeoutMs);
  if (!res || !res.ok) return null;
  return await res.json();
}

let cachedPendingManifest = null;
let updateCheckInterval = null;

async function checkRemoteUpdate(timeoutMs = 4500) {
  const cfg = readUpdateConfig();
  if (!cfg.feedUrl) {
    return { updateAvailable: false, currentVersion: cfg.currentVersion, feedUrl: '' };
  }
  try {
    const manifest = await fetchRemoteManifest(cfg.feedUrl, timeoutMs);
    if (!manifest || !manifest.version || !manifest.downloadUrl) {
      return { updateAvailable: false, currentVersion: cfg.currentVersion, feedUrl: cfg.feedUrl };
    }
    const isNewer = compareSemver(manifest.version, cfg.currentVersion) > 0;
    if (isNewer) cachedPendingManifest = manifest;
    return {
      updateAvailable: isNewer,
      currentVersion: cfg.currentVersion,
      feedUrl: cfg.feedUrl,
      manifest
    };
  } catch (err) {
    return { updateAvailable: false, currentVersion: cfg.currentVersion, feedUrl: cfg.feedUrl, error: err?.message || 'CHECK_FAILED' };
  }
}

function downloadUpdateFile(urlStr, destPath, onProgress, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('Too many redirects'));
    if (urlStr.startsWith('file:///') || /^[a-zA-Z]:[\\/]/.test(urlStr)) {
      const srcPath = urlStr.startsWith('file:///') ? decodeURIComponent(urlStr.slice(8)).replace(/\//g, '\\') : urlStr;
      fs.copyFileSync(srcPath, destPath);
      onProgress?.(100);
      return resolve(destPath);
    }
    const client = urlStr.startsWith('https') ? https : http;
    const req = client.get(urlStr, { headers: { 'User-Agent': 'GameLauncher-Updater/1.0' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const nextUrl = new URL(res.headers.location, urlStr).toString();
        res.resume();
        return downloadUpdateFile(nextUrl, destPath, onProgress, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const total = parseInt(res.headers['content-length'] || '0', 10) || 0;
      let received = 0;
      const out = fs.createWriteStream(destPath);
      res.on('data', (chunk) => {
        received += chunk.length;
        if (total > 0) {
          onProgress?.(Math.min(99, Math.round((received / total) * 100)));
        }
      });
      res.pipe(out);
      out.on('finish', () => {
        out.close(() => {
          onProgress?.(100);
          resolve(destPath);
        });
      });
      out.on('error', reject);
    });
    req.on('error', reject);
  });
}

async function installRemoteUpdate(manifest) {
  const target = manifest || cachedPendingManifest;
  if (!target?.downloadUrl) return { ok: false, error: 'NO_MANIFEST' };

  const tempDir = path.join(os.tmpdir(), 'GameLauncherUpdate');
  const stageDir = path.join(tempDir, 'stage');
  fs.rmSync(tempDir, { recursive: true, force: true });
  fs.mkdirSync(stageDir, { recursive: true });

  const isZip = /\.zip(\?|$)/i.test(target.downloadUrl);
  const pkgName = isZip ? 'update.zip' : 'update.exe';
  const downloadedPath = path.join(tempDir, pkgName);

  const sendProgress = (pct, status) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('updater:progress', { pct, status });
    }
  };

  try {
    sendProgress(5, `Downloading v${target.version}...`);
    await downloadUpdateFile(target.downloadUrl, downloadedPath, (pct) => {
      sendProgress(pct, `Downloading v${target.version}... ${pct}%`);
    });

    ensureDirs();
    fs.writeFileSync(
      WHATS_NEW_PATH,
      JSON.stringify(
        {
          version: target.version,
          title: target.title || `Updated to v${target.version}`,
          notes: Array.isArray(target.notes) ? target.notes : [],
          fixes: Array.isArray(target.fixes) ? target.fixes : []
        },
        null,
        2
      ),
      'utf8'
    );

    sendProgress(100, 'Applying update & relaunching...');

    if (!app.isPackaged) {
      // Dev mode simulation: relaunch without overwriting source files
      setTimeout(() => {
        app.relaunch();
        app.exit(0);
      }, 450);
      return { ok: true, devSimulated: true };
    }

    const appDir = path.dirname(process.execPath);
    const exeName = path.basename(process.execPath);
    const psScriptPath = path.join(tempDir, 'apply-update.ps1');
    const escapedAppDir = appDir.replace(/'/g, "''");
    const escapedExePath = process.execPath.replace(/'/g, "''");
    const escapedDownloaded = downloadedPath.replace(/'/g, "''");
    const escapedStage = stageDir.replace(/'/g, "''");
    const escapedExeName = exeName.replace(/'/g, "''");

    const isSetupExe = !isZip && /setup|installer/i.test(target.downloadUrl);
    const scriptLines = [
      `$ErrorActionPreference = 'Stop'`,
      `$pidToWait = ${process.pid}`,
      `while (Get-Process -Id $pidToWait -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 250 }`,
      `Start-Sleep -Milliseconds 350`,
      `Unblock-File -Path '${escapedDownloaded}' -ErrorAction SilentlyContinue`,
      isZip
        ? [
            `Expand-Archive -Path '${escapedDownloaded}' -DestinationPath '${escapedStage}' -Force`,
            `Get-ChildItem -Path '${escapedStage}' -Recurse -File | Unblock-File -ErrorAction SilentlyContinue`,
            `$exeMatch = Get-ChildItem -Path '${escapedStage}' -Filter '${escapedExeName}' -Recurse | Select-Object -First 1`,
            `if (-not $exeMatch) { $exeMatch = Get-ChildItem -Path '${escapedStage}' -Filter '*.exe' -Recurse | Select-Object -First 1 }`,
            `$srcRoot = if ($exeMatch) { $exeMatch.DirectoryName } else { '${escapedStage}' }`,
            `Copy-Item -Path (Join-Path $srcRoot '*') -Destination '${escapedAppDir}' -Recurse -Force`,
            `Start-Process -FilePath '${escapedExePath}'`
          ].join('\r\n')
        : isSetupExe
          ? `Start-Process -FilePath '${escapedDownloaded}' -ArgumentList '/S'`
          : [
              `Copy-Item -Path '${escapedDownloaded}' -Destination '${escapedExePath}' -Force`,
              `Start-Process -FilePath '${escapedExePath}'`
            ].join('\r\n')
    ].join('\r\n');

    fs.writeFileSync(psScriptPath, scriptLines, 'utf8');
    const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', psScriptPath], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    });
    child.unref();

    setTimeout(() => app.exit(0), 250);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message || 'UPDATE_FAILED' };
  }
}

app.whenReady().then(async () => {
  const startupCheck = await checkRemoteUpdate(4200);
  if (startupCheck.updateAvailable && startupCheck.manifest) {
    createMainWindow({ updateGate: '1' });
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow?.webContents.send('updater:gate', startupCheck);
    });
  } else {
    createMainWindow();
    createOverlayWindow();
    startGamepadGuideWatcher();

    // Periodic check while launcher is already open (every 10 minutes)
    updateCheckInterval = setInterval(async () => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      const res = await checkRemoteUpdate(6000);
      if (res.updateAvailable && res.manifest) {
        mainWindow.webContents.send('updater:available', res);
      }
    }, 10 * 60 * 1000);
  }

  // Global Insert key opens Quick Power Overlay even during fullscreen gameplay!
  globalShortcut.register('Insert', () => {
    togglePowerOverlay();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  if (gamepadProcess) {
    try {
      gamepadProcess.kill();
    } catch {
      // ignore
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Window Controls
ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (!mainWindow) return false;
  if (mainWindow.isFullScreen()) {
    mainWindow.setFullScreen(false);
    return false;
  }
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
    return false;
  }
  mainWindow.maximize();
  return true;
});
ipcMain.handle('window:toggleFullscreen', () => {
  if (!mainWindow) return false;
  const next = !mainWindow.isFullScreen();
  mainWindow.setFullScreen(next);
  return next;
});
ipcMain.handle('window:close', () => mainWindow?.close());
ipcMain.handle('window:isMaximized', () => (mainWindow ? mainWindow.isMaximized() : false));

// Profiles Persistence
ipcMain.handle('profiles:load', () => readProfilesStore());
ipcMain.handle('profiles:save', (_event, payload) => writeProfilesStore(payload));

// File Pickers
ipcMain.handle('dialog:pickGame', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Game Executable or Shortcut',
    properties: ['openFile'],
    filters: [
      { name: 'Executables & Shortcuts', extensions: ['exe', 'lnk', 'bat', 'cmd', 'url'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return null;
  const filePath = result.filePaths[0];
  let suggestedTitle = path.basename(filePath, path.extname(filePath));
  if (/^robloxplayer(beta|launcher)$/i.test(suggestedTitle) || /\\Roblox\\Versions\\/i.test(filePath)) {
    suggestedTitle = 'Roblox';
  } else if (/^minecraftlauncher$/i.test(suggestedTitle) || /^minecraft$/i.test(suggestedTitle)) {
    suggestedTitle = 'Minecraft';
  } else if (/^tlauncher$/i.test(suggestedTitle)) {
    suggestedTitle = 'TLauncher';
  }
  return { filePath, suggestedTitle };
});

ipcMain.handle('dialog:pickImage', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Cover / Disc Artwork',
    properties: ['openFile'],
    filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;

  ensureDirs();
  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath) || '.png';
  const destPath = path.join(ARTWORK_DIR, `${crypto.randomUUID()}${ext}`);
  fs.copyFileSync(srcPath, destPath);
  return `file:///${destPath.replace(/\\/g, '/')}`;
});

ipcMain.handle('dialog:pickAvatar', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Profile Picture (PNG or GIF)',
    properties: ['openFile'],
    filters: [{ name: 'Profile Pictures (PNG / GIF)', extensions: ['png', 'gif', 'jpg', 'jpeg', 'webp'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;

  ensureDirs();
  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath) || '.png';
  const destPath = path.join(AVATARS_DIR, `${crypto.randomUUID()}${ext}`);
  fs.copyFileSync(srcPath, destPath);
  return `file:///${destPath.replace(/\\/g, '/')}`;
});

ipcMain.handle('dialog:pickVideo', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Local Trailer Video',
    properties: ['openFile'],
    filters: [{ name: 'Videos', extensions: ['mp4', 'webm', 'mkv'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;

  ensureDirs();
  const srcPath = result.filePaths[0];
  const ext = path.extname(srcPath) || '.mp4';
  const destPath = path.join(TRAILERS_DIR, `${crypto.randomUUID()}${ext}`);
  fs.copyFileSync(srcPath, destPath);
  return `file:///${destPath.replace(/\\/g, '/')}`;
});

ipcMain.handle('dialog:pickWallpaper', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select PS3 XMB Background Video (MP4) or Image',
    properties: ['openFile'],
    filters: [
      { name: 'MP4 Video or Image Wallpaper', extensions: ['mp4', 'webm', 'mov', 'mkv', 'm4v', 'png', 'jpg', 'jpeg', 'webp', 'gif'] },
      { name: 'Videos (MP4 / WebM)', extensions: ['mp4', 'webm', 'mov', 'mkv', 'm4v'] },
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif'] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return null;
  ensureDirs();
  const srcPath = result.filePaths[0];
  const ext = (path.extname(srcPath) || '.png').toLowerCase();
  const isVid = ['.mp4', '.webm', '.mov', '.mkv', '.m4v'].includes(ext);
  const destDir = isVid ? PS3_VIDEO_DIR : PS3_PIC_DIR;
  const destPath = path.join(destDir, `${crypto.randomUUID()}${ext}`);
  fs.copyFileSync(srcPath, destPath);
  return pathToFileURL(destPath).href;
});

ipcMain.handle('dialog:pickAudio', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Add Audio File to ps3_audio',
    properties: ['openFile'],
    filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'opus'] }]
  });
  if (result.canceled || !result.filePaths.length) return null;
  ensureDirs();
  const srcPath = result.filePaths[0];
  const safeBase = path.basename(srcPath).replace(/[^a-zA-Z0-9._ -]/g, '_');
  const destPath = path.join(PS3_AUDIO_DIR, safeBase);
  fs.copyFileSync(srcPath, destPath);
  return pathToFileURL(destPath).href;
});

function readAudioTags(filePath) {
  const tags = { title: '', artist: '', album: '' };
  try {
    const fd = fs.openSync(filePath, 'r');
    const stat = fs.fstatSync(fd);
    const head = Buffer.alloc(Math.min(16384, stat.size));
    fs.readSync(fd, head, 0, head.length, 0);

    // 1. Check ID3v2 header ("ID3")
    if (head.length > 10 && head.toString('ascii', 0, 3) === 'ID3') {
      const ver = head[3];
      const tagSize =
        ((head[6] & 0x7f) << 21) |
        ((head[7] & 0x7f) << 14) |
        ((head[8] & 0x7f) << 7) |
        (head[9] & 0x7f);
      const limit = Math.min(head.length, 10 + tagSize);
      let pos = 10;
      while (pos + 10 < limit) {
        const frameId = head.toString('ascii', pos, pos + 4);
        if (!/^[A-Z0-9]{4}$/.test(frameId)) break;
        const fSize =
          ver >= 4
            ? ((head[pos + 4] & 0x7f) << 21) | ((head[pos + 5] & 0x7f) << 14) | ((head[pos + 6] & 0x7f) << 7) | (head[pos + 7] & 0x7f)
            : head.readUInt32BE(pos + 4);
        if (fSize <= 0 || pos + 10 + fSize > limit) break;
        if (frameId === 'TIT2' || frameId === 'TPE1' || frameId === 'TALB') {
          const enc = head[pos + 10];
          const raw = head.subarray(pos + 11, pos + 10 + fSize);
          let val = '';
          if (enc === 1 || enc === 2) {
            val = raw.toString('utf16le').replace(/^\ufeff/, '');
          } else if (enc === 3) {
            val = raw.toString('utf8');
          } else {
            val = raw.toString('latin1');
          }
          val = val.replace(/\0/g, '').trim();
          if (frameId === 'TIT2' && val) tags.title = val;
          if (frameId === 'TPE1' && val) tags.artist = val;
          if (frameId === 'TALB' && val) tags.album = val;
        }
        pos += 10 + fSize;
      }
    }

    // 2. Fallback: ID3v1 at end of file ("TAG")
    if ((!tags.title || !tags.album) && stat.size >= 128) {
      const tail = Buffer.alloc(128);
      fs.readSync(fd, tail, 0, 128, stat.size - 128);
      if (tail.toString('ascii', 0, 3) === 'TAG') {
        const t = tail.subarray(3, 33).toString('latin1').replace(/\0/g, '').trim();
        const a = tail.subarray(33, 63).toString('latin1').replace(/\0/g, '').trim();
        const al = tail.subarray(63, 93).toString('latin1').replace(/\0/g, '').trim();
        if (!tags.title && t) tags.title = t;
        if (!tags.artist && a) tags.artist = a;
        if (!tags.album && al) tags.album = al;
      }
    }
    fs.closeSync(fd);
  } catch {
    // ignore tag parse errors
  }
  return tags;
}

function scanMediaDir(dirPath, exts, limit = 100, isAudio = false) {
  const results = [];
  if (!dirPath || !fs.existsSync(dirPath)) return results;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      if (results.length >= limit) break;
      const full = path.join(dirPath, entry.name);
      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (exts.includes(ext)) {
          const tags = isAudio ? readAudioTags(full) : null;
          results.push({
            name: entry.name,
            title: tags?.title || path.basename(entry.name, ext),
            artist: tags?.artist || '',
            album: tags?.album || '',
            url: pathToFileURL(full).href,
            folder: dirPath,
            subFolder: ''
          });
        }
      } else if (entry.isDirectory() && results.length < limit) {
        const sub = fs.readdirSync(full, { withFileTypes: true });
        for (const sEntry of sub) {
          if (results.length >= limit) break;
          if (!sEntry.isFile()) continue;
          const ext = path.extname(sEntry.name).toLowerCase();
          if (exts.includes(ext)) {
            const subFull = path.join(full, sEntry.name);
            const tags = isAudio ? readAudioTags(subFull) : null;
            results.push({
              name: sEntry.name,
              title: tags?.title || path.basename(sEntry.name, ext),
              artist: tags?.artist || '',
              album: tags?.album || entry.name,
              url: pathToFileURL(subFull).href,
              folder: full,
              subFolder: entry.name
            });
          }
        }
      }
    }
  } catch {
    // ignore permission errors on system subfolders
  }
  return results;
}

ipcMain.handle('media:getFolderStatus', () => {
  return {
    launcherMainDir: LAUNCHER_MAIN_DIR,
    ps3PicDir: PS3_PIC_DIR,
    ps3VideoDir: PS3_VIDEO_DIR,
    ps3AudioDir: PS3_AUDIO_DIR,
    ps3PicExists: fs.existsSync(PS3_PIC_DIR),
    ps3VideoExists: fs.existsSync(PS3_VIDEO_DIR),
    ps3AudioExists: fs.existsSync(PS3_AUDIO_DIR),
    devicePicturesDir: app.getPath('pictures'),
    deviceVideosDir: app.getPath('videos'),
    deviceMusicDir: app.getPath('music')
  };
});

ipcMain.handle('media:createPs3Folders', () => {
  ensureDirs();
  return {
    ok: true,
    ps3PicDir: PS3_PIC_DIR,
    ps3VideoDir: PS3_VIDEO_DIR,
    ps3AudioDir: PS3_AUDIO_DIR
  };
});

ipcMain.handle('media:openFolder', (_event, kind) => {
  ensureDirs();
  const map = {
    pic: PS3_PIC_DIR,
    video: PS3_VIDEO_DIR,
    audio: PS3_AUDIO_DIR,
    devicePic: app.getPath('pictures'),
    deviceVideo: app.getPath('videos'),
    deviceAudio: app.getPath('music')
  };
  const target = map[kind] || LAUNCHER_MAIN_DIR;
  if (fs.existsSync(target)) {
    shell.openPath(target);
    return true;
  }
  return false;
});

ipcMain.handle('media:scan', () => {
  const picExts = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'];
  const vidExts = ['.mp4', '.webm', '.mov', '.mkv', '.m4v'];
  const audExts = ['.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac', '.opus'];

  const ps3Pics = scanMediaDir(PS3_PIC_DIR, picExts, 80);
  const devicePics = scanMediaDir(app.getPath('pictures'), picExts, 60);
  const ps3Videos = scanMediaDir(PS3_VIDEO_DIR, vidExts, 60);
  const deviceVideos = scanMediaDir(app.getPath('videos'), vidExts, 50);
  const ps3Audio = scanMediaDir(PS3_AUDIO_DIR, audExts, 120, true);
  const deviceAudio = scanMediaDir(app.getPath('music'), audExts, 120, true);

  return {
    pictures: { ps3: ps3Pics, device: devicePics },
    videos: { ps3: ps3Videos, device: deviceVideos },
    audio: { ps3: ps3Audio, device: deviceAudio }
  };
});

// Auto Metadata, Official Manual & Trailer Fetchers
ipcMain.handle('artwork:searchCover', async (_event, title) => {
  const res = await searchGameMetadata(title);
  if (!res?.ok && /\broblox\b/i.test(String(title || ''))) {
    return {
      ok: true,
      matchedTitle: 'Roblox',
      artwork: res?.artwork || '',
      backArtwork: res?.backArtwork || '',
      synopsis: res?.synopsis || 'Roblox is an online game platform and game creation system that lets users play and create millions of 3D experiences.',
      genre: res?.genre || 'Sandbox / Online',
      year: res?.year || '2006',
      steamTrailerUrl: ''
    };
  }
  if (!res?.ok && /\b(minecraft|tlauncher)\b/i.test(String(title || ''))) {
    const isTl = /\btlauncher\b/i.test(String(title || ''));
    return {
      ok: true,
      matchedTitle: isTl ? 'TLauncher (Minecraft)' : 'Minecraft',
      artwork: res?.artwork || '',
      backArtwork: res?.backArtwork || '',
      synopsis: res?.synopsis || 'Explore infinite blocky worlds, mine resources, craft tools, and build anything you can imagine.',
      genre: res?.genre || 'Sandbox / Survival',
      year: res?.year || '2009',
      steamTrailerUrl: ''
    };
  }
  return res;
});

ipcMain.handle('artwork:extractExeIcon', async (_event, exePath) => {
  if (!exePath || typeof exePath !== 'string' || !fs.existsSync(exePath)) return null;
  try {
    ensureDirs();
    const icon = await app.getFileIcon(exePath, { size: 'large' });
    if (!icon || icon.isEmpty()) return null;
    const png = icon.toPNG();
    if (!png || !png.length) return null;
    const destPath = path.join(ARTWORK_DIR, `exe-icon-${crypto.randomUUID()}.png`);
    fs.writeFileSync(destPath, png);
    return `file:///${destPath.replace(/\\/g, '/')}`;
  } catch {
    return null;
  }
});

ipcMain.handle('game:findRobloxExe', async () => {
  const candidates = [];
  const roots = [
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Roblox', 'Versions') : '',
    process.env['ProgramFiles(x86)'] ? path.join(process.env['ProgramFiles(x86)'], 'Roblox', 'Versions') : '',
    process.env.ProgramFiles ? path.join(process.env.ProgramFiles, 'Roblox', 'Versions') : ''
  ].filter(Boolean);

  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    try {
      const dirs = fs.readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory());
      for (const d of dirs) {
        const beta = path.join(root, d.name, 'RobloxPlayerBeta.exe');
        if (fs.existsSync(beta)) {
          const stat = fs.statSync(beta);
          candidates.push({ filePath: beta, mtimeMs: stat.mtimeMs });
        }
      }
    } catch {}
  }
  candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  if (candidates.length > 0) {
    return { ok: true, filePath: candidates[0].filePath, suggestedTitle: 'Roblox' };
  }
  return { ok: false, filePath: '', suggestedTitle: 'Roblox' };
});

ipcMain.handle('game:findMinecraftExe', async () => {
  const candidates = [
    process.env.LOCALAPPDATA ? { path: path.join(process.env.LOCALAPPDATA, 'Programs', 'Minecraft Launcher', 'MinecraftLauncher.exe'), title: 'Minecraft', kind: 'Minecraft Launcher' } : null,
    process.env['ProgramFiles(x86)'] ? { path: path.join(process.env['ProgramFiles(x86)'], 'Minecraft Launcher', 'MinecraftLauncher.exe'), title: 'Minecraft', kind: 'Minecraft Launcher' } : null,
    process.env.ProgramFiles ? { path: path.join(process.env.ProgramFiles, 'Minecraft Launcher', 'MinecraftLauncher.exe'), title: 'Minecraft', kind: 'Minecraft Launcher' } : null,
    { path: 'C:\\XboxGames\\Minecraft Launcher\\Content\\Minecraft.exe', title: 'Minecraft', kind: 'Minecraft (Xbox)' },
    process.env.APPDATA ? { path: path.join(process.env.APPDATA, '.tlauncher', 'TLauncher.exe'), title: 'TLauncher', kind: 'TLauncher' } : null,
    process.env.APPDATA ? { path: path.join(process.env.APPDATA, '.minecraft', 'TLauncher.exe'), title: 'TLauncher', kind: 'TLauncher' } : null,
    process.env.USERPROFILE ? { path: path.join(process.env.USERPROFILE, 'Desktop', 'TLauncher.exe'), title: 'TLauncher', kind: 'TLauncher' } : null,
    process.env.USERPROFILE ? { path: path.join(process.env.USERPROFILE, 'Downloads', 'TLauncher.exe'), title: 'TLauncher', kind: 'TLauncher' } : null
  ].filter(Boolean);

  const found = [];
  for (const c of candidates) {
    if (fs.existsSync(c.path)) {
      found.push({ filePath: c.path, suggestedTitle: c.title, kind: c.kind });
    }
  }
  if (found.length > 0) {
    return { ok: true, filePath: found[0].filePath, suggestedTitle: found[0].suggestedTitle, kind: found[0].kind, found };
  }
  return { ok: false, filePath: '', suggestedTitle: 'Minecraft', found: [] };
});

ipcMain.handle('vc:updateState', (_event, vcState) => {
  activeVcState = {
    active: Boolean(vcState?.active),
    roomId: String(vcState?.roomId || ''),
    participants: Array.isArray(vcState?.participants) ? vcState.participants : []
  };
  sendOverlayState();
  return true;
});

ipcMain.handle('vc:getState', () => activeVcState);

ipcMain.handle('manual:fetch', async (_event, title) => fetchOfficialManualPages(title));
ipcMain.handle('trailer:fetch', async () => null);

ipcMain.handle('artwork:importFile', async (_event, srcPath) => {
  if (!srcPath || typeof srcPath !== 'string' || !fs.existsSync(srcPath)) return null;
  const ext = path.extname(srcPath).toLowerCase();
  if (!['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(ext)) return null;
  ensureDirs();
  const destPath = path.join(ARTWORK_DIR, `${crypto.randomUUID()}${ext}`);
  fs.copyFileSync(srcPath, destPath);
  return `file:///${destPath.replace(/\\/g, '/')}`;
});

// Game Launch
ipcMain.handle('game:launch', async (_event, payload) => {
  if (typeof payload === 'string') return launchTarget(payload, '');
  return launchTarget(payload?.target, payload?.title);
});

ipcMain.handle('game:openFolder', async (_event, target) => {
  if (!target || typeof target !== 'string' || !fs.existsSync(target)) return false;
  shell.showItemInFolder(target);
  return true;
});

ipcMain.handle('theme:set', (_event, themeName) => {
  activeOverlayTheme = String(themeName || 'obsidian');
  sendOverlayState();
  return true;
});

// Quick Power Overlay Controls
ipcMain.handle('overlay:open', () => togglePowerOverlay(true));
ipcMain.handle('overlay:resume', () => togglePowerOverlay(false));
ipcMain.handle('overlay:getState', () => ({ runningGame, theme: activeOverlayTheme }));

ipcMain.handle('overlay:closeGame', async () => {
  await killRunningGame();
  togglePowerOverlay(false);
  resumeLauncherFromGame();
  return true;
});

ipcMain.handle('overlay:restartGame', async () => {
  const prev = runningGame ? { ...runningGame } : null;
  await killRunningGame();
  togglePowerOverlay(false);
  if (prev?.target) {
    setTimeout(() => launchTarget(prev.target, prev.title), 350);
  }
  return true;
});

ipcMain.handle('overlay:showLauncher', () => {
  togglePowerOverlay(false);
  resumeLauncherFromGame();
  return true;
});

ipcMain.handle('overlay:deviceAction', (_event, action) => {
  togglePowerOverlay(false);
  if (action === 'sleep') {
    execFile('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0'], { windowsHide: true });
  } else if (action === 'restart') {
    execFile('shutdown', ['/r', '/t', '0'], { windowsHide: true });
  } else if (action === 'shutdown') {
    execFile('shutdown', ['/s', '/t', '0'], { windowsHide: true });
  }
  return true;
});

// Remote Auto-Updater & What's New IPC
ipcMain.handle('updater:getConfig', () => readUpdateConfig());
ipcMain.handle('updater:setFeedUrl', (_event, feedUrl) => writeUpdateConfig({ feedUrl }));
ipcMain.handle('updater:check', () => checkRemoteUpdate(6500));
ipcMain.handle('updater:install', (_event, manifest) => installRemoteUpdate(manifest));
ipcMain.handle('updater:getWhatsNew', () => {
  try {
    if (!fs.existsSync(WHATS_NEW_PATH)) return null;
    return JSON.parse(fs.readFileSync(WHATS_NEW_PATH, 'utf8'));
  } catch {
    return null;
  }
});
ipcMain.handle('updater:clearWhatsNew', () => {
  try {
    if (fs.existsSync(WHATS_NEW_PATH)) fs.unlinkSync(WHATS_NEW_PATH);
  } catch {
    // ignore
  }
  return true;
});
ipcMain.handle('updater:bootNormally', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
    mainWindow.setFullScreen(true);
    if (!overlayWindow || overlayWindow.isDestroyed()) {
      createOverlayWindow();
      startGamepadGuideWatcher();
    }
  }
  return true;
});
