const api = window.launcherAPI;

const gameNameEl = document.getElementById('gameName');
const gameMetaEl = document.getElementById('gameMeta');
const padBadge = document.getElementById('padBadge');
const btnCloseGame = document.getElementById('btnCloseGame');
const btnRestartGame = document.getElementById('btnRestartGame');
const menuButtons = [...document.querySelectorAll('.menu-btn')];
const confirmBox = document.getElementById('confirmBox');
const confirmLabel = document.getElementById('confirmLabel');
const btnConfirmCancel = document.getElementById('btnConfirmCancel');
const btnConfirmYes = document.getElementById('btnConfirmYes');

let focusedIdx = 0;
let pendingDeviceAction = null;
let confirmYesFocused = false;
let lastNavTs = {};
let lastPadState = { a: false, b: false };
let lastDirRepeatAt = 0;

function updateStateUI(data) {
  const isXmb = data?.theme === 'xmb';
  document.body.classList.toggle('theme-xmb', isXmb);
  const badgeEl = document.querySelector('.badge');
  if (badgeEl) {
    badgeEl.textContent = isXmb ? 'PlayStation®3 System Menu' : 'Quick Power Menu';
  }
  const g = data?.runningGame;
  if (g) {
    gameNameEl.textContent = g.title || 'Running Game';
    const mins = Math.max(0, Math.floor((Date.now() - (g.startedAt || Date.now())) / 60000));
    gameMetaEl.textContent = `Running • ${mins}m elapsed`;
    btnCloseGame.disabled = false;
    btnRestartGame.disabled = false;
  } else {
    gameNameEl.textContent = 'No Active Game';
    gameMetaEl.textContent = 'Launcher Standby';
    btnCloseGame.disabled = true;
    btnRestartGame.disabled = true;
  }
  pendingDeviceAction = null;
  confirmBox.classList.add('hidden');
  setFocusIndex(0);
}

function setFocusIndex(idx) {
  const enabled = menuButtons.filter((b) => !b.disabled);
  if (!enabled.length) return;
  const wrapped = ((idx % enabled.length) + enabled.length) % enabled.length;
  focusedIdx = wrapped;
  menuButtons.forEach((b) => b.classList.remove('focused'));
  enabled[wrapped].classList.add('focused');
}

function syncConfirmFocus() {
  btnConfirmCancel.classList.toggle('focused', !confirmYesFocused);
  btnConfirmYes.classList.toggle('focused', confirmYesFocused);
}

function openConfirm(action) {
  pendingDeviceAction = action;
  confirmYesFocused = false;
  confirmLabel.textContent =
    action === 'sleep'
      ? 'Put device to sleep?'
      : action === 'restart'
      ? 'Restart Windows device now?'
      : 'Shut down Windows device now?';
  confirmBox.classList.remove('hidden');
  syncConfirmFocus();
}

function closeConfirm() {
  pendingDeviceAction = null;
  confirmBox.classList.add('hidden');
}

function triggerAction(action) {
  if (action === 'resume') {
    closeConfirm();
    api.resumeOverlay();
  } else if (action === 'closeGame') {
    api.closeRunningGame();
  } else if (action === 'restartGame') {
    api.restartRunningGame();
  } else if (action === 'showLauncher') {
    api.showLauncherFromOverlay();
  } else if (action === 'sleep' || action === 'restart' || action === 'shutdown') {
    openConfirm(action);
  }
}

function handleNavCommand(cmd, fromNative = false) {
  const now = performance.now();
  // Deduplicate if both native XInput daemon and Chromium HID gamepad report same button press
  if (now - (lastNavTs[cmd] || 0) < 135) return;
  lastNavTs[cmd] = now;

  if (padBadge && fromNative) {
    padBadge.textContent = 'PAD ACTIVE';
  }

  if (cmd === 'UP') {
    if (!pendingDeviceAction) setFocusIndex(focusedIdx - 1);
  } else if (cmd === 'DOWN') {
    if (!pendingDeviceAction) setFocusIndex(focusedIdx + 1);
  } else if (cmd === 'LEFT' || cmd === 'RIGHT') {
    if (pendingDeviceAction) {
      confirmYesFocused = cmd === 'RIGHT';
      syncConfirmFocus();
    }
  } else if (cmd === 'A' || cmd === 'X') {
    if (pendingDeviceAction) {
      if (confirmYesFocused) btnConfirmYes.click();
      else btnConfirmCancel.click();
    } else {
      const enabled = menuButtons.filter((b) => !b.disabled);
      const target = enabled[focusedIdx];
      if (target) triggerAction(target.dataset.action);
    }
  } else if (cmd === 'B') {
    if (pendingDeviceAction) {
      closeConfirm();
    } else {
      api.resumeOverlay();
    }
  }
}

