import { Stage3D } from './stage3d.js';
import { BackdropRenderer, XMB_BG_COLORS } from './backdrop.js';
import { XmbAudio, runPs3Intro, cancelPs3Intro, runPs3GameLaunchSplash } from './xmb-media.js';

const api = window.launcherAPI;
const xmbAudio = new XmbAudio();

const state = {
  activeProfileId: 'profile-default',
  profiles: [],
  tutorialCompleted: false,
  tutorialStep: 0,
  avatarGalleryTab: 'gradient',
  bindingHomeButton: false,
  filter: 'all',
  sort: 'recent',
  search: '',
  selectedId: null,
  drawerOpen: false,
  activeTab: 'display',
  creatingNewGame: false,
  editingProfileId: null,
  pendingUnwrapExec: '',
  pendingUnwrapTitle: '',
  last3dKey: '',
  xmbOpenAlbum: null,
  obsidianMediaTab: 'music',
  obsidianOpenAlbum: null,
  xmbCatIdx: 4, // Default to 'game' column in full 8-column XMB
  xmbItemIdxs: [0, 0, 0, 0, 0, 0, 0, 0, 0]
};

let stage3d = null;
let backdrop = null;
let resizeObserver = null;
let toastTimer = null;
let xmbHoverVideoTimer = null;
let xmbActiveVideoGameId = null;
const xmbAutoFetchSet = new Set();

const els = {
  backdropCanvas: document.getElementById('backdropCanvas'),
  obsidianHeroBackdrop: document.getElementById('obsidianHeroBackdrop'),
  brandTitle: document.getElementById('brandTitle'),
  btnTitlebarTutorial: document.getElementById('btnTitlebarTutorial'),
  btnTitlebarNotifs: document.getElementById('btnTitlebarNotifs'),
  notifBadgeCount: document.getElementById('notifBadgeCount'),
  controllerPill: document.getElementById('controllerPill'),
  controllerPillText: document.getElementById('controllerPillText'),
  btnForefrontProfile: document.getElementById('btnForefrontProfile'),
  forefrontPfpImg: document.getElementById('forefrontPfpImg'),
  forefrontPfpFallback: document.getElementById('forefrontPfpFallback'),
  forefrontStatusDot: document.getElementById('forefrontStatusDot'),
  profileNameLabel: document.getElementById('profileNameLabel'),
  profileLevelPill: document.getElementById('profileLevelPill'),
  profileCustomStatusLabel: document.getElementById('profileCustomStatusLabel'),
  profileRolesMini: document.getElementById('profileRolesMini'),
  btnFullscreen: document.getElementById('btnFullscreen'),
  btnMin: document.getElementById('btnMin'),
  btnMax: document.getElementById('btnMax'),
  btnClose: document.getElementById('btnClose'),

  // Quick Navigation Rail & Profile Card Popover
  launcherRail: document.getElementById('launcherRail'),
  railBtns: document.querySelectorAll('.rail-btn'),
  profileCardPopover: document.getElementById('profileCardPopover'),
  profileBannerEl: document.getElementById('profileBannerEl'),
  btnEditProfileCard: document.getElementById('btnEditProfileCard'),
  profileCardAvatarWrap: document.getElementById('profileCardAvatarWrap'),
  profileCardAvatarImg: document.getElementById('profileCardAvatarImg'),
  profileCardAvatarFallback: document.getElementById('profileCardAvatarFallback'),
  profileCardStatusDot: document.getElementById('profileCardStatusDot'),
  profileTrophyCountBadge: document.getElementById('profileTrophyCountBadge'),
  profileCardName: document.getElementById('profileCardName'),
  profileCardHandle: document.getElementById('profileCardHandle'),
  profileCardStatusText: document.getElementById('profileCardStatusText'),
  profileCardBio: document.getElementById('profileCardBio'),
  profileCardRolesList: document.getElementById('profileCardRolesList'),
  profileTrophyLevelText: document.getElementById('profileTrophyLevelText'),
  profileTotalPlaysText: document.getElementById('profileTotalPlaysText'),
  profileTrophyProgressFill: document.getElementById('profileTrophyProgressFill'),

  // XMB In-Launcher Media Player & Folder Prompt
  xmbPhotoViewer: document.getElementById('xmbPhotoViewer'),
  xmbPhotoTitle: document.getElementById('xmbPhotoTitle'),
  xmbPhotoImg: document.getElementById('xmbPhotoImg'),
  btnXmbPhotoPrev: document.getElementById('btnXmbPhotoPrev'),
  btnXmbPhotoNext: document.getElementById('btnXmbPhotoNext'),
  btnXmbPhotoSetBg: document.getElementById('btnXmbPhotoSetBg'),
  btnXmbPhotoSetPfp: document.getElementById('btnXmbPhotoSetPfp'),
  btnXmbPhotoClose: document.getElementById('btnXmbPhotoClose'),

  xmbVideoPlayerModal: document.getElementById('xmbVideoPlayerModal'),
  xmbVideoTitle: document.getElementById('xmbVideoTitle'),
  xmbVideoPlayerEl: document.getElementById('xmbVideoPlayerEl'),
  btnXmbVideoSetBg: document.getElementById('btnXmbVideoSetBg'),
  btnXmbVideoClose: document.getElementById('btnXmbVideoClose'),

  xmbMusicBar: document.getElementById('xmbMusicBar'),
  xmbMusicTitle: document.getElementById('xmbMusicTitle'),
  xmbMusicTime: document.getElementById('xmbMusicTime'),
  xmbAudioPlayerEl: document.getElementById('xmbAudioPlayerEl'),
  btnXmbMusicPrev: document.getElementById('btnXmbMusicPrev'),
  btnXmbMusicToggle: document.getElementById('btnXmbMusicToggle'),
  btnXmbMusicNext: document.getElementById('btnXmbMusicNext'),
  btnXmbMusicClose: document.getElementById('btnXmbMusicClose'),

  xmbMediaFolderPrompt: document.getElementById('xmbMediaFolderPrompt'),
  btnCreatePs3FoldersPrompt: document.getElementById('btnCreatePs3FoldersPrompt'),
  btnDismissPs3FoldersPrompt: document.getElementById('btnDismissPs3FoldersPrompt'),

  obsidianMediaHub: document.getElementById('obsidianMediaHub'),
  obsidianMediaGrid: document.getElementById('obsidianMediaGrid'),
  obsMediaTabs: document.querySelectorAll('.obs-m-tab'),
  btnCloseObsidianMedia: document.getElementById('btnCloseObsidianMedia'),
  obsidianMusicPill: document.getElementById('obsidianMusicPill'),
  obsMusicTitle: document.getElementById('obsMusicTitle'),
  obsMusicSub: document.getElementById('obsMusicSub'),
  btnObsMusicPrev: document.getElementById('btnObsMusicPrev'),
  btnObsMusicToggle: document.getElementById('btnObsMusicToggle'),
  btnObsMusicNext: document.getElementById('btnObsMusicNext'),
  btnObsMusicClose: document.getElementById('btnObsMusicClose'),

  gameReturnTransition: document.getElementById('gameReturnTransition'),
  gameReturnBadge: document.getElementById('gameReturnBadge'),
  updatePromptModal: document.getElementById('updatePromptModal'),
  updateModalBadge: document.getElementById('updateModalBadge'),
  updateModalTitle: document.getElementById('updateModalTitle'),
  updateModalDesc: document.getElementById('updateModalDesc'),
  updateProgressWrap: document.getElementById('updateProgressWrap'),
  updateProgressFill: document.getElementById('updateProgressFill'),
  updateProgressText: document.getElementById('updateProgressText'),
  updateModalNotes: document.getElementById('updateModalNotes'),
  btnUpdateLater: document.getElementById('btnUpdateLater'),
  btnUpdateNow: document.getElementById('btnUpdateNow'),
  whatsNewModal: document.getElementById('whatsNewModal'),
  whatsNewTitle: document.getElementById('whatsNewTitle'),
  whatsNewSubtitle: document.getElementById('whatsNewSubtitle'),
  whatsNewNotesWrap: document.getElementById('whatsNewNotesWrap'),
  whatsNewNotesList: document.getElementById('whatsNewNotesList'),
  whatsNewFixesWrap: document.getElementById('whatsNewFixesWrap'),
  whatsNewFixesList: document.getElementById('whatsNewFixesList'),
  btnCloseWhatsNew: document.getElementById('btnCloseWhatsNew'),
  updateFeedUrlInput: document.getElementById('updateFeedUrlInput'),
  btnSaveUpdateFeed: document.getElementById('btnSaveUpdateFeed'),
  btnCheckUpdatesNow: document.getElementById('btnCheckUpdatesNow'),
  btnPreviewWhatsNew: document.getElementById('btnPreviewWhatsNew'),
  updateStatusHint: document.getElementById('updateStatusHint'),

  ps3AddGameModal: document.getElementById('ps3AddGameModal'),
  ps3AddGameForm: document.getElementById('ps3AddGameForm'),
  ps3AddTitleInput: document.getElementById('ps3AddTitleInput'),
  ps3AddExecInput: document.getElementById('ps3AddExecInput'),
  btnPs3AddBrowseExec: document.getElementById('btnPs3AddBrowseExec'),
  ps3AddPlatformInput: document.getElementById('ps3AddPlatformInput'),
  ps3AddProgressWrap: document.getElementById('ps3AddProgressWrap'),
  ps3AddProgressFill: document.getElementById('ps3AddProgressFill'),
  ps3AddProgressText: document.getElementById('ps3AddProgressText'),
  btnPs3AddCancel: document.getElementById('btnPs3AddCancel'),
  btnPs3AddConfirm: document.getElementById('btnPs3AddConfirm'),

  // Dribbble Hero Game Metadata HUD
  heroGameHud: document.getElementById('heroGameHud'),
  hudPlatformTag: document.getElementById('hudPlatformTag'),
  hudYearTag: document.getElementById('hudYearTag'),
  hudFavStar: document.getElementById('hudFavStar'),
  hudGameTitle: document.getElementById('hudGameTitle'),
  hudGameGenre: document.getElementById('hudGameGenre'),
  hudGameSynopsis: document.getElementById('hudGameSynopsis'),
  hudStatPlays: document.getElementById('hudStatPlays'),
  hudStatTrophies: document.getElementById('hudStatTrophies'),
  hudStatMedia: document.getElementById('hudStatMedia'),
  hudTrophyPct: document.getElementById('hudTrophyPct'),
  hudTrophyFill: document.getElementById('hudTrophyFill'),
  btnHudFlipOrOpen: document.getElementById('btnHudFlipOrOpen'),
  btnHudManual: document.getElementById('btnHudManual'),
  btnHudTrailer: document.getElementById('btnHudTrailer'),

  stage3dWrap: document.getElementById('stage3dWrap'),
  canvas3dHost: document.getElementById('canvas3dHost'),
  consoleStatusBadge: document.getElementById('consoleStatusBadge'),

  xmbShell: document.getElementById('xmbShell'),
  xmbGameBg: document.getElementById('xmbGameBg'),
  xmbGameBgVideo: document.getElementById('xmbGameBgVideo'),
  xmbHoverTrailerStatus: document.getElementById('xmbHoverTrailerStatus'),
  xmbCinfoPanel: document.getElementById('xmbCinfoPanel'),
  xmbCinfoImg: document.getElementById('xmbCinfoImg'),
  xmbCinfoTitle: document.getElementById('xmbCinfoTitle'),
  xmbCinfoDesc: document.getElementById('xmbCinfoDesc'),
  xmbInfobox: document.getElementById('xmbInfobox'),
  xmbPsPlusIcon: document.getElementById('xmbPsPlusIcon'),
  xmbWallpaperWrap: document.getElementById('xmbWallpaperWrap'),
  xmbWallpaperVideo: document.getElementById('xmbWallpaperVideo'),
  xmbWallpaperImg: document.getElementById('xmbWallpaperImg'),
  ps3Intro: document.getElementById('ps3Intro'),
  xmbAvatarImg: document.getElementById('xmbAvatarImg'),
  xmbGameCount: document.getElementById('xmbGameCount'),
  xmbDate: document.getElementById('xmbDate'),
  xmbClock: document.getElementById('xmbClock'),
  xmbClockHour: document.getElementById('xmbClockHour'),
  xmbClockMinute: document.getElementById('xmbClockMinute'),
  xmbCategories: document.getElementById('xmbCategories'),
  xmbItems: document.getElementById('xmbItems'),

  unwrapBar: document.getElementById('unwrapBar'),
  unwrapFill: document.getElementById('unwrapFill'),
  btnCancelUnwrap: document.getElementById('btnCancelUnwrap'),

  manualBar: document.getElementById('manualBar'),
  btnManualPrev: document.getElementById('btnManualPrev'),
  btnManualNext: document.getElementById('btnManualNext'),
  manualPageLabel: document.getElementById('manualPageLabel'),
  btnManualClose: document.getElementById('btnManualClose'),

  stage2dWrap: document.getElementById('stage2dWrap'),
  mediaGrid: document.getElementById('mediaGrid'),
  emptyState: document.getElementById('emptyState'),
  btnEmptyOpenAdd: document.getElementById('btnEmptyOpenAdd'),

  optionsDrawer: document.getElementById('optionsDrawer'),
  btnToggleOptions: document.getElementById('btnToggleOptions'),
  btnCloseDrawer: document.getElementById('btnCloseDrawer'),
  selTabs: document.querySelectorAll('.sel-tab'),
  tabPanels: {
    display: document.getElementById('tab-display'),
    library: document.getElementById('tab-library'),
    profiles: document.getElementById('tab-profiles'),
    trophies: document.getElementById('tab-trophies'),
    launcher: document.getElementById('tab-launcher')
  },

  // Display Tab
  btnQuickThemeObsidian: document.getElementById('btnQuickThemeObsidian'),
  btnQuickThemeXmb: document.getElementById('btnQuickThemeXmb'),
  modeCdBtn: document.getElementById('modeCdBtn'),
  modeCaseBtn: document.getElementById('modeCaseBtn'),
  render3dBtn: document.getElementById('render3dBtn'),
  renderShelfBtn: document.getElementById('renderShelfBtn'),
  render2dBtn: document.getElementById('render2dBtn'),
  group3dActions: document.getElementById('group3dActions'),
  group2dOptions: document.getElementById('group2dOptions'),
  controls3dCd: document.getElementById('controls3dCd'),
  controls3dCase: document.getElementById('controls3dCase'),
  btn3dFlipDisc: document.getElementById('btn3dFlipDisc'),
  btn3dSpinBurst: document.getElementById('btn3dSpinBurst'),
  btn3dResetCd: document.getElementById('btn3dResetCd'),
  btn3dTestConsoleCd: document.getElementById('btn3dTestConsoleCd'),
  btn3dOpenCase: document.getElementById('btn3dOpenCase'),
  btn3dEjectDisc: document.getElementById('btn3dEjectDisc'),
  btn3dReadManual: document.getElementById('btn3dReadManual'),
  btn3dTestConsoleCase: document.getElementById('btn3dTestConsoleCase'),
  angleBtns: document.querySelectorAll('[data-angle]'),
  sizeBtns: document.querySelectorAll('.size-btn'),
  settingSpinHover: document.getElementById('settingSpinHover'),
  settingShowLabels: document.getElementById('settingShowLabels'),

  // Library, Metadata, Trailers & .exe Tab
  searchInput: document.getElementById('searchInput'),
  filterSelect: document.getElementById('filterSelect'),
  sortSelect: document.getElementById('sortSelect'),
  formModeHeading: document.getElementById('formModeHeading'),
  btnNewGameMode: document.getElementById('btnNewGameMode'),
  gameForm: document.getElementById('gameForm'),
  fieldId: document.getElementById('fieldId'),
  fieldTitle: document.getElementById('fieldTitle'),
  fieldExec: document.getElementById('fieldExec'),
  btnBrowseExec: document.getElementById('btnBrowseExec'),
  btnDetectRoblox: document.getElementById('btnDetectRoblox'),
  btnTestNotepadExe: document.getElementById('btnTestNotepadExe'),
  btnXmbRefresh: document.getElementById('btnXmbRefresh'),
  btnDrawerRefresh: document.getElementById('btnDrawerRefresh'),
  btnPs3DetectRoblox: document.getElementById('btnPs3DetectRoblox'),
  btnOpenGameFolder: document.getElementById('btnOpenGameFolder'),
  fieldArtwork: document.getElementById('fieldArtwork'),
  coverDropZone: document.getElementById('coverDropZone'),
  btnAutoFetchArt: document.getElementById('btnAutoFetchArt'),
  btnBrowseArt: document.getElementById('btnBrowseArt'),
  btnClearArt: document.getElementById('btnClearArt'),
  fieldBackArtwork: document.getElementById('fieldBackArtwork'),
  btnBrowseBackArt: document.getElementById('btnBrowseBackArt'),
  btnClearBackArt: document.getElementById('btnClearBackArt'),
  fieldTrailer: document.getElementById('fieldTrailer'),
  btnFetchTrailer: document.getElementById('btnFetchTrailer'),
  btnBrowseTrailer: document.getElementById('btnBrowseTrailer'),
  btnClearTrailer: document.getElementById('btnClearTrailer'),
  fieldManualStatus: document.getElementById('fieldManualStatus'),
  btnFetchManual: document.getElementById('btnFetchManual'),
  btnClearManual: document.getElementById('btnClearManual'),
  fieldPlatform: document.getElementById('fieldPlatform'),
  fieldYear: document.getElementById('fieldYear'),
  fieldGenre: document.getElementById('fieldGenre'),
  fieldSynopsis: document.getElementById('fieldSynopsis'),
  fieldAccent: document.getElementById('fieldAccent'),
  fieldSecondary: document.getElementById('fieldSecondary'),
  btnToggleFav: document.getElementById('btnToggleFav'),
  btnDeleteGame: document.getElementById('btnDeleteGame'),
  btnSaveGame: document.getElementById('btnSaveGame'),

  // Profiles, Discord Roles, VFX & PS3 Customization Tab
  profileList: document.getElementById('profileList'),
  activePfpPreviewWrap: document.getElementById('activePfpPreviewWrap'),
  activePfpPreviewImg: document.getElementById('activePfpPreviewImg'),
  activePfpPreviewFallback: document.getElementById('activePfpPreviewFallback'),
  btnPickPfp: document.getElementById('btnPickPfp'),
  btnOpenAvatarGallery: document.getElementById('btnOpenAvatarGallery'),
  btnClearPfp: document.getElementById('btnClearPfp'),
  avatarGalleryBox: document.getElementById('avatarGalleryBox'),
  avatarGalleryTabs: document.querySelectorAll('.av-tab'),
  avatarGalleryGrid: document.getElementById('avatarGalleryGrid'),
  profileStatusSelect: document.getElementById('profileStatusSelect'),
  profileVfxSelect: document.getElementById('profileVfxSelect'),
  profileHandleInput: document.getElementById('profileHandleInput'),
  profileBannerPreset: document.getElementById('profileBannerPreset'),
  profileCustomStatusInput: document.getElementById('profileCustomStatusInput'),
  profileBioInput: document.getElementById('profileBioInput'),
  profileRolesEditorList: document.getElementById('profileRolesEditorList'),
  newRoleNameInput: document.getElementById('newRoleNameInput'),
  newRoleTierSelect: document.getElementById('newRoleTierSelect'),
  newRoleColorInput: document.getElementById('newRoleColorInput'),
  btnAddProfileRole: document.getElementById('btnAddProfileRole'),
  settingXmbWaveStyle: document.getElementById('settingXmbWaveStyle'),
  settingXmbBgColor: document.getElementById('settingXmbBgColor'),
  settingXmbIconSet: document.getElementById('settingXmbIconSet'),
  settingXmbSoundSet: document.getElementById('settingXmbSoundSet'),
  psnCardColorInput: document.getElementById('psnCardColorInput'),
  psnCommentInput: document.getElementById('psnCommentInput'),
  settingXmbHoverVideo: document.getElementById('settingXmbHoverVideo'),
  settingXmbHoverAudio: document.getElementById('settingXmbHoverAudio'),
  xmbWallpaperInput: document.getElementById('xmbWallpaperInput'),
  btnPickXmbWallpaper: document.getElementById('btnPickXmbWallpaper'),
  btnClearXmbWallpaper: document.getElementById('btnClearXmbWallpaper'),
  settingXmbSounds: document.getElementById('settingXmbSounds'),
  settingXmbIntro: document.getElementById('settingXmbIntro'),
  btnReplayPs3Intro: document.getElementById('btnReplayPs3Intro'),
  settingBackdropMode: document.getElementById('settingBackdropMode'),
  settingGlassStyle: document.getElementById('settingGlassStyle'),
  settingTheme: document.getElementById('settingTheme'),
  settingGraphicsQuality: document.getElementById('settingGraphicsQuality'),
  settingPfpFrame: document.getElementById('settingPfpFrame'),
  settingUiAccent: document.getElementById('settingUiAccent'),
  profileCreateForm: document.getElementById('profileCreateForm'),
  profileFormTitle: document.getElementById('profileFormTitle'),
  profileNameInput: document.getElementById('profileNameInput'),
  profileColorInput: document.getElementById('profileColorInput'),
  btnProfileSubmit: document.getElementById('btnProfileSubmit'),
  btnProfileCancelEdit: document.getElementById('btnProfileCancelEdit'),
  profileCopyRow: document.getElementById('profileCopyRow'),
  profileCopyGames: document.getElementById('profileCopyGames'),

  // Trophies & Notifications Tab
  btnTestTrophyToast: document.getElementById('btnTestTrophyToast'),
  drawerTrophyLevelBadge: document.getElementById('drawerTrophyLevelBadge'),
  tCountPlat: document.getElementById('tCountPlat'),
  tCountGold: document.getElementById('tCountGold'),
  tCountSilver: document.getElementById('tCountSilver'),
  tCountBronze: document.getElementById('tCountBronze'),
  settingNotifsEnabled: document.getElementById('settingNotifsEnabled'),
  settingTrophySound: document.getElementById('settingTrophySound'),
  btnUnlockNextGameTrophy: document.getElementById('btnUnlockNextGameTrophy'),
  achievementsListEl: document.getElementById('achievementsListEl'),
  btnClearNotifications: document.getElementById('btnClearNotifications'),
  notificationHistoryList: document.getElementById('notificationHistoryList'),

  // System / Launcher Tab
  mediaFoldersStatusText: document.getElementById('mediaFoldersStatusText'),
  btnOpenPs3PicFolder: document.getElementById('btnOpenPs3PicFolder'),
  btnOpenPs3VideoFolder: document.getElementById('btnOpenPs3VideoFolder'),
  btnOpenPs3AudioFolder: document.getElementById('btnOpenPs3AudioFolder'),
  btnAddAudioTrack: document.getElementById('btnAddAudioTrack'),
  btnReplayTutorial: document.getElementById('btnReplayTutorial'),
  customHomeBtnLabel: document.getElementById('customHomeBtnLabel'),
  btnBindHomeButton: document.getElementById('btnBindHomeButton'),
  btnResetHomeButton: document.getElementById('btnResetHomeButton'),
  btnTestOverlay: document.getElementById('btnTestOverlay'),
  settingLauncherName: document.getElementById('settingLauncherName'),
  btnSaveLauncherName: document.getElementById('btnSaveLauncherName'),

  // Bottom Dock
  btnPrevGame: document.getElementById('btnPrevGame'),
  btnNextGame: document.getElementById('btnNextGame'),
  dockDiscPreview: document.getElementById('dockDiscPreview'),
  deckTitle: document.getElementById('deckTitle'),
  deckPlatform: document.getElementById('deckPlatform'),
  deckDemoTag: document.getElementById('deckDemoTag'),
  deckSubtitle: document.getElementById('deckSubtitle'),
  btnDockTrophies: document.getElementById('btnDockTrophies'),
  btnDockManual: document.getElementById('btnDockManual'),
  btnWatchTrailer: document.getElementById('btnWatchTrailer'),
  btnQuickUnwrap: document.getElementById('btnQuickUnwrap'),
  btnPlayGame: document.getElementById('btnPlayGame'),

  // Modals & Overlays
  renameModal: document.getElementById('renameModal'),
  closeRenameModal: document.getElementById('closeRenameModal'),
  renameForm: document.getElementById('renameForm'),
  renameTitleInput: document.getElementById('renameTitleInput'),
  renameExecInput: document.getElementById('renameExecInput'),
  btnRenameBrowseExec: document.getElementById('btnRenameBrowseExec'),
  btnRenameCancel: document.getElementById('btnRenameCancel'),
  btnRenameConfirm: document.getElementById('btnRenameConfirm'),

  trailerModal: document.getElementById('trailerModal'),
  trailerModalTitle: document.getElementById('trailerModalTitle'),
  closeTrailerModal: document.getElementById('closeTrailerModal'),
  trailerVideoEl: document.getElementById('trailerVideoEl'),

  achievementToastStack: document.getElementById('achievementToastStack'),
  tutorialModal: document.getElementById('tutorialModal'),
  tutorialStepPill: document.getElementById('tutorialStepPill'),
  btnSkipTutorial: document.getElementById('btnSkipTutorial'),
  tutorialStage: document.getElementById('tutorialStage'),
  tutorialDots: document.getElementById('tutorialDots'),
  btnTutorialPrev: document.getElementById('btnTutorialPrev'),
  btnTutorialNext: document.getElementById('btnTutorialNext'),

  toast: document.getElementById('toast')
};

function activeProfile() {
  return state.profiles.find((p) => p.id === state.activeProfileId) || state.profiles[0];
}

function activeSettings() {
  return activeProfile().settings;
}

function activeGames() {
  return activeProfile().games;
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    els.toast.classList.add('hidden');
  }, 3000);
}

async function persist() {
  await api.saveProfiles({
    tutorialCompleted: state.tutorialCompleted,
    activeProfileId: state.activeProfileId,
    profiles: state.profiles
  });
}

// =========================================================
// TROPHIES, ACHIEVEMENTS & DUAL-MODE NOTIFICATION ENGINE
// =========================================================
const TROPHY_GRADES = {
  bronze: { label: 'Bronze', icon: './assets/maxmb/icons/trophies/trophy_bronze.svg', xp: 15 },
  silver: { label: 'Silver', icon: './assets/maxmb/icons/trophies/trophy_silver.svg', xp: 30 },
  gold: { label: 'Gold', icon: './assets/maxmb/icons/trophies/trophy_gold.svg', xp: 90 },
  platinum: { label: 'Platinum', icon: './assets/maxmb/icons/trophies/trophy_platinum.svg', xp: 180 }
};

function getGameTrophyTemplates(game) {
  const t = game?.title || 'Game';
  return [
    { id: `ach-${game.id}-unwrap`, gameId: game.id, gameTitle: t, title: `Collector's Edition: ${t}`, desc: `Added and unwrapped ${t} in your library.`, grade: 'bronze' },
    { id: `ach-${game.id}-boot`, gameId: game.id, gameTitle: t, title: `First Boot: ${t}`, desc: `Launched ${t} from the physical media stage.`, grade: 'silver' },
    { id: `ach-${game.id}-manual`, gameId: game.id, gameTitle: t, title: `Lore & Manual Scholar`, desc: `Opened and read the instruction booklet for ${t}.`, grade: 'bronze' },
    { id: `ach-${game.id}-trailer`, gameId: game.id, gameTitle: t, title: `Cinema & Trailer Buff`, desc: `Watched the trailer or XMB hover preview for ${t}.`, grade: 'silver' },
    { id: `ach-${game.id}-veteran`, gameId: game.id, gameTitle: t, title: `Dedicated Master: ${t}`, desc: `Played ${t} 3+ times or unlocked all core milestones.`, grade: 'gold' },
    { id: `ach-${game.id}-plat`, gameId: game.id, gameTitle: t, title: `Platinum Completionist: ${t}`, desc: `Earned every trophy for ${t}!`, grade: 'platinum' }
  ];
}

