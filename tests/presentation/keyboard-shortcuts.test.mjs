import assert from "node:assert/strict";
import test from "node:test";

import {
  createKeyboardShortcuts,
  isSectionTimeInput,
  isTypingTarget
} from "../../src/presentation/keyboard-shortcuts.js";

function keyboardEvent(key, target, modifiers = {}) {
  return {
    key,
    target,
    defaultPrevented: false,
    ...modifiers,
    prevented: false,
    preventDefault() { this.prevented = true; }
  };
}

test("editable-target classification is explicit", () => {
  assert.equal(isTypingTarget({ tagName: "INPUT" }), true);
  assert.equal(isTypingTarget({ tagName: "TEXTAREA" }), true);
  assert.equal(isTypingTarget({ tagName: "SELECT" }), true);
  assert.equal(isTypingTarget({ tagName: "DIV", isContentEditable: true }), true);
  assert.equal(isTypingTarget({ tagName: "BUTTON" }), false);
  assert.equal(isTypingTarget(null), false);
  assert.equal(isSectionTimeInput({ dataset: { timeInput: "true", field: "start" } }), true);
  assert.equal(isSectionTimeInput({ dataset: { timeInput: "true", field: "end" } }), true);
  assert.equal(isSectionTimeInput({ dataset: { timeInput: "true", field: "name" } }), false);
  assert.equal(isSectionTimeInput({}), false);
  assert.equal(isSectionTimeInput(null), false);
  assert.equal(isSectionTimeInput({ dataset: { field: "name" } }), false);
});

test("Fine Tune shortcuts are scoped to boundary inputs and the visible panel", () => {
  const calls = { nudges: [], steps: [] };
  let visible = true;
  const handler = createKeyboardShortcuts({
    getNudgeAmount: () => 0.25,
    nudgeTimeInput: (input, delta) => calls.nudges.push([input, delta]),
    stepNudgeAmount: direction => calls.steps.push(direction),
    isFineTuneVisible: () => visible,
    togglePlayPause() {},
    playSection() {},
    hasActiveSection: () => true,
    setActiveBoundaryToNow() {}
  });
  const startInput = { tagName: "INPUT", dataset: { timeInput: "true", field: "start" } };

  const decrease = keyboardEvent(",", startInput);
  handler(decrease);
  assert.equal(decrease.prevented, true);
  assert.equal(calls.nudges[0][1], -0.25);
  const increase = keyboardEvent(".", startInput);
  handler(increase);
  assert.equal(increase.prevented, true);
  assert.equal(calls.nudges[1][1], 0.25);

  for (const [key, direction] of [["-", -1], ["_", -1], ["=", 1], ["+", 1]]) {
    const event = keyboardEvent(key, startInput);
    handler(event);
    assert.equal(event.prevented, true);
    assert.equal(calls.steps.at(-1), direction);
  }

  const nameInput = { tagName: "INPUT", dataset: { field: "name" } };
  const typing = keyboardEvent("-", nameInput);
  handler(typing);
  assert.equal(typing.prevented, false);

  for (const modifier of ["ctrlKey", "metaKey", "altKey"]) {
    const modified = keyboardEvent("=", { tagName: "BODY" }, { [modifier]: true });
    handler(modified);
    assert.equal(modified.prevented, false);
  }

  visible = false;
  const hidden = keyboardEvent("+", startInput);
  handler(hidden);
  assert.equal(hidden.prevented, false);
});

test("global playback and boundary shortcuts invoke only their use cases", () => {
  const calls = [];
  let active = true;
  const handler = createKeyboardShortcuts({
    getNudgeAmount: () => 0.1,
    nudgeTimeInput() {},
    stepNudgeAmount() {},
    isFineTuneVisible: () => false,
    togglePlayPause: () => calls.push("toggle"),
    playSection: () => calls.push("play"),
    hasActiveSection: () => active,
    setActiveBoundaryToNow: field => calls.push(field)
  });
  const body = { tagName: "BODY" };

  for (const key of [" ", "p", "s", "e"]) handler(keyboardEvent(key, body));
  assert.deepEqual(calls, ["toggle", "play", "start", "end"]);
  active = false;
  const inactiveStart = keyboardEvent("s", body);
  handler(inactiveStart);
  assert.equal(inactiveStart.prevented, true);
  assert.deepEqual(calls, ["toggle", "play", "start", "end"]);
  const inactiveEnd = keyboardEvent("e", body);
  handler(inactiveEnd);
  assert.equal(inactiveEnd.prevented, true);
  assert.deepEqual(calls, ["toggle", "play", "start", "end"]);

  active = true;
  handler(keyboardEvent("P", body));
  assert.equal(calls.at(-1), "play");
  const typing = keyboardEvent("p", { tagName: "INPUT" });
  handler(typing);
  assert.equal(typing.prevented, false);
  const unknown = keyboardEvent("?", body);
  const missing = keyboardEvent(undefined, body);
  handler(unknown);
  handler(missing);
  assert.equal(unknown.prevented, false);
  assert.equal(missing.prevented, false);

  const handled = keyboardEvent("p", body);
  handled.defaultPrevented = true;
  handler(handled);
  assert.equal(handled.prevented, false);
});


