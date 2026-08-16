import assert from "node:assert/strict";
import test from "node:test";

import { createEventBindings } from "../../src/presentation/event-bindings.js";

function makeBindings(calls, updateTimeResult = true) {
  const sectionController = {
    updateSectionName: (...args) => calls.push(["name", ...args]),
    updateSectionTime: (...args) => { calls.push(["time", ...args]); return updateTimeResult; },
    updateSectionSpeed: (...args) => calls.push(["speed", ...args]),
    toggleSection: index => calls.push(["toggle", index]),
    deleteSection: index => calls.push(["delete", index]),
    insertNewSectionAfter: index => calls.push(["insert", index]),
    setSectionBoundaryToNow: (...args) => calls.push(["now", ...args]),
    seekToBoundary: (...args) => calls.push(["seek", ...args]),
    copyBoundaryFromNeighbor: (...args) => calls.push(["copy", ...args]),
    activateFromFocus: index => calls.push(["focus", index])
  };
  return createEventBindings({
    documentObject: {},
    elements: {},
    videoController: {},
    playbackController: { playSection: index => calls.push(["play", index]) },
    settingsController: {},
    sectionController,
    shareController: { syncUrl: () => calls.push(["sync"]) },
    fineTuneControl: {},
    handleKeyboardShortcuts() {}
  });
}

test("delegated input handlers preserve raw focused values", () => {
  const calls = [];
  const bindings = makeBindings(calls);
  const classes = [];
  const input = {
    dataset: { index: "0", field: "start", timeInput: "true" },
    value: "3",
    classList: {
      toggle: (...args) => classes.push(args),
      add: (...args) => classes.push(args)
    }
  };

  bindings.handleSectionInput({ target: input });
  assert.deepEqual(classes[0], ["invalid", false]);
  assert.equal(calls[0][0], "time");
  assert.equal(calls[0][3], 3);
  assert.equal(calls[0][4].render, false);
  assert.equal(calls[0][4].preserveInput, input);
  assert.deepEqual(calls[1], ["sync"]);

  input.value = "partial";
  bindings.handleSectionInput({ target: input });
  assert.deepEqual(classes.at(-1), ["invalid", true]);
  assert.equal(calls.length, 2);

  bindings.handleSectionInput({
    target: { dataset: { index: "1", field: "name" }, value: "Verse" }
  });
  assert.deepEqual(calls.at(-1), ["name", 1, "Verse"]);
});

test("delegated change, click, and focus handlers route commands", () => {
  const calls = [];
  const bindings = makeBindings(calls);
  bindings.handleSectionChange({
    target: { dataset: { index: "2", field: "speed" }, value: "0.75" }
  });
  assert.deepEqual(calls.at(-1), ["speed", 2, "0.75"]);

  const button = { dataset: { index: "1", action: "play-section" } };
  bindings.handleSectionClick({ target: { closest: () => button } });
  assert.deepEqual(calls.at(-1), ["play", 1]);

  const card = { dataset: { index: "1" } };
  bindings.handleSectionFocus({
    target: { closest: selector => selector.startsWith("[") ? null : card }
  });
  assert.deepEqual(calls.at(-1), ["focus", 1]);
});

test("delegated handlers cover rejected changes and every section action", () => {
  const calls = [];
  const bindings = makeBindings(calls, false);
  const classes = [];
  const target = {
    dataset: { index: "0", field: "start", timeInput: "true" },
    value: "2",
    classList: { toggle() {}, add: value => classes.push(value) }
  };

  bindings.handleSectionInput({ target: { dataset: { index: "0", field: "other" } } });
  bindings.handleSectionInput({ target });
  assert.equal(calls.some(call => call[0] === "sync"), false);
  bindings.handleSectionChange({ target: { dataset: { field: "name" } } });
  bindings.handleSectionChange({ target });
  assert.deepEqual(classes, ["invalid"]);
  target.value = "bad";
  bindings.handleSectionChange({ target });
  assert.deepEqual(classes, ["invalid", "invalid"]);

  bindings.handleSectionClick({ target: {} });
  bindings.handleSectionClick({ target: { closest: () => ({ dataset: { index: "x", action: "delete" } }) } });
  const actions = [
    ["toggle-section", "toggle"],
    ["delete", "delete"],
    ["insert-after", "insert"],
    ["play-section", "play"],
    ["set-start-now", "now"],
    ["set-end-now", "now"],
    ["seek-to-start", "seek"],
    ["seek-to-end", "seek"],
    ["start-from-previous-section", "copy"],
    ["end-from-next-section", "copy"]
  ];
  for (const [action, expectedCall] of actions) {
    bindings.handleSectionClick({ target: { closest: () => ({ dataset: { index: "1", action } }) } });
    assert.equal(calls.at(-1)[0], expectedCall);
  }
  const callsBeforeUnknown = calls.length;
  bindings.handleSectionClick({ target: { closest: () => ({ dataset: { index: "1", action: "unknown" } }) } });
  assert.equal(calls.length, callsBeforeUnknown);

  bindings.handleSectionFocus({ target: { closest: () => ({ dataset: { index: "1" } }) } });
  bindings.handleSectionFocus({ target: { closest: () => null } });
});

function makeEventTarget(initial = {}) {
  return {
    ...initial,
    listeners: new Map(),
    addEventListener(name, listener) { this.listeners.set(name, listener); },
    removeEventListener(name, listener) {
      if (this.listeners.get(name) === listener) this.listeners.delete(name);
    },
    dispatch(name, event = {}) { this.listeners.get(name)?.(event); }
  };
}