const GLOBAL_TROPHIES = [
  { id: 'global-xmb', gameId: 'system', gameTitle: 'PS3 System 4.93', title: 'XrossMediaBar Pioneer', desc: 'Experienced the authentic PS3 Firmware 4.93 & MaXMB theme.', grade: 'silver' },
  { id: 'global-profile', gameId: 'system', gameTitle: 'Profile & Super Roles', title: 'Identity Architect', desc: 'Customized your profile super roles, banner, or glowing VFX.', grade: 'gold' },
  { id: 'global-tutorial', gameId: 'system', gameTitle: 'Onboarding', title: 'Ready Player One', desc: 'Completed the interactive launcher tutorial.', grade: 'bronze' }
];

function getProfileAchievements(profile = activeProfile()) {
  if (!Array.isArray(profile.achievements)) profile.achievements = [];
  return profile.achievements;
}

function getProfileNotifications(profile = activeProfile()) {
  if (!Array.isArray(profile.notifications)) profile.notifications = [];
  return profile.notifications;
}

function computeTrophyStats(profile = activeProfile()) {
  const unlocked = getProfileAchievements(profile);
  const counts = { platinum: 0, gold: 0, silver: 0, bronze: 0, total: unlocked.length, xp: 0 };
  for (const a of unlocked) {
    const g = a.grade || 'bronze';
    if (counts[g] !== undefined) counts[g]++;
    counts.xp += TROPHY_GRADES[g]?.xp || 15;
  }
  const level = Math.max(1, 1 + Math.floor(counts.xp / 100));
  const pct = counts.xp % 100;
  return { ...counts, level, pct };
}

function pushNotificationCard({ title, subtitle, icon, grade = 'gold', isTrophy = false }) {
  const profile = activeProfile();
  const settings = activeSettings();
  const notifs = getProfileNotifications(profile);
  const defaultIcon = isTrophy
    ? (TROPHY_GRADES[grade]?.icon || './assets/maxmb/icons/trophies/trophy_gold.svg')
    : './assets/maxmb/icons/trophies/notify_system.svg';
  notifs.unshift({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title,
    subtitle,
    icon: icon || defaultIcon,
    grade,
    isTrophy,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  });
  if (notifs.length > 50) notifs.length = 50;
  if (els.notifBadgeCount) els.notifBadgeCount.textContent = String(notifs.length);

  if (settings.notificationsEnabled === false) return;

  if (settings.achievementSoundEnabled !== false) {
    const prevEnabled = xmbAudio.enabled;
    xmbAudio.enabled = true;
    xmbAudio.play(isTrophy ? 'trophy' : 'notify', 0.72);
    xmbAudio.enabled = prevEnabled;
  }

  if (!els.achievementToastStack) return;
  const isXmb = settings.theme === 'xmb';
  const toastEl = document.createElement('div');
  toastEl.className = isXmb ? 'ps3-trophy-toast' : 'modern-trophy-toast';

  const imgSrc = icon || defaultIcon;
  const headerText = isTrophy
    ? isXmb
      ? 'You have earned a trophy!'
      : `🏆 ACHIEVEMENT UNLOCKED • ${(TROPHY_GRADES[grade]?.label || 'Trophy').toUpperCase()}`
    : '🔔 LAUNCHER NOTIFICATION';

  toastEl.innerHTML = `
    <img class="toast-trophy-img" src="${imgSrc}" alt="" />
    <div class="toast-trophy-body">
      <div class="toast-trophy-header">${headerText}</div>
      <div class="toast-trophy-name">${title}</div>
      <div class="toast-trophy-sub">${subtitle || ''}</div>
    </div>
  `;
  els.achievementToastStack.appendChild(toastEl);

  setTimeout(() => {
    toastEl.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    toastEl.style.opacity = '0';
    toastEl.style.transform = 'translateX(40px)';
    setTimeout(() => toastEl.remove(), 420);
  }, 4600);
}

async function unlockAchievement(achTemplate, silentIfAlready = true) {
  if (!achTemplate?.id) return false;
  const profile = activeProfile();
  const list = getProfileAchievements(profile);
  if (list.some((a) => a.id === achTemplate.id)) {
    if (!silentIfAlready) showToast(`Already unlocked: ${achTemplate.title}`);
    return false;
  }

  const record = {
    ...achTemplate,
    unlockedAt: new Date().toISOString()
  };
  list.unshift(record);
  pushNotificationCard({
    title: achTemplate.title,
    subtitle: `${achTemplate.gameTitle || 'Launcher'} • ${achTemplate.desc}`,
    icon: TROPHY_GRADES[achTemplate.grade || 'bronze']?.icon,
    grade: achTemplate.grade || 'bronze',
    isTrophy: true
  });

  // Check if all 5 base trophies for a game are unlocked -> auto-unlock Platinum!
  if (achTemplate.gameId && achTemplate.gameId !== 'system' && achTemplate.grade !== 'platinum') {
    const game = activeGames().find((g) => g.id === achTemplate.gameId);
    if (game) {
      const templates = getGameTrophyTemplates(game);
      const baseTrophies = templates.filter((t) => t.grade !== 'platinum');
      const allBaseDone = baseTrophies.every((bt) => list.some((u) => u.id === bt.id));
      if (allBaseDone) {
        const plat = templates.find((t) => t.grade === 'platinum');
        if (plat && !list.some((u) => u.id === plat.id)) {
          setTimeout(() => unlockAchievement(plat, true), 1200);
        }
      }
    }
  }

  await persist();
  renderProfileCardAndHud();
  if (state.drawerOpen && state.activeTab === 'trophies') {
    renderTrophiesTab();
  }
  return true;
}

function getProceduralArtStyle(game) {
  const accent = game.accent || '#38bdf8';
  const secondary = game.secondary || '#151926';
  return [
    `radial-gradient(circle at 28% 25%, ${accent}cc 0%, transparent 55%)`,
    `radial-gradient(circle at 76% 78%, ${accent}66 0%, transparent 50%)`,
    `linear-gradient(145deg, ${secondary} 0%, #090b10 100%)`
  ].join(', ');
}

function getFilteredSortedGames() {
  const query = state.search.trim().toLowerCase();
  const filtered = activeGames().filter((g) => {
    if (state.filter === 'favorites' && !g.favorite) return false;
    if (!query) return true;
    const hay = `${g.title} ${g.genre || ''} ${g.platform || ''}`.toLowerCase();
    return hay.includes(query);
  });

  const sorted = [...filtered];
  sorted.sort((a, b) => {
    if (state.sort === 'title') return a.title.localeCompare(b.title);
    if (state.sort === 'played') return (b.playCount || 0) - (a.playCount || 0);
    if (state.sort === 'added') return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
    const aTime = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
    const bTime = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
    if (bTime !== aTime) return bTime - aTime;
    return new Date(b.addedAt || 0) - new Date(a.addedAt || 0);
  });
  return sorted;
}

function ensureBackdrop() {
  if (!backdrop) {
    backdrop = new BackdropRenderer(els.backdropCanvas);
    backdrop.start();
    window.addEventListener('resize', () => backdrop?.resize());
  }
}

function ensureStage3D() {
  if (!stage3d) {
    stage3d = new Stage3D(els.canvas3dHost, {
      onStateChange: () => syncStageOverlays(),
      onContextRestored: () => {
        state.last3dKey = '';
        render();
      },
      onSelectGame: (gameId) => {
        if (!gameId || state.selectedId === gameId) return;
        state.selectedId = gameId;
        state.creatingNewGame = false;
        stage3d?.selectShelfGame(gameId);
        renderDock();
        if (activeSettings().theme === 'xmb') renderXmb();
        if (state.drawerOpen && state.activeTab === 'library') {
          syncGameFormToSelected();
        }
      },
      onUnwrapProgress: (p) => {
        els.unwrapFill.style.width = `${Math.round(p * 100)}%`;
      }
    });
    resizeObserver = new ResizeObserver(() => {
      stage3d?.resize();
      backdrop?.resize();
    });
    resizeObserver.observe(els.canvas3dHost);
  }
  stage3d.setQuality(activeSettings().graphicsQuality || 'high');
}

function syncXmbWallpaper() {
  const settings = activeSettings();
  const isXmb = settings.theme === 'xmb';
  const wp = isXmb ? String(settings.xmbWallpaper || '').trim() : '';

  if (!wp || !els.xmbWallpaperWrap) {
    els.xmbWallpaperWrap?.classList.add('hidden');
    if (els.xmbWallpaperVideo) {
      els.xmbWallpaperVideo.pause();
      if (els.xmbWallpaperVideo.getAttribute('src')) {
        els.xmbWallpaperVideo.removeAttribute('src');
        els.xmbWallpaperVideo.load();
      }
      els.xmbWallpaperVideo.classList.add('hidden');
    }
    if (els.xmbWallpaperImg) {
      els.xmbWallpaperImg.classList.add('hidden');
      els.xmbWallpaperImg.removeAttribute('src');
    }
    return false;
  }

  const isVideo = /\.(mp4|webm|mov|mkv|m4v)(\?|#|$)/i.test(wp);
  els.xmbWallpaperWrap.classList.remove('hidden');

  if (isVideo && els.xmbWallpaperVideo) {
    els.xmbWallpaperImg?.classList.add('hidden');
    els.xmbWallpaperImg?.removeAttribute('src');
    els.xmbWallpaperVideo.classList.remove('hidden');
    els.xmbWallpaperVideo.muted = true;
    els.xmbWallpaperVideo.loop = true;
    if (els.xmbWallpaperVideo.dataset.wpSrc !== wp) {
      els.xmbWallpaperVideo.dataset.wpSrc = wp;
      els.xmbWallpaperVideo.src = wp;
    }
    if (!document.hidden && els.xmbWallpaperVideo.paused) {
      els.xmbWallpaperVideo.play().catch(() => {});
    }
  } else if (els.xmbWallpaperImg) {
    els.xmbWallpaperVideo?.pause();
    els.xmbWallpaperVideo?.classList.add('hidden');
    els.xmbWallpaperImg.classList.remove('hidden');
    if (els.xmbWallpaperImg.dataset.wpSrc !== wp) {
      els.xmbWallpaperImg.dataset.wpSrc = wp;
      els.xmbWallpaperImg.src = wp;
    }
  }
  return true;
}

function getXmbIntroTint(colorId) {
  const preset = XMB_BG_COLORS[String(colorId || 'auto')];
  if (preset?.bot) {
    return `rgb(${preset.bot[0]}, ${preset.bot[1]}, ${preset.bot[2]})`;
  }
  return '';
}

function triggerPs3Intro(force = false) {
  const settings = activeSettings();
  if (settings.theme !== 'xmb') return;
  if (!force && settings.xmbIntro === false) return;
  ensureBackdrop();
  runPs3Intro({
    audio: xmbAudio,
    rootEl: els.ps3Intro,
    waveEls: [backdrop?.xmbWaveCanvas, els.backdropCanvas].filter(Boolean),
    bgEls: [els.xmbWallpaperWrap].filter(Boolean),
    playSound: settings.xmbSounds !== false,
    bgTint: getXmbIntroTint(settings.xmbBgColor)
  });
}

function playXmbSfx(role) {
  const settings = activeSettings();
  if (settings.theme !== 'xmb' || settings.xmbSounds === false) return;
  xmbAudio.play(role, role === 'cursor' ? 0.58 : 0.72);
}

function applyProfileThemeAndGraphics() {
  const profile = activeProfile();
  const settings = activeSettings();
  const theme = settings.theme || 'obsidian';
  const glass = settings.glassStyle || 'liquid';
  const hasSpecialRole = Array.isArray(profile.roles) && profile.roles.some((r) => r.tier === 'super' || r.tier === 'mythic');
  const pfpFrame = settings.pfpFrame || (hasSpecialRole ? 'dev-sparkle' : 'neon');
  const effectiveFrame = settings.pfpFrame === 'minimal' ? 'minimal' : (hasSpecialRole && settings.pfpFrame === 'neon' ? 'dev-sparkle' : pfpFrame);
  const accent = settings.uiAccent || profile.color || '#38bdf8';

  api.setOverlayTheme?.(theme);

  if (theme !== 'xmb') {
    cancelPs3Intro();
    stopXmbHoverVideo();
  }
  xmbAudio.enabled = theme === 'xmb' && settings.xmbSounds !== false;
  xmbAudio.setSoundSet(settings.xmbSoundSet || 'ps3');
  const hasWallpaper = syncXmbWallpaper();

  const is3dNeeded =
    Boolean(stage3d) &&
    (Boolean(stage3d.consoleSequence) || stage3d.subMode === 'manual' || stage3d.subMode === 'unwrap');
  const overlayActive = state.drawerOpen || is3dNeeded;
  const introClasses = [
    document.body.classList.contains('intro-run') ? 'intro-run' : '',
    document.body.classList.contains('intro-hold') ? 'intro-hold' : ''
  ]
    .filter(Boolean)
    .join(' ');
  document.body.className = `theme-${theme} glass-${glass}${overlayActive ? ' xmb-panel-open' : ''}${is3dNeeded ? ' xmb-3d-active' : ''}${introClasses ? ` ${introClasses}` : ''}`;
  document.documentElement.style.setProperty('--accent', accent);

  const vfx = profile.vfx === 'nitro' ? 'prismatic' : (profile.vfx || 'prismatic');
  const vfxClass = vfx && vfx !== 'none' ? ` vfx-${vfx}` : '';
  els.btnForefrontProfile.className = `corner-profile-btn pfp-frame-${effectiveFrame}${vfxClass}`;
  if (els.profileCardPopover) {
    const wasHidden = els.profileCardPopover.classList.contains('hidden');
    els.profileCardPopover.className = `profile-card-popover${vfxClass}${wasHidden ? ' hidden' : ''}`;
  }
  if (els.profileCardAvatarWrap) {
    els.profileCardAvatarWrap.className = `profile-card-avatar pfp-frame-${effectiveFrame}`;
  }
  if (els.activePfpPreviewWrap) {
    els.activePfpPreviewWrap.className = `pfp-preview-lg pfp-frame-${effectiveFrame}${vfxClass}`;
  }

  const backdropMode =
    theme === 'xmb' && (!settings.backdropMode || settings.backdropMode === 'aurora')
      ? 'xmb-wave'
      : settings.backdropMode || 'aurora';

  ensureBackdrop();
  backdrop.setConfig({
    mode: backdropMode,
    accent,
    quality: settings.graphicsQuality || 'high',
    hasWallpaper,
    xmbBgColor: settings.xmbBgColor || 'auto',
    xmbWaveStyle: settings.xmbWaveStyle || 'original'
  });

  if (stage3d) {
    stage3d.setQuality(settings.graphicsQuality || 'high');
  }
  syncMusicBarsUi();
}

function renderProfileCardAndHud() {
  const profile = activeProfile();
  const settings = activeSettings();
  const stats = computeTrophyStats(profile);

  // 1. Forefront Corner Profile Pill
  renderAvatarInto(els.forefrontPfpImg, els.forefrontPfpFallback, profile);
  if (els.profileNameLabel) els.profileNameLabel.textContent = profile.name;
  if (els.profileLevelPill) els.profileLevelPill.textContent = `★ LV ${stats.level}`;
  if (els.profileCustomStatusLabel) {
    els.profileCustomStatusLabel.textContent =
      profile.customStatus || `${ (settings.backdropMode || 'aurora').toUpperCase() } • ${(settings.graphicsQuality || 'high').toUpperCase()}`;
  }
  const statusKey = profile.status || 'online';
  if (els.forefrontStatusDot) {
    els.forefrontStatusDot.className = `live-status-dot status-${statusKey}`;
  }
  if (els.profileRolesMini) {
    els.profileRolesMini.innerHTML = '';
    const roles = Array.isArray(profile.roles) ? profile.roles : [];
    roles.slice(0, 2).forEach((r) => {
      const span = document.createElement('span');
      span.className = 'mini-role-tag';
      span.style.borderColor = `${r.color || '#38bdf8'}66`;
      span.innerHTML = `<span class="mini-role-dot" style="background:${r.color || '#38bdf8'}"></span>${r.name}`;
      els.profileRolesMini.appendChild(span);
    });
  }

  // 2. Animated Profile Popover Card
  if (els.profileBannerEl) {
    const b = profile.banner || 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #ec4899 100%)';
    els.profileBannerEl.style.background = b;
    els.profileBannerEl.style.backgroundSize = b.startsWith('url') ? 'cover' : '200% 200%';
    els.profileBannerEl.style.backgroundPosition = 'center';
  }
  if (els.profileCardAvatarImg && els.profileCardAvatarFallback) {
    renderAvatarInto(els.profileCardAvatarImg, els.profileCardAvatarFallback, profile);
  }
  if (els.profileCardStatusDot) {
    els.profileCardStatusDot.className = `live-status-dot status-${statusKey}`;
  }
  if (els.profileTrophyCountBadge) {
    els.profileTrophyCountBadge.textContent = `🏆 ${stats.total}`;
  }
  if (els.profileCardName) els.profileCardName.textContent = profile.name;
  if (els.profileCardHandle) {
    els.profileCardHandle.textContent = profile.handle || `@${profile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  }
  if (els.profileCardStatusText) {
    els.profileCardStatusText.textContent = profile.customStatus || 'Exploring Physical Media Stage';
  }
  if (els.profileCardBio) {
    els.profileCardBio.textContent = profile.bio || 'Collector of physical discs, PS3 XMB enthusiast & achievement hunter.';
  }
  if (els.profileCardRolesList) {
    els.profileCardRolesList.innerHTML = '';
    (profile.roles || []).forEach((r) => {
      const tier = r.tier || 'standard';
      const pill = document.createElement('span');
      pill.className = `profile-role-pill role-tier-${tier}`;
      pill.style.borderColor = `${r.color || '#38bdf8'}88`;
      const tierTag = tier === 'mythic' ? '🔥 ' : tier === 'super' ? '✦ ' : '';
      pill.innerHTML = `<span class="profile-role-dot" style="background:${r.color || '#38bdf8'}; box-shadow: 0 0 8px ${r.color || '#38bdf8'}"></span>${tierTag}${r.name}`;
      els.profileCardRolesList.appendChild(pill);
    });
  }
  const totalPlays = activeGames().reduce((acc, g) => acc + (g.playCount || 0), 0);
  if (els.profileTrophyLevelText) {
    els.profileTrophyLevelText.textContent = `Trophy Level ${stats.level} • ${stats.pct}%`;
  }
  if (els.profileTotalPlaysText) {
    els.profileTotalPlaysText.textContent = `${totalPlays} Total ${totalPlays === 1 ? 'Launch' : 'Launches'}`;
  }
  if (els.profileTrophyProgressFill) {
    els.profileTrophyProgressFill.style.width = `${Math.max(12, stats.pct)}%`;
  }

  // Notification Badge
  if (els.notifBadgeCount) {
    els.notifBadgeCount.textContent = String(getProfileNotifications(profile).length);
  }

  // 3. Dribbble Hero Game HUD & Ambient Hero Backdrop
  const selected = activeGames().find((g) => g.id === state.selectedId);
  const showHud = settings.theme !== 'xmb' && !state.drawerOpen && stage3d?.subMode !== 'manual' && stage3d?.subMode !== 'unwrap';
  if (els.heroGameHud) {
    els.heroGameHud.classList.toggle('hidden', !showHud);
  }

  if (els.obsidianHeroBackdrop) {
    const heroImg = selected?.backArtwork || selected?.artwork || '';
    if (settings.theme !== 'xmb' && heroImg) {
      if (els.obsidianHeroBackdrop.dataset.heroUrl !== heroImg) {
        els.obsidianHeroBackdrop.dataset.heroUrl = heroImg;
        els.obsidianHeroBackdrop.style.backgroundImage = `url("${encodeURI(heroImg).replace(/"/g, '%22')}")`;
      }
      els.obsidianHeroBackdrop.classList.add('active');
    } else {
      els.obsidianHeroBackdrop.dataset.heroUrl = '';
      els.obsidianHeroBackdrop.style.backgroundImage = 'none';
      els.obsidianHeroBackdrop.classList.remove('active');
    }
  }

  if (!selected) {
    if (els.hudPlatformTag) els.hudPlatformTag.textContent = 'PC DVD-ROM';
    if (els.hudYearTag) els.hudYearTag.textContent = String(new Date().getFullYear());
    if (els.hudFavStar) els.hudFavStar.classList.add('hidden');
    if (els.hudGameTitle) els.hudGameTitle.textContent = 'No Game Selected';
    if (els.hudGameGenre) els.hudGameGenre.textContent = 'Physical Media Collection • 3D Stage';
    if (els.hudGameSynopsis) {
      els.hudGameSynopsis.textContent = 'Click + New to unwrap a sealed game case and auto-fetch HD box art, manual scans, and YouTube trailer.';
    }
    if (els.hudStatPlays) els.hudStatPlays.textContent = '0';
    if (els.hudStatTrophies) els.hudStatTrophies.textContent = '0 / 6';
    if (els.hudStatMedia) els.hudStatMedia.textContent = settings.viewMode === 'case' ? '3D CASE' : '3D DISC';
    if (els.hudTrophyPct) els.hudTrophyPct.textContent = '0%';
    if (els.hudTrophyFill) els.hudTrophyFill.style.width = '0%';
  } else {
    if (els.hudPlatformTag) els.hudPlatformTag.textContent = selected.platform || 'PC DVD';
    if (els.hudYearTag) els.hudYearTag.textContent = selected.year || '2026';
    if (els.hudFavStar) els.hudFavStar.classList.toggle('hidden', !selected.favorite);
    if (els.hudGameTitle) els.hudGameTitle.textContent = selected.title;
    if (els.hudGameGenre) els.hudGameGenre.textContent = selected.genre || 'Interactive 3D Edition';
    if (els.hudGameSynopsis) {
      els.hudGameSynopsis.textContent =
        selected.synopsis ||
        `Experience ${selected.title} on the 3D physical media stage with interactive disc/case inspection, official manual, and gameplay trailer.`;
    }
    if (els.hudStatPlays) els.hudStatPlays.textContent = String(selected.playCount || 0);
    const gameTemplates = getGameTrophyTemplates(selected);
    const unlockedForGame = getProfileAchievements(profile).filter((a) => a.gameId === selected.id).length;
    const pct = Math.min(100, Math.round((unlockedForGame / gameTemplates.length) * 100));
    if (els.hudStatTrophies) els.hudStatTrophies.textContent = `${unlockedForGame} / ${gameTemplates.length}`;
    if (els.hudStatMedia) els.hudStatMedia.textContent = settings.viewMode === 'case' ? '3D CASE' : '3D DISC';
    if (els.hudTrophyPct) els.hudTrophyPct.textContent = `${pct}%`;
    if (els.hudTrophyFill) els.hudTrophyFill.style.width = `${pct}%`;
  }

  // Sync Discord Navigation Rail active button
  if (els.railBtns) {
    els.railBtns.forEach((btn) => {
      const r = btn.dataset.rail;
      let isAct = false;
      if (r === 'xmb' && settings.theme === 'xmb') isAct = true;
      else if (r === 'trophies' && state.drawerOpen && state.activeTab === 'trophies') isAct = true;
      else if (r === 'profile' && (!els.profileCardPopover?.classList.contains('hidden') || (state.drawerOpen && state.activeTab === 'profiles'))) isAct = true;
      else if (r === 'shelf' && settings.theme !== 'xmb' && (settings.renderMode === 'shelf3d' || settings.renderMode === '2d')) isAct = true;
      else if (r === 'stage' && settings.theme !== 'xmb' && settings.renderMode === '3d' && !state.drawerOpen) isAct = true;
      btn.classList.toggle('active', isAct);
    });
  }
}

function setConsoleStatus(text) {
  if (!text) {
    els.consoleStatusBadge.classList.add('hidden');
    return;
  }
  els.consoleStatusBadge.textContent = text;
  els.consoleStatusBadge.classList.remove('hidden');
}

function renderAvatarInto(imgEl, fallbackEl, profile) {
  const initial = (profile.name || 'P').trim().charAt(0).toUpperCase() || 'P';
  fallbackEl.textContent = initial;
  fallbackEl.style.background = profile.color || '#38bdf8';

  if (profile.avatar) {
    imgEl.src = profile.avatar;
    imgEl.classList.remove('hidden');
    fallbackEl.classList.add('hidden');
  } else {
    imgEl.removeAttribute('src');
    imgEl.classList.add('hidden');
    fallbackEl.classList.remove('hidden');
  }
}

function syncStageOverlays() {
  if (!stage3d) return;
  els.unwrapBar.classList.toggle('hidden', stage3d.subMode !== 'unwrap');
  els.manualBar.classList.toggle('hidden', stage3d.subMode !== 'manual');
  const xmbNeeds3d = Boolean(stage3d.consoleSequence) || stage3d.subMode === 'manual' || stage3d.subMode === 'unwrap';
  document.body.classList.toggle('xmb-3d-active', xmbNeeds3d);
  document.body.classList.toggle('xmb-panel-open', state.drawerOpen || xmbNeeds3d);
  if (activeSettings().theme === 'xmb' && !xmbNeeds3d) {
    stage3d.stop();
    els.stage3dWrap.classList.add('hidden');
  }

  if (stage3d.subMode === 'manual' && stage3d.manualState) {
    const p1 = stage3d.manualState.spreadIndex * 2 + 1;
    const p2 = p1 + 1;
    const total = stage3d.manualState.totalPages || 6;
    els.manualPageLabel.textContent = `Pages ${p1}–${p2} / ${total}`;
    els.btnManualPrev.disabled = stage3d.manualState.spreadIndex === 0;
    els.btnManualNext.disabled = stage3d.manualState.spreadIndex >= stage3d.manualState.maxSpread;
  }

  syncDisplayControls();
}

function syncDisplayControls() {
  const settings = activeSettings();
  const isCd = settings.viewMode !== 'case';
  const rm =
    settings.renderMode === '2d'
      ? '2d'
      : settings.renderMode === 'shelf3d'
        ? 'shelf3d'
        : '3d';
  const is3d = rm !== '2d';
  const isXmb = settings.theme === 'xmb';

  if (els.btnQuickThemeObsidian) els.btnQuickThemeObsidian.classList.toggle('active', !isXmb);
  if (els.btnQuickThemeXmb) els.btnQuickThemeXmb.classList.toggle('active', isXmb);

  els.modeCdBtn.classList.toggle('active', isCd);
  els.modeCaseBtn.classList.toggle('active', !isCd);
  els.render3dBtn.classList.toggle('active', rm === '3d');
  els.renderShelfBtn.classList.toggle('active', rm === 'shelf3d');
  els.render2dBtn.classList.toggle('active', rm === '2d');

  els.group3dActions.classList.toggle('hidden', !is3d);
  els.group2dOptions.classList.toggle('hidden', is3d);
  els.controls3dCd.classList.toggle('hidden', !isCd);
  els.controls3dCase.classList.toggle('hidden', isCd);

  els.sizeBtns.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.size === settings.discSize);
  });
  els.settingSpinHover.checked = settings.spinOnHover !== false;
  els.settingShowLabels.checked = settings.showTitlesOnMedia !== false;

  if (stage3d) {
    els.btn3dOpenCase.textContent = stage3d.isCaseOpen ? 'Close Case (X / □)' : 'Open Case (X / □)';
    els.btn3dOpenCase.classList.toggle('active', stage3d.isCaseOpen);
    els.btn3dEjectDisc.textContent = stage3d.isDiscEjected ? 'Seat Disc (E)' : 'Eject Disc (E)';
    els.btn3dEjectDisc.classList.toggle('active', stage3d.isDiscEjected);
    els.btn3dFlipDisc.classList.toggle('active', stage3d.isFlipped);
  }
}

function openOptionsDrawer(tabName = null) {
  state.drawerOpen = true;
  if (tabName) state.activeTab = tabName;
  applyProfileThemeAndGraphics();
  renderDrawer();
}

function closeOptionsDrawer() {
  state.drawerOpen = false;
  applyProfileThemeAndGraphics();
  renderDrawer();
}

function syncGameFormToSelected() {
  if (state.creatingNewGame) return;
  const game = activeGames().find((g) => g.id === state.selectedId);
  if (!game) {
    populateGameForm(null);
    return;
  }
  populateGameForm(game);
}

