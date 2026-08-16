import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(__dirname, "..", "index.html"), "utf8");

function extractFunction(name, nextName) {
  const match = indexHtml.match(new RegExp(`function ${name}\\([^]*?(?=\\n\\s*function ${nextName}\\b)`));
  assert.ok(match, `${name} should exist in index.html`);
  return match[0];
}

const source = [
  extractFunction("nudgeTimeInput", "updateSectionTimeDisplay"),
  extractFunction("handleKeyboardShortcuts", "isTypingTarget"),
  extractFunction("isTypingTarget", "isSectionTimeInput"),
  extractFunction("isSectionTimeInput", "startTicker")
].join("\n");

const state = {
  activeIndex: 0,
  sections: [{ start: 1, end: 2 }]
};
const calls = {
  updates: [],
  displays: [],
  syncs: 0,
  seeks: [],
  amountSteps: [],
  playPause: 0,
  playSection: 0,
  boundaries: []
};
let nudgeAmount = 0.25;
const fineTunePanel = { hidden: false };
const sandbox = {
  state,
  elements: { fineTunePanel },
  getNudgeAmount() {
    return nudgeAmount;
  },
  updateSectionTime(index, field, value, options) {
    calls.updates.push({ index, field, value, options });
    state.sections[index][field] = value;
  },
  updateSectionTimeDisplay(index) {
    calls.displays.push(index);
  },
  syncUrl() {
    calls.syncs += 1;
  },
  seekBy(delta) {
    calls.seeks.push(delta);
  },
  stepNudgeAmount(direction) {
    calls.amountSteps.push(direction);
  },
  togglePlayPause() {
    calls.playPause += 1;
  },
  playSection() {
    calls.playSection += 1;
  },
  setSectionBoundaryToNow(index, field) {
    calls.boundaries.push({ index, field });
  }
};

vm.createContext(sandbox);
vm.runInContext(`${source}\nthis.handleKeyboardShortcuts = handleKeyboardShortcuts;`, sandbox);
const { handleKeyboardShortcuts } = sandbox;

function keyboardEvent(key, target, defaultPrevented = false, modifiers = {}) {
  return {
    key,
    target,
    defaultPrevented,
    ...modifiers,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    }
  };
}

function assertLatestUpdate(index, field, value) {
  const update = calls.updates.at(-1);
  assert.equal(update.index, index);
  assert.equal(update.field, field);
  assert.equal(update.value, value);
  assert.equal(update.options.render, false);
}

const startInput = {
  tagName: "INPUT",
  dataset: { index: "0", field: "start", timeInput: "true" }
};
const endInput = {
  tagName: "INPUT",
  dataset: { index: "0", field: "end", timeInput: "true" }
};

const decreaseStart = keyboardEvent(",", startInput);
handleKeyboardShortcuts(decreaseStart);
assert.equal(decreaseStart.prevented, true);
assertLatestUpdate(0, "start", 0.75);
assert.deepEqual(calls.displays, [0]);
assert.equal(calls.syncs, 1);
assert.deepEqual(calls.seeks, [], "a focused boundary shortcut must not seek the video");

nudgeAmount = 1;
const increaseEnd = keyboardEvent(".", endInput);
handleKeyboardShortcuts(increaseEnd);
assert.equal(increaseEnd.prevented, true);
assertLatestUpdate(0, "end", 3);
assert.deepEqual(calls.displays, [0, 0]);
assert.equal(calls.syncs, 2);

const amountShortcutEvents = [
  [keyboardEvent("-", startInput), -1],
  [keyboardEvent("_", startInput, false, { shiftKey: true }), -1],
  [keyboardEvent("=", endInput), 1],
  [keyboardEvent("+", endInput, false, { shiftKey: true }), 1]
];
for (const [event, expectedDirection] of amountShortcutEvents) {
  handleKeyboardShortcuts(event);
  assert.equal(event.prevented, true);
  assert.equal(calls.amountSteps.at(-1), expectedDirection);
}
assert.deepEqual(calls.amountSteps, [-1, -1, 1, 1]);
assert.equal(calls.updates.length, 2, "amount shortcuts should not change section times");
assert.equal(calls.syncs, 2, "amount selection should remain UI-only");

