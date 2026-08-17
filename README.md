# YouTube Practice Sections

A static, URL-only YouTube practice looper. It lets you mark named sections, loop them, set precise boundaries and per-section speeds, and share the complete setup through the page URL.

The browser code is organized as native ES modules under `src/`. There is no bundler, application server, runtime package dependency, or browser storage.

## Features

- Load standard, shortened, embedded, Shorts, Live, and privacy-enhanced YouTube URLs.
- Keep the canonical full `youtube.com` URL visible after loading.
- Open a new empty practice session in another tab from the page header.
- Save an editable video title in the shared configuration and browser title. Matching YouTube metadata fills only a missing title.
- Add the first section at the playhead; later **Add section** actions start at the final displayed section's end.
- Insert a section after any existing section without changing later sections.
- Collapse section details while keeping Play and Speed controls available. Expanding one section collapses the others and makes it active.
- Edit names and millisecond-precision Start/End values without losing input focus.
- Accept raw seconds, `M:SS.mmm`, or `H:MM:SS.mmm` time input.
- Fine-tune boundaries by `0.05s`, `0.1s`, `0.25s`, `0.5s`, or `1s` (`0.1s` by default).
- Loop the active section or advance through displayed sections at their boundaries.
- Use each section's speed, map it to the nearest available YouTube rate, or force exact `1×` without changing saved speeds.
- Copy a URL containing the complete practice setup.
- Keep all practice data out of `localStorage`, `sessionStorage`, cookies, IndexedDB, and servers.

## Project structure

```text
resources/
  favicon.svg        Page favicon
  styles.css         Application styles and responsive layout

src/
  application/       Use cases and state-transition controllers
  config/            Shared constants and supported options
  domain/            Browser-independent state, section, time, and speed rules
  infrastructure/    URL, browser-location, and YouTube adapters
  presentation/      DOM rendering, event translation, keyboard, layout, and status UI
  main.js             Composition root only

tests/
  application/       Mirrors src/application/
  config/            Mirrors src/config/
  domain/            Mirrors src/domain/
  infrastructure/    Mirrors src/infrastructure/
  presentation/      Mirrors src/presentation/
  main.test.mjs      Deployment, markup, layout, and structure contract
```

See `ARCHITECTURE.md` for dependency rules and extension guidance.

## Deploy to GitHub Pages

1. Commit `index.html`, `resources/`, and `src/` to the published branch/folder.
2. Enable GitHub Pages for that branch/folder.
3. Open the published Pages URL.
4. Build a practice set and use **Copy URL** to share it.

No build step is required. Keep the relative `resources/` and `src/` paths together when deploying.

## Run locally

Native browser modules should be served over HTTP rather than opened through `file://`. From the repository root, run any static file server, for example:

```zsh
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080/
```

## Test

Node.js 24 or newer is required. The tests and coverage enforcement use only Node built-ins and import production modules directly.

```zsh
npm run check
npm test
npm run test-coverage
```

`npm run check` parses every JavaScript source and test file. `npm test` uses Node's recursive test discovery across the mirrored `tests/` tree. `npm run test-coverage` reports every `src/**/*.js` module and fails unless aggregate line, function, and branch coverage are all exactly 100%.

## URL format

State is stored in the URL hash as `#ytp=<base64url-json>`. The compact v1 JSON includes:

- YouTube video ID
- optional YouTube video title (`t`)
- loop enabled/disabled
- move-to-next enabled/disabled (`n` when enabled)
- use-section-speed disabled (`r: 0`; omission defaults to enabled)
- section tuples: `[name, startSeconds, endSeconds, speed]`

The active section, expanded section, selected Fine Tune amount, player state, and timers are runtime-only and are not shared. Existing v1 URLs remain supported.