function populateGameForm(game) {
  const isEdit = Boolean(game);
  els.formModeHeading.textContent = isEdit ? 'Edit Selected Game' : 'Add New Game';
  els.fieldId.value = isEdit ? game.id : '';
  els.fieldTitle.value = isEdit ? game.title : '';
  els.fieldExec.value = isEdit ? (game.executable || '') : '';
  els.fieldArtwork.value = isEdit ? (game.artwork || '') : '';
  els.fieldBackArtwork.value = isEdit ? (game.backArtwork || '') : '';
  if (els.fieldTrailer) els.fieldTrailer.value = isEdit ? (game.trailer || '') : '';
  els.fieldManualStatus.value = isEdit && game.manualPages?.length
    ? `${game.manualPages.length} official scanned pages ready`
    : '';
  els.fieldPlatform.value = isEdit ? (game.platform || 'PC DVD') : 'PC DVD';
  els.fieldYear.value = isEdit ? (game.year || '') : String(new Date().getFullYear());
  els.fieldGenre.value = isEdit ? (game.genre || '') : '';
  els.fieldSynopsis.value = isEdit ? (game.synopsis || '') : '';
  els.fieldAccent.value = isEdit ? (game.accent || '#38bdf8') : '#38bdf8';
  els.fieldSecondary.value = isEdit ? (game.secondary || '#151926') : '#151926';

  els.btnDeleteGame.classList.toggle('hidden', !isEdit);
  els.btnToggleFav.classList.toggle('hidden', !isEdit);
  els.btnToggleFav.classList.toggle('active', Boolean(game?.favorite));

  const hasLocal = Boolean(game?.executable && !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(game.executable));
  els.btnOpenGameFolder.classList.toggle('hidden', !hasLocal);
}

const AVATAR_GALLERY_LISTS = {
  gradient: [
    'cyber-visor.svg', 'nitro-crown.svg', 'obsidian-ghost.svg', 'neon-samurai.svg',
    'emerald-synth.svg', 'astral-voyager.svg', 'solar-valkyrie.svg', 'arctic-kitsune.svg',
    'violet-glitch.svg', 'golden-legend.svg', 'crimson-mecha.svg', 'cosmic-pulse.svg'
  ].map((f) => `./assets/maxmb/icons/avatars/gradient/${f}`),
  firmware: Array.from({ length: 27 }, (_, i) => `./assets/maxmb/icons/avatars/firmware/${String(i).padStart(3, '0')}.png`),
  psn: Array.from({ length: 40 }, (_, i) => `./assets/maxmb/icons/avatars/psn/PSNA ${i + 1}.png`)
};

function renderAvatarGallery() {
  if (!els.avatarGalleryGrid) return;
  const currentTab = state.avatarGalleryTab || 'gradient';
  els.avatarGalleryTabs?.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.avtab === currentTab);
  });
  const list = AVATAR_GALLERY_LISTS[currentTab] || AVATAR_GALLERY_LISTS.gradient;
  const activeAv = activeProfile().avatar || '';

  els.avatarGalleryGrid.innerHTML = '';
  list.forEach((src) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `avatar-choice-btn${activeAv === src ? ' selected' : ''}`;
    const img = document.createElement('img');
    img.src = src;
    img.alt = '';
    img.loading = 'lazy';
    btn.appendChild(img);
    btn.addEventListener('click', async () => {
      activeProfile().avatar = src;
      await persist();
      render();
      renderAvatarGallery();
      unlockAchievement(GLOBAL_TROPHIES[1], true);
      showToast('Profile avatar updated!');
    });
    els.avatarGalleryGrid.appendChild(btn);
  });
}

function renderProfileRolesEditor() {
  if (!els.profileRolesEditorList) return;
  const profile = activeProfile();
  if (!Array.isArray(profile.roles)) profile.roles = [];
  els.profileRolesEditorList.innerHTML = '';
  profile.roles.forEach((r) => {
    const tier = r.tier || 'standard';
    const tierTag = tier === 'mythic' ? '🔥 ' : tier === 'super' ? '✦ ' : '';
    const pill = document.createElement('span');
    pill.className = `profile-role-pill role-tier-${tier}`;
    pill.style.borderColor = `${r.color || '#38bdf8'}88`;
    pill.innerHTML = `
      <span class="profile-role-dot" style="background:${r.color || '#38bdf8'}"></span>
      <span>${tierTag}${r.name}</span>
      <button type="button" class="profile-role-remove" title="Remove Role">&times;</button>
    `;
    pill.querySelector('.profile-role-remove').addEventListener('click', async () => {
      profile.roles = profile.roles.filter((item) => item.id !== r.id);
      await persist();
      render();
      renderProfileRolesEditor();
    });
    els.profileRolesEditorList.appendChild(pill);
  });
}

function renderTrophiesTab() {
  const profile = activeProfile();
  const settings = activeSettings();
  const stats = computeTrophyStats(profile);

  if (els.drawerTrophyLevelBadge) els.drawerTrophyLevelBadge.textContent = String(stats.level);
  if (els.tCountPlat) els.tCountPlat.textContent = String(stats.platinum);
  if (els.tCountGold) els.tCountGold.textContent = String(stats.gold);
  if (els.tCountSilver) els.tCountSilver.textContent = String(stats.silver);
  if (els.tCountBronze) els.tCountBronze.textContent = String(stats.bronze);
  if (els.settingNotifsEnabled) els.settingNotifsEnabled.checked = settings.notificationsEnabled !== false;
  if (els.settingTrophySound) els.settingTrophySound.checked = settings.achievementSoundEnabled !== false;

  if (els.achievementsListEl) {
    els.achievementsListEl.innerHTML = '';
    const unlockedIds = new Set(getProfileAchievements(profile).map((a) => a.id));
    const selectedGame = activeGames().find((g) => g.id === state.selectedId);
    const allTemplates = [
      ...(selectedGame ? getGameTrophyTemplates(selectedGame) : []),
      ...GLOBAL_TROPHIES
    ];

    allTemplates.forEach((t) => {
      const isUnlocked = unlockedIds.has(t.id);
      const row = document.createElement('div');
      row.className = `achievement-item ${isUnlocked ? 'unlocked' : 'locked'}`;
      const gradeInfo = TROPHY_GRADES[t.grade] || TROPHY_GRADES.bronze;
      row.innerHTML = `
        <img class="achievement-icon" src="${gradeInfo.icon}" alt="" />
        <div class="achievement-info">
          <div class="achievement-title">${t.title}</div>
          <div class="achievement-desc">${t.gameTitle} • ${t.desc}</div>
        </div>
        <span class="achievement-badge">${isUnlocked ? 'UNLOCKED' : gradeInfo.label.toUpperCase()}</span>
      `;
      if (!isUnlocked) {
        row.style.cursor = 'pointer';
        row.title = 'Click to unlock trophy';
        row.addEventListener('click', () => unlockAchievement(t, false));
      }
      els.achievementsListEl.appendChild(row);
    });
  }

  if (els.notificationHistoryList) {
    els.notificationHistoryList.innerHTML = '';
    const notifs = getProfileNotifications(profile);
    if (!notifs.length) {
      els.notificationHistoryList.innerHTML = `<p class="hint-text">No notifications yet. Click "Test Trophy Unlock" above!</p>`;
    } else {
      notifs.slice(0, 18).forEach((n) => {
        const row = document.createElement('div');
        row.className = 'achievement-item unlocked';
        row.innerHTML = `
          <img class="achievement-icon" src="${n.icon || './assets/maxmb/icons/trophies/trophy_gold.svg'}" alt="" />
          <div class="achievement-info">
            <div class="achievement-title">${n.title}</div>
            <div class="achievement-desc">${n.subtitle || ''}</div>
          </div>
          <span class="achievement-badge">${n.time || ''}</span>
        `;
        els.notificationHistoryList.appendChild(row);
      });
    }
  }
}

function renderProfilesTab() {
  const profile = activeProfile();
  const settings = activeSettings();

  renderAvatarInto(els.activePfpPreviewImg, els.activePfpPreviewFallback, profile);
  if (els.profileStatusSelect) els.profileStatusSelect.value = profile.status || 'online';
  if (els.profileVfxSelect) els.profileVfxSelect.value = profile.vfx || 'nitro';
  if (els.profileHandleInput) els.profileHandleInput.value = profile.handle || `@${profile.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  if (els.profileBannerPreset) els.profileBannerPreset.value = profile.banner || 'linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #ec4899 100%)';
  if (els.profileCustomStatusInput) els.profileCustomStatusInput.value = profile.customStatus || '';
  if (els.profileBioInput) els.profileBioInput.value = profile.bio || '';
  renderProfileRolesEditor();
  if (!els.avatarGalleryBox?.classList.contains('hidden')) {
    renderAvatarGallery();
  }

  if (els.settingXmbWaveStyle) els.settingXmbWaveStyle.value = settings.xmbWaveStyle || 'original';
  if (els.settingXmbBgColor) els.settingXmbBgColor.value = settings.xmbBgColor || 'auto';
  if (els.settingXmbIconSet) els.settingXmbIconSet.value = settings.xmbIconSet || 'default';
  if (els.settingXmbSoundSet) els.settingXmbSoundSet.value = settings.xmbSoundSet || 'ps3';
  if (els.psnCardColorInput) els.psnCardColorInput.value = profile.psnCardColor || '#1d4ed8';
  if (els.psnCommentInput) els.psnCommentInput.value = profile.psnComment || 'Welcome to my PS3 XMB Profile!';
  if (els.settingXmbHoverVideo) els.settingXmbHoverVideo.checked = settings.xmbHoverVideo !== false;
  if (els.settingXmbHoverAudio) els.settingXmbHoverAudio.checked = Boolean(settings.xmbHoverAudio);
  if (els.xmbWallpaperInput) {
    const wp = settings.xmbWallpaper || '';
    els.xmbWallpaperInput.value = wp ? decodeURIComponent(wp.split('/').pop() || wp) : '';
  }
  if (els.settingXmbSounds) els.settingXmbSounds.checked = settings.xmbSounds !== false;
  if (els.settingXmbIntro) els.settingXmbIntro.checked = settings.xmbIntro !== false;

  els.settingBackdropMode.value = settings.backdropMode || 'aurora';
  els.settingGlassStyle.value = settings.glassStyle || 'liquid';
  els.settingTheme.value = settings.theme || 'obsidian';
  els.settingGraphicsQuality.value = settings.graphicsQuality || 'high';
  els.settingPfpFrame.value = settings.pfpFrame || 'neon';
  els.settingUiAccent.value = settings.uiAccent || profile.color || '#38bdf8';

  els.profileList.innerHTML = '';
  const canDelete = state.profiles.length > 1;

  state.profiles.forEach((p) => {
    const isActive = p.id === state.activeProfileId;
    const row = document.createElement('div');
    row.className = 'profile-row';
    if (isActive) row.classList.add('active');

    const main = document.createElement('div');
    main.className = 'profile-row-main';

    const avatar = document.createElement('div');
    avatar.className = 'profile-row-avatar';
    const img = document.createElement('img');
    img.className = 'pfp-img';
    const fb = document.createElement('span');
    fb.className = 'pfp-fallback';
    renderAvatarInto(img, fb, p);
    avatar.append(img, fb);

    const info = document.createElement('div');
    const title = document.createElement('div');
    title.className = 'profile-row-title';
    title.textContent = p.name + (isActive ? ' (Active)' : '');

    const meta = document.createElement('div');
    meta.className = 'profile-row-meta';
    const count = p.games?.length || 0;
    const roleCount = p.roles?.length || 0;
    const vfxLabel = (p.vfx || 'nitro').toUpperCase();
    meta.textContent = `${count} ${count === 1 ? 'game' : 'games'} • ${roleCount} roles • ${vfxLabel} VFX`;

    info.append(title, meta);
    main.append(avatar, info);

    const actions = document.createElement('div');
    actions.className = 'profile-row-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-secondary btn-xs';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      state.editingProfileId = p.id;
      els.profileFormTitle.textContent = `Rename "${p.name}"`;
      els.profileNameInput.value = p.name;
      els.profileColorInput.value = p.color || '#38bdf8';
      els.btnProfileSubmit.textContent = 'Save';
      els.btnProfileCancelEdit.classList.remove('hidden');
      els.profileCopyRow.classList.add('hidden');
      els.profileNameInput.focus();
    });
    actions.appendChild(editBtn);

    if (canDelete) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-danger btn-xs';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        state.profiles = state.profiles.filter((item) => item.id !== p.id);
        if (state.activeProfileId === p.id) {
          state.activeProfileId = state.profiles[0].id;
          state.selectedId = activeGames()[0]?.id || null;
          state.last3dKey = '';
        }
        if (state.editingProfileId === p.id) resetProfileForm();
        await persist();
        render();
        showToast(`Deleted profile "${p.name}"`);
      });
      actions.appendChild(delBtn);
    }

    row.addEventListener('click', async () => {
      if (state.activeProfileId !== p.id) {
        state.activeProfileId = p.id;
        state.selectedId = activeGames()[0]?.id || null;
        state.creatingNewGame = false;
        state.last3dKey = '';
        await persist();
        render();
        showToast(`Switched to ${p.name}`);
      }
    });

    row.append(main, actions);
    els.profileList.appendChild(row);
  });
}

function updateCustomHomeButtonLabel() {
  if (!els.customHomeBtnLabel) return;
  const idx = activeSettings().customHomeButton;
  if (typeof idx === 'number' && idx >= 0) {
    els.customHomeBtnLabel.textContent = `Bound to Raw Gamepad Button #${idx} (+ Auto PS Home / Share+Options)`;
  } else {
    els.customHomeBtnLabel.textContent = 'Auto (PS Home / Button 12 / 13 / 16 + Share+Options)';
  }
}

function renderDrawer() {
  els.optionsDrawer.classList.toggle('hidden', !state.drawerOpen);
  els.btnToggleOptions.classList.toggle('active', state.drawerOpen);
  renderProfileCardAndHud();

  if (!state.drawerOpen) return;

  els.selTabs.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === state.activeTab);
  });

  Object.entries(els.tabPanels).forEach(([key, panel]) => {
    if (panel) panel.classList.toggle('hidden', key !== state.activeTab);
  });

  if (state.activeTab === 'display') {
    syncDisplayControls();
  } else if (state.activeTab === 'library') {
    syncGameFormToSelected();
  } else if (state.activeTab === 'profiles') {
    renderProfilesTab();
  } else if (state.activeTab === 'trophies') {
    renderTrophiesTab();
  } else if (state.activeTab === 'launcher') {
    els.settingLauncherName.value = activeSettings().launcherName || '';
    updateCustomHomeButtonLabel();
    updateMediaFolderStatusUI();
  }

  if (activeSettings().renderMode !== '2d') {
    requestAnimationFrame(() => stage3d?.resize());
  }
}

function createCdElement(game) {
  const wrap = document.createElement('div');
  wrap.className = 'disc-wrap';

  const shadow = document.createElement('div');
  shadow.className = 'disc-shadow';

  const disc = document.createElement('div');
  disc.className = 'disc';

  const artLayer = document.createElement('div');
  artLayer.className = 'disc-art-layer';
  if (game.artwork) {
    artLayer.style.backgroundImage = `url("${game.artwork}")`;
    artLayer.style.backgroundPosition = 'center 22%';
    artLayer.style.filter = 'contrast(1.06) saturate(1.08)';
  } else {
    artLayer.style.backgroundImage = getProceduralArtStyle(game);
  }

  const grooves = document.createElement('div');
  grooves.className = 'disc-grooves';

  const holo = document.createElement('div');
  holo.className = 'disc-holo';

  const stamp = document.createElement('div');
  stamp.className = 'disc-label-stamp';
  const stampTop = document.createElement('span');
  stampTop.className = 'disc-stamp-top';
  stampTop.textContent = game.platform || 'PC DISC';
  const stampTitle = document.createElement('span');
  stampTitle.className = 'disc-stamp-title';
  stampTitle.textContent = game.title;
  stamp.append(stampTop, stampTitle);

  const hub = document.createElement('div');
  hub.className = 'disc-hub';

  disc.append(artLayer, grooves, holo);
  if (!game.artwork) disc.append(stamp);
  disc.append(hub);
  wrap.append(shadow, disc);
  return wrap;
}

function createCaseElement(game) {
  const wrap = document.createElement('div');
  wrap.className = 'case-wrap';

  const peekDisc = document.createElement('div');
  peekDisc.className = 'case-peek-disc';
  if (game.artwork) {
    peekDisc.style.backgroundImage = `url("${game.artwork}")`;
    peekDisc.style.backgroundSize = 'cover';
    peekDisc.style.backgroundPosition = 'center 22%';
  }

  const gameCase = document.createElement('div');
  gameCase.className = 'game-case';

  const headerBar = document.createElement('div');
  headerBar.className = 'case-header-bar';
  const platSpan = document.createElement('span');
  platSpan.textContent = game.platform || 'PC DVD';
  const yearSpan = document.createElement('span');
  yearSpan.textContent = game.year || '';
  headerBar.append(platSpan, yearSpan);

  const cover = document.createElement('div');
  cover.className = 'case-cover';
  if (game.artwork) {
    cover.style.backgroundImage = `linear-gradient(180deg, transparent 58%, rgba(0,0,0,0.8) 100%), url("${game.artwork}")`;
    cover.style.backgroundPosition = 'center 22%';
    cover.style.filter = 'contrast(1.06) saturate(1.08)';
  } else {
    cover.style.backgroundImage = getProceduralArtStyle(game);
  }

  const spine = document.createElement('div');
  spine.className = 'case-spine';

  const gloss = document.createElement('div');
  gloss.className = 'case-gloss';

  const coverTitle = document.createElement('div');
  coverTitle.className = 'case-cover-title';
  coverTitle.textContent = game.title;

  const coverSub = document.createElement('div');
  coverSub.className = 'case-cover-sub';
  coverSub.textContent = game.genre || (game.isDemo ? 'Sample Disc' : 'Game');

  if (!game.artwork) {
    cover.append(coverTitle, coverSub);
  }
  gameCase.append(spine, gloss, headerBar, cover);
  wrap.append(peekDisc, gameCase);
  return wrap;
}

function render3dView(visibleGames) {
  const settings = activeSettings();
  const isXmb = settings.theme === 'xmb';

  if (stage3d?.subMode === 'unwrap') {
    els.emptyState.classList.add('hidden');
    els.stage2dWrap.classList.add('hidden');
    els.stage3dWrap.classList.remove('hidden');
    stage3d.start();
    stage3d.resize();
    syncStageOverlays();
    return;
  }

  if (visibleGames.length === 0) {
    els.stage2dWrap.classList.add('hidden');
    els.stage3dWrap.classList.toggle('hidden', !isXmb);
    els.emptyState.classList.toggle('hidden', isXmb);
    if (isXmb) {
      ensureStage3D();
      stage3d.clearModel();
      stage3d.start();
      stage3d.resize();
    } else {
      stage3d?.stop();
    }
    return;
  }

  els.emptyState.classList.add('hidden');
  els.stage2dWrap.classList.add('hidden');
  els.stage3dWrap.classList.remove('hidden');

  ensureStage3D();
  stage3d.start();
  stage3d.resize();

  if (!visibleGames.some((g) => g.id === state.selectedId)) {
    state.selectedId = visibleGames[0].id;
  }

  const selected = visibleGames.find((g) => g.id === state.selectedId) || visibleGames[0];
  const viewMode = settings.viewMode === 'case' ? 'case' : 'cd';

  if (settings.renderMode === 'shelf3d') {
    const shelfKey =
      'shelf:' +
      activeProfile().id +
      ':' +
      viewMode +
      ':' +
      visibleGames.map((g) => `${g.id}:${g.title}:${g.artwork}:${g.backArtwork || ''}:${g.accent}`).join('|');

    if (state.last3dKey !== shelfKey) {
      state.last3dKey = shelfKey;
      stage3d.setShelfMode(visibleGames, selected.id, viewMode).then(() => syncStageOverlays());
    } else {
      stage3d.selectShelfGame(selected.id);
      syncStageOverlays();
    }
    return;
  }

  const modelKey = `${activeProfile().id}:${selected.id}:${viewMode}:${selected.title}:${selected.artwork}:${selected.backArtwork || ''}:${selected.synopsis || ''}:${selected.accent}:${selected.secondary}:${selected.platform}:${selected.year}:${selected.playCount}:${selected.executable}:${selected.trailer || ''}`;

  if (state.last3dKey !== modelKey) {
    state.last3dKey = modelKey;
    stage3d.setItem(selected, viewMode).then(() => syncStageOverlays());
  } else {
    syncStageOverlays();
  }
}

function render2dView(visibleGames) {
  els.stage3dWrap.classList.add('hidden');
  els.stage2dWrap.classList.remove('hidden');
  stage3d?.stop();

  const settings = activeSettings();
  const isCd = settings.viewMode !== 'case';

  els.mediaGrid.className = [
    'media-grid',
    `size-${settings.discSize || 'md'}`,
    isCd ? 'mode-cd' : 'mode-case',
    settings.spinOnHover ? 'spin-hover' : '',
    settings.showTitlesOnMedia ? '' : 'hide-labels'
  ]
    .filter(Boolean)
    .join(' ');

  els.mediaGrid.innerHTML = '';
  els.emptyState.classList.toggle('hidden', visibleGames.length > 0);

  visibleGames.forEach((game) => {
    const card = document.createElement('div');
    card.className = 'media-item';
    if (game.id === state.selectedId) card.classList.add('selected');
    card.dataset.id = game.id;

    if (game.favorite) {
      const favDot = document.createElement('span');
      favDot.className = 'media-fav-dot';
      favDot.textContent = '★';
      card.appendChild(favDot);
    }

    const visual = isCd ? createCdElement(game) : createCaseElement(game);
    card.appendChild(visual);

    const caption = document.createElement('div');
    caption.className = 'media-caption';
    const titleEl = document.createElement('div');
    titleEl.className = 'media-title';
    titleEl.textContent = game.title;
    const subEl = document.createElement('div');
    subEl.className = 'media-sub';
    subEl.textContent = game.genre || game.platform || 'PC';
    caption.append(titleEl, subEl);
    card.appendChild(caption);

    card.addEventListener('click', () => {
      state.selectedId = game.id;
      state.creatingNewGame = false;
      renderDock();
      if (state.drawerOpen && state.activeTab === 'library') {
        syncGameFormToSelected();
      }
      document.querySelectorAll('.media-item').forEach((el) => {
        el.classList.toggle('selected', el.dataset.id === game.id);
      });
    });

    card.addEventListener('dblclick', () => {
      state.selectedId = game.id;
      launchSelectedGame(game);
    });

    els.mediaGrid.appendChild(card);
  });
}

function renderDock() {
  renderProfileCardAndHud();
  const game = activeGames().find((g) => g.id === state.selectedId);
  if (!game) {
    els.dockDiscPreview.style.backgroundImage = 'none';
    els.deckTitle.textContent = 'No Game Selected';
    els.deckPlatform.textContent = 'PC';
    els.deckDemoTag.classList.add('hidden');
    els.deckSubtitle.textContent = 'Click + New to unwrap a game case';
    els.btnWatchTrailer?.classList.add('hidden');
    return;
  }

  els.dockDiscPreview.style.backgroundImage = game.artwork
    ? `url("${game.artwork}")`
    : getProceduralArtStyle(game);

  els.deckTitle.textContent = game.title;
  els.deckPlatform.textContent = game.platform || 'PC';
  els.deckDemoTag.classList.toggle('hidden', !game.isDemo);
  els.btnWatchTrailer?.classList.add('hidden');

  const plays = game.playCount || 0;
  const parts = [game.genre || 'Game', `${plays} ${plays === 1 ? 'play' : 'plays'}`];
  if (game.executable) parts.push('.exe linked');
  els.deckSubtitle.textContent = parts.join(' • ');
}

// =========================================================
// PS3 XROSSMEDIABAR (XMB) — Real MaXMB Assets, Font & Cross Metrics
// =========================================================
const XMB_METRICS = {
  spineX: 0.295,
  catY: 290 / 1080,
  catSelY: 281 / 1080,
  catGapSel: 210 / 1920,
  catGap: 199 / 1920,
  itemSpineY: 505 / 1080,
  itemBelowY: 680 / 1080,
  itemAboveY: 120 / 1080,
  itemPitch: 80 / 1080,
  gamePitch: 96 / 1080
};

const XMB_ALL_CATEGORIES = {
  users: { id: 'users', label: 'Users', icon: 'assets/maxmb/icons/theme/icon_user.png' },
  settings: { id: 'settings', label: 'Settings', icon: 'assets/maxmb/icons/theme/icon_setting.png' },
  photo: { id: 'photo', label: 'Photo', icon: 'assets/maxmb/icons/theme/icon_photo.png' },
  music: { id: 'music', label: 'Music', icon: 'assets/maxmb/icons/theme/icon_music.png' },
  video: { id: 'video', label: 'Video', icon: 'assets/maxmb/icons/theme/icon_video.png' },
  game: { id: 'game', label: 'Game', icon: 'assets/maxmb/icons/theme/icon_game.png' },
  psn: { id: 'psn', label: 'PlayStation®Network', icon: 'assets/maxmb/icons/theme/icon_network.png' },
  friends: { id: 'friends', label: 'Friends', icon: 'assets/maxmb/icons/theme/icon_friend.png' }
};

function resolveXmbIconPath(defaultPath) {
  if (!defaultPath) return 'assets/maxmb/icons/theme/icon_setting_item.png';
  const set = activeSettings().xmbIconSet || 'default';
  if (set === 'default') return defaultPath;
  const folder = set === 'vice' ? 'vice' : 'flat';
  // Replace assets/maxmb/icons/theme/<file> with assets/maxmb/iconsets/<folder>/<file> if it's a theme icon
  if (defaultPath.includes('assets/maxmb/icons/theme/')) {
    const fileName = defaultPath.split('/').pop();
    return `assets/maxmb/iconsets/${folder}/${fileName}`;
  }
  return defaultPath;
}

function getActiveXmbCategories() {
  return [
    XMB_ALL_CATEGORIES.users,
    XMB_ALL_CATEGORIES.settings,
    XMB_ALL_CATEGORIES.photo,
    XMB_ALL_CATEGORIES.music,
    XMB_ALL_CATEGORIES.game,
    XMB_ALL_CATEGORIES.video,
    XMB_ALL_CATEGORIES.psn,
    XMB_ALL_CATEGORIES.friends
  ];
}

function stopXmbHoverVideo() {
  clearTimeout(xmbHoverVideoTimer);
  xmbHoverVideoTimer = null;
  xmbActiveVideoGameId = null;
  if (els.xmbGameBgVideo) {
    els.xmbGameBgVideo.classList.remove('show');
    els.xmbGameBgVideo.pause();
  }
  if (els.xmbHoverTrailerStatus) {
    els.xmbHoverTrailerStatus.classList.add('hidden');
  }
}

function scheduleXmbHoverVideo() {
  stopXmbHoverVideo();
}

