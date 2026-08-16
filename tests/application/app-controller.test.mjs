import assert from "node:assert/strict";
import test from "node:test";

import { createAppController } from "../../src/application/app-controller.js";
import { normalizeState } from "../../src/domain/practice-state.js";

function createHarness(readState = normalizeState({})) {
  const readStateFromLocation = typeof readState === "function" ? readState : () => readState;
  const state = normalizeState({ sections: [{ id: "old", start: 0, end: 1 }] });
  const expandedSectionIds = new Set(["old"]);
  const calls = {
    titles: 0, inputs: [], controls: 0, shares: 0, syncs: 0, selects: 0,
    sections: 0, prepares: 0, loads: [], guards: 0, statuses: [], panelStart: 0,
    panelStop: 0, tickerStart: 0, tickerStop: 0, eventCleanup: 0, hashCleanup: 0,
    playerCleanup: 0
  };
  let hashListener;
  const controller = createAppController({
    state,
    expandedSectionIds,
    elements: { shareStatus: {} },
    appView: {
      renderVideoTitle: () => { calls.titles += 1; },
      renderVideoInput: id => calls.inputs.push(id),
      renderControls: () => { calls.controls += 1; }
    },
    sectionView: {
      renderActiveSelect: () => { calls.selects += 1; },
      render: () => { calls.sections += 1; }
    },
    shareController: {
      renderShareUrl: () => { calls.shares += 1; },
      syncUrl: () => { calls.syncs += 1; }
    },
    videoController: {
      prepareTitleCapture: () => { calls.prepares += 1; },
      loadVideoById: async id => { calls.loads.push(id); },
      bindPlayerEvents: () => [() => { calls.playerCleanup += 1; }]
    },
    playbackController: {
      guardSectionBoundary: () => { calls.guards += 1; },
      getActiveSection: () => null,
      startTicker: () => { calls.tickerStart += 1; },
      stopTicker: () => { calls.tickerStop += 1; }
    },
    location: {
      readState: readStateFromLocation,
      onHashChange(listener) {
        hashListener = listener;
        return () => { calls.hashCleanup += 1; };
      }
    },
    statusPresenter: { setStatus: (...args) => calls.statuses.push(args) },
    setVideoStatus: (...args) => calls.statuses.push(args),
    panelLayout: {
      start: () => { calls.panelStart += 1; },
      stop: () => { calls.panelStop += 1; }
    }
  });
  return { state, expandedSectionIds, calls, controller, getHashListener: () => hashListener };
}

test("applyState replaces state, clears runtime expansion, and renders", async () => {
  const harness = createHarness();
  harness.controller.applyState({
    videoId: "abcdefghijk",
    videoTitle: "Title",
    sections: [{ start: 1, end: 2 }]
  }, { loadVideo: true, syncUrl: true });
  await Promise.resolve();

  assert.equal(harness.state.videoId, "abcdefghijk");
  assert.equal(harness.expandedSectionIds.size, 0);
  assert.equal(harness.calls.prepares, 1);
  assert.equal(harness.calls.guards, 1);
  assert.deepEqual(harness.calls.inputs, ["abcdefghijk"]);
  assert.deepEqual(harness.calls.loads, ["abcdefghijk"]);
  assert.equal(harness.calls.syncs, 1);
  assert.equal(harness.calls.sections, 1);
});

test("start and stop own all event, player, layout, and ticker lifecycles", () => {
  const shared = normalizeState({ videoId: "abcdefghijk" });
  const harness = createHarness(shared);
  harness.controller.start(() => () => { harness.calls.eventCleanup += 1; });
  assert.equal(harness.calls.panelStart, 1);
  assert.equal(harness.calls.tickerStart, 1);
  assert.equal(typeof harness.getHashListener(), "function");
  assert.match(harness.calls.statuses[0][0], /Loaded state/);

  harness.controller.stop();
  assert.equal(harness.calls.eventCleanup, 1);
  assert.equal(harness.calls.hashCleanup, 1);
  assert.equal(harness.calls.playerCleanup, 1);
  assert.equal(harness.calls.panelStop, 1);
  assert.equal(harness.calls.tickerStop, 1);
});

test("syncAndRender synchronizes once and refreshes every view", () => {
  const harness = createHarness();
  harness.controller.syncAndRender();
  assert.equal(harness.calls.syncs, 1);
  assert.equal(harness.calls.titles, 1);
  assert.equal(harness.calls.shares, 1);
  assert.equal(harness.calls.selects, 1);
  assert.equal(harness.calls.sections, 1);
  assert.equal(harness.calls.controls, 1);
});

test("hash changes report both successful and malformed state", () => {
  const successful = createHarness(normalizeState({ videoId: "abcdefghijk" }));
  successful.controller.handleHashChange();
  assert.equal(successful.state.videoId, "abcdefghijk");
  assert.equal(successful.calls.statuses.at(-1)[1], "Loaded updated state from the URL.");
  assert.equal(successful.calls.statuses.at(-1)[2], "good");

  const malformed = createHarness(() => { throw new Error("bad hash"); });
  malformed.controller.handleHashChange();
  assert.match(malformed.calls.statuses.at(-1)[1], /bad hash/);
  assert.equal(malformed.calls.statuses.at(-1)[2], "bad");
});

test("empty and malformed startup use their status and fallback paths", () => {
  const empty = createHarness();
  empty.controller.start(() => undefined);
  assert.equal(empty.calls.statuses[0][0], "Paste a YouTube URL to begin.");
  empty.controller.stop();
  assert.equal(empty.calls.eventCleanup, 0);

  const malformed = createHarness(() => { throw new Error("broken share"); });
  malformed.controller.start(() => null);
  assert.match(malformed.calls.statuses[0][0], /broken share/);
  assert.equal(malformed.calls.statuses[0][1], "bad");
  assert.equal(malformed.calls.syncs, 1, "fallback state should replace the invalid URL");
  assert.equal(malformed.state.videoId, "");
});

test("default state application and stop-before-start are safe", () => {
  const harness = createHarness();
  harness.controller.applyState({});
  assert.deepEqual(harness.calls.loads, []);
  assert.equal(harness.calls.syncs, 0);
  harness.controller.stop();
  assert.equal(harness.calls.eventCleanup, 0);
  assert.equal(harness.calls.hashCleanup, 0);
  assert.equal(harness.calls.playerCleanup, 0);
  assert.equal(harness.calls.panelStop, 1);
  assert.equal(harness.calls.tickerStop, 1);
});

