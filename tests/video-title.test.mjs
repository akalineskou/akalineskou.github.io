import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(__dirname, "..", "index.html"), "utf8");
const titleFunctions = indexHtml.match(/function handleVideoTitleInput\(\)[\s\S]*?(?=\n\s*function loadVideoFromInput\b)/);
const normalizer = indexHtml.match(/function normalizeVideoTitle\(value\)[\s\S]*?(?=\n\s*function normalizeState\b)/);
assert.ok(titleFunctions, "video-title runtime functions should exist in index.html");
assert.ok(normalizer, "video-title normalizer should exist in index.html");

const state = { videoId: "abcdefghijk", videoTitle: "" };
const elements = { videoTitleInput: { hidden: true, value: "" } };
const document = { title: "" };
let syncs = 0;
const sandbox = {
  state,
  elements,
  document,
  sanitizeYouTubeId(value) {
    return /^[a-zA-Z0-9_-]{11}$/.test(String(value || "")) ? String(value) : "";
  },
  syncUrl() {
    syncs += 1;
  }
};

vm.createContext(sandbox);
vm.runInContext(`
  const APP_TITLE = "YouTube Practice Sections";
  let pendingVideoTitleId = "";
  let player = null;
  ${normalizer[0]}
  ${titleFunctions[0]}
  this.api = {
    handleVideoTitleInput,
    renderVideoTitle,
    captureVideoTitleFromPlayer,
    setPending(value) { pendingVideoTitleId = value; },
    getPending() { return pendingVideoTitleId; },
    setPlayer(value) { player = value; }
  };
`, sandbox);

const { api } = sandbox;
api.renderVideoTitle();
assert.equal(elements.videoTitleInput.hidden, false, "the title input should show when a video ID is loaded");
assert.equal(document.title, "YouTube Practice Sections");

state.videoId = "";
state.videoTitle = "";
api.renderVideoTitle();
assert.equal(elements.videoTitleInput.hidden, true, "the title input should hide without a loaded video");
assert.equal(document.title, "YouTube Practice Sections");

state.videoId = "abcdefghijk";
elements.videoTitleInput.value = "  Edited title 🎸  ";
api.setPending(state.videoId);
api.handleVideoTitleInput();
assert.equal(state.videoTitle, "Edited title 🎸");
assert.equal(api.getPending(), "", "manual edits should stop automatic metadata replacement");
assert.equal(document.title, "YouTube Practice Sections: Edited title 🎸");
assert.equal(syncs, 1, "manual title edits should persist to the URL");

state.videoTitle = "Configured title";
api.setPending(state.videoId);
api.setPlayer({ getVideoData: () => ({ video_id: state.videoId, title: "YouTube metadata title" }) });
api.captureVideoTitleFromPlayer();
assert.equal(state.videoTitle, "Configured title", "metadata must not overwrite a configured title");
assert.equal(syncs, 1);

state.videoTitle = "";
api.setPending(state.videoId);
api.setPlayer({ getVideoData: () => ({ video_id: "zyxwvutsrqp", title: "Wrong video" }) });
api.captureVideoTitleFromPlayer();
assert.equal(state.videoTitle, "", "stale metadata from another video must be ignored");
assert.equal(api.getPending(), state.videoId, "a mismatch should remain eligible for a later matching player event");
assert.equal(syncs, 1);

api.setPlayer({ getVideoData: () => ({ video_id: state.videoId, title: "  Metadata title 🎹  " }) });
api.captureVideoTitleFromPlayer();
assert.equal(state.videoTitle, "Metadata title 🎹");
assert.equal(elements.videoTitleInput.value, "Metadata title 🎹");
assert.equal(document.title, "YouTube Practice Sections: Metadata title 🎹");
assert.equal(api.getPending(), "");
assert.equal(syncs, 2, "captured metadata should persist once");

api.captureVideoTitleFromPlayer();
assert.equal(syncs, 2, "settled metadata should not be persisted repeatedly");

console.log("YouTube title behavior passed.");