function unusedScheduleXmbHoverVideo(game) {
  const settings = activeSettings();
  if (settings.theme !== 'xmb' || settings.xmbHoverVideo === false || !game) {
    stopXmbHoverVideo();
    return;
  }

  // If already playing this game's trailer, keep playing smoothly
  if (xmbActiveVideoGameId === game.id && els.xmbGameBgVideo?.classList.contains('show')) {
    els.xmbGameBgVideo.muted = !settings.xmbHoverAudio;
    return;
  }

  clearTimeout(xmbHoverVideoTimer);
  if (els.xmbGameBgVideo && xmbActiveVideoGameId !== game.id) {
    els.xmbGameBgVideo.classList.remove('show');
    els.xmbGameBgVideo.pause();
  }

  xmbHoverVideoTimer = setTimeout(async () => {
    if (activeSettings().theme !== 'xmb') return;
    const cats = getActiveXmbCategories();
    const curCat = cats[state.xmbCatIdx];
    const items = getXmbItemsForCategory(curCat?.id);
    const activeItem = items[state.xmbItemIdxs[state.xmbCatIdx] || 0];
    if (activeItem?.gameId !== game.id) return;

    if (game.trailer) {
      if (els.xmbHoverTrailerStatus) els.xmbHoverTrailerStatus.classList.add('hidden');
      if (els.xmbGameBgVideo) {
        xmbActiveVideoGameId = game.id;
        if (els.xmbGameBgVideo.dataset.gameTrailer !== game.trailer) {
          els.xmbGameBgVideo.dataset.gameTrailer = game.trailer;
          els.xmbGameBgVideo.src = game.trailer;
        }
        els.xmbGameBgVideo.muted = !activeSettings().xmbHoverAudio;
        els.xmbGameBgVideo.currentTime = 0;
        els.xmbGameBgVideo.play().then(() => {
          els.xmbGameBgVideo.classList.add('show');
          // Unlock Trailer trophy automatically!
          const tList = getGameTrophyTemplates(game);
          const trTrophy = tList.find((t) => t.id.endsWith('-trailer'));
          if (trTrophy) unlockAchievement(trTrophy, true);
        }).catch(() => {});
      }
      return;
    }

    // No trailer downloaded yet -> Auto-fetch from YouTube via yt-dlp in background!
    if (!xmbAutoFetchSet.has(game.id)) {
      xmbAutoFetchSet.add(game.id);
      if (els.xmbHoverTrailerStatus) {
        els.xmbHoverTrailerStatus.textContent = `🎬 Fetching YouTube Gameplay / Trailer for "${game.title}"…`;
        els.xmbHoverTrailerStatus.classList.remove('hidden');
      }
      try {
        const res = await api.fetchTrailer({
          title: game.title,
          steamTrailerUrl: '',
          preferGameplay: true
        });
        if (els.xmbHoverTrailerStatus) els.xmbHoverTrailerStatus.classList.add('hidden');
        if (res?.ok && res.url) {
          game.trailer = res.url;
          await persist();
          // If user is still hovering this game in XMB, immediately start playing the trailer background!
          const nowCat = getActiveXmbCategories()[state.xmbCatIdx];
          const nowItem = getXmbItemsForCategory(nowCat?.id)[state.xmbItemIdxs[state.xmbCatIdx] || 0];
          if (activeSettings().theme === 'xmb' && nowItem?.gameId === game.id) {
            scheduleXmbHoverVideo(game);
          }
        }
      } catch {
        if (els.xmbHoverTrailerStatus) els.xmbHoverTrailerStatus.classList.add('hidden');
      }
    }
  }, 420);
}

const XMB_MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];
const XMB_BG_COLOR_CYCLE = [
  'auto', 'blue', 'royal-blue', 'purple', 'red', 'pink',
  'orange', 'olive', 'green', 'turquoise', 'brown', 'silver', 'black',
  ...Array.from({ length: 12 }, (_, m) => `month:${m}`)
];

function getXmbBgColorLabel(id) {
  const key = String(id || 'auto');
  if (key.startsWith('month:')) {
    const m = Number.parseInt(key.slice(6), 10);
    if (XMB_MONTH_NAMES[m]) return XMB_MONTH_NAMES[m];
  }
  return XMB_BG_COLORS[key]?.label || 'Original (Month)';
}

function getXmbConsoleBadge(platform) {
  const p = String(platform || '').toLowerCase();
  if (/ps3/.test(p)) return 'assets/maxmb/icons/consoles/item_tex_ps3format.png';
  if (/ps2/.test(p)) return 'assets/maxmb/icons/consoles/item_tex_ps2format.png';
  if (/ps1|psx/.test(p)) return 'assets/maxmb/icons/consoles/item_tex_ps1format.png';
  if (/psp/.test(p)) return 'assets/maxmb/icons/consoles/item_tex_pspformat.png';
  if (/xbox\s*360/.test(p)) return 'assets/maxmb/icons/consoles/tex_vc_xbox360.png';
  if (/xbox/.test(p)) return 'assets/maxmb/icons/consoles/tex_vc_xboxone.png';
  if (/switch/.test(p)) return 'assets/maxmb/icons/consoles/tex_vc_switch.png';
  return 'assets/maxmb/icons/consoles/tex_vc_pc.png';
}

function getXmbItemsForCategory(catId) {
  const settings = activeSettings();
  const visible = getFilteredSortedGames();

  if (catId === 'users') {
    const items = state.profiles.map((p) => ({
      id: `user-${p.id}`,
      kind: 'user',
      activeUser: p.id === state.activeProfileId,
      title: p.name,
      sub: `${p.games?.length || 0} ${(p.games?.length || 0) === 1 ? 'game' : 'games'}`,
      art: p.avatar || '',
      fallbackArt: 'assets/maxmb/icons/avatars/stock/person_blue.png',
      iconPng: 'assets/maxmb/icons/theme/icon_user.png',
      action: async () => {
        if (state.activeProfileId !== p.id) {
          state.activeProfileId = p.id;
          state.selectedId = activeGames()[0]?.id || null;
          state.last3dKey = '';
          await persist();
          render();
          showToast(`Signed in as ${p.name}`);
        } else {
          openOptionsDrawer('profiles');
        }
      }
    }));
    items.push({
      id: 'user-customize',
      kind: 'system',
      title: 'Create New User / Edit Profile',
      sub: 'Profiles & personalization settings',
      iconPng: 'assets/maxmb/icons/theme/icon_newuser.png',
      action: () => openOptionsDrawer('profiles')
    });
    items.push({
      id: 'user-power',
      kind: 'system',
      title: 'Turn Off System / Power Menu',
      sub: 'Open Quick Power Overlay',
      iconPng: 'assets/maxmb/icons/theme/icon_poweroff.png',
      action: () => api.openOverlay()
    });
    return items;
  }

  if (catId === 'settings') {
    const rmLabel =
      settings.renderMode === 'shelf3d'
        ? settings.viewMode === 'case'
          ? 'Domino Shelf'
          : 'CD Spindle'
        : settings.renderMode === '2d'
          ? '2D Grid'
          : '3D Hero';

    return [
      {
        id: 'set-media',
        kind: 'setting',
        title: 'Game Display Format',
        sub: 'Switch Obsidian mode between Game CDs and Game Cases',
        setVal: settings.viewMode === 'case' ? 'Game Cases' : 'Game CDs',
        iconPng: 'assets/maxmb/icons/theme/icon_game_setting.png',
        action: async () => {
          settings.viewMode = settings.viewMode === 'case' ? 'cd' : 'case';
          state.last3dKey = '';
          await persist();
          render();
        }
      },
      {
        id: 'set-render',
        kind: 'setting',
        title: 'Shelf Layout Mode',
        sub: 'Cycle 3D Hero, Domino Shelf / CD Spindle & 2D Grid',
        setVal: rmLabel,
        iconPng: 'assets/maxmb/icons/theme/icon_display_setting.png',
        action: async () => {
          const order = ['3d', 'shelf3d', '2d'];
          const cur = order.includes(settings.renderMode) ? settings.renderMode : '3d';
          settings.renderMode = order[(order.indexOf(cur) + 1) % order.length];
          state.last3dKey = '';
          await persist();
          render();
        }
      },
      {
        id: 'set-options',
        kind: 'setting',
        title: 'System Settings',
        sub: 'Open Display, Games & .exe, Profiles & Launcher drawer',
        setVal: 'Open',
        iconPng: 'assets/maxmb/icons/theme/icon_system_setting.png',
        action: () => openOptionsDrawer('display')
      },
      {
        id: 'set-bgcolor',
        kind: 'setting',
        title: 'Original Wave Color',
        sub: 'Cycle Sony PS3 colors & months for the wave background',
        setVal: getXmbBgColorLabel(settings.xmbBgColor || 'auto'),
        iconPng: 'assets/maxmb/icons/theme/icon_theme_setting.png',
        action: async () => {
          const cur = settings.xmbBgColor || 'auto';
          const idx = XMB_BG_COLOR_CYCLE.indexOf(cur);
          settings.xmbBgColor = XMB_BG_COLOR_CYCLE[(idx + 1) % XMB_BG_COLOR_CYCLE.length];
          await persist();
          render();
        }
      },
      {
        id: 'set-wallpaper',
        kind: 'setting',
        title: 'Background Wallpaper (MP4 / Image)',
        sub: 'Replace wave with looping MP4 video or picture background',
        setVal: settings.xmbWallpaper
          ? decodeURIComponent(settings.xmbWallpaper.split('/').pop() || 'Custom')
          : 'Original Wave',
        iconPng: 'assets/maxmb/icons/theme/icon_photo.png',
        action: async () => {
          const picked = await api.pickWallpaperFile();
          if (picked) {
            settings.xmbWallpaper = picked;
            await persist();
            render();
            showToast('PS3 XMB Wallpaper updated');
          }
        }
      },
      ...(settings.xmbWallpaper
        ? [
            {
              id: 'set-wallpaper-clear',
              kind: 'setting',
              title: 'Reset Background to Classic Wave',
              sub: 'Clear MP4 / Image wallpaper and use pure PS3 wave',
              setVal: 'Restore',
              iconPng: 'assets/maxmb/icons/theme/icon_theme_setting.png',
              action: async () => {
                settings.xmbWallpaper = '';
                await persist();
                render();
              }
            }
          ]
        : []),
      {
        id: 'set-wavestyle',
        kind: 'setting',
        title: 'PS3 Wave Engine (lines.qrc)',
        sub: 'Switch between PS3 Firmware 4.93 lines.qrc OriginalWave & MaXMB Spline',
        setVal: (settings.xmbWaveStyle || 'original') === 'original' ? 'Firmware 4.93 (lines.qrc)' : 'MaXMB Complex',
        iconPng: 'assets/maxmb/icons/theme/icon_theme_setting.png',
        action: async () => {
          settings.xmbWaveStyle = (settings.xmbWaveStyle || 'original') === 'original' ? 'complex' : 'original';
          await persist();
          render();
        }
      },
      {
        id: 'set-iconset',
        kind: 'setting',
        title: 'MaXMB Icon Pack',
        sub: 'Cycle Official PS3 Gloss, MaXMB Flat Icons & Neon Vice Icons',
        setVal: (settings.xmbIconSet || 'default').toUpperCase(),
        iconPng: 'assets/maxmb/icons/theme/icon_display_setting.png',
        action: async () => {
          const order = ['default', 'flat', 'vice'];
          const cur = order.includes(settings.xmbIconSet) ? settings.xmbIconSet : 'default';
          settings.xmbIconSet = order[(order.indexOf(cur) + 1) % order.length];
          xmbCatDomMap.clear();
          els.xmbCategories.innerHTML = '';
          xmbRenderedSignature = '';
          await persist();
          render();
        }
      },
      {
        id: 'set-soundset',
        kind: 'setting',
        title: 'System Sound Pack',
        sub: 'Switch between PS3 Original Sounds and PS4 System Sounds',
        setVal: (settings.xmbSoundSet || 'ps3').toUpperCase(),
        iconPng: 'assets/maxmb/icons/theme/icon_sound_setting.png',
        action: async () => {
          settings.xmbSoundSet = settings.xmbSoundSet === 'ps4' ? 'ps3' : 'ps4';
          await persist();
          render();
        }
      },
      {
        id: 'set-hover-video',
        kind: 'setting',
        title: 'Game Hover Trailer Background',
        sub: 'Auto-play YouTube gameplay / trailer in background when hovering games',
        setVal: settings.xmbHoverVideo !== false ? 'On' : 'Off',
        iconPng: 'assets/maxmb/icons/theme/icon_bdvd_setting.png',
        action: async () => {
          settings.xmbHoverVideo = settings.xmbHoverVideo === false;
          await persist();
          render();
        }
      },
      {
        id: 'set-sounds',
        kind: 'setting',
        title: 'PS3 XMB Sound Effects',
        sub: 'Toggle MaXMB Original cursor, enter, back & startup sounds',
        setVal: settings.xmbSounds !== false ? 'On' : 'Off',
        iconPng: 'assets/maxmb/icons/theme/icon_sound_setting.png',
        action: async () => {
          settings.xmbSounds = settings.xmbSounds === false;
          await persist();
          render();
        }
      },
      {
        id: 'set-intro',
        kind: 'setting',
        title: 'Replay PS3 Startup Intro',
        sub: 'Play authentic PS3 boot sequence & coldboot sound',
        setVal: settings.xmbIntro !== false ? 'Enabled' : 'Off',
        iconPng: 'assets/maxmb/icons/theme/icon_poweroff.png',
        action: () => triggerPs3Intro(true)
      },
      {
        id: 'set-fullscreen',
        kind: 'setting',
        title: 'Video Output Settings',
        sub: 'Toggle Fullscreen Window (F11)',
        setVal: 'Fullscreen / Window',
        iconPng: 'assets/maxmb/icons/theme/icon_bdvd_setting.png',
        action: () => api.toggleFullscreen()
      },
      {
        id: 'set-exit-xmb',
        kind: 'setting',
        title: 'Theme Settings',
        sub: 'Return to Obsidian (Default 3D Case / CD Theme)',
        setVal: 'PS3 XMB',
        iconPng: 'assets/maxmb/icons/theme/icon_theme_setting.png',
        action: async () => {
          settings.theme = 'obsidian';
          if (settings.backdropMode === 'xmb-wave') settings.backdropMode = 'aurora';
          await persist();
          render();
        }
      }
    ];
  }

  if (catId === 'photo') {
    const pics = [
      ...(state.deviceMedia?.pictures?.ps3 || []).map((f) => ({ ...f, source: 'ps3_pic' })),
      ...(state.deviceMedia?.pictures?.device || []).map((f) => ({ ...f, source: 'Device Pictures' }))
    ];
    return [
      {
        id: 'photo-add-pic',
        kind: 'system',
        title: 'Import Picture to ps3_pic',
        sub: 'Copy PNG / JPG / GIF safely into launcher ps3_pic folder',
        iconPng: 'assets/maxmb/icons/theme/icon_photogallery.png',
        action: async () => {
          const picked = await api.pickImageFile();
          if (picked) {
            await refreshDeviceMedia();
            renderXmb();
            showToast('Picture saved to ps3_pic!');
          }
        }
      },
      {
        id: 'photo-open-folder',
        kind: 'system',
        title: '📁 ps3_pic Folder',
        sub: 'Open launcher ps3_pic folder in Explorer',
        iconPng: 'assets/maxmb/icons/theme/icon_savedata.png',
        action: () => api.openMediaFolder('pic')
      },
      ...pics.map((f, idx) => ({
        id: `pic-${idx}-${f.name}`,
        kind: 'system',
        title: f.title,
        sub: `${f.source} • Click to view in PS3 Photo Viewer`,
        art: f.url,
        iconPng: 'assets/maxmb/icons/theme/icon_photo.png',
        action: () => openXmbPhotoViewer(pics, idx)
      }))
    ];
  }

  if (catId === 'music') {
    const tracks = [
      ...(state.deviceMedia?.audio?.ps3 || []).map((f) => ({ ...f, source: 'ps3_audio' })),
      ...(state.deviceMedia?.audio?.device || []).map((f) => ({ ...f, source: 'Device Music' }))
    ];

    const albumMap = new Map();
    const singles = [];
    for (const t of tracks) {
      const alb = String(t.album || '').trim();
      if (alb) {
        if (!albumMap.has(alb)) albumMap.set(alb, []);
        albumMap.get(alb).push(t);
      } else {
        singles.push(t);
      }
    }

    // If an album dropdown is open in XMB, show Close Album + all tracks in that album!
    if (state.xmbOpenAlbum && albumMap.has(state.xmbOpenAlbum)) {
      const albTracks = albumMap.get(state.xmbOpenAlbum);
      return [
        {
          id: 'music-close-album',
          kind: 'system',
          title: `◀ Close Album: ${state.xmbOpenAlbum}`,
          sub: `${albTracks.length} ${albTracks.length === 1 ? 'song' : 'songs'} • Click to return to Albums & Audio`,
          iconPng: 'assets/maxmb/icons/theme/icon_savedata.png',
          action: () => {
            state.xmbOpenAlbum = null;
            state.xmbItemIdxs[state.xmbCatIdx] = 0;
            renderXmb();
          }
        },
        ...albTracks.map((f, idx) => ({
          id: `alb-trk-${idx}-${f.name}`,
          kind: 'system',
          title: f.title,
          sub: `${f.artist ? `${f.artist} • ` : ''}${state.xmbOpenAlbum}`,
          iconPng: 'assets/maxmb/icons/theme/icon_music.png',
          action: () => playXmbMusicTrack(albTracks, idx)
        }))
      ];
    }

    return [
      {
        id: 'music-add-audio',
        kind: 'system',
        title: 'Import Music to ps3_audio',
        sub: 'Copy MP3 / WAV / OGG / FLAC safely into launcher ps3_audio folder',
        iconPng: 'assets/maxmb/icons/theme/icon_music.png',
        action: async () => {
          const picked = await api.pickAudioFile();
          if (picked) {
            await refreshDeviceMedia();
            renderXmb();
            showToast('Audio saved to ps3_audio!');
          }
        }
      },
      {
        id: 'music-open-folder',
        kind: 'system',
        title: '📁 ps3_audio Folder',
        sub: 'Open launcher ps3_audio folder in Explorer',
        iconPng: 'assets/maxmb/icons/theme/icon_savedata.png',
        action: () => api.openMediaFolder('audio')
      },
      ...Array.from(albumMap.entries()).map(([albName, albTracks]) => ({
        id: `album-${albName}`,
        kind: 'system',
        title: `💿 ${albName} (Album)`,
        sub: `${albTracks.length} ${albTracks.length === 1 ? 'song' : 'songs'} • Press Enter to open album`,
        setVal: `${albTracks.length} tracks`,
        iconPng: 'assets/maxmb/icons/theme/icon_podcast.png',
        action: () => {
          state.xmbOpenAlbum = albName;
          state.xmbItemIdxs[state.xmbCatIdx] = 0;
          renderXmb();
        }
      })),
      ...singles.map((f, idx) => ({
        id: `aud-${idx}-${f.name}`,
        kind: 'system',
        title: f.title,
        sub: `${f.artist ? `${f.artist} • ` : ''}${f.source}`,
        iconPng: 'assets/maxmb/icons/theme/icon_music.png',
        action: () => playXmbMusicTrack(singles, idx)
      }))
    ];
  }

  if (catId === 'video') {
    const vids = [
      ...(state.deviceMedia?.videos?.ps3 || []).map((f) => ({ ...f, source: 'ps3_video' })),
      ...(state.deviceMedia?.videos?.device || []).map((f) => ({ ...f, source: 'Device Videos' }))
    ];
    return [
      {
        id: 'vid-add-video',
        kind: 'system',
        title: 'Import Video to ps3_video',
        sub: 'Copy MP4 / WebM / MKV safely into launcher ps3_video folder',
        iconPng: 'assets/maxmb/icons/theme/icon_video.png',
        action: async () => {
          const picked = await api.pickVideoFile();
          if (picked) {
            await refreshDeviceMedia();
            renderXmb();
            showToast('Video saved to ps3_video!');
          }
        }
      },
      {
        id: 'vid-open-folder',
        kind: 'system',
        title: '📁 ps3_video Folder',
        sub: 'Open launcher ps3_video folder in Explorer',
        iconPng: 'assets/maxmb/icons/theme/icon_savedata.png',
        action: () => api.openMediaFolder('video')
      },
      ...vids.map((f) => ({
        id: `vidfile-${f.name}-${f.source}`,
        kind: 'system',
        title: f.title,
        sub: `${f.source} • Click to play in PS3 Video Player`,
        iconPng: 'assets/maxmb/icons/theme/icon_video.png',
        action: () => openXmbVideoPlayer(f)
      }))
    ];
  }

  if (catId === 'psn') {
    const stats = computeTrophyStats();
    return [
      {
        id: 'psn-whatsnew',
        kind: 'system',
        title: "What's New",
        sub: 'Latest Trophies, Firmware 4.93 QRC Wave & MaXMB News',
        iconPng: 'assets/maxmb/icons/theme/icon_whatsnew.png',
        cinfoImg: './assets/maxmb/cinfo/cinfo-bg-whatsnew.jpg',
        cinfoTitle: "What's New on PlayStation®3 (4.93)",
        cinfoDesc: 'All PS3UPDAT.PUP (lines.qrc, earth.qrc, canyon.qrc, Rodin fonts, 27 firmware avatars) & MaXMB assets active.',
        action: () => openOptionsDrawer('trophies')
      },
      {
        id: 'psn-trophies',
        kind: 'system',
        title: `Trophy Collection (Level ${stats.level} • ${stats.total} Trophies)`,
        sub: `Platinum: ${stats.platinum} • Gold: ${stats.gold} • Silver: ${stats.silver} • Bronze: ${stats.bronze}`,
        art: './assets/maxmb/icons/trophies/trophy_platinum.png',
        iconPng: 'assets/maxmb/icons/theme/icon_trophy.png',
        action: () => openOptionsDrawer('trophies')
      },
      {
        id: 'psn-home',
        kind: 'system',
        title: 'PlayStation®Home',
        sub: 'Virtual 3D Social Space & Physical Disc Showcase',
        art: './assets/maxmb/icons/firmware/icon_home.png',
        iconPng: 'assets/maxmb/icons/theme/icon_home.png',
        cinfoImg: './assets/maxmb/cinfo/cinfo-bg-home-modern.jpg',
        cinfoTitle: 'PlayStation®Home',
        cinfoDesc: 'Enter the 3D Interactive Physical Media Stage to orbit cases, eject discs, and read manuals.',
        action: async () => {
          settings.theme = 'obsidian';
          await persist();
          render();
        }
      },
      {
        id: 'psn-plus',
        kind: 'system',
        title: 'PlayStation®Plus',
        sub: activeProfile().psPlus !== false ? 'Membership Active (Golden Badge Enabled)' : 'Click to Enable PS Plus Badge',
        art: './assets/maxmb/icons/system/ps_plus.png',
        cinfoImg: './assets/maxmb/cinfo/cinfo-bg-storegame.jpg',
        cinfoTitle: 'PlayStation®Plus Instant Game Collection',
        cinfoDesc: 'Toggle your PlayStation Plus icon on your XMB Infobox and PSN Player Card.',
        action: async () => {
          activeProfile().psPlus = activeProfile().psPlus === false;
          await persist();
          render();
          showToast(activeProfile().psPlus ? 'PlayStation Plus Badge Enabled' : 'PlayStation Plus Badge Hidden');
        }
      },
      {
        id: 'psn-store',
        kind: 'system',
        title: 'PlayStation®Store',
        sub: 'Install & Add New Games with Auto Covers, Manuals & Trailers',
        art: './assets/maxmb/icons/system/ps_store.png',
        cinfoImg: './assets/maxmb/cinfo/cinfo-bg-storemain.jpg',
        cinfoTitle: 'PlayStation®Store',
        cinfoDesc: 'Press Enter to register a new game and automatically download its HD cover, manual & YouTube trailer.',
        action: () => openPs3AddGameModal()
      },
      {
        id: 'psn-trophy-util',
        kind: 'system',
        title: 'Trophy Collection',
        sub: `Level ${computeTrophyStats().level} (${computeTrophyStats().pct}%) • ${computeTrophyStats().total} Unlocked Trophies`,
        iconPng: 'assets/maxmb/icons/theme/icon_trophy.png',
        action: () => openOptionsDrawer('trophies')
      }
    ];
  }

  if (catId === 'friends') {
    const p = activeProfile();
    const stats = computeTrophyStats(p);
    return [
      {
        id: 'friend-self-card',
        kind: 'user',
        activeUser: true,
        title: `${p.name} (${p.handle || '@player1'})`,
        sub: `★ Trophy Level ${stats.level} • "${p.psnComment || p.customStatus || 'Online'}"`,
        art: p.avatar || './assets/maxmb/icons/avatars/firmware/000.png',
        setVal: `🏆 ${stats.total}`,
        action: () => openOptionsDrawer('profiles')
      },
      {
        id: 'friend-avatar-picker',
        kind: 'system',
        title: 'PSN & Firmware 4.93 Avatar Gallery (90+ Avatars)',
        sub: 'Choose from Official PS3 Firmware Avatars, MaXMB PSN Avatars & Gradient Icons',
        iconPng: 'assets/maxmb/icons/theme/icon_friend_add.png',
        action: () => {
          openOptionsDrawer('profiles');
          els.avatarGalleryBox?.classList.remove('hidden');
          state.avatarGalleryTab = 'psn';
          renderAvatarGallery();
        }
      },
      {
        id: 'friend-roles',
        kind: 'system',
        title: 'Customize PSN Player Card & Super Roles',
        sub: `Active Roles: ${(p.roles || []).map((r) => r.name).join(', ') || 'None'}`,
        iconPng: 'assets/maxmb/icons/theme/icon_chatroom.png',
        action: () => openOptionsDrawer('profiles')
      }
    ];
  }

  // 'game' category: Saved Data Utility + real user games + Install / Add Game (no trophies here)
  const gameItems = [
    {
      id: 'game-savedata-util',
      kind: 'system',
      title: 'Saved Data Utility (PS3™)',
      sub: `${visible.length} Physical Games in Library • Manage .exe & Metadata`,
      iconPng: 'assets/maxmb/icons/theme/icon_savedata.png',
      action: () => openOptionsDrawer('library')
    },
    ...visible.map((g) => ({
      id: `game-${g.id}`,
      kind: 'game',
      title: g.title,
      sub: `${g.genre || 'Game'}${g.platform ? ` • ${g.platform}` : ''}${g.executable ? '' : ' • Link .exe in Options'}`,
      art: g.artwork || '',
      bgArt: g.backArtwork || g.artwork || '',
      gameFmt: getXmbConsoleBadge(g.platform),
      fallbackArt: 'assets/maxmb/icons/system/default_game.png',
      iconPng: 'assets/maxmb/icons/theme/icon_game.png',
      gameId: g.id,
      action: () => launchSelectedGame(g)
    })),
    {
      id: 'game-add',
      kind: 'system',
      title: 'Install / Add Game (.exe)',
      sub: 'Register game disc & auto-fetch HD cover, manual and trailer',
      iconPng: 'assets/maxmb/icons/theme/icon_newuser.png',
      action: () => openPs3AddGameModal()
    }
  ];
  return gameItems;
}

function updateXmbClock() {
  if (!els.xmbClock || !els.xmbDate) return;
  const now = new Date();
  const d = now.getDate();
  const m = now.getMonth() + 1;
  const hh = String(now.getHours());
  const mm = String(now.getMinutes()).padStart(2, '0');
  // MaXMB clock.js format: single-digit day/month + 24h time
  els.xmbDate.textContent = `${d}/${m}`;
  els.xmbClock.textContent = `${hh}:${mm}`;
  if (els.xmbClockHour && els.xmbClockMinute) {
    const mAngle = (now.getMinutes() + now.getSeconds() / 60) * 6;
    const hAngle = ((now.getHours() % 12) + now.getMinutes() / 60) * 30;
    els.xmbClockHour.setAttribute('transform', `rotate(${hAngle % 360} 20 20)`);
    els.xmbClockMinute.setAttribute('transform', `rotate(${mAngle % 360} 20 20)`);
  }
}

function makeXmbMaskIcon(url, extraClass = '') {
  const resolved = resolveXmbIconPath(url);
  const span = document.createElement('span');
  span.className = `sysicon${extraClass ? ` ${extraClass}` : ''}`;
  span.style.webkitMaskImage = `url("${resolved}")`;
  span.style.maskImage = `url("${resolved}")`;
  return span;
}

const xmbCatDomMap = new Map();
let xmbRenderedSignature = '';
let xmbItemDomMap = new Map();

function buildXmbCategoryEl(cat, onPick) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'cat fresh';
  const iconEl = makeXmbMaskIcon(cat.icon);
  const lbl = document.createElement('div');
  lbl.className = 'cat-label';
  lbl.textContent = cat.label;
  btn.append(iconEl, lbl);
  btn.addEventListener('click', onPick);
  requestAnimationFrame(() => requestAnimationFrame(() => btn.classList.remove('fresh')));
  return btn;
}

