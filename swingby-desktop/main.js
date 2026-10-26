const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage } = require("electron");
const path = require("path");
const fs = require("fs");
const DEFAULTS = require("./defaults");

if (!app.requestSingleInstanceLock()) app.quit();

const SNOOZE_MIN = 5;
const OVERLAY_W = 760;
const OVERLAY_H = 480;
const startHidden = process.argv.includes("--hidden");

let state, settingsWin = null, overlayWin = null, tray = null;
let quitting = false, paused = false, showing = false, current = null;
const queue = [];          // reminders waiting for the hero to be free
const nextDue = {};        // interval reminders: id -> { due, interval }
const oneOffs = [];        // snoozes and quick timers: { reminder, due }
const fired = new Set();   // clock-time alarms already rung today

/* ---------- saved data ---------- */
const statePath = () => path.join(app.getPath("userData"), "swingby.json");

function load() {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(statePath(), "utf8")); } catch (e) { /* first run */ }
  state = { ...JSON.parse(JSON.stringify(DEFAULTS)), ...saved };
}
function save() {
  try { fs.writeFileSync(statePath(), JSON.stringify(state, null, 2)); } catch (e) { console.error(e); }
}

/* ---------- scheduler ---------- */
function inQuietHours() {
  const q = state.quiet;
  if (!q.enabled) return false;
  const now = new Date();
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = t => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  const s = toMin(q.start), e = toMin(q.end);
  return s <= e ? mins >= s && mins < e : mins >= s || mins < e;
}

function tick() {
  if (paused) return;
  const now = new Date();
  const t = now.getTime();
  if (fired.size > 300) fired.clear();

  for (const r of state.reminders) {
    if (!r.enabled) { delete nextDue[r.id]; continue; }

    if (r.mode === "times") {
      for (const time of r.times || []) {
        const key = `${r.id}|${time}|${now.toDateString()}`;
        const [h, m] = time.split(":").map(Number);
        const due = new Date(now); due.setHours(h, m, 0, 0);
        // ring within 2 minutes of the set time (covers a short sleep or a slow start)
        if (t >= due.getTime() && t - due.getTime() < 120000 && !fired.has(key)) {
          fired.add(key);
          show(r);
        }
      }
    } else {
      let nd = nextDue[r.id];
      if (!nd || nd.interval !== r.interval) nd = nextDue[r.id] = { due: t + r.interval * 60000, interval: r.interval };
      if (t >= nd.due) {
        nd.due = t + r.interval * 60000;
        // quiet hours only silence repeating reminders, never a clock time you set on purpose
        if (!inQuietHours()) show(r);
      }
    }
  }

  for (let i = oneOffs.length - 1; i >= 0; i--) {
    if (t >= oneOffs[i].due) { show(oneOffs[i].reminder); oneOffs.splice(i, 1); }
  }
}

/* ---------- overlay (the hero) ---------- */
function createOverlay() {
  overlayWin = new BrowserWindow({
    width: OVERLAY_W, height: OVERLAY_H, show: false,
    frame: false, transparent: true, resizable: false, movable: false,
    skipTaskbar: true, focusable: false, hasShadow: false, alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      autoplayPolicy: "no-user-gesture-required",
      backgroundThrottling: false
    }
  });
  overlayWin.setAlwaysOnTop(true, "screen-saver");
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWin.setIgnoreMouseEvents(true, { forward: true });
  overlayWin.loadFile(path.join(__dirname, "overlay", "overlay.html"));
}

function show(reminder) {
  if (!reminder) return;
  if (showing) { queue.push(reminder); return; }
  showing = true;
  current = reminder;
  const area = screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea;
  overlayWin.setBounds({ x: area.x + area.width - OVERLAY_W, y: area.y, width: OVERLAY_W, height: OVERLAY_H });
  overlayWin.setIgnoreMouseEvents(true, { forward: true });
  overlayWin.showInactive();   // appears over any app without stealing your typing focus
  setTimeout(() => overlayWin.webContents.send("show", { reminder, sound: state.sound }), 120);
}

ipcMain.on("set-ignore", (_e, ignore) => {
  if (overlayWin) overlayWin.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on("action", (_e, kind) => {
  if (kind === "done") {
    const today = new Date().toDateString();
    if (state.stats.date !== today) state.stats = { date: today, done: 0 };
    state.stats.done += 1;
    save();
  } else if (current) {
    oneOffs.push({ reminder: current, due: Date.now() + SNOOZE_MIN * 60000 });  // snooze, or auto-dismiss
  }
});

ipcMain.on("finished", () => {
  overlayWin.hide();
  showing = false;
  current = null;
  if (queue.length) setTimeout(() => show(queue.shift()), 700);
});

/* ---------- settings window ---------- */
function createSettings() {
  settingsWin = new BrowserWindow({
    width: 480, height: 760, minWidth: 420, minHeight: 520,
    show: !startHidden, title: "SwingBy", backgroundColor: "#0b0d14",
    icon: path.join(__dirname, "assets", "icon.png"), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true }
  });
  settingsWin.setMenu(null);
  settingsWin.loadFile(path.join(__dirname, "settings", "settings.html"));
  // closing the window keeps SwingBy running in the tray
  settingsWin.on("close", e => { if (!quitting) { e.preventDefault(); settingsWin.hide(); } });
}

function openSettings() {
  if (!settingsWin) createSettings();
  settingsWin.show();
  settingsWin.focus();
}

ipcMain.handle("get-state", () => ({ ...state, packaged: app.isPackaged }));

ipcMain.handle("save-state", (_e, s) => {
  state = { ...state, ...s };
  save();
  applyLoginItem();
  return true;
});

ipcMain.handle("test", (_e, id) => { show(state.reminders.find(r => r.id === id)); return true; });

ipcMain.handle("quick-timer", (_e, minutes, label) => {
  const m = Math.max(1, Math.round(Number(minutes) || 1));
  const title = (label || "").trim() || "Timer's up";
  oneOffs.push({
    reminder: { id: "quick", emoji: "⏰", title, text: `Your ${m}-minute timer just ended.` },
    due: Date.now() + m * 60000
  });
  return new Date(Date.now() + m * 60000).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
});

/* ---------- tray + startup ---------- */
function buildMenu() {
  return Menu.buildFromTemplate([
    { label: "Open SwingBy", click: openSettings },
    { label: "Test the hero", click: () => show(state.reminders.find(r => r.enabled) || state.reminders[0]) },
    { label: paused ? "Resume reminders" : "Pause reminders", click: () => { paused = !paused; tray.setContextMenu(buildMenu()); } },
    { type: "separator" },
    { label: "Quit", click: () => { quitting = true; app.quit(); } }
  ]);
}

function createTray() {
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "assets", "tray.png")));
  tray.setToolTip("SwingBy");
  tray.setContextMenu(buildMenu());
  tray.on("click", openSettings);
}

function applyLoginItem() {
  // only for the installed build; in dev mode this would register Electron itself
  if (app.isPackaged) app.setLoginItemSettings({ openAtLogin: !!state.autostart, args: ["--hidden"] });
}

app.on("second-instance", openSettings);
app.on("before-quit", () => { quitting = true; });
app.on("window-all-closed", () => { /* stay alive in the tray */ });

app.whenReady().then(() => {
  load();
  createOverlay();
  createSettings();
  createTray();
  applyLoginItem();
  setInterval(tick, 5000);
});
