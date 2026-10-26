# SwingBy

A desktop reminder app where a web-swinging hero drops onto your screen, over any app, to tell you to drink water, stretch, rest your eyes, or go to bed.

Most reminders are a notification you swipe away without reading. SwingBy is built to be noticed: a character swings in on a web line, "types" a short message in a speech bubble, and waits for you to answer.

![SwingBy screenshot](docs/screenshot.png)
<!-- Add a screenshot or a short GIF at docs/screenshot.png -->

## Features

- **Shows over any app.** Word, your desktop, a browser or a game. It appears on top without stealing your typing focus.
- **Two kinds of reminders.** Repeat every X minutes (for example, water every 30 minutes), or ring at set clock times like 7:00 PM and 2:00 AM.
- **Quick timer.** "Remind me in 10 minutes about the tea."
- **Snooze or done.** Snooze brings the hero back in 5 minutes. If you ignore him, he swings away and returns later. Done counts toward your daily total.
- **Quiet hours.** Pause repeating reminders at night. Clock-time alarms still ring, because you set those on purpose.
- **Runs in the system tray.** Closing the window keeps SwingBy running. Pause, test, or quit from the tray menu.
- **Starts with your computer** (installed version).
- **Dark theme** with an editable name, message and schedule for every reminder.
- **Original character.** The hero is an original design, drawn as SVG and animated with CSS.

## Install (Windows)

1. Go to the [Releases page](https://github.com/Nishupathak/swingby-desktop/releases) and download **SwingBy Setup 1.0.0.exe**.
2. Double-click it. If Windows shows "Windows protected your PC", click **More info**, then **Run anyway**. This appears because the app is not signed with a paid certificate.
3. Open SwingBy from the Start menu. In **General**, tick *Start SwingBy when I sign in*.

## Run from source

You need [Node.js](https://nodejs.org) (LTS).

```bash
git clone https://github.com/Nishupathak/swingby-desktop.git
cd swingby-desktop
npm install
npm start
```

Build your own installer:

```bash
npm run dist
```

The installer is created in the `dist` folder.

## How it works

SwingBy is an [Electron](https://www.electronjs.org) app with two windows:

- **Overlay window:** a transparent, frameless, always-on-top window that is shown without taking focus. Clicks pass through to the app underneath, except when the mouse is over the speech bubble.
- **Settings window:** where you manage reminders, timers and preferences. Closing it hides it to the tray.

The main process runs a scheduler that checks every 5 seconds for due reminders, snoozes and timers, and queues them so two reminders never overlap. Settings are saved as a JSON file in the user's app data folder.

```
main.js              scheduler, tray, windows, saved data
preload.js           safe bridge between the windows and the main process
defaults.js          starting reminders and their wording
overlay/             the hero, speech bubble, typing effect, sound
settings/            the settings window
assets/              icons
```

## Customize

- Change reminder wording: edit `defaults.js` or use the settings window.
- Change snooze length: `SNOOZE_MIN` in `main.js`.
- Change the look of the hero and bubble: `overlay/overlay.css` and `overlay/overlay.html`.

## Challenges I solved

- **Drawing over other apps without interrupting them.** The overlay uses a non-focusable window and toggles click-through, so it never grabs keystrokes from the app you are typing in.
- **Alarms at exact times.** Clock-time reminders are checked against the local time with a short grace window, so a brief sleep or slow start does not skip them.
- **Quiet hours that make sense.** Only repeating reminders are silenced, so a deliberate 2 AM alarm still rings.

## Roadmap

- A different animation for each reminder type
- Streaks and a weekly summary
- Pomodoro mode
- Mac build

## Tech

Electron, JavaScript, HTML, CSS, SVG, Web Audio API.

## License

MIT