function buildXmbItemEl(item) {
  const row = document.createElement('button');
  row.type = 'button';
  row.className = 'item fresh';

  if (item.kind === 'user') {
    const img = document.createElement('img');
    img.className = 'item-avatar';
    img.src = item.art || item.fallbackArt;
    img.alt = '';
    row.appendChild(img);
    const diamond = document.createElement('div');
    diamond.className = 'user-diamond';
    if (!item.activeUser) diamond.classList.add('hidden');
    row.appendChild(diamond);
  } else if (item.art || item.fallbackArt) {
    const img = document.createElement('img');
    img.className = item.art ? 'item-art' : 'item-sys coloricon';
    img.src = item.art || item.fallbackArt;
    img.alt = '';
    row.appendChild(img);
  } else {
    row.appendChild(makeXmbMaskIcon(item.iconPng || 'assets/maxmb/icons/theme/icon_setting_item.png', 'item-sys'));
  }

  const label = document.createElement('div');
  label.className = `item-label${item.kind === 'game' ? ' il-game' : ''}`;
  const titleEl = document.createElement('div');
  titleEl.className = 'il-title';
  titleEl.textContent = item.title;
  label.appendChild(titleEl);

  const subEl = document.createElement('div');
  subEl.className = 'il-sub';
  subEl.textContent = item.sub || '';
  if (!item.sub) subEl.classList.add('hidden');
  label.appendChild(subEl);
  row.appendChild(label);

  const valEl = document.createElement('div');
  valEl.className = 'item-setval';
  valEl.textContent = item.setVal || '';
  if (!item.setVal) valEl.classList.add('hidden');
  row.appendChild(valEl);

  if (item.gameFmt) {
    const fmt = document.createElement('img');
    fmt.className = 'game-fmt';
    fmt.src = item.gameFmt;
    fmt.alt = '';
    row.appendChild(fmt);
  }

  requestAnimationFrame(() => requestAnimationFrame(() => row.classList.remove('fresh')));
  return row;
}

function renderXmb() {
  if (activeSettings().theme !== 'xmb') return;
  const profile = activeProfile();
  if (els.xmbAvatarImg) {
    const av = profile.avatar || 'assets/maxmb/icons/avatars/stock/person_blue.png';
    if (els.xmbAvatarImg.getAttribute('src') !== av) els.xmbAvatarImg.src = av;
  }
  if (els.xmbGameCount) {
    els.xmbGameCount.textContent = String(activeGames().length);
  }
  updateXmbClock();

  const w = window.innerWidth || 1280;
  const h = window.innerHeight || 720;
  const spineX = w * XMB_METRICS.spineX;

  const cats = getActiveXmbCategories();
  const catIdx = Math.max(0, Math.min(cats.length - 1, state.xmbCatIdx));
  state.xmbCatIdx = catIdx;
  const currentCat = cats[catIdx];

  // Persistent Category Nodes for buttery GPU transitions
  const catIdSet = new Set(cats.map((c) => c.id));
  for (const [id, el] of xmbCatDomMap.entries()) {
    if (!catIdSet.has(id)) {
      el.remove();
      xmbCatDomMap.delete(id);
    }
  }
  cats.forEach((cat, idx) => {
    let btn = xmbCatDomMap.get(cat.id);
    if (!btn) {
      btn = buildXmbCategoryEl(cat, () => {
        const curCats = getActiveXmbCategories();
        const nextIdx = curCats.findIndex((c) => c.id === cat.id);
        if (nextIdx >= 0 && nextIdx !== state.xmbCatIdx) {
          state.xmbCatIdx = nextIdx;
          playXmbSfx('cursor');
          renderXmb();
          syncXmbSelectionToStage();
        }
      });
      xmbCatDomMap.set(cat.id, btn);
      els.xmbCategories.appendChild(btn);
    }
    const d = idx - catIdx;
    const ad = Math.abs(d);
    const off = ad === 0 ? 0 : Math.sign(d) * (XMB_METRICS.catGapSel + (ad - 1) * XMB_METRICS.catGap) * w;
    btn.classList.toggle('sel', d === 0);
    btn.style.setProperty('--tx', `${spineX + off}px`);
    btn.style.setProperty('--ty', `${h * (d === 0 ? XMB_METRICS.catSelY : XMB_METRICS.catY)}px`);
    btn.style.opacity = d === 0 ? '1' : '0.78';
  });

  const items = getXmbItemsForCategory(currentCat.id);
  let itemIdx = state.xmbItemIdxs[catIdx] || 0;
  if (itemIdx >= items.length) itemIdx = Math.max(0, items.length - 1);
  state.xmbItemIdxs[catIdx] = itemIdx;

  // MaXMB _rowTops geometry
  const sy = h * XMB_METRICS.itemSpineY;
  const rowH = (it) => (it.kind === 'game' ? XMB_METRICS.gamePitch : XMB_METRICS.itemPitch) * h;
  const tops = new Array(items.length);
  if (items.length) {
    tops[itemIdx] = sy;
    const basePitch = XMB_METRICS.itemPitch * h;
    for (let j = itemIdx + 1; j < items.length; j++) {
      const r = rowH(items[j]);
      tops[j] =
        j === itemIdx + 1
          ? h * XMB_METRICS.itemBelowY + (r - basePitch) / 2
          : tops[j - 1] + (rowH(items[j - 1]) + r) / 2;
    }
    const firstAbove = h * XMB_METRICS.itemAboveY;
    for (let j = itemIdx - 1; j >= 0; j--) {
      const r = rowH(items[j]);
      tops[j] =
        j === itemIdx - 1
          ? firstAbove - (r - basePitch) / 2
          : tops[j + 1] - (rowH(items[j + 1]) + r) / 2;
    }
  }

  // Persistent Item Nodes within the active category for buttery GPU glide
  const signature = `${currentCat.id}:${items.map((it) => `${it.id}:${it.art || ''}:${it.fallbackArt || ''}:${it.gameFmt || ''}`).join('|')}`;
  if (signature !== xmbRenderedSignature) {
    xmbRenderedSignature = signature;
    els.xmbItems.innerHTML = '';
    xmbItemDomMap = new Map();
    items.forEach((item, idx) => {
      const row = buildXmbItemEl(item);
      row.addEventListener('click', () => {
        if ((state.xmbItemIdxs[state.xmbCatIdx] || 0) !== idx) {
          state.xmbItemIdxs[state.xmbCatIdx] = idx;
          playXmbSfx('cursor');
          renderXmb();
          syncXmbSelectionToStage();
        } else {
          playXmbSfx('enter');
          row._xmbAction?.();
        }
      });
      row.addEventListener('dblclick', () => {
        playXmbSfx('enter');
        row._xmbAction?.();
      });
      xmbItemDomMap.set(item.id, row);
      els.xmbItems.appendChild(row);
    });
  }

  items.forEach((item, idx) => {
    const row = xmbItemDomMap.get(item.id);
    if (!row) return;
    row._xmbAction = item.action;

    const isSel = idx === itemIdx;
    row.classList.toggle('sel', isSel);
    row.style.setProperty('--tx', `${spineX}px`);
    row.style.setProperty('--ty', `${tops[idx]}px`);
    row.style.opacity = isSel ? '1' : '0.55';
    row.style.zIndex = isSel ? '5' : '1';

    const titleEl = row.querySelector('.il-title');
    if (titleEl && titleEl.textContent !== item.title) titleEl.textContent = item.title;
    const subEl = row.querySelector('.il-sub');
    if (subEl) {
      subEl.textContent = item.sub || '';
      subEl.classList.toggle('hidden', !item.sub);
    }
    const valEl = row.querySelector('.item-setval');
    if (valEl) {
      valEl.textContent = item.setVal || '';
      valEl.classList.toggle('hidden', !item.setVal);
    }
    const diamond = row.querySelector('.user-diamond');
    if (diamond) diamond.classList.toggle('hidden', !item.activeUser);
  });

  // MaXMB game hover backdrop + Auto YouTube Trailer / Gameplay Background Video + PSN Cinfo Panel
  const selectedItem = items[itemIdx];
  const hasCustomWp = Boolean(String(activeSettings().xmbWallpaper || '').trim());

  if (els.xmbPsPlusIcon) {
    els.xmbPsPlusIcon.style.display = profile.psPlus !== false ? '' : 'none';
  }
  if (els.xmbInfobox) {
    const box = els.xmbInfobox.querySelector('.ib-box');
    if (box && profile.psnCardColor) {
      box.style.background = `linear-gradient(90deg, ${profile.psnCardColor}55 0%, rgba(0, 0, 0, 0.25) 100%)`;
    }
  }

  // PSN / Photo Cinfo Preview Card
  if (els.xmbCinfoPanel) {
    if (selectedItem?.cinfoImg) {
      if (els.xmbCinfoImg && els.xmbCinfoImg.getAttribute('src') !== selectedItem.cinfoImg) {
        els.xmbCinfoImg.src = selectedItem.cinfoImg;
      }
      if (els.xmbCinfoTitle) els.xmbCinfoTitle.textContent = selectedItem.cinfoTitle || selectedItem.title;
      if (els.xmbCinfoDesc) els.xmbCinfoDesc.textContent = selectedItem.cinfoDesc || selectedItem.sub || '';
      els.xmbCinfoPanel.classList.remove('hidden');
    } else {
      els.xmbCinfoPanel.classList.add('hidden');
    }
  }

  if (els.xmbGameBg) {
    const bgUrl = !hasCustomWp && (currentCat.id === 'game' || currentCat.id === 'video' || currentCat.id === 'photo') ? selectedItem?.bgArt : '';
    if (bgUrl) {
      els.xmbGameBg.style.backgroundImage = `url("${bgUrl}")`;
      els.xmbGameBg.classList.add('show');
    } else {
      els.xmbGameBg.classList.remove('show');
    }
  }

  // Hover Video Background: when hovering a game in PS3 XMB Game or Video column, transition to trailer/gameplay!
  if (!hasCustomWp && (currentCat.id === 'game' || currentCat.id === 'video') && selectedItem?.gameId) {
    const hoveredGame = activeGames().find((g) => g.id === selectedItem.gameId);
    scheduleXmbHoverVideo(hoveredGame);
  } else {
    stopXmbHoverVideo();
  }
}

function syncXmbSelectionToStage() {
  if (activeSettings().theme !== 'xmb') return;
  const cats = getActiveXmbCategories();
  const cat = cats[Math.max(0, Math.min(cats.length - 1, state.xmbCatIdx))];
  const items = getXmbItemsForCategory(cat.id);
  const activeItem = items[state.xmbItemIdxs[state.xmbCatIdx] || 0];
  if (activeItem?.gameId && activeItem.gameId !== state.selectedId) {
    state.selectedId = activeItem.gameId;
    renderDock();
  }
}

function stepXmbCategory(dx) {
  const cats = getActiveXmbCategories();
  if (!cats.length) return;
  state.xmbCatIdx = (state.xmbCatIdx + dx + cats.length) % cats.length;
  playXmbSfx('cursor');
  renderXmb();
  syncXmbSelectionToStage();
}

function stepXmbItem(dy) {
  const cats = getActiveXmbCategories();
  const cat = cats[Math.max(0, Math.min(cats.length - 1, state.xmbCatIdx))];
  const items = getXmbItemsForCategory(cat.id);
  if (!items.length) return;
  const cur = state.xmbItemIdxs[state.xmbCatIdx] || 0;
  state.xmbItemIdxs[state.xmbCatIdx] = (cur + dy + items.length) % items.length;
  playXmbSfx('cursor');
  renderXmb();
  syncXmbSelectionToStage();
}

function activateXmbItem() {
  const cats = getActiveXmbCategories();
  const cat = cats[Math.max(0, Math.min(cats.length - 1, state.xmbCatIdx))];
  const items = getXmbItemsForCategory(cat.id);
  const item = items[state.xmbItemIdxs[state.xmbCatIdx] || 0];
  if (item?.action) {
    playXmbSfx('enter');
    item.action();
  }
}

function render() {
  const profile = activeProfile();
  const settings = activeSettings();

  applyProfileThemeAndGraphics();
  renderProfileCardAndHud();

  const name = (settings.launcherName || '').trim();
  els.brandTitle.textContent = name || 'GLAUNCHER';
  document.title = name || 'GLauncher Alpha';

  const isXmb = settings.theme === 'xmb';
  els.xmbShell.classList.toggle('hidden', !isXmb);

  const visibleGames = getFilteredSortedGames();
  const xmbNeeds3d = Boolean(stage3d?.consoleSequence) || stage3d?.subMode === 'manual' || stage3d?.subMode === 'unwrap';

  if (isXmb && !xmbNeeds3d) {
    els.stage2dWrap.classList.add('hidden');
    els.emptyState.classList.add('hidden');
    stage3d?.stop();
  } else if (settings.renderMode === '2d' && !isXmb && stage3d?.subMode !== 'unwrap') {
    render2dView(visibleGames);
  } else {
    render3dView(visibleGames);
  }

  if (isXmb) {
    renderXmb();
  }

  renderDock();
  renderDrawer();
}

let activePs3BootHandle = null;

async function runConsoleLaunch(game, testOnly = false) {
  const isXmb = activeSettings().theme === 'xmb';
  if (!isXmb && activeSettings().renderMode === '2d') {
    activeSettings().renderMode = '3d';
    await persist();
    render();
  }

  const onInsertLaunch = async () => {
    if (testOnly || !game?.executable) {
      activePs3BootHandle?.finish();
      activePs3BootHandle = null;
      stage3d?.releaseConsoleWait?.();
      if (!testOnly) showToast('Console boot complete — link an .exe in Options to launch.');
      return;
    }

    const result = await api.launchGame(game.executable, game.title);
    if (!result.ok) {
      activePs3BootHandle?.finish();
      activePs3BootHandle = null;
      stage3d?.releaseConsoleWait?.();
      if (result.error === 'FILE_NOT_FOUND') {
        showToast('Executable not found on disk — update the .exe path in Options.');
        state.creatingNewGame = false;
        openOptionsDrawer('library');
      } else {
        showToast(`Could not launch: ${result.error}`);
      }
      return;
    }

    game.playCount = (game.playCount || 0) + 1;
    game.lastPlayed = new Date().toISOString();
    await persist();
    showToast(`Started ${game.title}`);

    // Unlock First Boot and Veteran Trophies!
    const tList = getGameTrophyTemplates(game);
    const bootT = tList.find((t) => t.id.endsWith('-boot'));
    if (bootT) unlockAchievement(bootT, true);
    if ((game.playCount || 0) >= 3) {
      const vetT = tList.find((t) => t.id.endsWith('-veteran'));
      if (vetT) unlockAchievement(vetT, true);
    }

    renderDock();
  };

  if (isXmb) {
    stopXmbHoverVideo();
    activePs3BootHandle = runPs3GameLaunchSplash({
      audio: xmbAudio,
      rootEl: els.ps3Intro,
      gameTitle: game?.title,
      bgTint: getXmbIntroTint(activeSettings().xmbBgColor),
      playSound: activeSettings().xmbSounds !== false,
      holdUntilRelease: true,
      onComplete: onInsertLaunch
    });
    return;
  }

  ensureStage3D();
  stage3d.playConsoleSequence(onInsertLaunch, (status) => setConsoleStatus(status), { holdUntilRelease: true });
}

async function launchSelectedGame(game) {
  if (!game) {
    startNewGameUnwrapFlow();
    return;
  }

  if (!game.executable) {
    showToast('Link an .exe in Games & .exe (or click "Use Notepad" to test)');
    state.creatingNewGame = false;
    openOptionsDrawer('library');
    setTimeout(() => els.fieldExec.focus(), 40);
    return;
  }

  await runConsoleLaunch(game, false);
}

function stepSelection(delta) {
  const list = getFilteredSortedGames();
  if (list.length === 0) return;
  const idx = list.findIndex((g) => g.id === state.selectedId);
  const nextIdx = (idx === -1 ? 0 : idx + delta + list.length) % list.length;
  state.selectedId = list[nextIdx].id;
  state.creatingNewGame = false;
  render();
}

function resetProfileForm() {
  state.editingProfileId = null;
  els.profileFormTitle.textContent = 'Create New Profile';
  els.profileNameInput.value = '';
  els.profileColorInput.value = '#a855f7';
  els.btnProfileSubmit.textContent = 'Create Profile';
  els.btnProfileCancelEdit.classList.add('hidden');
  els.profileCopyRow.classList.remove('hidden');
  els.profileCopyGames.checked = false;
}

async function autoFetchMetadataForTitle(title, silent = false) {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return null;
  if (!silent) showToast(`Searching auto data for "${cleanTitle}"...`);
  const res = await api.searchGameCover(cleanTitle);
  if (res?.ok) {
    if (!silent) showToast(`Auto data applied (${res.matchedTitle || cleanTitle})`);
    return res;
  }
  if (!silent) showToast('No online match — drag & drop your own cover image below!');
  return res;
}

async function fetchTrailerInBackground() {
  // Trailer support disabled
}

async function fetchManualInBackground(game) {
  if (!game?.title) return false;
  const res = await api.fetchOfficialManual(game.title);
  if (res?.ok && Array.isArray(res.pages) && res.pages.length >= 2) {
    game.manualPages = res.pages;
    await persist();
    if (state.selectedId === game.id && state.drawerOpen && state.activeTab === 'library') {
      els.fieldManualStatus.value = `${res.pages.length} official scanned pages ready`;
    }
    showToast(`Official manual loaded (${res.pages.length} pages)`);
    return true;
  }
  return false;
}

async function openSelectedManual() {
  const game = activeGames().find((g) => g.id === state.selectedId);
  if (!game) return;
  if (activeSettings().theme !== 'xmb' && activeSettings().renderMode === '2d') {
    activeSettings().renderMode = '3d';
    await persist();
    render();
  }
  ensureStage3D();
  if (activeSettings().theme === 'xmb') {
    document.body.classList.add('xmb-3d-active', 'xmb-panel-open');
    els.stage3dWrap.classList.remove('hidden');
  }
  stage3d.start();
  stage3d.resize();
  if (!Array.isArray(game.manualPages) || game.manualPages.length < 2) {
    showToast(`Checking official manual for "${game.title}"...`);
    await fetchManualInBackground(game);
  }
  stage3d.currentGame = game;
  await stage3d.openManualMode();
  const manT = getGameTrophyTemplates(game).find((t) => t.id.endsWith('-manual'));
  if (manT) unlockAchievement(manT, true);
  syncStageOverlays();
}

// =========================================================
// KEY FEATURE: SEALED PLASTIC UNWRAP -> RENAME -> AUTO DATA
// =========================================================
function openPs3AddGameModal(prefillExec = '', prefillTitle = '') {
  if (!els.ps3AddGameModal) return;
  closeOptionsDrawer();
  if (els.ps3AddTitleInput) els.ps3AddTitleInput.value = prefillTitle || '';
  if (els.ps3AddExecInput) els.ps3AddExecInput.value = prefillExec || '';
  if (els.ps3AddPlatformInput) els.ps3AddPlatformInput.value = 'PS3';
  els.ps3AddProgressWrap?.classList.add('hidden');
  if (els.ps3AddProgressFill) els.ps3AddProgressFill.style.width = '0%';
  if (els.btnPs3AddConfirm) {
    els.btnPs3AddConfirm.disabled = false;
    els.btnPs3AddConfirm.textContent = 'Install to XMB';
  }
  els.ps3AddGameModal.classList.remove('hidden');
  playXmbSfx('enter');
  setTimeout(() => els.ps3AddTitleInput?.focus(), 40);
}

async function startNewGameUnwrapFlow(prefillExec = '', prefillTitle = '') {
  if (activeSettings().theme === 'xmb') {
    openPs3AddGameModal(prefillExec, prefillTitle);
    return;
  }
  state.pendingUnwrapExec = prefillExec;
  state.pendingUnwrapTitle = prefillTitle;

  if (activeSettings().theme !== 'xmb' && activeSettings().renderMode === '2d') {
    activeSettings().renderMode = '3d';
    await persist();
  }
  closeOptionsDrawer();

  els.stage2dWrap.classList.add('hidden');
  els.stage3dWrap.classList.remove('hidden');
  if (activeSettings().theme === 'xmb') {
    document.body.classList.add('xmb-3d-active', 'xmb-panel-open');
  }
  ensureStage3D();
  stage3d.start();
  stage3d.resize();
  els.unwrapFill.style.width = '0%';

  await stage3d.startUnwrapMode(() => {
    // Plastic wrap peeled off -> immediately prompt user to name it!
    els.unwrapBar.classList.add('hidden');
    els.renameTitleInput.value = state.pendingUnwrapTitle || '';
    els.renameExecInput.value = state.pendingUnwrapExec || '';
    els.renameModal.classList.remove('hidden');
    setTimeout(() => els.renameTitleInput.focus(), 40);
  });

  syncStageOverlays();
}

function cancelUnwrapFlow() {
  state.pendingUnwrapExec = '';
  state.pendingUnwrapTitle = '';
  state.last3dKey = '';
  if (stage3d) stage3d.subMode = 'showcase';
  render();
}

function openTrailerModal(game) {
  if (!game?.trailer) {
    showToast('No trailer downloaded yet — fetch one in Games & .exe');
    return;
  }
  const trT = getGameTrophyTemplates(game).find((t) => t.id.endsWith('-trailer'));
  if (trT) unlockAchievement(trT, true);
  els.trailerModalTitle.textContent = `${game.title} — Official Trailer`;
  els.trailerVideoEl.src = game.trailer;
  els.trailerModal.classList.remove('hidden');
  els.trailerVideoEl.play().catch(() => {});
}

function closeTrailerModal() {
  els.trailerVideoEl.pause();
  els.trailerVideoEl.removeAttribute('src');
  els.trailerModal.classList.add('hidden');
}

function cleanExeTitle(rawName) {
  const base = String(rawName || '')
    .replace(/\.[^/.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim();
  if (/^roblox\s*player\s*(beta|launcher)?$/i.test(base)) {
    return 'Roblox';
  }
  return base;
}

async function applyDroppedCoverImage(filePath) {
  const url = await api.importArtworkFile(filePath);
  if (!url) {
    showToast('Unsupported image file — use PNG, JPG, or WEBP');
    return;
  }
  els.fieldArtwork.value = url;
  if (!state.creatingNewGame && els.fieldId.value) {
    const game = activeGames().find((g) => g.id === els.fieldId.value);
    if (game) {
      game.artwork = url;
      state.last3dKey = '';
      await persist();
      render();
      showToast('Custom cover formatted & applied to both Case and CD!');
      return;
    }
  }
  const selected = activeGames().find((g) => g.id === state.selectedId);
  if (selected && !state.drawerOpen) {
    selected.artwork = url;
    state.last3dKey = '';
    await persist();
    render();
    showToast(`Applied custom cover to "${selected.title}" Case & CD!`);
  } else {
    showToast('Cover loaded — click Save Game to apply to Case & CD');
  }
}

// =========================================================
// ANIMATED & POLISHED FIRST-RUN ONBOARDING TUTORIAL
// =========================================================
const TUTORIAL_STEPS = [
  {
    icon: '💿',
    icon2: '🌌',
    title: 'Welcome to Your Next-Gen Physical & PS3 XMB Launcher',
    desc: 'Experience two flagship worlds in one desktop launcher: the revamped Obsidian Glass 3D Physical Media Stage and the authentic Sony PS3 Firmware 4.93 + MaXMB Cross-Media Bar.',
    box1Title: 'Obsidian Glass 3D Stage',
    box1Desc: 'Floating navigation rail, hero glass HUD, animated profile cards, and 360° 3D Cases & Discs.',
    box2Title: 'Authentic PS3 XMB (4.93)',
    box2Desc: 'Powered by real PS3 lines.qrc, earth.qrc, canyon.qrc shaders, Rodin Latin fonts, 90+ PSN avatars & coldboot intro.'
  },
  {
    icon: '📦',
    icon2: '📖',
    title: 'Hold-to-Unwrap New Games & 3D Instruction Manuals',
    desc: 'Adding a brand-new game feels like opening a sealed physical copy. Peel off the tear-strip plastic wrap once when adding, type the title, and the launcher automatically pulls HD cover art, back art, Archive.org scanned manuals, and YouTube trailers.',
    box1Title: '3D Case, Disc & Console Boot',
    box1Desc: 'Press X / Square to open the 3D case, E to eject the disc, F to flip the mirror side, or Play for a 3D console disc-insert boot.',
    box2Title: 'Domino Shelf & CD Spindle',
    box2Desc: 'Switch between 3D Hero, Domino Case Shelf, CD Spindle Tower, and 2D Grid views anytime.'
  },
  {
    icon: '🎬',
    icon2: '🌊',
    title: 'PS3 XMB Hover Trailers & In-Launcher Media Folders',
    desc: 'Hovering a game in the PS3 XMB Game column transitions the background to its YouTube trailer/gameplay! Plus, Photo, Music, and Video connect directly to your device folders and ps3_pic, ps3_video & ps3_audio to play everything right inside the launcher.',
    box1Title: '8 Full XMB Columns & Icon Packs',
    box1Desc: 'Explore Users, Settings, Photo, Music, Game, Video, PlayStation®Network (What’s New / Home / Store) & Friends.',
    box2Title: 'Safe Asset Redirection',
    box2Desc: 'All PFPs, GIFs, MP4s & audio you customize with are copied into ps3_pic, ps3_video, and ps3_audio so deleting originals never breaks your setup.'
  },
  {
    icon: '✨',
    icon2: '🎭',
    title: 'Animated Profile Card, Super Roles & Gradient Icons',
    desc: 'Click your top-left profile pill to open your animated Profile Card, complete with shifting banners, live status, bio, trophy XP bar, and animated Super Roles & Mythic Roles.',
    box1Title: 'Glowing VFX & Gradient Icons',
    box1Desc: 'Choose Prismatic Pulse, Cyber Neon, Obsidian Void Flame, or PS3 Gold VFX, plus 12 gradient profile icons.',
    box2Title: '90+ Official PS3 & PSN Avatars',
    box2Desc: 'Open the built-in Avatar Gallery to pick from 27 PS3 Firmware 4.93 avatars, 64 MaXMB PSN avatars, or your own PNG/GIF.'
  },
  {
    icon: '🏆',
    icon2: '🔔',
    title: 'In-Game Trophies, Achievements & Notification Center',
    desc: 'Every game in your library automatically tracks 6 trophies (Bronze, Silver, Gold & Platinum) for unwrapping, booting, reading manuals, watching trailers, and mastering games.',
    box1Title: 'Authentic PS3 & Modern Toasts',
    box1Desc: 'In PS3 XMB mode, earn authentic top-right PS3 Trophy toasts with the crystal chime; in Obsidian mode, get glowing achievement cards.',
    box2Title: 'Trophy Drawer & History',
    box2Desc: 'Click the 🔔 bell in the titlebar or 🏆 Trophies in the rail to inspect your Trophy Level, counts, and notification feed.'
  },
  {
    icon: '🎮',
    icon2: '⚡',
    title: '3rd-Party PS4 & Controller Home Button Quick Panel',
    desc: 'Navigate everything with your controller: D-Pad moves across XMB and menus, Left/Right sticks orbit 3D models, and pressing the PS / Home button (or Touchpad / Share+Options / Insert key) opens the Quick Power & Options Overlay even mid-game!',
    box1Title: '3rd-Party PS4 Home Button Support',
    box1Desc: 'Automatically detects XInput Guide (0x0400) AND DirectInput PS4 Home (Button 13 / 14 / 17) across all controller drivers.',
    box2Title: '1-Click Custom Home Button Bind',
    box2Desc: 'Open Media & System -> "Detect / Bind Home Button" to bind any button on your 3rd-party controller with a single press.'
  }
];

function openTutorialModal(startStep = 0) {
  state.tutorialStep = Math.max(0, Math.min(TUTORIAL_STEPS.length - 1, startStep));
  renderTutorialStep();
  els.tutorialModal?.classList.remove('hidden');
}

async function closeTutorialModal(markCompleted = true) {
  els.tutorialModal?.classList.add('hidden');
  if (markCompleted && !state.tutorialCompleted) {
    state.tutorialCompleted = true;
    await persist();
    unlockAchievement(GLOBAL_TROPHIES[2], true);
  }
}

function renderTutorialStep() {
  if (!els.tutorialStage) return;
  const idx = state.tutorialStep;
  const step = TUTORIAL_STEPS[idx];
  if (els.tutorialStepPill) {
    els.tutorialStepPill.textContent = `STEP ${idx + 1} OF ${TUTORIAL_STEPS.length}`;
  }
  els.tutorialStage.innerHTML = `
    <div class="tut-visual-banner">
      <div class="tut-anim-icon">${step.icon}</div>
      <div class="tut-anim-icon" style="animation-delay:0.4s">${step.icon2}</div>
    </div>
    <h2>${step.title}</h2>
    <p>${step.desc}</p>
    <div class="tut-feature-grid">
      <div class="tut-feature-box">
        <strong>${step.box1Title}</strong>
        <span>${step.box1Desc}</span>
      </div>
      <div class="tut-feature-box">
        <strong>${step.box2Title}</strong>
        <span>${step.box2Desc}</span>
      </div>
    </div>
  `;

  if (els.tutorialDots) {
    els.tutorialDots.innerHTML = '';
    TUTORIAL_STEPS.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `tut-dot${i === idx ? ' active' : ''}`;
      dot.addEventListener('click', () => {
        state.tutorialStep = i;
        renderTutorialStep();
      });
      els.tutorialDots.appendChild(dot);
    });
  }

  if (els.btnTutorialPrev) {
    els.btnTutorialPrev.disabled = idx === 0;
  }
  if (els.btnTutorialNext) {
    els.btnTutorialNext.textContent = idx === TUTORIAL_STEPS.length - 1 ? '✦ Finish & Start Playing' : 'Next →';
  }
}

