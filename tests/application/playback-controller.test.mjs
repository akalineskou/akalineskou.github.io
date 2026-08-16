import assert from "node:assert/strict";
import test from "node:test";

import { createPlaybackController } from "../../src/application/playback-controller.js";

function createHarness() {
  const state = {
    loop: false,
    moveToNextSection: false,
    useSectionSpeed: true,
    activeIndex: 0,
    sections: [
      { id: "first", start: 4, end: 10, speed: 1.4 },
      { id: "second", start: 20, end: 30, speed: 0.5 }
    ]
  };
  const clock = { now: 1000 };
  const runtime = { currentTime: 0, playing: true, ready: true, rates: [0.5, 1, 1.5] };
  const calls = { rates: [], seeks: [], plays: 0, pauses: 0, syncs: 0, times: [], intervals: [], clears: [] };
  const player = {
    isReady: () => runtime.ready,
    isPlaying: () => runtime.playing,
    getCurrentTime: fallback => runtime.ready ? runtime.currentTime : fallback,
    getAvailablePlaybackRates: () => runtime.rates,
    setPlaybackRate: rate => calls.rates.push(rate),
    seek: time => calls.seeks.push(time),
    play: () => { calls.plays += 1; },
    pause: () => { calls.pauses += 1; }
  };
  const controller = createPlaybackController({
    state,
    player,
    view: { renderCurrentTime: value => calls.times.push(value) },
    syncAndRender: () => { calls.syncs += 1; },
    now: () => clock.now,
    setIntervalFn: (callback, delay) => {
      const id = calls.intervals.length + 1;
      calls.intervals.push({ id, callback, delay });
      return id;
    },
    clearIntervalFn: id => calls.clears.push(id)
  });
  const reset = () => {
    calls.rates.length = 0;
    calls.seeks.length = 0;
    calls.plays = 0;
    calls.pauses = 0;
    calls.syncs = 0;
    calls.times.length = 0;
    controller.guardSectionBoundary(null);
  };
  return { state, clock, runtime, calls, controller, reset };
}

test("playing a section selects, seeks, enables loop, and synchronizes once", () => {
  const { state, calls, controller } = createHarness();
  assert.equal(controller.playSection(1), true);
  assert.equal(state.activeIndex, 1);
  assert.equal(state.loop, true);
  assert.deepEqual(calls.seeks, [20]);
  assert.equal(calls.plays, 1);
  assert.equal(calls.syncs, 1);
  assert.equal(calls.rates.at(-1), 0.5);

  state.loop = false;
  assert.equal(controller.playSection(99), false);
  assert.equal(state.loop, false);
  assert.equal(calls.syncs, 1);
});

test("speed control maps enabled rates and forces exact 1x when disabled", () => {
  const { state, runtime, calls, controller } = createHarness();
  controller.applyActiveSpeed();
  assert.equal(calls.rates.at(-1), 1.5);
  const storedSpeed = state.sections[0].speed;
  state.useSectionSpeed = false;
  controller.applyActiveSpeed();
  assert.equal(calls.rates.at(-1), 1);
  assert.equal(state.sections[0].speed, storedSpeed);
  state.useSectionSpeed = true;
  state.activeIndex = -1;
  controller.applyActiveSpeed();
  assert.equal(calls.rates.at(-1), 1);
  runtime.ready = false;
  const count = calls.rates.length;
  controller.applyActiveSpeed();
  assert.equal(calls.rates.length, count);
});

test("destination lock prevents stale playheads from skipping a section", () => {
  const { state, clock, runtime, calls, controller, reset } = createHarness();
  state.moveToNextSection = true;
  state.activeIndex = 1;
  runtime.currentTime = 30;
  controller.playSection(0);
  controller.tick();
  assert.equal(state.activeIndex, 0);
  assert.deepEqual(calls.seeks, [4]);

  runtime.currentTime = 4;
  clock.now += 501;
  controller.tick();
  assert.equal(state.activeIndex, 0);
  runtime.currentTime = 10;
  controller.tick();
  assert.equal(state.activeIndex, 1);
  assert.deepEqual(calls.seeks, [4, 20]);

  reset();
  controller.tick();
  assert.equal(calls.times.length, 1, "ticker should always refresh the time readout");
});

