const $ = s => document.querySelector(s);
let state = null, saveTimer = null;

const fmt = t => {
  const [h, m] = t.split(":").map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => api.saveState({
    reminders: state.reminders, quiet: state.quiet, sound: state.sound, autostart: state.autostart
  }), 250);
}

async function load() {
  state = await api.getState();
  render();
}

function showStat() {
  $("#done").textContent = state.stats.date === new Date().toDateString() ? state.stats.done : 0;
}

function el(tag, props = {}, ...kids) {
  const n = Object.assign(document.createElement(tag), props);
  kids.forEach(k => n.append(k));
  return n;
}

function scheduleControls(r) {
  const box = el("div", { className: "when" });
  const mode = el("select", { ariaLabel: "Schedule type" });
  mode.append(new Option("Repeats every", "interval"), new Option("At these times", "times"));
  mode.value = r.mode === "times" ? "times" : "interval";
  mode.onchange = () => { r.mode = mode.value; if (r.mode === "times" && !(r.times || []).length) r.times = ["19:00"]; persist(); render(); };
  box.append(mode);

  if (r.mode === "times") {
    (r.times || []).slice().sort().forEach(t => {
      const x = el("button", { textContent: "✕", ariaLabel: "Remove " + fmt(t) });
      x.onclick = () => { r.times = r.times.filter(v => v !== t); persist(); render(); };
      box.append(el("span", { className: "chip" }, fmt(t), x));
    });
    const ti = el("input", { type: "time", value: "19:00", ariaLabel: "New time" });
    const add = el("button", { textContent: "Add time", className: "small" });
    add.onclick = () => {
      if (!ti.value || (r.times || []).includes(ti.value)) return;
      r.times = [...(r.times || []), ti.value]; persist(); render();
    };
    box.append(ti, add);
  } else {
    const n = el("input", { type: "number", min: 1, value: r.interval, className: "num", ariaLabel: "Minutes between reminders" });
    n.onchange = () => { r.interval = Math.max(1, +n.value || 1); persist(); };
    box.append(n, "minutes");
  }
  return box;
}

function card(r) {
  const on = el("input", { type: "checkbox", checked: r.enabled, ariaLabel: "Turn on " + r.title });
  on.onchange = () => { r.enabled = on.checked; persist(); render(); };
  const name = el("input", { className: "name", value: r.title, ariaLabel: "Name", maxLength: 30 });
  name.oninput = () => { r.title = name.value; persist(); };
  const test = el("button", { textContent: "Test" });
  test.onclick = () => api.test(r.id);
  const del = el("button", { textContent: "Delete", className: "del" });
  del.onclick = () => { state.reminders = state.reminders.filter(x => x !== r); persist(); render(); };
  const msg = el("input", { className: "msg", value: r.text, ariaLabel: "Message", maxLength: 80 });
  msg.oninput = () => { r.text = msg.value; persist(); };

  const top = el("div", { className: "top" }, el("label", { className: "switch" }, on, el("span")), name, test, del);
  return el("article", { className: "card" + (r.enabled ? "" : " off") }, top, msg, scheduleControls(r));
}

function render() {
  showStat();
  const list = $("#list");
  list.replaceChildren(...state.reminders.map(card));
  if (!state.reminders.length) list.append(el("p", { className: "hint", textContent: "No reminders yet. Add one below." }));
  $("#quietOn").checked = state.quiet.enabled;
  $("#qStartT").value = state.quiet.start;
  $("#qEndT").value = state.quiet.end;
  $("#soundOn").checked = state.sound;
  $("#autoOn").checked = !!state.autostart;
  $("#autoOn").disabled = !state.packaged;
  $("#autoHint").hidden = state.packaged;
}

$("#nMode").onchange = e => {
  $("#nIntRow").hidden = e.target.value === "times";
  $("#nTimeRow").hidden = e.target.value !== "times";
};

$("#nAdd").onclick = () => {
  const title = $("#nTitle").value.trim();
  if (!title) { $("#nTitle").focus(); return; }
  const mode = $("#nMode").value;
  state.reminders.push({
    id: "c" + Date.now(), emoji: "🕸️", title,
    text: $("#nText").value.trim() || `Time to ${title.toLowerCase()}.`,
    mode, interval: Math.max(1, +$("#nInt").value || 30),
    times: mode === "times" && $("#nTime").value ? [$("#nTime").value] : [],
    enabled: true
  });
  $("#nTitle").value = ""; $("#nText").value = "";
  persist(); render();
};

$("#qStart").onclick = async () => {
  const at = await api.quickTimer($("#qMin").value, $("#qLabel").value);
  $("#qMsg").textContent = `Timer set. The hero will show up at ${at}.`;
  $("#qLabel").value = "";
};

$("#quietOn").onchange = e => { state.quiet.enabled = e.target.checked; persist(); };
$("#qStartT").onchange = e => { state.quiet.start = e.target.value; persist(); };
$("#qEndT").onchange   = e => { state.quiet.end = e.target.value; persist(); };
$("#soundOn").onchange = e => { state.sound = e.target.checked; persist(); };
$("#autoOn").onchange  = e => { state.autostart = e.target.checked; persist(); };

window.addEventListener("focus", async () => { if (state) { state.stats = (await api.getState()).stats; showStat(); } });
load();
