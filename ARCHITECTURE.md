# Architecture Notes for Future Agents

## Goal

This is intentionally a greenfield, static-only GitHub Pages app. The user wanted a single webpage (`index.html`) that can be uploaded and used without an application server. All practice data must be shareable through the URL and must not depend on browser storage.

## Files

- `index.html` — complete application: markup, CSS, JavaScript, YouTube IFrame API integration, URL codec, and UI behavior.
- `README.md` — usage, deployment, and test instructions.
- `ARCHITECTURE.md` — this handoff file.
- `package.json` — no runtime dependencies; provides `npm test`.
- `tests/url-state.test.mjs` — extracts and tests the URL-state utility block from `index.html`.
- `tests/layout.test.mjs` — checks responsive panel placement and collapsible-section markup contracts.
- `tests/section-actions.test.mjs` — tests section insertion, deletion, and neighbor-boundary behavior.
- `tests/status.test.mjs` — tests cancellable, element-specific temporary status messages.
- `tests/scroll.test.mjs` — tests post-render scrolling to newly created sections.
- `tests/playback.test.mjs` — tests section playback and automatic loop enabling.
- `tests/playback-speed.test.mjs` — tests section-speed enablement, exact `1×` bypass, and speed-selection auto-enable behavior.
- `tests/keyboard-shortcuts.test.mjs` — tests focused-only time nudging and visible-panel amount shortcuts with editable-target protection.
- `tests/fine-tune-expansion.test.mjs` — tests Fine Tune amount selection, clamped keyboard stepping, and exclusive active section expansion.
- `tests/section-name.test.mjs` — tests immediate, focus-preserving section-summary name updates.
- `tests/section-time-input.test.mjs` — tests immediate manual boundary summaries without replacing the focused input value.
- `tests/video-title.test.mjs` — tests configured-title precedence, metadata capture, input visibility, and browser-title updates.

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
  t: "Video title",  // optional: YouTube title; omitted when empty
  l: 1,              // loop enabled, 1 or 0
  n: 1,              // optional: move to next section when enabled
  r: 0,              // optional: disable section-speed control; omission means enabled
  s: [               // sections
    ["", 12.345, 18.9, 0.75] // name may be empty
  ]
};
```

The hash is used instead of query parameters so GitHub Pages does not need to process anything server-side and so opening a shared URL loads the app normally before client-side decoding.

The active section index is runtime-only UI state. It is not encoded, and legacy `a` fields are ignored so shared URLs always open without selecting a section.

### No browser storage

Do not add `localStorage`, `sessionStorage`, cookies, or IndexedDB for practice data. If a future feature needs persistence, prefer extending the hash schema or adding explicit import/export text that the user controls.

### Time precision

Times are normalized to milliseconds (`0.001s`) by `roundSeconds`. Inputs accept raw seconds or clock notation. The ticker runs every 50 ms and can advance to the next displayed section or loop the active section. Move-to-next takes precedence before the final section; the final section loops only when looping is enabled.

### YouTube integration

The app uses the public YouTube IFrame API and requests the privacy-enhanced embed host (`youtube-nocookie.com`) for the player iframe. When a configuration has no saved title, matching player metadata supplies one; a configured or manually edited title is never overwritten. Section-speed control is enabled by default; disabling it applies exactly `1×` without mutating stored section speeds. Selecting a section speed re-enables control. If a video exposes a limited set of playback rates, enabled section speeds use the nearest available rate.

## Safe extension points

- Add global metadata through carefully extended optional top-level fields in `compactState` and `inflateState`; preserve omission defaults for legacy v1 URLs.
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
2. Add a first section at the playhead, then move the playhead and confirm later Add actions start from the final section’s end instead.
3. Confirm new sections show only `1.`, `2.`, etc.; type and clear a name while verifying summaries, the active selector, and shared URLs update immediately.
4. Verify fixed-width Start/End inputs, Now and neighbor buttons immediately after them, and Go aligned at the far right at desktop and narrow widths.
5. Rename a section and confirm its summary and active-section option update while typing without losing focus.
6. Verify `0.1s` is the default Fine Tune amount, `0.05s` is reachable below it, and “Press - / + to decrease / increase the amount.” appears on its own help line.
7. Confirm the compact `12rem` Active section control stays right-aligned, Current time takes the main row space, and all playback checkboxes span the row below across desktop and narrow widths.
8. Disable Use section speed and confirm playback applies `1×` while saved section values remain unchanged; selecting a speed must re-enable it.
9. Confirm Delete follows New section after and is aligned to the right; after deletion, the final remaining section should expand and become active.
10. Confirm the URL/title inputs and Load video button remain on one row, including when a title is visible.
11. Select a section and confirm the shared hash does not change or contain an `a` field.
12. Copy a URL and confirm the success message disappears after about three seconds; clipboard errors should remain visible.
13. Confirm the Share panel has no heading or help text and keeps Copy URL to the right of the URL textarea.
14. Copy enabled and disabled share URLs, verify their state in a fresh tab, and confirm a legacy URL defaults speed control to enabled.
