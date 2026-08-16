import assert from "node:assert/strict";
import test from "node:test";

import { createSectionController } from "../../src/application/section-controller.js";

function createHarness({ withOnSectionAdded = true } = {}) {
  const state = {
    useSectionSpeed: false,
    activeIndex: 0,
    sections: [
      { id: "a", name: "First", start: 4, end: 10, speed: 0.75 },
      { id: "b", name: "Second", start: 20, end: 30, speed: 0.5 }
    ]
  };
  const expandedSectionIds = new Set(["a"]);
  const calls = {
    selected: [], renders: 0, activeSelects: 0, activeClasses: 0,
    controls: 0, syncs: 0, fullSyncs: 0, scrolls: [], names: [], times: [], speeds: 0, added: 0
  };
  let currentTime = 5;
  const playback = {
    selectSection(index) {
      state.activeIndex = state.sections[index] ? index : -1;
      calls.selected.push(index);
    },
    getCurrentPlayerTime: () => currentTime,
    getActiveSection: () => state.sections[state.activeIndex] || null,
    applyActiveSpeed: () => { calls.speeds += 1; },
    seekTo: value => calls.seeks = [...(calls.seeks || []), value]
  };
  const sectionView = {
    render: () => { calls.renders += 1; },
    renderActiveSelect: () => { calls.activeSelects += 1; },
    updateActiveClasses: () => { calls.activeClasses += 1; },
    updateName: (_state, index) => calls.names.push(index),
    updateTime: (_state, index, options) => calls.times.push([index, options])
  };
  const dependencies = {
    state,
    expandedSectionIds,
    playback,
    sectionView,
    appView: { renderControls: () => { calls.controls += 1; } },
    syncUrl: () => { calls.syncs += 1; },
    syncAndRender: () => { calls.fullSyncs += 1; },
    sectionScroller: { scrollSectionIntoView: id => calls.scrolls.push(id) }
  };
  if (withOnSectionAdded) dependencies.onSectionAdded = () => { calls.added += 1; };
  const controller = createSectionController(dependencies);
  return { state, expandedSectionIds, calls, controller, setCurrentTime: value => { currentTime = value; } };
}

test("expansion is exclusive and collapsing is view-only", () => {
  const { state, expandedSectionIds, calls, controller } = createHarness();
  controller.toggleSection(1);
  assert.deepEqual([...expandedSectionIds], ["b"]);
  assert.equal(state.activeIndex, 1);
  assert.equal(calls.fullSyncs, 1);
  controller.toggleSection(1);
  assert.deepEqual([...expandedSectionIds], []);
  assert.equal(state.activeIndex, 1);
  assert.equal(calls.renders, 1);
  assert.equal(controller.toggleSection(99), false);
});

test("adding and inserting sections expand, select, render, and scroll", () => {
  const { state, expandedSectionIds, calls, controller, setCurrentTime } = createHarness();
  setCurrentTime(999);
  const added = controller.addSectionAtPlayhead();
  assert.equal(added.start, 30, "later Add actions use the final displayed end");
  assert.equal(added.end, 38);
  assert.deepEqual([...expandedSectionIds], [added.id]);
  assert.equal(state.activeIndex, 2);
  assert.deepEqual(calls.scrolls, [added.id]);
  assert.equal(calls.added, 1);

  const inserted = controller.insertNewSectionAfter(0);
  assert.equal(inserted.start, 10);
  assert.equal(inserted.speed, 0.75);
  assert.equal(state.activeIndex, 1);
  assert.deepEqual([...expandedSectionIds], [inserted.id]);
  assert.equal(calls.scrolls.at(-1), inserted.id);
  assert.equal(controller.insertNewSectionAfter(99), null);
});

test("deletion expands and activates the final remaining section", () => {
  const { state, expandedSectionIds, calls, controller } = createHarness();
  assert.equal(controller.deleteSection(0), true);
  assert.deepEqual(state.sections.map(section => section.id), ["b"]);
  assert.deepEqual([...expandedSectionIds], ["b"]);
  assert.equal(state.activeIndex, 0);
  assert.equal(calls.fullSyncs, 1);
  assert.equal(controller.deleteSection(99), false);
  assert.deepEqual([...expandedSectionIds], ["b"]);
  controller.deleteSection(0);
  assert.equal(state.activeIndex, -1);
  assert.equal(expandedSectionIds.size, 0);
});

