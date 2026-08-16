# YouTube Practice Sections

A self-contained static `index.html` page for practicing music with YouTube videos. It lets you mark named sections, loop them, set precise start/end times, choose a playback speed per section, and share the whole practice setup through the URL.

## Features

- Load a YouTube URL from a compact single-row URL/title/Load video control and keep the canonical full `youtube.com` URL visible in the input.
- Save the YouTube title in the shared configuration, edit it beside the loaded video URL, and include it in the browser title for useful bookmarks. New videos use title metadata from the YouTube player when available; shared titles are preserved.
- Use a YouTube-style favicon with the page's solid blue background color and a white play button.
- Add the first practice section from the current playhead; each later **Add section** starts at the final displayed section’s end.
- Keep the player visible beside a height-limited, independently scrollable section list on desktop.
- Collapse section details while keeping each section's Play and Speed controls available; expanding one section collapses the others and makes it active.
- Choose the active section from the player controls or by expanding a section card.
- Insert a new section after any section, starting at the previous section's end without changing later sections.
- Keep Now and neighbor controls immediately after each boundary input, with Go aligned at the far right; delete from the expanded section action row. After deletion, the final remaining section expands and becomes active.
- Leave section names empty for number-only labels such as `1.` and `2.`, or enter an optional name that updates summaries immediately.
- Edit Start/End times with immediate summary updates and set per-section playback speeds.
- Times support high-precision milliseconds and flexible formats:
  - `83.250`
  - `1:23.250`
  - `01:02:03.250`
- Fine-tune section start and end with `0.05s`, `0.1s`, `0.25s`, `0.5s`, or `1s` amount buttons (`0.1s` by default). The panel places “Press `-` / `+` to decrease / increase the amount.” on its own help line.
- Play a section with looping enabled automatically.
- Optionally move to the next displayed section at each boundary; the final section loops when looping is enabled.
- Keep the compact fixed-width Active section control aligned right of Current time and Play/Pause, with playback checkboxes on the full row below.
- Use each section’s saved playback speed by default, or disable **Use section speed** to force `1×` without changing saved values. Choosing any section speed automatically enables the option again.
- Export/share by copying the current page URL; the clipboard confirmation clears automatically after a few seconds.
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

The included tests check URL-state utilities, layout/collapsible-section contracts, and section-action behavior embedded in `index.html`:

```zsh
npm test
```

No npm packages are required; the script only uses Node.js built-ins.

## URL format

State is stored in the URL hash as `#ytp=<base64url-json>`. The compact JSON includes:

- YouTube video ID
- YouTube video title (optional compact field `t`; omitted when empty)
- loop enabled/disabled
- move to next section enabled/disabled
- use section speed enabled/disabled (disabled is stored as optional compact field `r: 0`; omitted/legacy values default to enabled)
- section tuples: `[name, startSeconds, endSeconds, speed]` (`name` may be an empty string)

The currently selected section is intentionally runtime-only and is not included in shared URLs. This keeps the page serverless and shareable while avoiding browser storage for practice data.
