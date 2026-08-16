import assert from "node:assert/strict";
import test from "node:test";

import { createStatusPresenter } from "../../src/presentation/status-presenter.js";

test("temporary statuses cancel stale element-specific timers", () => {
  let nextTimer = 1;
  const callbacks = new Map();
  const delays = new Map();
  const cleared = new Set();
  const presenter = createStatusPresenter({
    setTimeoutFn(callback, delay) {
      const timer = nextTimer++;
      callbacks.set(timer, callback);
      delays.set(timer, delay);
      return timer;
    },
    clearTimeoutFn: timer => cleared.add(timer)
  });
  const video = { textContent: "", className: "status" };
  const share = { textContent: "", className: "status" };

  presenter.setStatus(video, "Loaded", "good", 3000);
  assert.equal(video.className, "status good");
  assert.equal(delays.get(1), 3000);
  presenter.setStatus(video, "Error", "bad", 3000);
  assert.equal(cleared.has(1), true);
  callbacks.get(1)();
  assert.equal(video.textContent, "Error");
  callbacks.get(2)();
  assert.deepEqual(video, { textContent: "", className: "status" });

  presenter.setStatus(share, "Copied", "good", 1000);
  presenter.setStatus(video, "Persistent", "bad");
  callbacks.get(3)();
  assert.equal(share.textContent, "");
  assert.equal(video.textContent, "Persistent");
});

