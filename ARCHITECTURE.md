# Architecture Notes for Future Agents

## Goal

This is intentionally a greenfield, static-only GitHub Pages app. The user wanted a single webpage (`index.html`) that can be uploaded and used without an application server. All practice data must be shareable through the URL and must not depend on browser storage.

## Files

- `index.html` — complete application: markup, CSS, JavaScript, YouTube IFrame API integration, URL codec, and UI behavior.
- `README.md` — usage, deployment, and test instructions.
- `ARCHITECTURE.md` — this handoff file.
- `package.json` — no runtime dependencies; provides `npm test`.
- `tests/url-state.test.mjs` — extracts and tests the URL-state utility block from `index.html`.

## Design decisions

### Single-file app

The app keeps all browser code in `index.html` so it can be uploaded directly to GitHub Pages with no bundler or asset pipeline. This also makes shared URLs stable because there are no generated filenames.

### URL-only state

Practice data is encoded in the URL hash under `#ytp=...`.

The codec lives inside the marked block:

```js
/* URL_STATE_UTILS_START */
// URL-state utility functions live here.
/* URL_STATE_UTILS_END */
```

The test harness extracts this block, so keep those markers if the codec changes.

The encoded compact object shape is:

```js
const compactState = {
  v: 1,              // schema version
  y: "VIDEO_ID",     // YouTube video ID
  l: 1,              // loop enabled, 1 or 0
  a: 0,              // active section index, -1 when none
  s: [               // sections
    ["Name", 12.345, 18.9, 0.75]
  ]
};
```

The hash is used instead of query parameters so GitHub Pages does not need to process anything server-side and so opening a shared URL loads the app normally before client-side decoding.

### No browser storage

Do not add `localStorage`, `sessionStorage`, cookies, or IndexedDB for practice data. If a future feature needs persistence, prefer extending the hash schema or adding explicit import/export text that the user controls.

### Time precision

Times are normalized to milliseconds (`0.001s`) by `roundSeconds`. Inputs accept raw seconds or clock notation. The loop ticker runs every 50 ms and seeks back slightly before/at section end to keep loops responsive with the YouTube IFrame API.

### YouTube integration

The app uses the public YouTube IFrame API and requests the privacy-enhanced embed host (`youtube-nocookie.com`) for the player iframe. Playback speed is set per active section. If a video exposes a limited set of playback rates, the nearest available playback rate is used.

## Safe extension points

- Add new encoded fields by bumping or carefully extending the compact schema in `compactState` and `inflateState`.
- Add section metadata by appending values to each section tuple; preserve existing tuple positions for backwards compatibility.
- Add UI features by updating `renderSections`, `handleSectionInput`, and `handleSectionClick` together.
- If moving JavaScript out of `index.html`, update tests and note that the user originally asked for an uploadable `index.html` page.

## Verification checklist after changes

Run:

```zsh
npm test
```

Also manually verify in a browser:

1. Load a YouTube video.
2. Add at least two sections.
3. Edit start/end with millisecond precision.
4. Set different speeds per section.
5. Copy the share URL.
6. Open the share URL in a fresh tab and confirm all state loads from the URL.
