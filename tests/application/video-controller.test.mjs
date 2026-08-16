import assert from "node:assert/strict";
import test from "node:test";

import { createVideoController } from "../../src/application/video-controller.js";

function createHarness() {
  const state = { videoId: "abcdefghijk", videoTitle: "" };
  const calls = { documentTitleRenders: 0, titleRenders: 0, inputs: [], syncs: 0, fullSyncs: 0, statuses: [], loads: [], speeds: 0 };
  const events = new Map();
  let videoData = {};
  let loadImplementation = async id => { calls.loads.push(id); };
  const player = {
    getVideoData: () => videoData,
    load: id => loadImplementation(id),
    on(name, listener) {
      events.set(name, listener);
      return () => events.delete(name);
    }
  };
  const controller = createVideoController({
    state,
    player,
    playback: { applyActiveSpeed: () => { calls.speeds += 1; } },
    appView: {
      renderDocumentTitle: () => { calls.documentTitleRenders += 1; },
      renderVideoTitle: () => { calls.titleRenders += 1; },
      renderVideoInput: id => calls.inputs.push(id)
    },
    syncUrl: () => { calls.syncs += 1; },
    syncAndRender: () => { calls.fullSyncs += 1; },
    setVideoStatus: (...args) => calls.statuses.push(args)
  });
  return {
    state,
    calls,
    events,
    controller,
    setVideoData: data => { videoData = data; },
    setLoadImplementation: implementation => { loadImplementation = implementation; }
  };
}

test("manual and configured titles take precedence over metadata", () => {
  const { state, calls, controller, setVideoData } = createHarness();
  state.videoTitle = "Configured title";
  controller.prepareTitleCapture();
  setVideoData({ video_id: state.videoId, title: "Metadata" });
  assert.equal(controller.captureVideoTitleFromPlayer(), false);
  assert.equal(state.videoTitle, "Configured title");

  controller.handleVideoTitleInput("  Edited title 🎸  ");
  assert.equal(state.videoTitle, "Edited title 🎸");
  assert.equal(calls.documentTitleRenders, 1);
  assert.equal(calls.titleRenders, 0, "manual edits must not rewrite the focused title input");
  assert.equal(calls.syncs, 1);
});

test("only matching player metadata fills a missing title once", () => {
  const { state, calls, controller, setVideoData } = createHarness();
  controller.prepareTitleCapture();
  setVideoData({ video_id: "zyxwvutsrqp", title: "Wrong" });
  assert.equal(controller.captureVideoTitleFromPlayer(), false);
  assert.equal(state.videoTitle, "");

  setVideoData({ video_id: state.videoId, title: "  Metadata title 🎹  " });
  assert.equal(controller.captureVideoTitleFromPlayer(), true);
  assert.equal(state.videoTitle, "Metadata title 🎹");
  assert.equal(calls.syncs, 1);
  assert.equal(controller.captureVideoTitleFromPlayer(), false);
  assert.equal(calls.syncs, 1);
});

test("input loading validates IDs, clears stale titles, and delegates asynchronously", async () => {
  const { state, calls, controller } = createHarness();
  state.videoTitle = "Old title";
  assert.equal(controller.loadVideoFromInput("invalid"), false);
  assert.match(calls.statuses.at(-1)[0], /valid YouTube URL/);

  assert.equal(controller.loadVideoFromInput("https://youtu.be/zyxwvutsrqp"), true);
  assert.equal(state.videoId, "zyxwvutsrqp");
  assert.equal(state.videoTitle, "");
  assert.deepEqual(calls.inputs, ["zyxwvutsrqp"]);
  assert.equal(calls.fullSyncs, 1);
  await Promise.resolve();
  assert.deepEqual(calls.loads, ["zyxwvutsrqp"]);
});

test("player lifecycle events refresh metadata/speed and surface errors", () => {
  const { calls, events, controller } = createHarness();
  const remove = controller.bindPlayerEvents();
  assert.equal(remove.length, 4);
  events.get("ready")();
  events.get("stateChange")();
  events.get("playbackRateChange")();
  assert.equal(calls.speeds, 3);
  events.get("error")({ data: 101 });
  assert.match(calls.statuses.at(-1)[0], /error 101/);
  remove.forEach(unsubscribe => unsubscribe());
  assert.equal(events.size, 0);
});

test("video loading reports success, explicit errors, and fallback errors", async () => {
  const { calls, controller, setLoadImplementation } = createHarness();
  assert.equal(await controller.loadVideoById(""), false);
  assert.equal(await controller.loadVideoById("abcdefghijk"), true);
  assert.deepEqual(calls.loads, ["abcdefghijk"]);
  assert.equal(calls.speeds, 1);

  setLoadImplementation(async () => { throw new Error("network down"); });
  assert.equal(await controller.loadVideoById("abcdefghijk"), false);
  assert.deepEqual(calls.statuses.at(-1), ["network down", "bad"]);

  setLoadImplementation(async () => { throw {}; });
  assert.equal(await controller.loadVideoById("abcdefghijk"), false);
  assert.deepEqual(calls.statuses.at(-1), ["Could not load the YouTube player.", "bad"]);
});

test("metadata rejection paths and same-video reload preserve configured state", () => {
  const { state, controller, setVideoData } = createHarness();
  assert.equal(controller.captureVideoTitleFromPlayer(), false, "capture requires a pending video");
  state.videoId = "";
  controller.prepareTitleCapture();
  assert.equal(controller.captureVideoTitleFromPlayer(), false);

  state.videoId = "abcdefghijk";
  controller.prepareTitleCapture();
  setVideoData({ video_id: "invalid", title: "Title" });
  assert.equal(controller.captureVideoTitleFromPlayer(), false);
  setVideoData({ video_id: state.videoId, title: "   " });
  assert.equal(controller.captureVideoTitleFromPlayer(), false);

  state.videoTitle = "Keep me";
  assert.equal(controller.loadVideoFromInput(state.videoId), true);
  assert.equal(state.videoTitle, "Keep me");
});


