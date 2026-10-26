# SwingBy (desktop)

A hero swings onto your screen, over any app (Word, your desktop, a game, a browser), and tells you to drink water, stretch, or go to bed.

## Run it
1. Install Node.js (the LTS version) from nodejs.org.
2. Open this folder in VS Code, then open the terminal (Ctrl + `).
3. Run:
       npm install
       npm start
4. Click **Test** on a reminder. Close the window and SwingBy keeps running in the system tray (bottom right, near the clock).

## Make a real installer (Windows)
    npm run dist
The installer appears in the `dist` folder. The installed version can start when you sign in (tick it in General).

## Where to change what
- `defaults.js`: starting reminders and their wording
- `main.js`: timers, quiet hours, snooze length (`SNOOZE_MIN`), where the hero appears
- `overlay/overlay.css`: the look of the hero and the speech bubble
- `overlay/overlay.js`: typing effect, sound, auto-dismiss time
- `overlay/overlay.html`: the hero drawing (SVG)
- `settings/`: the settings window
