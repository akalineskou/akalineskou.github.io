# YouTube Practice Sections

A self-contained static `index.html` page for practicing music with YouTube videos. It lets you mark named sections, loop them, set precise start/end times, choose a playback speed per section, and share the whole practice setup through the URL.

## Features

- Load a YouTube URL or 11-character video ID.
- Add practice sections from the current playhead.
- Edit section names, start times, end times, and playback speeds.
- Times support high-precision milliseconds and flexible formats:
  - `83.250`
  - `1:23.250`
  - `01:02:03.250`
- Fine-tune start/end/playhead with nudges down to `0.001s`.
- Loop the active section while practicing.
- Export/share by copying the current page URL.
- Import/load automatically by opening a shared URL.
- No app data is written to `localStorage`, `sessionStorage`, cookies, IndexedDB, or a server.

## Deploy to GitHub Pages

1. Commit `index.html` to a repository.
2. Enable GitHub Pages for the branch/folder containing `index.html`.
3. Open the published Pages URL.
4. Build a practice set and use **Copy URL** to share it.

No build step is required.

## Run locally

You can open `index.html` directly in a browser, or serve the folder with any static file server:

```zsh
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

## Test

The included test checks the URL-state utility code embedded in `index.html`:

```zsh
npm test
```

No npm packages are required; the script only uses Node.js built-ins.

## URL format

State is stored in the URL hash as `#ytp=<base64url-json>`. The compact JSON includes:

- YouTube video ID
- loop enabled/disabled
- active section index
- section tuples: `[name, startSeconds, endSeconds, speed]`

This keeps the page serverless and shareable while avoiding browser storage for practice data.