test("live names and times update narrowly without full rendering", () => {
  const { state, calls, controller } = createHarness();
  assert.equal(controller.updateSectionName(0, "x".repeat(130)), true);
  assert.equal(state.sections[0].name.length, 120);
  assert.deepEqual(calls.names, [0]);
  assert.equal(calls.syncs, 1);
  assert.equal(calls.activeSelects, 1);

  const focusedInput = {};
  assert.equal(controller.updateSectionTime(0, "start", 12, { render: false, preserveInput: focusedInput }), true);
  assert.deepEqual({ start: state.sections[0].start, end: state.sections[0].end }, { start: 12, end: 12 });
  assert.equal(calls.times[0][1].preserveInput, focusedInput);
  assert.equal(calls.fullSyncs, 0);
});

test("boundary, nudge, seek, and speed commands preserve invariants", () => {
  const { state, calls, controller, setCurrentTime } = createHarness();
  setCurrentTime(2);
  controller.setSectionBoundaryToNow(0, "end");
  assert.deepEqual({ start: state.sections[0].start, end: state.sections[0].end }, { start: 2, end: 2 });

  controller.copyBoundaryFromNeighbor(1, "start");
  assert.equal(state.sections[1].start, 2);
  controller.nudgeSelected("end", -100);
  assert.equal(state.sections[1].start, 0);
  assert.equal(state.sections[1].end, 0);

  const input = { dataset: { index: "1", field: "end" } };
  controller.nudgeTimeInput(input, 0.25);
  assert.equal(state.sections[1].end, 0.25);
  assert.equal(calls.times.length, 1);

  controller.updateSectionSpeed(1, "0.75");
  assert.equal(state.sections[1].speed, 0.75);
  assert.equal(state.useSectionSpeed, true);
  assert.equal(calls.speeds, 1);
  assert.ok(calls.syncs >= 2);

  controller.seekToBoundary(0, "start");
  assert.equal(calls.seeks.at(-1), state.sections[0].start);
});

test("focus activation ignores invalid/current sections and narrowly refreshes a new section", () => {
  const { state, calls, controller } = createHarness();
  assert.equal(controller.activateFromFocus("1"), false);
  assert.equal(controller.activateFromFocus(99), false);
  assert.equal(controller.activateFromFocus(0), false);
  assert.equal(controller.activateFromFocus(1), true);
  assert.equal(state.activeIndex, 1);
  assert.deepEqual(calls.selected, [1]);
  assert.equal(calls.syncs, 1);
  assert.equal(calls.activeSelects, 1);
  assert.equal(calls.activeClasses, 1);
  assert.equal(calls.controls, 1);
});

test("invalid section commands are safe no-ops", () => {
  const { state, calls, controller } = createHarness();
  assert.equal(controller.updateSectionTime(99, "start", 1), false);
  assert.equal(controller.updateSectionTime(0, "invalid", 1), false);
  assert.equal(controller.setSectionBoundaryToNow(99, "start"), false);
  assert.equal(controller.copyBoundaryFromNeighbor(99, "start"), false);
  assert.equal(controller.copyBoundaryFromNeighbor(0, "start"), false);
  assert.equal(controller.copyBoundaryFromNeighbor(0, "invalid"), false);
  assert.equal(controller.updateSectionSpeed(99, 1), false);
  assert.equal(controller.updateSectionName(99, "missing"), false);
  assert.equal(controller.nudgeSelected("invalid", 1), false);
  state.activeIndex = -1;
  assert.equal(controller.nudgeSelected("start", 1), false);
  assert.equal(controller.nudgeTimeInput(null, 1), false);
  assert.equal(controller.nudgeTimeInput({ dataset: { index: "x", field: "start" } }, 1), false);
  assert.equal(controller.nudgeTimeInput({ dataset: { index: "99", field: "start" } }, 1), false);
  assert.equal(controller.nudgeTimeInput({ dataset: { index: "0", field: "name" } }, 1), false);
  assert.equal(controller.seekToBoundary(99, "start"), false);
  assert.equal(controller.seekToBoundary(0, "invalid"), false);
  assert.equal(calls.fullSyncs, 0);
});

test("adding without an active section uses default speed and optional callback", () => {
  const { state, calls, controller } = createHarness({ withOnSectionAdded: false });
  state.activeIndex = -1;
  const section = controller.addSectionAtPlayhead();
  assert.equal(section.start, 30);
  assert.equal(section.speed, 1);
  assert.equal(calls.added, 0);
});

