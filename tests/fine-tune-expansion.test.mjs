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

const amountButtons = [0.05, 0.1, 0.25, 0.5, 1].map(amount => ({
  dataset: { nudgeAmount: String(amount) },
  pressed: "",
  setAttribute(name, value) {
    if (name === "aria-pressed") this.pressed = value;
  }
}));
const amountSandbox = {
  elements: {
    nudgeAmountButtons: {
      querySelectorAll() {
        return amountButtons;
      }
    }
  }
};

vm.createContext(amountSandbox);
vm.runInContext(`
  const NUDGE_AMOUNTS = [0.05, 0.1, 0.25, 0.5, 1];
  const DEFAULT_NUDGE_AMOUNT = 0.1;
  let selectedNudgeAmount = DEFAULT_NUDGE_AMOUNT;
  ${extractFunction("getNudgeAmount", "setNudgeAmount")}
  ${extractFunction("setNudgeAmount", "stepNudgeAmount")}
  ${extractFunction("stepNudgeAmount", "nudgeSelected")}
  this.getNudgeAmount = getNudgeAmount;
  this.setNudgeAmount = setNudgeAmount;
  this.stepNudgeAmount = stepNudgeAmount;
`, amountSandbox);

assert.equal(amountSandbox.getNudgeAmount(), 0.1, "0.1s should be the default amount");
amountSandbox.setNudgeAmount("0.5");
assert.equal(amountSandbox.getNudgeAmount(), 0.5);
assert.deepEqual(amountButtons.map(button => button.pressed), ["false", "false", "false", "true", "false"]);
amountSandbox.setNudgeAmount("0.3");
assert.equal(amountSandbox.getNudgeAmount(), 0.5, "unsupported amounts should be ignored");
assert.deepEqual(amountButtons.map(button => button.pressed), ["false", "false", "false", "true", "false"]);

amountSandbox.setNudgeAmount(0.1);
amountSandbox.stepNudgeAmount(-1);
assert.equal(amountSandbox.getNudgeAmount(), 0.05);
assert.deepEqual(amountButtons.map(button => button.pressed), ["true", "false", "false", "false", "false"]);
amountSandbox.stepNudgeAmount(-1);
assert.equal(amountSandbox.getNudgeAmount(), 0.05, "decreasing at the minimum should not wrap");

for (const expected of [0.1, 0.25, 0.5, 1]) {
  amountSandbox.stepNudgeAmount(1);
  assert.equal(amountSandbox.getNudgeAmount(), expected);
}
assert.deepEqual(amountButtons.map(button => button.pressed), ["false", "false", "false", "false", "true"]);
amountSandbox.stepNudgeAmount(1);
assert.equal(amountSandbox.getNudgeAmount(), 1, "increasing at the maximum should not wrap");

for (const expected of [0.5, 0.25, 0.1, 0.05]) {
  amountSandbox.stepNudgeAmount(-1);
  assert.equal(amountSandbox.getNudgeAmount(), expected);
}
amountSandbox.stepNudgeAmount(0);
assert.equal(amountSandbox.getNudgeAmount(), 0.05, "invalid directions should be ignored");

const expansionState = {
  activeIndex: 0,
  sections: [
    { id: "first" },
    { id: "second" }
  ]
};
const expansionCalls = {
  selected: [],
  renders: 0,
  synchronizedRenders: 0
};
const expansionSandbox = {
  state: expansionState,
  selectSection(index) {
    expansionState.activeIndex = index;
    expansionCalls.selected.push(index);
  },
  renderSections() {
    expansionCalls.renders += 1;
  },
  syncAndRender() {
    expansionCalls.synchronizedRenders += 1;
  }
};

vm.createContext(expansionSandbox);
vm.runInContext(`
  const expandedSectionIds = new Set(["first"]);
  ${extractFunction("toggleSection", "handleSectionFocus")}
  this.toggleSection = toggleSection;
  this.getExpandedIds = () => [...expandedSectionIds];
`, expansionSandbox);

expansionSandbox.toggleSection(1);
assert.deepEqual(Array.from(expansionSandbox.getExpandedIds()), ["second"], "opening a section should collapse all others");
assert.equal(expansionState.activeIndex, 1, "opening a section should make it active");
assert.deepEqual(expansionCalls.selected, [1]);
assert.equal(expansionCalls.synchronizedRenders, 1, "opening should synchronize active state to the URL");
assert.equal(expansionCalls.renders, 0);

expansionSandbox.toggleSection(1);
assert.deepEqual(Array.from(expansionSandbox.getExpandedIds()), [], "clicking an open section should collapse it");
assert.equal(expansionState.activeIndex, 1, "collapsing should not clear the active section");
assert.deepEqual(expansionCalls.selected, [1], "collapsing should not reselect the section");
assert.equal(expansionCalls.synchronizedRenders, 1);
assert.equal(expansionCalls.renders, 1, "collapsing only needs a view render");

expansionSandbox.toggleSection(99);
assert.deepEqual(Array.from(expansionSandbox.getExpandedIds()), []);
assert.equal(expansionCalls.synchronizedRenders, 1);
assert.equal(expansionCalls.renders, 1);

console.log("Fine Tune amounts and exclusive section expansion passed.");