menuButtons.forEach((btn, i) => {
  btn.addEventListener('mouseenter', () => {
    const enabled = menuButtons.filter((b) => !b.disabled);
    const eIdx = enabled.indexOf(btn);
    if (eIdx >= 0) setFocusIndex(eIdx);
  });
  btn.addEventListener('click', () => triggerAction(btn.dataset.action));
});

btnConfirmCancel.addEventListener('click', closeConfirm);

btnConfirmYes.addEventListener('click', () => {
  if (pendingDeviceAction) {
    const act = pendingDeviceAction;
    closeConfirm();
    api.deviceAction(act);
  }
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (pendingDeviceAction) closeConfirm();
    else api.resumeOverlay();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    handleNavCommand('DOWN');
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    handleNavCommand('UP');
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    handleNavCommand('LEFT');
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    handleNavCommand('RIGHT');
  } else if (e.key === 'Enter') {
    e.preventDefault();
    handleNavCommand('A');
  }
});

// Browser Gamepad API fallback for PlayStation DualSense/DS4/3rd-party PS4/Switch/DirectInput HID controllers
let lastGuidePressed = false;
function pollGamepad(now) {
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const pad = [...pads].find(Boolean);
  if (pad) {
    if (padBadge) padBadge.textContent = 'PAD ACTIVE';
    const isStandard = pad.mapping === 'standard';

    // Detect D-Pad via standard buttons[12..15] OR DirectInput POV hat axes[9]
    let povUp = false, povDown = false, povLeft = false, povRight = false;
    if (!isStandard && typeof pad.axes[9] === 'number' && pad.axes[9] <= 1.05) {
      const h = pad.axes[9];
      // Standard Chromium DirectInput hat switch encoding: -1=Up, -0.71=UpRight, -0.43=Right, -0.14=DownRight, 0.14=Down, 0.43=DownLeft, 0.71=Left, 1.0=UpLeft
      povUp = h < -0.65 || (h > 0.85 && h <= 1.05);
      povRight = h > -0.85 && h < -0.05;
      povDown = h > -0.25 && h < 0.55;
      povLeft = h > 0.3 && h <= 1.05;
    }

    const up = Boolean((isStandard && pad.buttons[12]?.pressed) || povUp || pad.axes[1] < -0.55);
    const down = Boolean((isStandard && pad.buttons[13]?.pressed) || povDown || pad.axes[1] > 0.55);
    const left = Boolean((isStandard && pad.buttons[14]?.pressed) || povLeft || pad.axes[0] < -0.55);
    const right = Boolean((isStandard && pad.buttons[15]?.pressed) || povRight || pad.axes[0] > 0.55);

    // On DirectInput PS4 pad: Cross is button 1, Circle is button 2; on standard: A/Cross is 0, B/Circle is 1
    const a = isStandard ? Boolean(pad.buttons[0]?.pressed) : Boolean(pad.buttons[1]?.pressed || pad.buttons[0]?.pressed);
    const b = isStandard ? Boolean(pad.buttons[1]?.pressed) : Boolean(pad.buttons[2]?.pressed);

    // Detect PS Home / Guide button or Share+Options chord to close overlay
    const chord = Boolean(pad.buttons[8]?.pressed && pad.buttons[9]?.pressed);
    const guide = Boolean(
      pad.buttons[16]?.pressed ||
      pad.buttons[17]?.pressed ||
      (!isStandard && (pad.buttons[12]?.pressed || pad.buttons[13]?.pressed)) ||
      chord
    );
    if (guide && !lastGuidePressed) {
      api.resumeOverlay();
    }
    lastGuidePressed = guide;

    if ((up || down || left || right) && now - lastDirRepeatAt > 190) {
      lastDirRepeatAt = now;
      if (up) handleNavCommand('UP');
      else if (down) handleNavCommand('DOWN');
      else if (left) handleNavCommand('LEFT');
      else if (right) handleNavCommand('RIGHT');
    }

    if (a && !lastPadState.a) handleNavCommand('A');
    if (b && !lastPadState.b) handleNavCommand('B');
    lastPadState = { a, b };
  }
  requestAnimationFrame(pollGamepad);
}

api.onOverlayState((data) => updateStateUI(data));
api.onOverlayNav((cmd) => handleNavCommand(cmd, true));
api.getOverlayState().then((data) => updateStateUI(data));
requestAnimationFrame(pollGamepad);
