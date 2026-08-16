import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const indexHtml = readFileSync(join(root, "index.html"), "utf8");

const match = indexHtml.match(/\/\* URL_STATE_UTILS_START \*\/[\s\S]*?\/\* URL_STATE_UTILS_END \*\//);
assert.ok(match, "URL state utility block should exist in index.html");

const sandbox = {
  URL,
  URLSearchParams,
  TextEncoder,
  TextDecoder,
  Number,
  Math,
  Date: class FixedDate extends Date {
    static now() {
      return 1_700_000_000_000;
    }
  }
};

Object.defineProperties(sandbox, {
  btoa: { value: value => Buffer.from(value, "binary").toString("base64") },
  atob: { value: value => Buffer.from(value, "base64").toString("binary") }
});

vm.createContext(sandbox);
vm.runInContext(`${match[0]}
this.utils = {
  STATE_VERSION,
  SHARE_HASH_KEY,
  roundSeconds,
  roundSpeed,
  extractYouTubeId,
  formatYouTubeUrl,
  parseTimeInput,
  formatTime,
  normalizeState,
  compactState,
  inflateState,
  encodeStateToHash,
  decodeStateFromHash
};`, sandbox);

const {
  extractYouTubeId,
  formatYouTubeUrl,
  parseTimeInput,
  formatTime,
  normalizeState,
  encodeStateToHash,
  decodeStateFromHash,
  roundSpeed
} = sandbox.utils;

assert.equal(extractYouTubeId("dQw4w9WgXcQ"), "dQw4w9WgXcQ");
assert.equal(extractYouTubeId("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s"), "dQw4w9WgXcQ");
assert.equal(extractYouTubeId("https://youtu.be/dQw4w9WgXcQ?si=abc"), "dQw4w9WgXcQ");
assert.equal(extractYouTubeId("https://www.youtube.com/embed/dQw4w9WgXcQ"), "dQw4w9WgXcQ");
assert.equal(extractYouTubeId("https://notyoutube.com/watch?v=dQw4w9WgXcQ"), "");
assert.equal(extractYouTubeId("not a video"), "");
assert.equal(formatYouTubeUrl("dQw4w9WgXcQ"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
assert.equal(formatYouTubeUrl(""), "");

const formattedInputAssignments = indexHtml.match(/elements\.videoInput\.value = formatYouTubeUrl\((?:state\.)?videoId\);/g) || [];
assert.equal(formattedInputAssignments.length, 2, "direct and shared-state loads should display full YouTube URLs");

assert.equal(parseTimeInput("83.250"), 83.25);
assert.equal(parseTimeInput("1:23.250"), 83.25);
assert.equal(parseTimeInput("01:02:03.250"), 3723.25);
assert.equal(parseTimeInput("1,250"), 1.25);
assert.ok(Number.isNaN(parseTimeInput("1:bad")));
assert.equal(formatTime(83.25), "01:23.250");
assert.equal(formatTime(3723.25), "01:02:03.250");

assert.equal(roundSpeed(0.1), 0.25);
assert.equal(roundSpeed(3), 1.5);
assert.equal(roundSpeed(0.7554), 0.755);

const state = normalizeState({
  videoId: "dQw4w9WgXcQ",
  loop: true,
  activeIndex: 1,
  sections: [
    { name: "Verse 🎸", start: 12.3454, end: 24.9996, speed: 0.75 },
    { name: "Chorus", start: 60, end: 75.125, speed: 1.25 }
  ]
});

const hash = encodeStateToHash(state);
assert.match(hash, /^#ytp=[A-Za-z0-9_-]+$/);
assert.equal(hash.includes("="), true, "hash should include key separator");

const decoded = decodeStateFromHash(hash);
assert.equal(decoded.videoId, "dQw4w9WgXcQ");
assert.equal(decoded.loop, true);
assert.equal(decoded.activeIndex, 1);
assert.equal(decoded.sections.length, 2);
assert.equal(decoded.sections[0].name, "Verse 🎸");
assert.equal(decoded.sections[0].start, 12.345);
assert.equal(decoded.sections[0].end, 25);
assert.equal(decoded.sections[0].speed, 0.75);
assert.equal(decoded.sections[1].speed, 1.25);

const empty = decodeStateFromHash("");
assert.equal(empty.videoId, "");
assert.equal(empty.activeIndex, -1);
assert.equal(Array.isArray(empty.sections), true);
assert.equal(empty.sections.length, 0);

assert.throws(() => decodeStateFromHash("#ytp=invalid"));

console.log("URL state utilities passed.");