// =========================================================
// IN-LAUNCHER PS3 MEDIA PLAYER (PHOTO, VIDEO, MUSIC) + PS3 FOLDERS
// =========================================================
let photoViewerList = [];
let photoViewerIdx = 0;
let musicPlaylist = [];
let musicTrackIdx = 0;
let currentVideoItem = null;

async function refreshDeviceMedia() {
  try {
    state.deviceMedia = await api.scanDeviceMedia();
  } catch {
    state.deviceMedia = { pictures: { ps3: [], device: [] }, videos: { ps3: [], device: [] }, audio: { ps3: [], device: [] } };
  }
}

async function updateMediaFolderStatusUI() {
  if (!els.mediaFoldersStatusText) return;
  try {
    const st = await api.getMediaFolderStatus();
    const ready = st.ps3PicExists && st.ps3VideoExists && st.ps3AudioExists;
    els.mediaFoldersStatusText.textContent = ready
      ? `Active in: ${st.launcherMainDir} (ps3_pic, ps3_video, ps3_audio) + Device Pictures/Videos/Music`
      : `Device Pictures/Videos/Music connected • Click any folder button below to create ps3_pic / ps3_video / ps3_audio`;
  } catch {}
}

async function checkPs3MediaFolderPrompt() {
  if (activeSettings().ps3FoldersPrompted) return;
  try {
    const st = await api.getMediaFolderStatus();
    if (!st.ps3PicExists || !st.ps3VideoExists || !st.ps3AudioExists) {
      els.xmbMediaFolderPrompt?.classList.remove('hidden');
    }
  } catch {}
}

function openXmbPhotoViewer(list, idx) {
  if (!list?.length) return;
  photoViewerList = list;
  photoViewerIdx = Math.max(0, Math.min(list.length - 1, idx));
  const item = photoViewerList[photoViewerIdx];
  if (els.xmbPhotoTitle) els.xmbPhotoTitle.textContent = `${item.title} (${photoViewerIdx + 1}/${photoViewerList.length})`;
  if (els.xmbPhotoImg) els.xmbPhotoImg.src = item.url;
  els.xmbPhotoViewer?.classList.remove('hidden');
}

function closeXmbPhotoViewer() {
  els.xmbPhotoViewer?.classList.add('hidden');
}

function openXmbVideoPlayer(item) {
  if (!item?.url) return;
  currentVideoItem = item;
  stopXmbHoverVideo();
  if (els.xmbVideoTitle) els.xmbVideoTitle.textContent = item.title || 'Video Player';
  if (els.xmbVideoPlayerEl) {
    els.xmbVideoPlayerEl.src = item.url;
    els.xmbVideoPlayerEl.play().catch(() => {});
  }
  els.xmbVideoPlayerModal?.classList.remove('hidden');
}

function closeXmbVideoPlayer() {
  if (els.xmbVideoPlayerEl) {
    els.xmbVideoPlayerEl.pause();
    els.xmbVideoPlayerEl.removeAttribute('src');
  }
  els.xmbVideoPlayerModal?.classList.add('hidden');
}

let musicDismissed = false;

function syncMusicBarsUi() {
  const hasTrack = Boolean(els.xmbAudioPlayerEl?.getAttribute('src')) && !musicDismissed;
  const isXmb = activeSettings().theme === 'xmb';
  els.xmbMusicBar?.classList.toggle('hidden', !hasTrack || !isXmb);
  els.obsidianMusicPill?.classList.toggle('hidden', !hasTrack || isXmb);

  const track = musicPlaylist[musicTrackIdx];
  if (track) {
    if (els.xmbMusicTitle) els.xmbMusicTitle.textContent = track.title || 'Track';
    if (els.obsMusicTitle) els.obsMusicTitle.textContent = track.title || 'Track';
    if (els.obsMusicSub) {
      els.obsMusicSub.textContent = [track.artist, track.album].filter(Boolean).join(' • ') || track.source || 'Now Playing';
    }
  }
  const label = els.xmbAudioPlayerEl?.paused ? 'Play' : 'Pause';
  if (els.btnXmbMusicToggle) els.btnXmbMusicToggle.textContent = label;
  if (els.btnObsMusicToggle) els.btnObsMusicToggle.textContent = els.xmbAudioPlayerEl?.paused ? '▶' : '⏸';
}

function playXmbMusicTrack(list, idx) {
  if (!list?.length) return;
  musicDismissed = false;
  musicPlaylist = list;
  musicTrackIdx = ((idx % list.length) + list.length) % list.length;
  const track = musicPlaylist[musicTrackIdx];
  if (els.xmbAudioPlayerEl) {
    els.xmbAudioPlayerEl.src = track.url;
    els.xmbAudioPlayerEl.play().catch(() => {});
  }
  syncMusicBarsUi();
}

function toggleMusicPlayPause() {
  if (!els.xmbAudioPlayerEl) return;
  if (els.xmbAudioPlayerEl.paused) {
    els.xmbAudioPlayerEl.play().catch(() => {});
  } else {
    els.xmbAudioPlayerEl.pause();
  }
  syncMusicBarsUi();
}

function closeMusicBars() {
  musicDismissed = true;
  els.xmbAudioPlayerEl?.pause();
  els.xmbAudioPlayerEl?.removeAttribute('src');
  syncMusicBarsUi();
}

function renderObsidianMediaHub() {
  if (!els.obsidianMediaGrid) return;
  const tab = state.obsidianMediaTab || 'music';
  els.obsMediaTabs?.forEach((t) => {
    t.classList.toggle('active', t.dataset.obsMediaTab === tab);
  });

  const media = state.deviceMedia || { photos: {}, video: {}, audio: {} };
  const grid = els.obsidianMediaGrid;
  grid.innerHTML = '';

  const makeCard = ({ icon, thumbUrl, title, sub, onClick }) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'obs-media-card';
    const mediaBox = document.createElement('div');
    mediaBox.className = 'obs-media-thumb';
    if (thumbUrl) {
      const img = document.createElement('img');
      img.src = thumbUrl;
      img.alt = title;
      img.loading = 'lazy';
      mediaBox.appendChild(img);
    } else {
      const sp = document.createElement('span');
      sp.className = 'obs-media-icon';
      sp.textContent = icon || '🎵';
      mediaBox.appendChild(sp);
    }
    const info = document.createElement('div');
    info.className = 'obs-media-info';
    const tEl = document.createElement('div');
    tEl.className = 'obs-media-title';
    tEl.textContent = title;
    const sEl = document.createElement('div');
    sEl.className = 'obs-media-sub';
    sEl.textContent = sub || '';
    info.appendChild(tEl);
    info.appendChild(sEl);
    card.appendChild(mediaBox);
    card.appendChild(info);
    card.addEventListener('click', onClick);
    return card;
  };

  if (tab === 'music') {
    const tracks = [
      ...(media.audio?.ps3 || []).map((f) => ({ ...f, source: 'ps3_audio' })),
      ...(media.audio?.device || []).map((f) => ({ ...f, source: 'Device Music' }))
    ];
    const albumMap = new Map();
    const singles = [];
    for (const t of tracks) {
      const alb = String(t.album || '').trim();
      if (alb) {
        if (!albumMap.has(alb)) albumMap.set(alb, []);
        albumMap.get(alb).push(t);
      } else {
        singles.push(t);
      }
    }

    if (state.obsidianOpenAlbum && albumMap.has(state.obsidianOpenAlbum)) {
      const albTracks = albumMap.get(state.obsidianOpenAlbum);
      grid.appendChild(
        makeCard({
          icon: '◀',
          title: `Close Album: ${state.obsidianOpenAlbum}`,
          sub: `${albTracks.length} ${albTracks.length === 1 ? 'song' : 'songs'} • Back to Albums`,
          onClick: () => {
            state.obsidianOpenAlbum = null;
            renderObsidianMediaHub();
          }
        })
      );
      albTracks.forEach((f, idx) => {
        grid.appendChild(
          makeCard({
            icon: '🎵',
            title: f.title,
            sub: `${f.artist ? `${f.artist} • ` : ''}${state.obsidianOpenAlbum}`,
            onClick: () => playXmbMusicTrack(albTracks, idx)
          })
        );
      });
      return;
    }

    grid.appendChild(
      makeCard({
        icon: '➕',
        title: 'Import Audio to ps3_audio',
        sub: 'Copy MP3 / WAV / OGG / FLAC into launcher',
        onClick: async () => {
          const picked = await api.pickAudioFile();
          if (picked) {
            await refreshDeviceMedia();
            renderObsidianMediaHub();
            showToast('Audio saved to ps3_audio!');
          }
        }
      })
    );

    for (const [albName, albTracks] of albumMap.entries()) {
      const firstArtist = albTracks.find((t) => t.artist)?.artist || '';
      grid.appendChild(
        makeCard({
          icon: '📁',
          title: albName,
          sub: `Album • ${albTracks.length} ${albTracks.length === 1 ? 'song' : 'songs'}${firstArtist ? ` • ${firstArtist}` : ''}`,
          onClick: () => {
            state.obsidianOpenAlbum = albName;
            renderObsidianMediaHub();
          }
        })
      );
    }

    singles.forEach((f, idx) => {
      grid.appendChild(
        makeCard({
          icon: '🎵',
          title: f.title,
          sub: `${f.artist ? `${f.artist} • ` : ''}${f.source}`,
          onClick: () => playXmbMusicTrack(singles, idx)
        })
      );
    });
  } else if (tab === 'video') {
    const videos = [
      ...(media.video?.ps3 || []).map((f) => ({ ...f, source: 'ps3_video' })),
      ...(media.video?.device || []).map((f) => ({ ...f, source: 'Device Videos' }))
    ];
    grid.appendChild(
      makeCard({
        icon: '📁',
        title: 'Open ps3_video Folder',
        sub: 'Drop MP4 / WebM / MKV videos here',
        onClick: () => api.openMediaFolder('video')
      })
    );
    videos.forEach((f) => {
      grid.appendChild(
        makeCard({
          icon: '🎬',
          title: f.title,
          sub: f.source,
          onClick: () => openXmbVideoPlayer(f)
        })
      );
    });
  } else {
    const photos = [
      ...(media.photos?.ps3 || []).map((f) => ({ ...f, source: 'ps3_pic' })),
      ...(media.photos?.device || []).map((f) => ({ ...f, source: 'Device Pictures' }))
    ];
    grid.appendChild(
      makeCard({
        icon: '📁',
        title: 'Open ps3_pic Folder',
        sub: 'Saved avatars, covers & wallpapers',
        onClick: () => api.openMediaFolder('photos')
      })
    );
    photos.forEach((f, idx) => {
      grid.appendChild(
        makeCard({
          thumbUrl: f.url,
          title: f.title,
          sub: f.source,
          onClick: () => openXmbPhotoViewer(photos, idx)
        })
      );
    });
  }
}