test("move-next precedence and final-section looping remain stable", () => {
  const { state, runtime, calls, controller, reset } = createHarness();
  state.loop = true;
  state.moveToNextSection = true;
  state.activeIndex = 0;
  runtime.currentTime = 10;
  controller.tick();
  assert.equal(state.activeIndex, 1);
  assert.deepEqual(calls.seeks, [20]);
  assert.equal(calls.syncs, 1);

  reset();
  state.activeIndex = 1;
  runtime.currentTime = 30;
  controller.tick();
  assert.equal(state.activeIndex, 1);
  assert.deepEqual(calls.seeks, [20]);
  assert.equal(calls.syncs, 0);

  reset();
  state.loop = false;
  controller.tick();
  assert.deepEqual(calls.seeks, []);
  assert.equal(calls.plays, 0);

  reset();
  state.loop = true;
  state.moveToNextSection = false;
  state.activeIndex = 0;
  runtime.currentTime = 10;
  controller.tick();
  assert.deepEqual(calls.seeks, [4]);
});

test("changing the selector only continues playback when an active section was playing", () => {
  const { state, runtime, calls, controller, reset } = createHarness();
  controller.handleActiveSectionChange(1);
  assert.equal(state.activeIndex, 1);
  assert.equal(state.loop, true);
  assert.deepEqual(calls.seeks, [20]);

  reset();
  runtime.playing = false;
  state.loop = false;
  controller.handleActiveSectionChange(0);
  assert.equal(state.activeIndex, 0);
  assert.equal(state.loop, false);
  assert.deepEqual(calls.seeks, []);
  assert.equal(calls.syncs, 1);

  reset();
  runtime.playing = true;
  controller.handleActiveSectionChange(-1);
  assert.equal(state.activeIndex, -1);
  assert.deepEqual(calls.seeks, []);
});

test("play/pause delegates only when the adapter is ready", () => {
  const { runtime, calls, controller } = createHarness();
  controller.togglePlayPause();
  assert.equal(calls.pauses, 1);
  runtime.playing = false;
  controller.togglePlayPause();
  assert.equal(calls.plays, 1);
  runtime.ready = false;
  controller.togglePlayPause();
  assert.equal(calls.plays, 1);
});

test("direct helpers round values, honor fallbacks, and use desired rate when availability is unknown", () => {
  const { state, runtime, calls, controller } = createHarness();
  runtime.rates = [];
  controller.applyActiveSpeed();
  assert.equal(calls.rates.at(-1), 1.4);
  controller.seekTo(1.2345);
  assert.equal(calls.seeks.at(-1), 1.235);
  assert.equal(controller.getCurrentPlayerTime(), 0);
  runtime.ready = false;
  assert.equal(controller.getCurrentPlayerTime(), 0);
  assert.equal(controller.getCurrentPlayerTime({ fallback: 7.1234 }), 7.123);
  controller.playVideo();
  assert.equal(calls.plays, 0);
  runtime.ready = true;
  controller.playVideo();
  assert.equal(calls.plays, 1);

  state.activeIndex = 1;
  assert.equal(controller.playSection(), true);
  assert.equal(calls.seeks.at(-1), 20);
});

test("ticker early returns and boundary-lock outside paths are stable", () => {
  const { state, clock, runtime, calls, controller, reset } = createHarness();
  state.activeIndex = -1;
  controller.tick();
  state.activeIndex = 0;
  controller.tick();
  state.loop = true;
  runtime.ready = false;
  controller.tick();
  runtime.ready = true;
  runtime.playing = false;
  controller.tick();
  runtime.playing = true;
  runtime.currentTime = 9;
  controller.tick();
  assert.deepEqual(calls.seeks, []);

  reset();
  state.loop = true;
  runtime.currentTime = 0;
  controller.guardSectionBoundary(state.sections[0], 0);
  controller.tick();
  assert.deepEqual(calls.seeks, [], "an expired lock remains until the playhead reaches its section");
  runtime.currentTime = 4;
  controller.tick();
  runtime.currentTime = 10;
  controller.guardSectionBoundary(state.sections[0], 0);
  clock.now += 1;
  controller.tick();
  assert.deepEqual(calls.seeks, []);
});

test("ticker start, restart, callback, and stop own interval lifecycle", () => {
  const { calls, controller } = createHarness();
  controller.stopTicker();
  assert.deepEqual(calls.clears, []);
  controller.startTicker();
  assert.equal(calls.intervals[0].delay, 50);
  controller.startTicker();
  assert.deepEqual(calls.clears, [1]);
  calls.intervals[1].callback();
  assert.equal(calls.times.length, 1);
  controller.stopTicker();
  assert.deepEqual(calls.clears, [1, 2]);
});