for (const modifier of ["metaKey", "ctrlKey", "altKey"]) {
  for (const key of ["-", "="]) {
    const modified = keyboardEvent(key, { tagName: "BODY", dataset: {} }, false, { [modifier]: true });
    handleKeyboardShortcuts(modified);
    assert.equal(modified.prevented, false, `${modifier}+${key} should remain available to the browser`);
  }
}
assert.deepEqual(calls.amountSteps, [-1, -1, 1, 1]);

const nameInput = { tagName: "INPUT", dataset: { index: "0", field: "name" } };
const typingComma = keyboardEvent(",", nameInput);
handleKeyboardShortcuts(typingComma);
assert.equal(typingComma.prevented, false, "normal text inputs should keep punctuation typing");
assert.equal(calls.updates.length, 2);
assert.deepEqual(calls.seeks, []);

const editableTargets = [
  nameInput,
  { tagName: "TEXTAREA", dataset: {} },
  { tagName: "SELECT", dataset: {} },
  { tagName: "DIV", dataset: {}, isContentEditable: true }
];
for (const target of editableTargets) {
  for (const key of ["-", "_", "=", "+"]) {
    const typing = keyboardEvent(key, target, false, { shiftKey: key === "_" || key === "+" });
    handleKeyboardShortcuts(typing);
    assert.equal(typing.prevented, false, `${key} should remain available in unrelated editable controls`);
  }
}
assert.deepEqual(calls.amountSteps, [-1, -1, 1, 1]);

const globalAmountEvents = [
  [keyboardEvent("-", { tagName: "BODY", dataset: {} }), -1],
  [keyboardEvent("_", { tagName: "BUTTON", dataset: {} }, false, { shiftKey: true }), -1],
  [keyboardEvent("=", { tagName: "BODY", dataset: {} }), 1],
  [keyboardEvent("+", { tagName: "BUTTON", dataset: {} }, false, { shiftKey: true }), 1]
];
for (const [event, expectedDirection] of globalAmountEvents) {
  handleKeyboardShortcuts(event);
  assert.equal(event.prevented, true);
  assert.equal(calls.amountSteps.at(-1), expectedDirection);
}
assert.deepEqual(calls.amountSteps, [-1, -1, 1, 1, -1, -1, 1, 1]);

fineTunePanel.hidden = true;
for (const key of ["-", "_", "=", "+"]) {
  for (const target of [{ tagName: "BODY", dataset: {} }, startInput]) {
    const hiddenPanelShortcut = keyboardEvent(key, target, false, { shiftKey: key === "_" || key === "+" });
    handleKeyboardShortcuts(hiddenPanelShortcut);
    assert.equal(hiddenPanelShortcut.prevented, false, "amount shortcuts should be disabled while Fine Tune is hidden");
  }
}
assert.deepEqual(calls.amountSteps, [-1, -1, 1, 1, -1, -1, 1, 1]);
fineTunePanel.hidden = false;

const globalComma = keyboardEvent(",", { tagName: "BUTTON", dataset: {} });
const globalPeriod = keyboardEvent(".", { tagName: "BODY", dataset: {} });
handleKeyboardShortcuts(globalComma);
handleKeyboardShortcuts(globalPeriod);
assert.equal(globalComma.prevented, false);
assert.equal(globalPeriod.prevented, false);
assert.deepEqual(calls.seeks, [], "punctuation outside time inputs should not seek the video");

const alreadyHandled = keyboardEvent(".", endInput, true);
const alreadyHandledAmount = keyboardEvent("=", { tagName: "BODY", dataset: {} }, true);
handleKeyboardShortcuts(alreadyHandled);
handleKeyboardShortcuts(alreadyHandledAmount);
assert.equal(alreadyHandled.prevented, false);
assert.equal(alreadyHandledAmount.prevented, false);
assert.equal(calls.updates.length, 2);

console.log("Fine Tune keyboard shortcuts passed.");



