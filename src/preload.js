const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('launcherAPI', {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  toggleFullscreen: () => ipcRenderer.invoke('window:toggleFullscreen'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  onMaximizedChange: (cb) => {
    const handler = (_event, state) => cb(state);
    ipcRenderer.on('window:maximized-changed', handler);
    return () => ipcRenderer.removeListener('window:maximized-changed', handler);
  },

  loadProfiles: () => ipcRenderer.invoke('profiles:load'),
  saveProfiles: (data) => ipcRenderer.invoke('profiles:save', data),

  pickGameFile: () => ipcRenderer.invoke('dialog:pickGame'),
  pickImageFile: () => ipcRenderer.invoke('dialog:pickImage'),
  pickAvatarFile: () => ipcRenderer.invoke('dialog:pickAvatar'),
  pickVideoFile: () => ipcRenderer.invoke('dialog:pickVideo'),
  pickWallpaperFile: () => ipcRenderer.invoke('dialog:pickWallpaper'),
  pickAudioFile: () => ipcRenderer.invoke('dialog:pickAudio'),

  getMediaFolderStatus: () => ipcRenderer.invoke('media:getFolderStatus'),
  createPs3MediaFolders: () => ipcRenderer.invoke('media:createPs3Folders'),
  openMediaFolder: (kind) => ipcRenderer.invoke('media:openFolder', kind),
  scanDeviceMedia: () => ipcRenderer.invoke('media:scan'),

  searchGameCover: (title) => ipcRenderer.invoke('artwork:searchCover', title),
  extractExeIcon: (exePath) => ipcRenderer.invoke('artwork:extractExeIcon', exePath),
  findRobloxExe: () => ipcRenderer.invoke('game:findRobloxExe'),
  findMinecraftExe: () => ipcRenderer.invoke('game:findMinecraftExe'),
  updateVcState: (vcState) => ipcRenderer.invoke('vc:updateState', vcState),
  getVcState: () => ipcRenderer.invoke('vc:getState'),
  onVcState: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('vc:state', handler);
    return () => ipcRenderer.removeListener('vc:state', handler);
  },
  onRunningGameChange: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('game:runningChanged', handler);
    return () => ipcRenderer.removeListener('game:runningChanged', handler);
  },
  detectGameTrophies: (game) => ipcRenderer.invoke('trophies:detect', game),
  watchGameTrophies: (ctx) => ipcRenderer.invoke('trophies:watchGame', ctx),
  showTrophyPopup: (trophy) => ipcRenderer.invoke('trophies:showPopup', trophy),
  onTrophyUnlocked: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('trophy:unlocked', handler);
    return () => ipcRenderer.removeListener('trophy:unlocked', handler);
  },
  onTrophyPopup: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('trophy:popup', handler);
    return () => ipcRenderer.removeListener('trophy:popup', handler);
  },
  fetchOfficialManual: (title) => ipcRenderer.invoke('manual:fetch', title),
  fetchTrailer: (payload) => ipcRenderer.invoke('trailer:fetch', payload),
  importArtworkFile: (filePath) => ipcRenderer.invoke('artwork:importFile', filePath),

  launchGame: (target, title = '') => ipcRenderer.invoke('game:launch', { target, title }),
  openGameFolder: (target) => ipcRenderer.invoke('game:openFolder', target),
  getFilePath: (file) => (webUtils?.getPathForFile ? webUtils.getPathForFile(file) : file?.path || ''),

  // Quick Power Overlay APIs
  setOverlayTheme: (theme) => ipcRenderer.invoke('theme:set', theme),
  onLauncherSuspended: (cb) => {
    const handler = (_event, suspended) => cb(Boolean(suspended));
    ipcRenderer.on('launcher:suspended', handler);
    return () => ipcRenderer.removeListener('launcher:suspended', handler);
  },
  openOverlay: () => ipcRenderer.invoke('overlay:open'),
  resumeOverlay: () => ipcRenderer.invoke('overlay:resume'),
  getOverlayState: () => ipcRenderer.invoke('overlay:getState'),
  closeRunningGame: () => ipcRenderer.invoke('overlay:closeGame'),
  restartRunningGame: () => ipcRenderer.invoke('overlay:restartGame'),
  showLauncherFromOverlay: () => ipcRenderer.invoke('overlay:showLauncher'),
  deviceAction: (action) => ipcRenderer.invoke('overlay:deviceAction', action),
  onOverlayState: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('overlay:state', handler);
    return () => ipcRenderer.removeListener('overlay:state', handler);
  },
  onOverlayNav: (cb) => {
    const handler = (_event, cmd) => cb(cmd);
    ipcRenderer.on('overlay:nav', handler);
    return () => ipcRenderer.removeListener('overlay:nav', handler);
  },

  // Remote Auto-Updater & What's New
  getUpdateConfig: () => ipcRenderer.invoke('updater:getConfig'),
  setUpdateFeedUrl: (feedUrl) => ipcRenderer.invoke('updater:setFeedUrl', feedUrl),
  checkForUpdates: () => ipcRenderer.invoke('updater:check'),
  installUpdate: (manifest) => ipcRenderer.invoke('updater:install', manifest),
  getWhatsNew: () => ipcRenderer.invoke('updater:getWhatsNew'),
  clearWhatsNew: () => ipcRenderer.invoke('updater:clearWhatsNew'),
  bootNormally: () => ipcRenderer.invoke('updater:bootNormally'),
  onUpdaterAvailable: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('updater:available', handler);
    return () => ipcRenderer.removeListener('updater:available', handler);
  },
  onUpdaterGate: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('updater:gate', handler);
    return () => ipcRenderer.removeListener('updater:gate', handler);
  },
  onUpdaterProgress: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('updater:progress', handler);
    return () => ipcRenderer.removeListener('updater:progress', handler);
  }
});
