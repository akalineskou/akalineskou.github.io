import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(__dirname, "..", "index.html"), "utf8");
const match = indexHtml.match(/function playSection\(index = state\.activeIndex\)[\s\S]*?(?=\n\s*function getNudgeAmount)/);
assert.ok(match, "playSection should exist in index.html");
const tickMatch = indexHtml.match(/function tick\(\)[\s\S]*?(?=\n\s*function togglePlayPause)/);
assert.ok(tickMatch, "tick should exist in index.html");
const selectMatch = indexHtml.match(/function selectSection\(index\)[\s\S]*?(?=\n\s*function handleActiveSectionChange)/);
assert.ok(selectMatch, "selectSection should exist in index.html");
const selectChangeMatch = indexHtml.match(/function handleActiveSectionChange\(\)[\s\S]*?(?=\n\s*function insertNewSectionAfter)/);
assert.ok(selectChangeMatch, "handleActiveSectionChange should exist in index.html");

const state = {
  loop: false,
  moveToNextSection: false,
  activeIndex: 0,
  sections: [
    { id: "first", start: 4, end: 10 },
    { id: "second", start: 20, end: 30 }
  ]
};
let currentTime = 0;
let playing = true;
const clock = { now: 1_000 };
const calls = {
  applySpeed: 0,
  seek: [],
  play: 0,
  sync: 0
};
const sandbox = {
  state,
  clock,
  Date: { now: () => clock.now },
  elements: {
    currentTime: { textContent: "" },
    activeSectionSelect: { value: "-1" }
  },
  playerReady: true,
  getActiveSection() {
    return state.sections[state.activeIndex] || null;
  },
  getCurrentPlayerTime() {
    return currentTime;
  },
  formatTime(value) {
    return String(value);
  },
  isPlayerPlaying() {
    return playing;
  },
  applyActiveSpeed() {
    calls.applySpeed += 1;
  },
  seekTo(time) {
    calls.seek.push(time);
  },
  playVideo() {
    calls.play += 1;
  },
  syncAndRender() {
    calls.sync += 1;
  }
};

vm.createContext(sandbox);
vm.runInContext(`let boundaryTransitionSectionId = "";
let boundaryTransitionUntil = 0;
${selectMatch[0]}
${selectChangeMatch[0]}
${match[0]}
${tickMatch[0]}
this.playSection = playSection;
this.handleActiveSectionChange = handleActiveSectionChange;
this.tick = tick;
this.clearBoundaryLock = () => { boundaryTransitionSectionId = ""; boundaryTransitionUntil = 0; };
this.advanceTime = milliseconds => clock.now += milliseconds;`, sandbox);
const { playSection, handleActiveSectionChange, tick, clearBoundaryLock, advanceTime } = sandbox;

playSection(1);
assert.equal(state.activeIndex, 1);
assert.equal(state.loop, true, "playing a section should enable looping");
assert.equal(calls.applySpeed, 1);
assert.deepEqual(calls.seek, [20]);
assert.equal(calls.play, 1);
assert.equal(calls.sync, 1, "loop and active-section state should synchronize exactly once");

state.loop = false;
state.activeIndex = 0;
playSection(99);
assert.equal(state.loop, false, "invalid playback should not change loop state");
assert.equal(state.activeIndex, 0);
assert.equal(calls.applySpeed, 1);
assert.deepEqual(calls.seek, [20]);
assert.equal(calls.play, 1);
assert.equal(calls.sync, 1);

function resetCalls() {
  calls.applySpeed = 0;
  calls.seek.length = 0;
  calls.play = 0;
  calls.sync = 0;
  clearBoundaryLock();
}

resetCalls();
state.loop = false;
state.moveToNextSection = true;
state.activeIndex = 1;
currentTime = 30;
playSection(0);
assert.equal(state.activeIndex, 0);
assert.deepEqual(calls.seek, [4]);
tick();
assert.equal(state.activeIndex, 0, "a stale Section 2 playhead must not immediately re-advance Section 1");
assert.deepEqual(calls.seek, [4]);
assert.equal(calls.sync, 1);
currentTime = 4;
advanceTime(501);
tick();
assert.equal(state.activeIndex, 0, "the destination lock should release after the seek settles");
currentTime = 10;
tick();
assert.equal(state.activeIndex, 1, "normal move-to-next should resume after the destination is reached");
assert.deepEqual(calls.seek, [4, 20]);

resetCalls();
state.loop = false;
state.moveToNextSection = true;
state.activeIndex = 0;
currentTime = 10;
tick();
assert.equal(state.activeIndex, 1);
assert.equal(state.loop, false, "automatic advancement must not enable looping");
assert.equal(calls.applySpeed, 1);
assert.deepEqual(calls.seek, [20]);
assert.equal(calls.play, 1);
assert.equal(calls.sync, 1);

tick();
assert.equal(state.activeIndex, 1, "a stale playhead must not trigger another transition");
assert.equal(calls.sync, 1);

resetCalls();
state.loop = true;
state.moveToNextSection = true;
state.activeIndex = 0;
currentTime = 10;
tick();
assert.equal(state.activeIndex, 1, "move-to-next should take precedence before the final section");
assert.deepEqual(calls.seek, [20]);

resetCalls();
state.loop = true;
state.moveToNextSection = true;
state.activeIndex = 1;
currentTime = 30;
tick();
assert.equal(state.activeIndex, 1);
assert.deepEqual(calls.seek, [20], "the final section should loop when looping is enabled");
assert.equal(calls.sync, 0);

resetCalls();
state.loop = false;
state.moveToNextSection = true;
state.activeIndex = 1;
currentTime = 30;
tick();
assert.deepEqual(calls.seek, [], "the final section should continue normally when looping is disabled");
assert.equal(calls.play, 0);

resetCalls();
state.loop = true;
state.moveToNextSection = false;
state.activeIndex = 0;
currentTime = 10;
tick();
assert.equal(state.activeIndex, 0);
assert.deepEqual(calls.seek, [4], "disabled move-to-next should preserve normal section looping");

resetCalls();
playing = true;
state.loop = false;
state.activeIndex = 0;
sandbox.elements.activeSectionSelect.value = "1";
handleActiveSectionChange();
assert.equal(state.activeIndex, 1);
assert.equal(state.loop, true);
assert.deepEqual(calls.seek, [20], "changing the selector while a section plays should play the destination");
assert.equal(calls.play, 1);
assert.equal(calls.sync, 1);

resetCalls();
playing = false;
state.loop = false;
state.activeIndex = 1;
sandbox.elements.activeSectionSelect.value = "0";
handleActiveSectionChange();
assert.equal(state.activeIndex, 0);
assert.equal(state.loop, false);
assert.deepEqual(calls.seek, [], "changing the selector while paused should not seek or play");
assert.equal(calls.play, 0);
assert.equal(calls.sync, 1);

resetCalls();
playing = true;
state.activeIndex = 0;
sandbox.elements.activeSectionSelect.value = "-1";
handleActiveSectionChange();
assert.equal(state.activeIndex, -1);
assert.deepEqual(calls.seek, [], "selecting None should never start playback");
assert.equal(calls.play, 0);
assert.equal(calls.sync, 1);

resetCalls();
playing = true;
state.activeIndex = -1;
sandbox.elements.activeSectionSelect.value = "1";
handleActiveSectionChange();
assert.equal(state.activeIndex, 1);
assert.deepEqual(calls.seek, [], "without an active playing section, selection should remain selection-only");
assert.equal(calls.play, 0);
assert.equal(calls.sync, 1);

console.log("Section playback loop enabling passed.");

