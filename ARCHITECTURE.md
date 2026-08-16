# Architecture Notes

## Goal and constraints

This is a static-only GitHub Pages application for practicing YouTube sections. It has no build step, runtime package dependency, application server, or browser storage. Practice data is shareable through the URL hash.

The application uses native browser ES modules and an external stylesheet. Deploy `index.html`, the complete `resources/` folder, and the complete `src/` tree together, and use an HTTP static server for local development.

## Structure

```text
resources/
  favicon.svg                 Page favicon
  styles.css                  Application styles and responsive layout

src/
  application/
    app-controller.js       Application startup, state application, and lifecycle
    playback-controller.js  Selection, playback, speed, ticker, loop/advance rules
    section-controller.js   Section editing, expansion, insertion, deletion, nudging
    settings-controller.js  Playback-option use cases
    share-controller.js     URL synchronization and clipboard workflow
    video-controller.js     Video loading and title-metadata precedence
  config/
    constants.js            Schema/UI constants and selectable values
  domain/
    practice-state.js       State normalization and in-place replacement
    section.js              Section entities and boundary invariants
    speed.js                Speed normalization and nearest-rate selection
    time.js                 Time parsing, formatting, and precision
    video-id.js             YouTube ID sanitization
    video-title.js          Title normalization
  infrastructure/
    browser/location.js     Hash/history adapter
    url/state-codec.js      Compact v1 Base64URL codec
    url/youtube-url.js      YouTube URL parsing/formatting
    youtube/iframe-api-loader.js
    youtube/youtube-player.js
  presentation/
    app-view.js             Top-level title/control/readout rendering
    dom-elements.js         Required static-element registry
    event-bindings.js       DOM-event-to-use-case translation
    fine-tune-control.js    Runtime-only nudge amount selection
    formatters.js           Escaped labels and display formatting
    keyboard-shortcuts.js   Keyboard policy
    panel-layout.js         Responsive panel-height behavior
    section-scroller.js     Post-render section scrolling
    section-view.js         Section HTML and narrow live updates
    status-presenter.js     Element-specific cancellable statuses
  main.js                   Composition root
```

`tests/` mirrors these source folders. `tests/main.test.mjs` verifies the deployment entry point, static markup, responsive CSS, no-storage rule, and mirrored folder contract.

## Dependency and design rules

The refactor favors SOLID principles without introducing classes where functions and injected ports are simpler:

1. **Single responsibility:** domain rules, application use cases, infrastructure effects, and DOM rendering live in separate modules.
2. **Open/closed:** controllers consume narrow ports (`player`, `location`, `view`, scheduler callbacks), so adapters can change without rewriting use cases.
3. **Liskov substitution:** test fakes implement the same small player/location/view contracts as browser adapters.
4. **Interface segregation:** controllers receive only operations they use rather than `window`, `document`, or the YouTube global.
5. **Dependency inversion:** `main.js` constructs concrete adapters and injects them. Application controllers do not read browser globals directly.

Keep `main.js` as a composition root. New behavior belongs in the narrowest applicable domain/controller/view/adapter module, not in `main.js`.

## Runtime flow

1. `index.html` loads `resources/styles.css` and `src/main.js`; it contains no inline CSS or application JavaScript.
2. `main.js` resolves required DOM elements and constructs state, views, adapters, and controllers.
3. `app-controller.start()` decodes the current hash, applies normalized state, binds DOM/player/hash listeners, starts responsive layout observation, and starts the 50 ms ticker.
4. Event bindings translate DOM events into controller calls; they do not own state transitions.
5. Controllers mutate the shared normalized state and request narrow rendering or full URL/render synchronization.

The YouTube adapter dynamically appends the IFrame API script only after installing its readiness callback. It uses `youtube-nocookie.com` as the player host and exposes a narrow player interface. Loading failures are surfaced through the video status UI.

## URL-only state

State is encoded under `#ytp=...` as compact Base64URL JSON. The v1 shape is:

```js
const compactState = {
  v: 1,
  y: "VIDEO_ID",
  t: "Video title", // optional
  l: 1,
  n: 1,             // optional; move-next enabled
  r: 0,             // optional; section-speed control disabled
  s: [
    ["", 12.345, 18.9, 0.75]
  ]
};
```

Compatibility rules:

- Preserve schema version `1`, tuple positions, and omission defaults unless intentionally introducing a migration.
- Active selection is never encoded; legacy `a` fields are ignored.
- Omitted `r` means section-speed control is enabled.
- Titles require a valid video ID.
- Times are normalized to non-negative milliseconds.
- Do not add `localStorage`, `sessionStorage`, cookies, or IndexedDB for practice data.

Runtime-only values include active selection, expanded section IDs, Fine Tune amount, player readiness, boundary locks, pending metadata, timers, observers, and animation frames.

## Important behavior contracts

- Full section-list rendering is appropriate after structural changes. Live name/time input uses narrow `textContent`/value updates to preserve focus, selection, and raw user text.
- Dynamic state rendered into HTML must be escaped. Narrow text updates must use `textContent`.
- Expanding a section is exclusive and makes it active; collapsing it does not clear active selection.
- Adding after the first section starts at the final displayed section's end. Inserting starts at the selected section's end without moving later sections.
- Deletion expands and activates the final remaining section.
- Playing a section enables looping. Automatic advancement does not.
- Move-next takes precedence before the final section; the final section loops only when looping is enabled.
- A 500 ms destination lock prevents stale pre-seek playheads from immediately crossing another boundary.
- Disabling section speed applies exact `1×` without changing saved speeds. Selecting a speed re-enables speed control.
- Configured/manual titles are never overwritten by player metadata; metadata must match both the pending and current video IDs.
- Successful temporary statuses cancel prior timers on the same element. Persistent errors have no hide timer.
- Share hash updates use `history.replaceState`; the hash-assignment fallback suppresses only its own `hashchange` event.

## Extension guidance

- New deterministic business rules: `src/domain/` with direct unit tests in `tests/domain/`.
- New state-changing use cases: `src/application/`, depending on injected narrow ports.
- Browser, URL, or third-party effects: `src/infrastructure/` behind an adapter.
- DOM rendering or interaction policy: `src/presentation/`.
- New source folders must be mirrored under `tests/`; the structure contract enforces this.
- Add required static element IDs to both `index.html` and `ELEMENT_IDS`.

## Verification

Run:

```zsh
npm run check
npm test
npm run test-coverage
```

Coverage uses Node 24's built-in V8 test coverage. Every `src/**/*.js` module must appear in the report, and the enforced aggregate line, function, and branch thresholds are all 100%; because no file can exceed 100%, an aggregate 100% also requires every reported source module to be 100%.

### Test coverage policy

- Test coverage must always remain at **100% for lines, functions, and branches** across every `src/**/*.js` module.
- Every production-code change must add or update tests for all new and changed behavior, including error paths and boundary cases.
- Never lower the thresholds, exclude production modules, or remove assertions merely to make the coverage command pass.
- A change is not complete until `npm run test-coverage` succeeds with every source module reporting 100% in all three metrics.

For manual browser verification, serve the repository over HTTP and check video loading, section add/insert/delete, focused live edits, Fine Tune shortcuts, speed toggling, loop/advance transitions, title metadata precedence, copied URL restoration, responsive section scrolling, and clipboard fallback.
