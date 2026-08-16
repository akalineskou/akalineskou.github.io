import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(__dirname, "..", "index.html"), "utf8");
const match = indexHtml.match(/function setStatus\(element,[\s\S]*?(?=\n\s*function getBaseUrl)/);
assert.ok(match, "setStatus should exist in index.html");

let nextTimer = 1;
const callbacks = new Map();
const delays = new Map();
const cleared = new Set();
const sandbox = {
  WeakMap,
  setTimeout(callback, delay) {
    const timer = nextTimer++;
    callbacks.set(timer, callback);
    delays.set(timer, delay);
    return timer;
  },
  clearTimeout(timer) {
    cleared.add(timer);
  }
};

vm.createContext(sandbox);
vm.runInContext(`const statusHideTimers = new WeakMap();
${match[0]}
this.setStatus = setStatus;`, sandbox);
const { setStatus } = sandbox;

const videoStatus = { textContent: "", className: "status" };
setStatus(videoStatus, "Loaded state from the URL.", "good", 3000);
assert.equal(videoStatus.textContent, "Loaded state from the URL.");
assert.equal(videoStatus.className, "status good");
assert.equal(delays.get(1), 3000);

setStatus(videoStatus, "YouTube player error", "bad", 3000);
assert.equal(cleared.has(1), true, "a newer status should cancel the boot timer");
callbacks.get(1)();
assert.equal(videoStatus.textContent, "YouTube player error", "a stale timer must not erase a newer message");
assert.equal(videoStatus.className, "status bad");
callbacks.get(2)();
assert.equal(videoStatus.textContent, "", "the newer video message should also auto-hide");
assert.equal(videoStatus.className, "status");

const shareStatus = { textContent: "", className: "status" };
setStatus(shareStatus, "Share URL copied to clipboard.", "good", 3000);
setStatus(videoStatus, "Temporary video message", "good", 1000);
callbacks.get(3)();
assert.equal(shareStatus.textContent, "", "successful Share feedback should auto-hide");
assert.equal(shareStatus.className, "status");
assert.equal(videoStatus.textContent, "Temporary video message", "Share timers must not affect video status");
callbacks.get(4)();
assert.equal(videoStatus.textContent, "");
assert.equal(videoStatus.className, "status");

setStatus(shareStatus, "Clipboard unavailable.", "bad");
setStatus(videoStatus, "Another temporary video message", "good", 1000);
callbacks.get(5)();
assert.equal(shareStatus.textContent, "Clipboard unavailable.", "video timers must not affect persistent Share errors");
assert.equal(shareStatus.className, "status bad");

console.log("Temporary status handling passed.");