function bindEvents() {
  els.btnFullscreen.addEventListener('click', () => api.toggleFullscreen());
  els.btnMin.addEventListener('click', () => api.minimize());
  els.btnMax.addEventListener('click', () => api.maximize());
  els.btnClose.addEventListener('click', () => api.close());

  // Titlebar Tutorial & Notifications buttons
  els.btnTitlebarTutorial?.addEventListener('click', () => openTutorialModal(0));
  els.btnTitlebarNotifs?.addEventListener('click', () => {
    if (state.drawerOpen && state.activeTab === 'trophies') closeOptionsDrawer();
    else openOptionsDrawer('trophies');
  });

  // Forefront Corner Profile Pill toggles Animated Profile Popover Card (or double-click opens Full-Screen Studio)
  els.btnForefrontProfile.addEventListener('click', (e) => {
    e.stopPropagation();
    els.profileCardPopover?.classList.toggle('hidden');
    renderProfileCardAndHud();
  });
  els.btnForefrontProfile.addEventListener('dblclick', () => {
    els.profileCardPopover?.classList.add('hidden');
    openOptionsDrawer('profiles');
  });
  els.btnEditProfileCard?.addEventListener('click', () => {
    els.profileCardPopover?.classList.add('hidden');
    openOptionsDrawer('profiles');
  });
  window.addEventListener('pointerdown', (e) => {
    if (
      els.profileCardPopover &&
      !els.profileCardPopover.classList.contains('hidden') &&
      !els.profileCardPopover.contains(e.target) &&
      !els.btnForefrontProfile.contains(e.target)
    ) {
      els.profileCardPopover.classList.add('hidden');
      renderProfileCardAndHud();
    }
  });

  // PS3 XMB Infobox click -> opens PSN Profile customization
  els.xmbInfobox?.addEventListener('click', () => openOptionsDrawer('profiles'));

  // In-Launcher PS3 Media Player & Folder Prompt events
  els.btnXmbPhotoPrev?.addEventListener('click', () => {
    if (photoViewerList.length) openXmbPhotoViewer(photoViewerList, (photoViewerIdx - 1 + photoViewerList.length) % photoViewerList.length);
  });
  els.btnXmbPhotoNext?.addEventListener('click', () => {
    if (photoViewerList.length) openXmbPhotoViewer(photoViewerList, (photoViewerIdx + 1) % photoViewerList.length);
  });
  els.btnXmbPhotoSetBg?.addEventListener('click', async () => {
    const item = photoViewerList[photoViewerIdx];
    if (!item?.url) return;
    activeSettings().xmbWallpaper = item.url;
    await persist();
    render();
    showToast('Set photo as PS3 XMB Wallpaper!');
  });
  els.btnXmbPhotoSetPfp?.addEventListener('click', async () => {
    const item = photoViewerList[photoViewerIdx];
    if (!item?.url) return;
    activeProfile().avatar = item.url;
    await persist();
    render();
    showToast('Set photo as Profile Avatar!');
  });
  els.btnXmbPhotoClose?.addEventListener('click', closeXmbPhotoViewer);

  els.btnXmbVideoSetBg?.addEventListener('click', async () => {
    if (!currentVideoItem?.url) return;
    activeSettings().xmbWallpaper = currentVideoItem.url;
    await persist();
    render();
    showToast('Set video as PS3 XMB Background!');
  });
  els.btnXmbVideoClose?.addEventListener('click', closeXmbVideoPlayer);

  els.btnXmbMusicPrev?.addEventListener('click', () => playXmbMusicTrack(musicPlaylist, musicTrackIdx - 1));
  els.btnXmbMusicNext?.addEventListener('click', () => playXmbMusicTrack(musicPlaylist, musicTrackIdx + 1));
  els.btnXmbMusicToggle?.addEventListener('click', toggleMusicPlayPause);
  els.btnXmbMusicClose?.addEventListener('click', closeMusicBars);

  els.btnObsMusicPrev?.addEventListener('click', () => playXmbMusicTrack(musicPlaylist, musicTrackIdx - 1));
  els.btnObsMusicNext?.addEventListener('click', () => playXmbMusicTrack(musicPlaylist, musicTrackIdx + 1));
  els.btnObsMusicToggle?.addEventListener('click', toggleMusicPlayPause);
  els.btnObsMusicClose?.addEventListener('click', closeMusicBars);

  els.obsMediaTabs?.forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      state.obsidianMediaTab = tabBtn.dataset.obsMediaTab || 'music';
      state.obsidianOpenAlbum = null;
      renderObsidianMediaHub();
    });
  });
  els.btnCloseObsidianMedia?.addEventListener('click', () => {
    els.obsidianMediaHub?.classList.add('hidden');
  });

  els.xmbAudioPlayerEl?.addEventListener('timeupdate', () => {
    if (!els.xmbMusicTime || !els.xmbAudioPlayerEl) return;
    const fmt = (s) => {
      if (!Number.isFinite(s)) return '0:00';
      const m = Math.floor(s / 60);
      const sec = String(Math.floor(s % 60)).padStart(2, '0');
      return `${m}:${sec}`;
    };
    els.xmbMusicTime.textContent = `${fmt(els.xmbAudioPlayerEl.currentTime)} / ${fmt(els.xmbAudioPlayerEl.duration)}`;
  });
  els.xmbAudioPlayerEl?.addEventListener('ended', () => {
    if (musicPlaylist.length > 1) playXmbMusicTrack(musicPlaylist, musicTrackIdx + 1);
    else syncMusicBarsUi();
  });

  els.btnCreatePs3FoldersPrompt?.addEventListener('click', async () => {
    await api.createPs3MediaFolders();
    activeSettings().ps3FoldersPrompted = true;
    await persist();
    els.xmbMediaFolderPrompt?.classList.add('hidden');
    await refreshDeviceMedia();
    renderXmb();
    showToast('Created ps3_pic, ps3_video & ps3_audio inside launcher folder!');
  });
  els.btnDismissPs3FoldersPrompt?.addEventListener('click', async () => {
    activeSettings().ps3FoldersPrompted = true;
    await persist();
    els.xmbMediaFolderPrompt?.classList.add('hidden');
  });

  // Left Floating Navigation Rail
  els.railBtns?.forEach((btn) => {
    btn.addEventListener('click', async () => {
      const r = btn.dataset.rail;
      if (r === 'stage') {
        activeSettings().theme = 'obsidian';
        activeSettings().renderMode = '3d';
        state.last3dKey = '';
        closeOptionsDrawer();
        await persist();
        render();
      } else if (r === 'shelf') {
        activeSettings().theme = 'obsidian';
        activeSettings().renderMode = activeSettings().renderMode === 'shelf3d' ? '2d' : 'shelf3d';
        state.last3dKey = '';
        closeOptionsDrawer();
        await persist();
        render();
        showToast(activeSettings().renderMode === 'shelf3d' ? '3D Domino / Spindle Shelf' : '2D Grid Shelf');
      } else if (r === 'xmb') {
        activeSettings().theme = 'xmb';
        activeSettings().backdropMode = 'xmb-wave';
        state.last3dKey = '';
        closeOptionsDrawer();
        await persist();
        await refreshDeviceMedia();
        render();
        unlockAchievement(GLOBAL_TROPHIES[0], true);
        triggerPs3Intro();
        checkPs3MediaFolderPrompt();
      } else if (r === 'media') {
        if (els.obsidianMediaHub) {
          const opening = els.obsidianMediaHub.classList.contains('hidden');
          els.obsidianMediaHub.classList.toggle('hidden', !opening);
          if (opening) {
            await refreshDeviceMedia();
            renderObsidianMediaHub();
          }
        }
      } else if (r === 'trophies') {
        if (state.drawerOpen && state.activeTab === 'trophies') closeOptionsDrawer();
        else openOptionsDrawer('trophies');
      } else if (r === 'profile') {
        if (state.drawerOpen && state.activeTab === 'profiles') closeOptionsDrawer();
        else openOptionsDrawer('profiles');
      } else if (r === 'add') {
        startNewGameUnwrapFlow();
      } else if (r === 'refresh') {
        refreshLauncherView();
      }
    });
  });

  async function refreshLauncherView() {
    state.launching = false;
    state.last3dKey = '';
    xmbAutoFetchSet.clear();

    if (stage3d && stage3d.subMode !== 'manual' && stage3d.subMode !== 'unwrap') {
      stage3d.subMode = null;
    }

    applyProfileThemeAndGraphics();
    try { backdrop?.resize?.(); } catch {}

    if (activeSettings().theme === 'xmb') {
      try { await loadDeviceMediaForXmb(true); } catch {}
      renderXmb();
    } else if (stage3d) {
      try {
        stage3d.resize?.();
        stage3d.start?.();
      } catch {}
    }

    render();
    syncStageOverlays();
    showToast('Refreshed theme & stage');
  }

  els.btnXmbRefresh?.addEventListener('click', () => refreshLauncherView());
  els.btnDrawerRefresh?.addEventListener('click', () => refreshLauncherView());
  window.addEventListener('keydown', (e) => {
    if (e.key === 'F5' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r')) {
      e.preventDefault();
      refreshLauncherView();
    }
  });

  // Hero Game HUD quick chips
  els.btnHudFlipOrOpen?.addEventListener('click', () => {
    if (activeSettings().viewMode === 'case') stage3d?.toggleCaseOpen();
    else stage3d?.flipDisc();
    syncStageOverlays();
  });
  els.btnHudManual?.addEventListener('click', () => openSelectedManual());

  // Quick Theme buttons in Display tab
  els.btnQuickThemeObsidian?.addEventListener('click', async () => {
    activeSettings().theme = 'obsidian';
    if (activeSettings().backdropMode === 'xmb-wave') activeSettings().backdropMode = 'aurora';
    state.last3dKey = '';
    await persist();
    render();
  });
  els.btnQuickThemeXmb?.addEventListener('click', async () => {
    activeSettings().theme = 'xmb';
    activeSettings().backdropMode = 'xmb-wave';
    state.last3dKey = '';
    closeOptionsDrawer();
    await persist();
    render();
    unlockAchievement(GLOBAL_TROPHIES[0], true);
    triggerPs3Intro();
  });

  els.btnToggleOptions.addEventListener('click', () => {
    state.drawerOpen ? closeOptionsDrawer() : openOptionsDrawer();
  });
  els.btnCloseDrawer.addEventListener('click', closeOptionsDrawer);

  els.selTabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.activeTab = btn.dataset.tab;
      renderDrawer();
    });
  });

  // Unwrap & Manual Overlays
  els.btnCancelUnwrap.addEventListener('click', cancelUnwrapFlow);
  els.btnManualPrev.addEventListener('click', () => {
    stage3d?.flipManualPage(-1);
    syncStageOverlays();
  });
  els.btnManualNext.addEventListener('click', () => {
    stage3d?.flipManualPage(1);
    syncStageOverlays();
  });
  els.btnManualClose.addEventListener('click', () => {
    state.last3dKey = '';
    render();
  });

  // Rename Modal after Unwrap
  const dismissRename = () => {
    els.renameModal.classList.add('hidden');
    cancelUnwrapFlow();
  };
  els.closeRenameModal.addEventListener('click', dismissRename);
  els.btnRenameCancel.addEventListener('click', dismissRename);
  els.btnRenameBrowseExec.addEventListener('click', async () => {
    const picked = await api.pickGameFile();
    if (!picked) return;
    els.renameExecInput.value = picked.filePath;
    if (!els.renameTitleInput.value.trim()) {
      els.renameTitleInput.value = cleanExeTitle(picked.suggestedTitle);
    }
  });

  async function retryMetadataInBackground(game) {
    if (!game?.title) return;
    try {
      const meta = await autoFetchMetadataForTitle(game.title, true);
      if (!meta?.ok) return;
      let changed = false;
      if (meta.artwork && (!game.artwork || game.artwork.includes('exe-icon-'))) {
        game.artwork = meta.artwork;
        changed = true;
      }
      if (meta.backArtwork && !game.backArtwork) {
        game.backArtwork = meta.backArtwork;
        changed = true;
      }
      if (meta.synopsis && (!game.synopsis || game.synopsis.startsWith('Local PC executable'))) {
        game.synopsis = meta.synopsis;
        changed = true;
      }
      if (meta.genre && (!game.genre || game.genre === 'Game')) {
        game.genre = meta.genre;
        changed = true;
      }
      if (meta.year && !game.year) {
        game.year = meta.year;
        changed = true;
      }
      if (changed) {
        state.last3dKey = '';
        await persist();
        render();
        showToast(`Metadata updated for "${game.title}"`);
      }
    } catch {}
  }

  async function createGameWithAutoData({ title, executable, platform = 'PC DVD', onStage }) {
    onStage?.(30, 'Searching game artwork & metadata...');
    let meta = null;
    let timedOut = false;
    try {
      meta = await Promise.race([
        autoFetchMetadataForTitle(title, true),
        new Promise((resolve) => setTimeout(() => {
          timedOut = true;
          resolve(null);
        }, 5000))
      ]);
    } catch {
      meta = null;
    }

    let artwork = meta?.artwork || '';
    if (!artwork && executable) {
      onStage?.(55, 'Extracting executable icon fallback...');
      try {
        artwork = (await api.extractExeIcon(executable)) || '';
      } catch {}
    }

    onStage?.(75, 'Registering game & saving to library...');
    const newGame = {
      id: `game-${Date.now()}`,
      title,
      executable,
      platform,
      year: meta?.year || String(new Date().getFullYear()),
      genre: meta?.genre || 'Game',
      synopsis: meta?.synopsis || (executable ? `Local PC executable (${executable.split(/[\\/]/).pop()}) • Ready to launch.` : ''),
      artwork,
      backArtwork: meta?.backArtwork || '',
      trailer: '',
      accent: '#38bdf8',
      secondary: '#151926',
      favorite: false,
      playCount: 0,
      lastPlayed: null,
      addedAt: new Date().toISOString(),
      isDemo: false
    };

    state.filter = 'all';
    state.search = '';
    activeGames().unshift(newGame);
    state.selectedId = newGame.id;
    state.last3dKey = '';
    await persist();

    const unwT = getGameTrophyTemplates(newGame).find((t) => t.id.endsWith('-unwrap'));
    if (unwT) await unlockAchievement(unwT, true);

    onStage?.(100, 'Installed!');
    fetchManualInBackground(newGame);
    if (timedOut || !meta?.ok) {
      retryMetadataInBackground(newGame);
    }
    return newGame;
  }

  els.renameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = els.renameTitleInput.value.trim();
    if (!title) return;
    const executable = els.renameExecInput.value.trim();

    els.btnRenameConfirm.disabled = true;
    els.btnRenameConfirm.textContent = 'Fetching Data...';

    await createGameWithAutoData({ title, executable, platform: 'PC DVD' });

    els.btnRenameConfirm.disabled = false;
    els.btnRenameConfirm.textContent = 'Fetch Auto Data & Save';
    els.renameModal.classList.add('hidden');
    if (stage3d) stage3d.subMode = 'showcase';
    render();
  });

  // Unique PS3 XMB Install / Add Game Modal
  els.btnPs3AddBrowseExec?.addEventListener('click', async () => {
    const picked = await api.pickGameFile();
    if (picked?.filePath && els.ps3AddExecInput) {
      els.ps3AddExecInput.value = picked.filePath;
      if (els.ps3AddTitleInput && !els.ps3AddTitleInput.value.trim()) {
        els.ps3AddTitleInput.value = cleanExeTitle(picked.suggestedTitle || picked.filePath.split(/[\\/]/).pop() || '');
      }
    }
  });
  els.btnPs3AddCancel?.addEventListener('click', () => {
    playXmbSfx('back');
    els.ps3AddGameModal?.classList.add('hidden');
  });
  els.ps3AddGameForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const executable = els.ps3AddExecInput?.value.trim() || '';
    let title = els.ps3AddTitleInput?.value.trim() || '';
    if (!title && executable) {
      title = cleanExeTitle(executable.split(/[\\/]/).pop() || '');
      if (els.ps3AddTitleInput) els.ps3AddTitleInput.value = title;
    }
    if (!title) return;
    const platform = els.ps3AddPlatformInput?.value || 'PS3';

    if (els.btnPs3AddConfirm) {
      els.btnPs3AddConfirm.disabled = true;
      els.btnPs3AddConfirm.textContent = 'Installing...';
    }
    els.ps3AddProgressWrap?.classList.remove('hidden');
    if (els.ps3AddProgressFill) els.ps3AddProgressFill.style.width = '15%';
    if (els.ps3AddProgressText) els.ps3AddProgressText.textContent = 'Preparing PS3 package registration...';

    try {
      const created = await createGameWithAutoData({
        title,
        executable,
        platform,
        onStage: (pct, msg) => {
          if (els.ps3AddProgressFill) els.ps3AddProgressFill.style.width = `${pct}%`;
          if (els.ps3AddProgressText) els.ps3AddProgressText.textContent = msg;
        }
      });

      const gameCatIdx = XMB_CATS.findIndex((c) => c.id === 'game');
      if (gameCatIdx !== -1) {
        state.xmbCatIdx = gameCatIdx;
        const xmbGames = buildXmbItems('game');
        const newIdx = xmbGames.findIndex((it) => it.gameId === created.id);
        state.xmbItemIdxs[gameCatIdx] = newIdx !== -1 ? newIdx : 1;
      }

      playXmbSfx('enter');
      els.ps3AddGameModal?.classList.add('hidden');
      render();
      showToast(`${title} installed & saved to PS3 XMB!`);
    } finally {
      if (els.btnPs3AddConfirm) {
        els.btnPs3AddConfirm.disabled = false;
        els.btnPs3AddConfirm.textContent = 'Install to XMB';
      }
    }
  });

  // Trailer Modal (removed)
  els.closeTrailerModal?.addEventListener('click', closeTrailerModal);
  els.btnWatchTrailer?.addEventListener('click', () => {
    const game = activeGames().find((g) => g.id === state.selectedId);
    openTrailerModal(game);
  });

  // Display Tab Controls
  els.modeCdBtn.addEventListener('click', () => {
    activeSettings().viewMode = 'cd';
    persist();
    render();
  });

  els.modeCaseBtn.addEventListener('click', () => {
    activeSettings().viewMode = 'case';
    persist();
    render();
  });

  els.render3dBtn.addEventListener('click', () => {
    activeSettings().renderMode = '3d';
    state.last3dKey = '';
    persist();
    render();
  });

  els.renderShelfBtn.addEventListener('click', () => {
    activeSettings().renderMode = 'shelf3d';
    state.last3dKey = '';
    persist();
    render();
  });

  els.render2dBtn.addEventListener('click', () => {
    activeSettings().renderMode = '2d';
    persist();
    render();
  });

  els.btn3dFlipDisc.addEventListener('click', () => {
    stage3d?.flipDisc();
    syncStageOverlays();
  });

  els.btn3dSpinBurst.addEventListener('click', () => {
    stage3d?.triggerSpinBurst();
  });

  els.btn3dResetCd.addEventListener('click', () => {
    stage3d?.setAnglePreset('front');
    syncStageOverlays();
  });

  els.btn3dTestConsoleCd.addEventListener('click', () => {
    const game = activeGames().find((g) => g.id === state.selectedId);
    runConsoleLaunch(game, true);
  });

  els.btn3dOpenCase.addEventListener('click', () => {
    stage3d?.toggleCaseOpen();
    syncStageOverlays();
  });

  els.btn3dEjectDisc.addEventListener('click', () => {
    stage3d?.toggleDiscEject();
    syncStageOverlays();
  });

  els.btn3dReadManual.addEventListener('click', () => openSelectedManual());
  els.btnDockManual.addEventListener('click', () => openSelectedManual());

  els.btn3dTestConsoleCase.addEventListener('click', () => {
    const game = activeGames().find((g) => g.id === state.selectedId);
    runConsoleLaunch(game, true);
  });

  els.angleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      stage3d?.setAnglePreset(btn.dataset.angle);
    });
  });

  els.sizeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      activeSettings().discSize = btn.dataset.size;
      persist();
      render();
    });
  });

  els.settingSpinHover.addEventListener('change', () => {
    activeSettings().spinOnHover = els.settingSpinHover.checked;
    persist();
    render();
  });

  els.settingShowLabels.addEventListener('change', () => {
    activeSettings().showTitlesOnMedia = els.settingShowLabels.checked;
    persist();
    render();
  });

  // Library, Auto Metadata, Trailers & .exe Tab
  els.searchInput.addEventListener('input', (e) => {
    state.search = e.target.value;
    render();
  });

  els.filterSelect.addEventListener('change', (e) => {
    state.filter = e.target.value;
    render();
  });

  els.sortSelect.addEventListener('change', (e) => {
    state.sort = e.target.value;
    render();
  });

  els.btnNewGameMode.addEventListener('click', () => startNewGameUnwrapFlow());
  els.btnQuickUnwrap.addEventListener('click', () => startNewGameUnwrapFlow());
  els.btnEmptyOpenAdd.addEventListener('click', () => startNewGameUnwrapFlow());

  els.btnBrowseExec.addEventListener('click', async () => {
    const picked = await api.pickGameFile();
    if (!picked) return;
    els.fieldExec.value = picked.filePath;
    if (!els.fieldTitle.value.trim()) {
      els.fieldTitle.value = cleanExeTitle(picked.suggestedTitle);
    }
  });

  els.btnDetectRoblox?.addEventListener('click', async () => {
    const res = await api.findRobloxExe();
    if (res?.ok && res.filePath) {
      els.fieldExec.value = res.filePath;
      if (!els.fieldTitle.value.trim()) els.fieldTitle.value = 'Roblox';
      showToast('Detected RobloxPlayerBeta.exe!');
    } else {
      showToast('Roblox not found in default folder — select RobloxPlayerBeta.exe manually');
      const picked = await api.pickGameFile();
      if (picked) {
        els.fieldExec.value = picked.filePath;
        if (!els.fieldTitle.value.trim()) els.fieldTitle.value = cleanExeTitle(picked.suggestedTitle) || 'Roblox';
      }
    }
  });

  els.btnPs3DetectRoblox?.addEventListener('click', async () => {
    const res = await api.findRobloxExe();
    if (res?.ok && res.filePath) {
      if (els.ps3AddExecInput) els.ps3AddExecInput.value = res.filePath;
      if (els.ps3AddTitleInput && !els.ps3AddTitleInput.value.trim()) els.ps3AddTitleInput.value = 'Roblox';
      showToast('Detected RobloxPlayerBeta.exe!');
    } else {
      showToast('Roblox not found in default folder — select RobloxPlayerBeta.exe manually');
      const picked = await api.pickGameFile();
      if (picked) {
        if (els.ps3AddExecInput) els.ps3AddExecInput.value = picked.filePath;
        if (els.ps3AddTitleInput && !els.ps3AddTitleInput.value.trim()) {
          els.ps3AddTitleInput.value = cleanExeTitle(picked.suggestedTitle) || 'Roblox';
        }
      }
    }
  });

  els.btnTestNotepadExe.addEventListener('click', () => {
    els.fieldExec.value = 'C:\\Windows\\System32\\notepad.exe';
    if (!els.fieldTitle.value.trim()) {
      els.fieldTitle.value = 'Notepad Test';
    }
    showToast('Filled Notepad (.exe) — click Save Game, then Play!');
  });

  els.btnOpenGameFolder.addEventListener('click', () => {
    const exec = els.fieldExec.value.trim();
    if (exec) api.openGameFolder(exec);
  });

  els.btnAutoFetchArt.addEventListener('click', async () => {
    const title = els.fieldTitle.value.trim();
    if (!title) {
      showToast('Enter a game title first');
      els.fieldTitle.focus();
      return;
    }
    els.btnAutoFetchArt.disabled = true;
    const meta = await autoFetchMetadataForTitle(title, false);
    els.btnAutoFetchArt.disabled = false;
    if (meta?.ok) {
      if (meta.artwork) els.fieldArtwork.value = meta.artwork;
      if (meta.backArtwork) els.fieldBackArtwork.value = meta.backArtwork;
      if (meta.synopsis && !els.fieldSynopsis.value.trim()) els.fieldSynopsis.value = meta.synopsis;
      if (meta.genre && !els.fieldGenre.value.trim()) els.fieldGenre.value = meta.genre;
      if (meta.year) els.fieldYear.value = meta.year;
    }
  });

  els.btnBrowseArt.addEventListener('click', async () => {
    const imgUrl = await api.pickImageFile();
    if (imgUrl) els.fieldArtwork.value = imgUrl;
  });

  els.btnClearArt.addEventListener('click', () => {
    els.fieldArtwork.value = '';
  });

  els.btnBrowseBackArt.addEventListener('click', async () => {
    const imgUrl = await api.pickImageFile();
    if (imgUrl) els.fieldBackArtwork.value = imgUrl;
  });

  els.btnClearBackArt.addEventListener('click', () => {
    els.fieldBackArtwork.value = '';
  });

  els.btnFetchTrailer?.addEventListener('click', async () => {});

  els.btnBrowseTrailer?.addEventListener('click', async () => {
    const vidUrl = await api.pickVideoFile();
    if (vidUrl && els.fieldTrailer) els.fieldTrailer.value = vidUrl;
  });

  els.btnClearTrailer?.addEventListener('click', () => {
    if (els.fieldTrailer) els.fieldTrailer.value = '';
  });

  els.btnFetchManual.addEventListener('click', async () => {
    const game = activeGames().find((g) => g.id === els.fieldId.value);
    const title = els.fieldTitle.value.trim();
    if (!title) {
      showToast('Enter a game title first');
      return;
    }
    els.btnFetchManual.disabled = true;
    els.btnFetchManual.textContent = 'Searching...';
    const res = await api.fetchOfficialManual(title);
    els.btnFetchManual.disabled = false;
    els.btnFetchManual.textContent = 'Fetch';
    if (res?.ok && res.pages?.length >= 2) {
      if (game) {
        game.manualPages = res.pages;
        await persist();
      }
      els.fieldManualStatus.value = `${res.pages.length} official scanned pages ready`;
      showToast(`Found official manual (${res.pages.length} pages)!`);
    } else {
      showToast('No official manual scan found on Archive.org — generated manual will be used');
    }
  });

  els.btnClearManual.addEventListener('click', async () => {
    const game = activeGames().find((g) => g.id === els.fieldId.value);
    if (game) {
      game.manualPages = [];
      await persist();
    }
    els.fieldManualStatus.value = '';
    showToast('Official manual cleared');
  });

  els.coverDropZone.addEventListener('click', async () => {
    const imgUrl = await api.pickImageFile();
    if (imgUrl) {
      els.fieldArtwork.value = imgUrl;
      if (!state.creatingNewGame && els.fieldId.value) {
        const game = activeGames().find((g) => g.id === els.fieldId.value);
        if (game) {
          game.artwork = imgUrl;
          state.last3dKey = '';
          await persist();
          render();
          showToast('Cover fitted to both Case and CD!');
        }
      }
    }
  });

  els.coverDropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.coverDropZone.classList.add('drag-active');
  });
  els.coverDropZone.addEventListener('dragleave', () => {
    els.coverDropZone.classList.remove('drag-active');
  });
  els.coverDropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    els.coverDropZone.classList.remove('drag-active');
    const file = e.dataTransfer?.files?.[0];
    const filePath = file ? api.getFilePath(file) : '';
    if (filePath) await applyDroppedCoverImage(filePath);
  });

  els.btnToggleFav.addEventListener('click', async () => {
    const game = activeGames().find((g) => g.id === els.fieldId.value);
    if (!game) return;
    game.favorite = !game.favorite;
    await persist();
    render();
  });

  els.btnDeleteGame.addEventListener('click', async () => {
    const id = els.fieldId.value;
    const profile = activeProfile();
    profile.games = profile.games.filter((g) => g.id !== id);
    if (state.selectedId === id) {
      state.selectedId = profile.games[0]?.id || null;
    }
    state.creatingNewGame = false;
    state.last3dKey = '';
    await persist();
    render();
    showToast('Game removed');
  });

  els.gameForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = els.fieldId.value;
    const title = els.fieldTitle.value.trim();
    if (!title) return;

    let artwork = els.fieldArtwork.value.trim();
    let backArtwork = els.fieldBackArtwork.value.trim();
    let synopsis = els.fieldSynopsis.value.trim();
    let genre = els.fieldGenre.value.trim();
    let year = els.fieldYear.value.trim();
    const isNew = !id || state.creatingNewGame;

    if (isNew && !artwork) {
      els.btnSaveGame.disabled = true;
      els.btnSaveGame.textContent = 'Fetching Data...';
      const meta = await autoFetchMetadataForTitle(title, false);
      if (meta?.ok) {
        artwork = meta.artwork || '';
        backArtwork = backArtwork || meta.backArtwork || '';
        synopsis = synopsis || meta.synopsis || '';
        genre = genre || meta.genre || '';
        year = year || meta.year || '';
      }
      if (!artwork && els.fieldExec.value.trim()) {
        try {
          artwork = (await api.extractExeIcon(els.fieldExec.value.trim())) || '';
        } catch {}
      }
      if (!synopsis && els.fieldExec.value.trim()) {
        const exeBase = els.fieldExec.value.trim().split(/[\\/]/).pop();
        synopsis = `Local PC executable (${exeBase}) • Ready to launch.`;
      }
      els.btnSaveGame.disabled = false;
      els.btnSaveGame.textContent = 'Save Game';
    }

    const payload = {
      title,
      executable: els.fieldExec.value.trim(),
      platform: els.fieldPlatform.value.trim() || 'PC DVD',
      year,
      genre,
      synopsis,
      artwork,
      backArtwork,
      trailer: els.fieldTrailer ? els.fieldTrailer.value.trim() : '',
      accent: els.fieldAccent.value,
      secondary: els.fieldSecondary.value
    };

    const games = activeGames();
    if (!isNew) {
      const idx = games.findIndex((g) => g.id === id);
      if (idx !== -1) {
        games[idx] = {
          ...games[idx],
          ...payload,
          isDemo: payload.executable ? false : games[idx].isDemo
        };
      }
      state.selectedId = id;
    } else {
      const newGame = {
        id: `game-${Date.now()}`,
        ...payload,
        favorite: false,
        playCount: 0,
        lastPlayed: null,
        addedAt: new Date().toISOString(),
        isDemo: false
      };
      games.unshift(newGame);
      state.selectedId = newGame.id;
    }

    state.creatingNewGame = false;
    state.last3dKey = '';
    await persist();
    render();
    showToast(isNew ? 'Game added with HD fitted Case, CD & Manual' : 'Game saved');
  });

  // Profiles, Discord Roles, VFX & PS3 Customization Tab
  els.btnPickPfp.addEventListener('click', async () => {
    const pfpUrl = await api.pickAvatarFile();
    if (!pfpUrl) return;
    activeProfile().avatar = pfpUrl;
    await persist();
    render();
    showToast('Profile picture updated');
  });

  els.btnOpenAvatarGallery?.addEventListener('click', () => {
    els.avatarGalleryBox?.classList.toggle('hidden');
    if (!els.avatarGalleryBox?.classList.contains('hidden')) {
      renderAvatarGallery();
    }
  });

  els.avatarGalleryTabs?.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.avatarGalleryTab = btn.dataset.avtab;
      renderAvatarGallery();
    });
  });

  els.btnClearPfp.addEventListener('click', async () => {
    activeProfile().avatar = './assets/maxmb/icons/avatars/firmware/000.png';
    await persist();
    render();
    showToast('Profile avatar reset to PS3 default');
  });

  els.profileStatusSelect?.addEventListener('change', async () => {
    activeProfile().status = els.profileStatusSelect.value;
    await persist();
    render();
  });

  els.profileVfxSelect?.addEventListener('change', async () => {
    activeProfile().vfx = els.profileVfxSelect.value;
    await persist();
    render();
    unlockAchievement(GLOBAL_TROPHIES[1], true);
  });

  els.profileHandleInput?.addEventListener('change', async () => {
    let val = els.profileHandleInput.value.trim();
    if (val && !val.startsWith('@')) val = `@${val}`;
    activeProfile().handle = val;
    await persist();
    render();
  });

  els.profileBannerPreset?.addEventListener('change', async () => {
    activeProfile().banner = els.profileBannerPreset.value;
    await persist();
    render();
    unlockAchievement(GLOBAL_TROPHIES[1], true);
  });

  els.profileCustomStatusInput?.addEventListener('change', async () => {
    activeProfile().customStatus = els.profileCustomStatusInput.value.trim();
    await persist();
    render();
  });

  els.profileBioInput?.addEventListener('change', async () => {
    activeProfile().bio = els.profileBioInput.value.trim();
    await persist();
    render();
  });

  els.btnAddProfileRole?.addEventListener('click', async () => {
    const name = els.newRoleNameInput?.value.trim();
    if (!name) {
      showToast('Enter a role name first');
      return;
    }
    const color = els.newRoleColorInput?.value || '#38bdf8';
    const tier = els.newRoleTierSelect?.value || 'standard';
    const profile = activeProfile();
    if (!Array.isArray(profile.roles)) profile.roles = [];
    profile.roles.push({
      id: `role-${Date.now()}`,
      name,
      color,
      tier
    });
    if (els.newRoleNameInput) els.newRoleNameInput.value = '';
    await persist();
    render();
    renderProfileRolesEditor();
    unlockAchievement(GLOBAL_TROPHIES[1], true);
    showToast(`Added ${tier === 'mythic' ? 'Mythic' : tier === 'super' ? 'Super' : ''} Role "${name}"`);
  });

  els.settingXmbWaveStyle?.addEventListener('change', async () => {
    activeSettings().xmbWaveStyle = els.settingXmbWaveStyle.value || 'original';
    await persist();
    render();
    showToast(`Wave Engine: ${activeSettings().xmbWaveStyle === 'original' ? 'PS3 Firmware 4.93 (lines.qrc)' : 'MaXMB Complex'}`);
  });

  els.settingXmbIconSet?.addEventListener('change', async () => {
    activeSettings().xmbIconSet = els.settingXmbIconSet.value || 'default';
    xmbCatDomMap.clear();
    els.xmbCategories.innerHTML = '';
    xmbRenderedSignature = '';
    await persist();
    render();
    showToast(`XMB Icon Pack: ${activeSettings().xmbIconSet.toUpperCase()}`);
  });

  els.settingXmbSoundSet?.addEventListener('change', async () => {
    activeSettings().xmbSoundSet = els.settingXmbSoundSet.value || 'ps3';
    await persist();
    render();
    showToast(`XMB Sound Pack: ${activeSettings().xmbSoundSet.toUpperCase()}`);
  });

  els.psnCardColorInput?.addEventListener('change', async () => {
    activeProfile().psnCardColor = els.psnCardColorInput.value || '#1d4ed8';
    await persist();
    render();
  });

  els.psnCommentInput?.addEventListener('change', async () => {
    activeProfile().psnComment = els.psnCommentInput.value.trim();
    await persist();
    render();
  });

  els.settingXmbHoverVideo?.addEventListener('change', async () => {
    activeSettings().xmbHoverVideo = els.settingXmbHoverVideo.checked;
    await persist();
    render();
  });

  els.settingXmbHoverAudio?.addEventListener('change', async () => {
    activeSettings().xmbHoverAudio = els.settingXmbHoverAudio.checked;
    if (els.xmbGameBgVideo) {
      els.xmbGameBgVideo.muted = !activeSettings().xmbHoverAudio;
    }
    await persist();
  });

  els.settingBackdropMode.addEventListener('change', async () => {
    activeSettings().backdropMode = els.settingBackdropMode.value;
    await persist();
    render();
  });

  els.settingGlassStyle.addEventListener('change', async () => {
    activeSettings().glassStyle = els.settingGlassStyle.value;
    await persist();
    render();
  });

  els.settingTheme.addEventListener('change', async () => {
    const nextTheme = els.settingTheme.value;
    activeSettings().theme = nextTheme;
    if (nextTheme === 'xmb') {
      activeSettings().backdropMode = 'xmb-wave';
      els.settingBackdropMode.value = 'xmb-wave';
    } else if (activeSettings().backdropMode === 'xmb-wave') {
      activeSettings().backdropMode = 'aurora';
      els.settingBackdropMode.value = 'aurora';
    }
    state.last3dKey = '';
    await persist();
    render();
    if (nextTheme === 'xmb') {
      closeOptionsDrawer();
      triggerPs3Intro();
    }
  });

  els.settingXmbBgColor?.addEventListener('change', async () => {
    activeSettings().xmbBgColor = els.settingXmbBgColor.value || 'auto';
    await persist();
    render();
  });

  els.btnPickXmbWallpaper?.addEventListener('click', async () => {
    const picked = await api.pickWallpaperFile();
    if (!picked) return;
    activeSettings().xmbWallpaper = picked;
    await persist();
    render();
    showToast('PS3 XMB Background updated');
  });

  els.btnClearXmbWallpaper?.addEventListener('click', async () => {
    activeSettings().xmbWallpaper = '';
    await persist();
    render();
    showToast('Restored classic PS3 dynamic wave');
  });

  els.settingXmbSounds?.addEventListener('change', async () => {
    activeSettings().xmbSounds = els.settingXmbSounds.checked;
    await persist();
    render();
  });

  els.settingXmbIntro?.addEventListener('change', async () => {
    activeSettings().xmbIntro = els.settingXmbIntro.checked;
    await persist();
    render();
  });

  els.btnReplayPs3Intro?.addEventListener('click', async () => {
    if (activeSettings().theme !== 'xmb') {
      activeSettings().theme = 'xmb';
      activeSettings().backdropMode = 'xmb-wave';
      await persist();
      render();
    }
    closeOptionsDrawer();
    triggerPs3Intro(true);
  });

  els.settingGraphicsQuality.addEventListener('change', async () => {
    activeSettings().graphicsQuality = els.settingGraphicsQuality.value;
    await persist();
    render();
    showToast(`Graphics: ${els.settingGraphicsQuality.value.toUpperCase()}`);
  });

  els.settingPfpFrame.addEventListener('change', async () => {
    activeSettings().pfpFrame = els.settingPfpFrame.value;
    await persist();
    render();
  });

  els.settingUiAccent.addEventListener('input', () => {
    const color = els.settingUiAccent.value;
    activeSettings().uiAccent = color;
    activeProfile().color = color;
    applyProfileThemeAndGraphics();
    renderAvatarInto(els.forefrontPfpImg, els.forefrontPfpFallback, activeProfile());
    renderAvatarInto(els.activePfpPreviewImg, els.activePfpPreviewFallback, activeProfile());
  });

  els.settingUiAccent.addEventListener('change', async () => {
    await persist();
    render();
  });

  els.btnProfileCancelEdit.addEventListener('click', resetProfileForm);
  els.profileCreateForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = els.profileNameInput.value.trim();
    if (!name) return;
    const color = els.profileColorInput.value || '#38bdf8';

    if (state.editingProfileId) {
      const target = state.profiles.find((p) => p.id === state.editingProfileId);
      if (target) {
        target.name = name;
        target.color = color;
        target.settings.uiAccent = color;
      }
      await persist();
      resetProfileForm();
      render();
      showToast(`Updated profile "${name}"`);
      return;
    }

    const current = activeProfile();
    const copyGames = els.profileCopyGames.checked;
    const newProfile = {
      id: `profile-${Date.now()}`,
      name,
      color,
      avatar: '',
      createdAt: new Date().toISOString(),
      settings: { ...current.settings, uiAccent: color },
      games: copyGames ? structuredClone(current.games) : []
    };

    state.profiles.push(newProfile);
    state.activeProfileId = newProfile.id;
    state.selectedId = newProfile.games[0]?.id || null;
    state.creatingNewGame = false;
    state.last3dKey = '';
    await persist();
    resetProfileForm();
    render();
    showToast(`Profile "${name}" active`);
  });

  // Trophies & Notifications Tab
  els.btnTestTrophyToast?.addEventListener('click', () => {
    const grades = ['bronze', 'silver', 'gold', 'platinum'];
    const g = grades[Math.floor(Math.random() * grades.length)];
    pushNotificationCard({
      title: `Trophy Showcase (${TROPHY_GRADES[g].label})`,
      subtitle: activeSettings().theme === 'xmb' ? 'PS3 Firmware 4.93 Trophy Toast' : 'Obsidian Nitro Glowing Achievement Toast',
      grade: g,
      isTrophy: true
    });
    renderTrophiesTab();
  });

  els.settingNotifsEnabled?.addEventListener('change', async () => {
    activeSettings().notificationsEnabled = els.settingNotifsEnabled.checked;
    await persist();
  });

  els.settingTrophySound?.addEventListener('change', async () => {
    activeSettings().achievementSoundEnabled = els.settingTrophySound.checked;
    await persist();
  });

  els.btnUnlockNextGameTrophy?.addEventListener('click', async () => {
    const game = activeGames().find((g) => g.id === state.selectedId);
    const unlockedIds = new Set(getProfileAchievements().map((a) => a.id));
    const pool = [...(game ? getGameTrophyTemplates(game) : []), ...GLOBAL_TROPHIES];
    const next = pool.find((t) => !unlockedIds.has(t.id));
    if (next) {
      await unlockAchievement(next, false);
    } else {
      pushNotificationCard({
        title: '100% Platinum Completionist!',
        subtitle: 'All trophies for this game are unlocked!',
        grade: 'platinum',
        isTrophy: true
      });
    }
  });

  els.btnClearNotifications?.addEventListener('click', async () => {
    activeProfile().notifications = [];
    await persist();
    renderTrophiesTab();
    renderProfileCardAndHud();
  });

  // System / Launcher Tab & Controller Home Button Binding + Media Folders
  els.btnOpenPs3PicFolder?.addEventListener('click', () => {
    api.openMediaFolder('pic');
    updateMediaFolderStatusUI();
  });
  els.btnOpenPs3VideoFolder?.addEventListener('click', () => {
    api.openMediaFolder('video');
    updateMediaFolderStatusUI();
  });
  els.btnOpenPs3AudioFolder?.addEventListener('click', () => {
    api.openMediaFolder('audio');
    updateMediaFolderStatusUI();
  });
  els.btnAddAudioTrack?.addEventListener('click', async () => {
    const picked = await api.pickAudioFile();
    if (picked) {
      await refreshDeviceMedia();
      showToast('Audio track saved safely inside ps3_audio!');
    }
  });
  els.btnReplayTutorial?.addEventListener('click', () => {
    closeOptionsDrawer();
    openTutorialModal(0);
  });

  els.btnBindHomeButton?.addEventListener('click', () => {
    state.bindingHomeButton = true;
    els.btnBindHomeButton.textContent = 'Press Any Controller Button Now…';
    if (els.customHomeBtnLabel) {
      els.customHomeBtnLabel.textContent = 'Listening for controller button press…';
    }
    showToast('Press the Home / PS button (or any button) on your controller now!');
  });

  els.btnResetHomeButton?.addEventListener('click', async () => {
    state.bindingHomeButton = false;
    activeSettings().customHomeButton = -1;
    if (els.btnBindHomeButton) els.btnBindHomeButton.textContent = '🎮 Detect / Bind Home Button';
    await persist();
    updateCustomHomeButtonLabel();
    showToast('Reset controller Home button to Auto Detection');
  });

  els.btnTestOverlay.addEventListener('click', () => api.openOverlay());
  els.btnSaveLauncherName.addEventListener('click', async () => {
    activeSettings().launcherName = els.settingLauncherName.value.trim();
    await persist();
    render();
    showToast('Launcher name updated');
  });

  // Onboarding Tutorial Modal Navigation
  els.btnSkipTutorial?.addEventListener('click', () => closeTutorialModal(true));
  els.btnTutorialPrev?.addEventListener('click', () => {
    if (state.tutorialStep > 0) {
      state.tutorialStep--;
      renderTutorialStep();
    }
  });
  els.btnTutorialNext?.addEventListener('click', () => {
    if (state.tutorialStep < TUTORIAL_STEPS.length - 1) {
      state.tutorialStep++;
      renderTutorialStep();
    } else {
      closeTutorialModal(true);
    }
  });

  // Bottom Dock
  els.btnDockTrophies?.addEventListener('click', () => {
    if (state.drawerOpen && state.activeTab === 'trophies') closeOptionsDrawer();
    else openOptionsDrawer('trophies');
  });
  els.btnPrevGame.addEventListener('click', () => stepSelection(-1));
  els.btnNextGame.addEventListener('click', () => stepSelection(1));
  els.btnPlayGame.addEventListener('click', () => {
    const game = activeGames().find((g) => g.id === state.selectedId);
    launchSelectedGame(game);
  });

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement?.tagName;
    const isTyping = activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT';

    if (e.key === 'F11') {
      e.preventDefault();
      api.toggleFullscreen();
      return;
    }

    if (e.key === 'Escape' || (e.key === 'Backspace' && !isTyping)) {
      if (els.xmbPhotoViewer && !els.xmbPhotoViewer.classList.contains('hidden')) {
        playXmbSfx('back');
        closeXmbPhotoViewer();
        return;
      }
      if (els.xmbVideoPlayerModal && !els.xmbVideoPlayerModal.classList.contains('hidden')) {
        playXmbSfx('back');
        closeXmbVideoPlayer();
        return;
      }
      if (els.ps3AddGameModal && !els.ps3AddGameModal.classList.contains('hidden')) {
        playXmbSfx('back');
        els.ps3AddGameModal.classList.add('hidden');
        return;
      }
      if (els.trailerModal && !els.trailerModal.classList.contains('hidden')) {
        playXmbSfx('back');
        closeTrailerModal();
        return;
      }
      if (!els.renameModal.classList.contains('hidden')) {
        playXmbSfx('back');
        dismissRename();
        return;
      }
      if (state.drawerOpen) {
        playXmbSfx('back');
        closeOptionsDrawer();
        return;
      }
      if (stage3d?.subMode === 'manual') {
        playXmbSfx('back');
        state.last3dKey = '';
        render();
        return;
      }
      if (stage3d?.subMode === 'unwrap') {
        playXmbSfx('back');
        cancelUnwrapFlow();
        return;
      }
      return;
    }

    if (isTyping) return;

    if (e.code === 'Space' && stage3d?.subMode === 'unwrap') {
      e.preventDefault();
      stage3d.setUnwrapHolding(true);
      return;
    }

    const isXmb = activeSettings().theme === 'xmb' && !state.drawerOpen && stage3d?.subMode !== 'manual' && stage3d?.subMode !== 'unwrap';
    const has3dActive = activeSettings().renderMode !== '2d' || activeSettings().theme === 'xmb';
    const key = e.key.toLowerCase();

    if (key === 'v') {
      activeSettings().viewMode = activeSettings().viewMode === 'cd' ? 'case' : 'cd';
      state.last3dKey = '';
      persist();
      render();
    } else if (e.key === '3' || key === 'd') {
      const order = ['3d', 'shelf3d', '2d'];
      const cur = order.includes(activeSettings().renderMode) ? activeSettings().renderMode : '3d';
      activeSettings().renderMode = order[(order.indexOf(cur) + 1) % order.length];
      state.last3dKey = '';
      persist();
      render();
    } else if ((key === 'f' || key === 'x') && has3dActive && activeSettings().viewMode === 'cd') {
      stage3d?.flipDisc();
      syncStageOverlays();
    } else if ((key === 'x' || key === 'o') && has3dActive && activeSettings().viewMode === 'case') {
      stage3d?.toggleCaseOpen();
      syncStageOverlays();
    } else if (key === 'e' && has3dActive && activeSettings().viewMode === 'case') {
      stage3d?.toggleDiscEject();
      syncStageOverlays();
    } else if (e.key === 'ArrowUp' && isXmb) {
      e.preventDefault();
      stepXmbItem(-1);
    } else if (e.key === 'ArrowDown' && isXmb) {
      e.preventDefault();
      stepXmbItem(1);
    } else if (e.key === 'ArrowLeft') {
      if (stage3d?.subMode === 'manual') {
        stage3d.flipManualPage(-1);
        syncStageOverlays();
      } else if (isXmb) {
        stepXmbCategory(-1);
      } else {
        stepSelection(-1);
      }
    } else if (e.key === 'ArrowRight') {
      if (stage3d?.subMode === 'manual') {
        stage3d.flipManualPage(1);
        syncStageOverlays();
      } else if (isXmb) {
        stepXmbCategory(1);
      } else {
        stepSelection(1);
      }
    } else if (e.key === 'Enter') {
      if (isXmb) {
        activateXmbItem();
      } else if (state.selectedId) {
        const game = activeGames().find((g) => g.id === state.selectedId);
        if (game) launchSelectedGame(game);
      }
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space' && stage3d?.subMode === 'unwrap') {
      stage3d.setUnwrapHolding(false);
    }
  });

  // Drag & Drop .exe -> starts Hold-to-Unwrap flow! Or image -> fits Case & CD!
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', async (e) => {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    const filePath = file ? api.getFilePath(file) : '';
    if (!file || !filePath) return;
    const ext = file.name.split('.').pop()?.toLowerCase();

    if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
      await applyDroppedCoverImage(filePath);
      return;
    }

    if (!['exe', 'lnk', 'bat', 'cmd', 'url'].includes(ext)) {
      showToast('Drop a game (.exe / .lnk) or cover image (.png / .jpg)');
      return;
    }
    const cleanTitle = cleanExeTitle(file.name);
    await startNewGameUnwrapFlow(filePath, cleanTitle);
  });
}

