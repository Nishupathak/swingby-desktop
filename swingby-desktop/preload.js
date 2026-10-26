const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  // settings window
  getState: () => ipcRenderer.invoke("get-state"),
  saveState: s => ipcRenderer.invoke("save-state", s),
  test: id => ipcRenderer.invoke("test", id),
  quickTimer: (minutes, label) => ipcRenderer.invoke("quick-timer", minutes, label),
  // overlay window
  onShow: cb => ipcRenderer.on("show", (_e, data) => cb(data)),
  action: kind => ipcRenderer.send("action", kind),
  finished: () => ipcRenderer.send("finished"),
  setIgnore: b => ipcRenderer.send("set-ignore", b)
});