test("bind wires every static control, is idempotent, and removes every listener", async () => {
  const calls = [];
  const elementNames = [
    "player",
    "loadVideoButton", "videoInput", "videoTitleInput", "playPauseButton",
    "loopToggle", "useSectionSpeedToggle", "moveToNextSectionToggle",
    "activeSectionSelect", "addSectionButton", "copyShareButton",
    "nudgeAmountButtons", "nudgeStartDownButton", "nudgeStartUpButton",
    "nudgeEndDownButton", "nudgeEndUpButton", "sectionList"
  ];
  const elements = Object.fromEntries(elementNames.map(name => [name, makeEventTarget()]));
  elements.player.id = "player";
  Object.assign(elements.videoInput, { value: "video-url" });
  Object.assign(elements.videoTitleInput, { value: "Video title" });
  Object.assign(elements.loopToggle, { checked: true });
  Object.assign(elements.useSectionSpeedToggle, { checked: false });
  Object.assign(elements.moveToNextSectionToggle, { checked: true });
  Object.assign(elements.activeSectionSelect, { value: "2" });
  const documentObject = makeEventTarget();
  const bindings = createEventBindings({
    documentObject,
    elements,
    videoController: {
      loadVideoFromInput: value => calls.push(["load", value]),
      handleVideoTitleInput: value => calls.push(["title", value])
    },
    playbackController: {
      togglePlayPause: () => calls.push(["toggle-play"]),
      handleActiveSectionChange: index => calls.push(["active", index]),
      playSection: index => calls.push(["play", index])
    },
    settingsController: {
      setLoop: value => calls.push(["loop", value]),
      setUseSectionSpeed: value => calls.push(["use-speed", value]),
      setMoveToNextSection: value => calls.push(["move-next", value])
    },
    sectionController: {
      addSectionAtPlayhead: () => calls.push(["add"]),
      nudgeSelected: (...args) => calls.push(["nudge", ...args]),
      updateSectionName() {}, updateSectionTime: () => true, updateSectionSpeed() {},
      toggleSection() {}, deleteSection() {}, insertNewSectionAfter() {},
      setSectionBoundaryToNow() {}, seekToBoundary() {},
      copyBoundaryFromNeighbor() {}, activateFromFocus() {}
    },
    shareController: {
      copyShareUrl: async () => calls.push(["copy-url"]),
      syncUrl() {}
    },
    fineTuneControl: {
      getAmount: () => 0.25,
      setAmount: value => calls.push(["amount", value])
    },
    handleKeyboardShortcuts: event => calls.push(["keyboard", event.key])
  });

  const unbind = bindings.bind();
  assert.equal(bindings.bind(), unbind, "a second bind must not duplicate listeners");
  assert.equal(documentObject.listeners.has("pointerdown"), true);

  let blurCalls = 0;
  const playerIframe = {
    tagName: "IFRAME",
    id: "player",
    blur: () => { blurCalls += 1; }
  };
  documentObject.activeElement = playerIframe;
  documentObject.dispatch("pointerdown", { target: {} });
  assert.equal(blurCalls, 1);
  documentObject.dispatch("pointerdown", { target: playerIframe });
  documentObject.activeElement = { tagName: "IFRAME", id: "other", blur: () => { blurCalls += 1; } };
  documentObject.dispatch("pointerdown", { target: {} });
  documentObject.activeElement = { tagName: "BUTTON", blur: () => { blurCalls += 1; } };
  documentObject.dispatch("pointerdown", { target: {} });
  documentObject.activeElement = null;
  documentObject.dispatch("pointerdown", { target: {} });
  assert.equal(blurCalls, 1, "inside clicks, other iframes, and non-player elements must retain focus");

  elements.loadVideoButton.dispatch("click");
  elements.videoInput.dispatch("keydown", { key: "x" });
  elements.videoInput.dispatch("keydown", { key: "Enter" });
  elements.videoTitleInput.dispatch("input");
  elements.playPauseButton.dispatch("click");
  elements.loopToggle.dispatch("change");
  elements.useSectionSpeedToggle.dispatch("change");
  elements.moveToNextSectionToggle.dispatch("change");
  elements.activeSectionSelect.dispatch("change");
  elements.addSectionButton.dispatch("click");
  elements.copyShareButton.dispatch("click");
  elements.nudgeAmountButtons.dispatch("click", { target: {} });
  elements.nudgeAmountButtons.dispatch("click", {
    target: { closest: () => ({ dataset: { nudgeAmount: "0.5" } }) }
  });
  elements.nudgeStartDownButton.dispatch("click");
  elements.nudgeStartUpButton.dispatch("click");
  elements.nudgeEndDownButton.dispatch("click");
  elements.nudgeEndUpButton.dispatch("click");
  documentObject.dispatch("keydown", { key: "p" });
  await Promise.resolve();

  assert.deepEqual(calls.filter(call => call[0] === "load"), [["load", "video-url"], ["load", "video-url"]]);
  assert.deepEqual(calls.find(call => call[0] === "title"), ["title", "Video title"]);
  assert.deepEqual(calls.find(call => call[0] === "active"), ["active", 2]);
  assert.deepEqual(calls.find(call => call[0] === "amount"), ["amount", "0.5"]);
  assert.deepEqual(calls.filter(call => call[0] === "nudge"), [
    ["nudge", "start", -0.25], ["nudge", "start", 0.25],
    ["nudge", "end", -0.25], ["nudge", "end", 0.25]
  ]);

  unbind();
  assert.equal(documentObject.listeners.size, 0);
  assert.equal(Object.values(elements).every(element => element.listeners.size === 0), true);
  bindings.unbind();
  bindings.bind();
  assert.equal(documentObject.listeners.has("pointerdown"), true, "outside-pointer handling can be installed again");
  assert.equal(documentObject.listeners.has("keydown"), true, "bindings can be installed again after removal");
  bindings.unbind();
});

