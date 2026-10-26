// Starting reminders. Edit the wording here, or from the app's settings window.
module.exports = {
  reminders: [
    { id: "water",   emoji: "💧", title: "Water break",         text: "You've been at it a while. Drink some water.", mode: "interval", interval: 30, times: [],        enabled: true  },
    { id: "stretch", emoji: "🤸", title: "Stretch",             text: "Stand up. Roll your shoulders. Two minutes.",  mode: "interval", interval: 60, times: [],        enabled: true  },
    { id: "eyes",    emoji: "👀", title: "Eyes off the screen", text: "Look 20 feet away for 20 seconds.",            mode: "interval", interval: 20, times: [],        enabled: false },
    { id: "bed",     emoji: "🌙", title: "Wind down",           text: "Save your work. Time to call it a night.",     mode: "times",    interval: 30, times: ["23:00"], enabled: false }
  ],
  quiet: { enabled: false, start: "22:00", end: "07:00" },
  sound: true,
  autostart: false,
  stats: { date: "", done: 0 }
};