// =========================================================
// FULL CONTROLLER / GAMEPAD SUPPORT (XInput / Standard)
// =========================================================
const ANGLES = ['front', 'spine', 'back'];

function startControllerLoop() {
  const prevButtons = new Map();
  let lastNavAt = 0;
  let lastHomeTriggerAt = 0;
  let angleCursor = 0;
  let holdingUnwrapByPad = false;

  const isPressed = (gp, idx) => Boolean(gp.buttons?.[idx]?.pressed);
  const justPressed = (gp, idx) => {
    const key = `${gp.index}:${idx}`;
    const cur = isPressed(gp, idx);
    const prev = prevButtons.get(key) || false;
    prevButtons.set(key, cur);
    return cur && !prev;
  };

  function tick(now) {
    requestAnimationFrame(tick);
    if (document.hidden) return;

    const pads = navigator.getGamepads ? Array.from(navigator.getGamepads()).filter(Boolean) : [];
    els.controllerPill.classList.toggle('hidden', pads.length === 0);
    if (!pads.length) return;

    const pad = pads[0];
    const isStandard = pad.mapping === 'standard';
    els.controllerPillText.textContent = `PAD ${pad.index + 1}`;

    // 1. Interactive 1-Click Custom Home Button Binder (for any 3rd-party PS4 / generic controller)
    if (state.bindingHomeButton) {
      for (let bIdx = 0; bIdx < (pad.buttons?.length || 0); bIdx++) {
        if (justPressed(pad, bIdx)) {
          state.bindingHomeButton = false;
          activeSettings().customHomeButton = bIdx;
          if (els.btnBindHomeButton) els.btnBindHomeButton.textContent = '🎮 Detect / Bind Home Button';
          persist();
          updateCustomHomeButtonLabel();
          showToast(`Bound Controller Button #${bIdx} to Quick Power / Options Panel!`);
          return;
        }
      }
      return;
    }

    // 2. Detect PS / Home / Guide Button on Standard, 3rd-Party PS4 DirectInput, Custom Bound, or Share+Options Chord
    const customBtnIdx = activeSettings().customHomeButton;
    const customHomeEdge = typeof customBtnIdx === 'number' && customBtnIdx >= 0 && justPressed(pad, customBtnIdx);
    const stdHomeEdge = justPressed(pad, 16) || justPressed(pad, 17);
    // On raw DirectInput PS4 controllers (where mapping !== 'standard' and D-pad is on axes[9] POV hat):
    // Button 12 is PS Home, Button 13 is Touchpad Click
    const rawPs4HomeEdge = !isStandard && (justPressed(pad, 12) || justPressed(pad, 13));
    const chordPressed = isPressed(pad, 8) && isPressed(pad, 9);
    const prevChord = prevButtons.get(`${pad.index}:chord89`) || false;
    prevButtons.set(`${pad.index}:chord89`, chordPressed);
    const chordEdge = chordPressed && !prevChord;

    if ((customHomeEdge || stdHomeEdge || rawPs4HomeEdge || chordEdge) && now - lastHomeTriggerAt > 400) {
      lastHomeTriggerAt = now;
      api.openOverlay();
      return;
    }

    const modalOpen =
      (els.ps3AddGameModal && !els.ps3AddGameModal.classList.contains('hidden')) ||
      (els.trailerModal && !els.trailerModal.classList.contains('hidden')) ||
      !els.renameModal.classList.contains('hidden') ||
      (els.tutorialModal && !els.tutorialModal.classList.contains('hidden'));
    const inUnwrap = stage3d?.subMode === 'unwrap';
    const inManual = stage3d?.subMode === 'manual';
    const isXmb = activeSettings().theme === 'xmb' && !state.drawerOpen && !inManual && !inUnwrap && !modalOpen;

    // Cross / A button: standard index 0, or DirectInput PS4 index 1 (Cross) / 0 (Square)
    const aIdx = isStandard ? 0 : 1;
    const bIdx = isStandard ? 1 : 2; // Circle on DirectInput PS4 is button 2
    const xIdx = isStandard ? 2 : 0; // Square on DirectInput PS4 is button 0

    // A / Cross button: Hold to Unwrap, or Launch / Activate XMB
    const aHeld = isPressed(pad, aIdx) || isPressed(pad, 0);
    if (inUnwrap) {
      stage3d.setUnwrapHolding(aHeld);
      holdingUnwrapByPad = aHeld;
    } else if (holdingUnwrapByPad && !aHeld) {
      holdingUnwrapByPad = false;
    }

    if (justPressed(pad, aIdx) && !inUnwrap && !modalOpen) {
      if (state.drawerOpen) {
        const focused = document.activeElement;
        if (focused && els.optionsDrawer.contains(focused)) {
          focused.click();
        }
      } else if (isXmb) {
        activateXmbItem();
      } else {
        const game = activeGames().find((g) => g.id === state.selectedId);
        launchSelectedGame(game);
      }
    }

    // B / Circle button: Back / Close modals, Drawer, Manual, Unwrap
    if (justPressed(pad, bIdx)) {
      if (els.ps3AddGameModal && !els.ps3AddGameModal.classList.contains('hidden')) {
        playXmbSfx('back');
        els.ps3AddGameModal.classList.add('hidden');
      } else if (els.tutorialModal && !els.tutorialModal.classList.contains('hidden')) {
        closeTutorialModal(true);
      } else if (els.trailerModal && !els.trailerModal.classList.contains('hidden')) {
        playXmbSfx('back');
        closeTrailerModal();
      } else if (!els.renameModal.classList.contains('hidden')) {
        playXmbSfx('back');
        dismissRename();
      } else if (state.drawerOpen) {
        playXmbSfx('back');
        closeOptionsDrawer();
      } else if (inManual) {
        playXmbSfx('back');
        state.last3dKey = '';
        render();
      } else if (inUnwrap) {
        playXmbSfx('back');
        cancelUnwrapFlow();
      } else if (isXmb) {
        playXmbSfx('back');
      }
    }

    // X / Square button: Open Case / Flip Disc across Hero, Domino Shelf & XMB
    if (justPressed(pad, xIdx) && !inUnwrap && !inManual && !modalOpen) {
      if (activeSettings().viewMode === 'case') {
        stage3d?.toggleCaseOpen();
      } else {
        stage3d?.flipDisc();
      }
      syncStageOverlays();
    }

    // Y / Triangle button (3): Theme-unique controls (Obsidian toggles Case/CD; PS3 XMB opens Options)
    if (justPressed(pad, 3) && !inUnwrap && !inManual && !modalOpen) {
      if (isXmb) {
        openOptionsDrawer('display');
      } else {
        activeSettings().viewMode = activeSettings().viewMode === 'case' ? 'cd' : 'case';
        state.last3dKey = '';
        persist();
        render();
        showToast(activeSettings().viewMode === 'case' ? 'Game Cases' : 'Game CDs');
      }
    }

    // Start / Options (9): Toggle Options Drawer
    if (justPressed(pad, 9) && !chordPressed && !modalOpen) {
      if (state.drawerOpen) closeOptionsDrawer();
      else openOptionsDrawer('display');
    }

    // LB (4) / RB (5): Switch Options Tabs OR Cycle Case/Disc Angles
    const lb = justPressed(pad, 4);
    const rb = justPressed(pad, 5);
    if ((lb || rb) && !modalOpen) {
      if (state.drawerOpen) {
        const tabs = ['display', 'library', 'profiles', 'trophies', 'launcher'];
        const cur = tabs.indexOf(state.activeTab);
        const next = tabs[(cur + (rb ? 1 : -1) + tabs.length) % tabs.length];
        openOptionsDrawer(next);
      } else if (!inManual && !inUnwrap) {
        angleCursor = (angleCursor + (rb ? 1 : -1) + ANGLES.length) % ANGLES.length;
        stage3d?.setAnglePreset(ANGLES[angleCursor]);
      }
    }

    // Back/Select/Share (8) or Right Stick Press (11): Reset 3D view cleanly to front angle
    if ((justPressed(pad, 8) || justPressed(pad, 11)) && !chordPressed && !modalOpen && !state.drawerOpen && !inManual && !inUnwrap) {
      stage3d?.setAnglePreset('front');
      angleCursor = 0;
    }

    // D-Pad + Left Stick menu navigation: support Standard buttons[12..15], DirectInput POV axes[9], & Left Stick in XMB/Drawer
    let povUp = false, povDown = false, povLeft = false, povRight = false;
    if (!isStandard && typeof pad.axes?.[9] === 'number' && pad.axes[9] <= 1.05) {
      const h = pad.axes[9];
      povUp = h < -0.65 || (h > 0.85 && h <= 1.05);
      povRight = h > -0.85 && h < -0.05;
      povDown = h > -0.25 && h < 0.55;
      povLeft = h > 0.3 && h <= 1.05;
    }

    const lsx = pad.axes?.[0] || 0;
    const lsy = pad.axes?.[1] || 0;
    const allowStickNav = isXmb || state.drawerOpen;
    const sUp = allowStickNav && lsy < -0.55;
    const sDown = allowStickNav && lsy > 0.55;
    const sLeft = allowStickNav && lsx < -0.55;
    const sRight = allowStickNav && lsx > 0.55;

    const dUp = (isStandard && isPressed(pad, 12)) || povUp || sUp;
    const dDown = (isStandard && isPressed(pad, 13)) || povDown || sDown;
    const dLeft = (isStandard && isPressed(pad, 14)) || povLeft || sLeft;
    const dRight = (isStandard && isPressed(pad, 15)) || povRight || sRight;
    const eUp = isStandard && justPressed(pad, 12);
    const eDown = isStandard && justPressed(pad, 13);
    const eLeft = isStandard && justPressed(pad, 14);
    const eRight = isStandard && justPressed(pad, 15);
    const anyDpadEdge = eUp || eDown || eLeft || eRight;

    const repeatDelay = isXmb ? 175 : 115;
    if ((anyDpadEdge || ((dLeft || dRight || dUp || dDown) && now - lastNavAt > repeatDelay)) && !modalOpen && !inUnwrap) {
      lastNavAt = now;
      if (inManual) {
        if (dLeft) stage3d.flipManualPage(-1);
        if (dRight) stage3d.flipManualPage(1);
        syncStageOverlays();
      } else if (state.drawerOpen) {
        const tabs = ['display', 'library', 'profiles', 'trophies', 'launcher'];
        if (dLeft || dRight) {
          const cur = tabs.indexOf(state.activeTab);
          openOptionsDrawer(tabs[(cur + (dRight ? 1 : -1) + tabs.length) % tabs.length]);
        } else if (dUp || dDown) {
          const focusables = [...els.tabPanels[state.activeTab].querySelectorAll('button:not(.hidden), input:not(.hidden), select:not(.hidden)')].filter(
            (el) => el.offsetParent !== null && !el.disabled
          );
          if (focusables.length) {
            const idx = focusables.indexOf(document.activeElement);
            const next = focusables[(idx + (dDown ? 1 : -1) + focusables.length) % focusables.length];
            next?.focus();
          }
        }
      } else if (isXmb) {
        if (dLeft) stepXmbCategory(-1);
        else if (dRight) stepXmbCategory(1);
        else if (dUp) stepXmbItem(-1);
        else if (dDown) stepXmbItem(1);
      } else {
        if (dLeft) stepSelection(-1);
        else if (dRight) stepSelection(1);
        else if (dUp || dDown) {
          const order = ['3d', 'shelf3d', '2d'];
          const cur = order.includes(activeSettings().renderMode) ? activeSettings().renderMode : '3d';
          activeSettings().renderMode = order[(order.indexOf(cur) + (dDown ? 1 : -1) + order.length) % order.length];
          state.last3dKey = '';
          persist();
          render();
        }
      }
    }

    // Left Joystick OR Right Joystick moves/orbits smoothly around the 3D Case or CD; LT/RT zooms
    const has3dActive =
      (activeSettings().theme !== 'xmb' && activeSettings().renderMode !== '2d') ||
      document.body.classList.contains('xmb-3d-active');
    if (!modalOpen && !state.drawerOpen && stage3d && has3dActive) {
      const lx = pad.axes?.[0] || 0;
      const ly = pad.axes?.[1] || 0;
      const rx = pad.axes?.[2] || 0;
      const ry = pad.axes?.[3] || 0;
      const sx = Math.abs(rx) > Math.abs(lx) ? rx : lx;
      const sy = Math.abs(ry) > Math.abs(ly) ? ry : ly;

      if (Math.abs(sx) > 0.14 || Math.abs(sy) > 0.14) {
        stage3d.orbitBy(sx * 0.036, sy * 0.032);
      }
      const lt = pad.buttons?.[6]?.value || 0;
      const rt = pad.buttons?.[7]?.value || 0;
      if (lt > 0.1 || rt > 0.1) {
        stage3d.zoomBy((lt - rt) * 0.065);
      }
    }
  }

  requestAnimationFrame(tick);
}

function initSpotlightSurfaces() {
  const selectors = ['.bottom-dock', '.options-drawer', '.corner-profile-btn', '.hero-hud-card'];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (!el) continue;
    el.classList.add('spotlight-surface');
    el.addEventListener(
      'pointermove',
      (e) => {
        const rect = el.getBoundingClientRect();
        el.style.setProperty('--spot-x', `${e.clientX - rect.left}px`);
        el.style.setProperty('--spot-y', `${e.clientY - rect.top}px`);
      },
      { passive: true }
    );
  }
}

let pendingUpdateManifest = null;

function showUpdateModal(checkResult, isGate = false) {
  if (!els.updatePromptModal || !checkResult?.manifest) return;
  const m = checkResult.manifest;
  pendingUpdateManifest = m;

  if (els.updateModalBadge) {
    els.updateModalBadge.textContent = isGate ? '⚡ Update Required Before Launch' : '⚡ Launcher Update Available';
  }
  if (els.updateModalTitle) {
    els.updateModalTitle.textContent = m.title ? `${m.title} (v${m.version})` : `Update v${m.version} Ready`;
  }
  if (els.updateModalDesc) {
    els.updateModalDesc.textContent = isGate
      ? `Your launcher (v${checkResult.currentVersion}) needs to update to v${m.version} before booting.`
      : `A new update (v${m.version}) is available. The launcher will close, update, and relaunch with What's New.`;
  }
  if (els.updateModalNotes) {
    els.updateModalNotes.innerHTML = '';
    const items = [...(m.notes || []), ...(m.fixes || [])];
    if (!items.length) {
      const li = document.createElement('li');
      li.textContent = 'Latest performance improvements & bug fixes.';
      els.updateModalNotes.appendChild(li);
    } else {
      for (const line of items) {
        const li = document.createElement('li');
        li.textContent = line;
        els.updateModalNotes.appendChild(li);
      }
    }
  }
  els.updateProgressWrap?.classList.add('hidden');
  els.btnUpdateLater?.classList.toggle('hidden', isGate);
  if (els.btnUpdateNow) {
    els.btnUpdateNow.disabled = false;
    els.btnUpdateNow.textContent = 'Update & Relaunch';
  }
  els.updatePromptModal.classList.remove('hidden');

  if (isGate) {
    startInstallPendingUpdate(true);
  }
}

async function startInstallPendingUpdate(isGate = false) {
  if (!pendingUpdateManifest) return;
  els.updateProgressWrap?.classList.remove('hidden');
  if (els.btnUpdateNow) {
    els.btnUpdateNow.disabled = true;
    els.btnUpdateNow.textContent = 'Updating...';
  }
  if (els.btnUpdateLater) els.btnUpdateLater.classList.add('hidden');

  const res = await api.installUpdate(pendingUpdateManifest);
  if (!res?.ok) {
    if (els.updateProgressText) els.updateProgressText.textContent = `Update failed: ${res?.error || 'Network error'}`;
    if (els.btnUpdateNow) {
      els.btnUpdateNow.disabled = false;
      els.btnUpdateNow.textContent = 'Retry Update';
    }
    if (!isGate) els.btnUpdateLater?.classList.remove('hidden');
  }
}

function showWhatsNewModal(data) {
  if (!els.whatsNewModal || !data) return;
  if (els.whatsNewTitle) els.whatsNewTitle.textContent = data.title || `What's New in v${data.version}`;
  if (els.whatsNewSubtitle) els.whatsNewSubtitle.textContent = `Successfully updated to v${data.version || 'latest'}.`;

  const notes = Array.isArray(data.notes) ? data.notes : [];
  const fixes = Array.isArray(data.fixes) ? data.fixes : [];

  if (els.whatsNewNotesList) {
    els.whatsNewNotesList.innerHTML = '';
    for (const n of notes) {
      const li = document.createElement('li');
      li.textContent = n;
      els.whatsNewNotesList.appendChild(li);
    }
  }
  els.whatsNewNotesWrap?.classList.toggle('hidden', notes.length === 0);

  if (els.whatsNewFixesList) {
    els.whatsNewFixesList.innerHTML = '';
    for (const f of fixes) {
      const li = document.createElement('li');
      li.textContent = f;
      els.whatsNewFixesList.appendChild(li);
    }
  }
  els.whatsNewFixesWrap?.classList.toggle('hidden', fixes.length === 0);

  els.whatsNewModal.classList.remove('hidden');
}

function playReturnToLauncherTransition() {
  if (!els.gameReturnTransition) return;
  if (els.gameReturnBadge) {
    els.gameReturnBadge.textContent =
      activeSettings().theme === 'xmb' ? 'Returning to XMB…' : 'Returning to Launcher…';
  }
  document.body.classList.remove('game-return-anim');
  els.gameReturnTransition.classList.remove('hidden', 'active');
  void els.gameReturnTransition.offsetWidth;
  document.body.classList.add('game-return-anim');
  els.gameReturnTransition.classList.add('active');
  if (activeSettings().theme === 'xmb') {
    playXmbSfx('ok');
  }
  setTimeout(() => {
    els.gameReturnTransition?.classList.add('hidden');
    els.gameReturnTransition?.classList.remove('active');
    document.body.classList.remove('game-return-anim');
  }, 880);
}

async function initUpdaterUi() {
  api.onUpdaterProgress?.(({ pct, status }) => {
    els.updateProgressWrap?.classList.remove('hidden');
    if (els.updateProgressFill) els.updateProgressFill.style.width = `${Math.max(0, Math.min(100, pct || 0))}%`;
    if (els.updateProgressText && status) els.updateProgressText.textContent = status;
  });

  els.btnUpdateNow?.addEventListener('click', () => startInstallPendingUpdate(false));
  els.btnUpdateLater?.addEventListener('click', () => els.updatePromptModal?.classList.add('hidden'));
  els.btnCloseWhatsNew?.addEventListener('click', () => els.whatsNewModal?.classList.add('hidden'));

  const cfg = await api.getUpdateConfig?.();
  if (cfg) {
    if (els.updateFeedUrlInput) els.updateFeedUrlInput.value = cfg.feedUrl || '';
    if (els.updateStatusHint) els.updateStatusHint.textContent = `Current Version: v${cfg.currentVersion || '0.1.0'}`;
  }

  els.btnSaveUpdateFeed?.addEventListener('click', async () => {
    const url = els.updateFeedUrlInput?.value.trim() || '';
    await api.setUpdateFeedUrl?.(url);
    showToast(url ? 'Remote update feed URL saved!' : 'Remote update feed cleared.');
  });

  els.btnCheckUpdatesNow?.addEventListener('click', async () => {
    if (els.updateStatusHint) els.updateStatusHint.textContent = 'Checking for updates...';
    const res = await api.checkForUpdates?.();
    if (res?.updateAvailable) {
      if (els.updateStatusHint) els.updateStatusHint.textContent = `Update v${res.manifest.version} available!`;
      showUpdateModal(res, false);
    } else if (res?.error) {
      if (els.updateStatusHint) els.updateStatusHint.textContent = `Check failed: ${res.error}`;
    } else {
      if (els.updateStatusHint) els.updateStatusHint.textContent = `Up to date (v${res?.currentVersion || '0.1.0'})`;
      showToast('Launcher is up to date!');
    }
  });

  els.btnPreviewWhatsNew?.addEventListener('click', () => {
    showWhatsNewModal({
      version: cfg?.currentVersion || '0.2.0',
      title: "What's New & Fixes",
      notes: [
        'Smooth PS3 XMB scrolling & stalled boot animation until game window opens',
        'Smooth return transition back to launcher on game exit in both themes',
        'Remote auto-updater with startup gate & in-app update prompt'
      ],
      fixes: [
        'Fixed PS3 XMB category & item glide timing',
        'Fixed controller Home panel & theme-unique Triangle binding'
      ]
    });
  });

  api.onUpdaterAvailable?.((res) => {
    if (res?.updateAvailable) showUpdateModal(res, false);
  });

  const whatsNew = await api.getWhatsNew?.();
  if (whatsNew) {
    showWhatsNewModal(whatsNew);
    await api.clearWhatsNew?.();
  }
}

async function init() {
  if (window.location.search.includes('updateGate=1')) {
    await initUpdaterUi();
    api.onUpdaterGate?.((res) => showUpdateModal(res, true));
    return;
  }

  const store = await api.loadProfiles();
  state.activeProfileId = store.activeProfileId;
  state.profiles = store.profiles;
  state.tutorialCompleted = Boolean(store.tutorialCompleted);
  state.selectedId = activeGames()[0]?.id || null;

  // Always open in Obsidian theme by default on startup
  if (activeSettings().theme !== 'obsidian') {
    activeSettings().theme = 'obsidian';
    if (activeSettings().backdropMode === 'xmb-wave') {
      activeSettings().backdropMode = 'aurora';
    }
    await persist();
  }

  await refreshDeviceMedia();
  bindEvents();
  initSpotlightSurfaces();
  render();

  // Tutorial never interferes with PS3 intro: if intro is running, wait until it finishes
  if (!state.tutorialCompleted) {
    const launchTutorialSafely = () => {
      if (document.body.classList.contains('intro-run')) {
        setTimeout(launchTutorialSafely, 450);
        return;
      }
      openTutorialModal(0);
    };
    setTimeout(launchTutorialSafely, 650);
  }
  startControllerLoop();
  setInterval(updateXmbClock, 1000);
  window.addEventListener('resize', () => {
    if (activeSettings().theme === 'xmb') renderXmb();
  });
  await initUpdaterUi();
  api.onLauncherSuspended?.((suspended) => {
    if (suspended) {
      activePs3BootHandle?.finish();
      activePs3BootHandle = null;
      stage3d?.releaseConsoleWait?.();
      stage3d?.stop?.();
      backdrop?.stop?.();
      stopXmbHoverVideo();
    } else {
      state.last3dKey = '';
      if (els.obsidianHeroBackdrop) els.obsidianHeroBackdrop.dataset.heroUrl = '';
      applyProfileThemeAndGraphics();
      backdrop?.resize?.();
      backdrop?.start?.();
      stage3d?.resize?.();
      stage3d?.start?.();
      render();
      playReturnToLauncherTransition();
    }
  });
  document.addEventListener('visibilitychange', () => {
    syncXmbWallpaper();
  });
}

init();
