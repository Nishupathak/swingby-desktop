const $ = s => document.querySelector(s);
const swing = $("#swing"), dots = $("#dots"), body = $("#body");
const title = $("#title"), text = $("#text"), row = $("#row");
let timers = [], ignoring = true;

const later = (fn, ms) => timers.push(setTimeout(fn, ms));
const clearAll = () => { timers.forEach(clearTimeout); timers = []; };

// Types the text out one character at a time, like someone texting you.
function type(el, str, speed, done) {
  let i = 0;
  (function step() {
    el.textContent = str.slice(0, i++);
    if (i <= str.length) later(step, speed); else if (done) done();
  })();
}

function thwip() {
  try {
    const ctx = new AudioContext();
    const len = ctx.sampleRate * 0.22;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.Q.value = 4;
    f.frequency.setValueAtTime(400, ctx.currentTime);
    f.frequency.exponentialRampToValueAtTime(5000, ctx.currentTime + 0.2);
    const g = ctx.createGain(); g.gain.value = 0.25;
    src.connect(f).connect(g).connect(ctx.destination);
    src.start();
  } catch (e) { /* no audio: stay silent */ }
}

function dismiss(kind) {
  clearAll();
  api.action(kind);                      // "done", "snooze" or "auto"
  swing.className = "swing out";
  later(() => api.finished(), 950);
}

api.onShow(({ reminder, sound }) => {
  clearAll();
  ignoring = true;
  title.textContent = ""; text.textContent = "";
  dots.hidden = false; body.hidden = true; row.hidden = true;
  swing.className = "swing"; void swing.offsetWidth; swing.className = "swing in";
  if (sound) thwip();

  later(() => {
    dots.hidden = true; body.hidden = false;
    type(title, `${reminder.emoji} ${reminder.title}`, 30, () =>
      type(text, reminder.text, 14, () => { row.hidden = false; }));
  }, 1500);

  later(() => dismiss("auto"), 30000);   // nobody answered: swing away and come back in 5 minutes
});

swing.addEventListener("animationend", e => {
  if (e.target === swing && e.animationName === "swingIn") swing.className = "swing idle";
});

$("#doneBtn").onclick = () => dismiss("done");
$("#snoozeBtn").onclick = () => dismiss("snooze");

// Clicks pass through to the app underneath, except when the mouse is over the bubble.
document.addEventListener("mousemove", e => {
  const overBubble = !!e.target.closest(".bubble");
  if (overBubble === ignoring) { ignoring = !overBubble; api.setIgnore(ignoring); }
});
