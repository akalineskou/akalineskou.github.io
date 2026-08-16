import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(__dirname, "..", "index.html"), "utf8");

function extractFunction(name, nextName, nextIsAsync = false) {
  const nextPrefix = nextIsAsync ? "async function" : "function";
  const match = indexHtml.match(new RegExp(`function ${name}\\([^]*?(?=\\n\\s*${nextPrefix} ${nextName}\\b)`));
  assert.ok(match, `${name} should exist in index.html`);
  return match[0];
}

const state = {
  useSectionSpeed: true,
  activeIndex: 0,
  sections: [
    { speed: 1.4 },
    { speed: 0.5 }
  ]
};
const calls = { rates: [], syncs: 0 };
let availableRates = [0.5, 1, 1.5];
const sandbox = {
  state,
  elements: { useSectionSpeedToggle: { checked: true } },
  playerReady: true,
  player: {
    setPlaybackRate(rate) {
      calls.rates.push(rate);
    },
    getAvailablePlaybackRates() {
      return availableRates;
    }
  },
  getActiveSection() {
    return state.sections[state.activeIndex] || null;
  },
  roundSpeed(value) {
    return Number(value);
  },
  syncUrl() {
    calls.syncs += 1;
  }
};

vm.createContext(sandbox);
vm.runInContext(`
  ${extractFunction("updateSectionSpeed", "updateSectionActiveClasses")}
  ${extractFunction("applyActiveSpeed", "nearestNumber")}
  ${extractFunction("nearestNumber", "copyShareUrl", true)}
  this.updateSectionSpeed = updateSectionSpeed;
  this.applyActiveSpeed = applyActiveSpeed;
`, sandbox);

sandbox.applyActiveSpeed();
assert.deepEqual(calls.rates, [1.5], "enabled section speed should map to the nearest available rate");

state.useSectionSpeed = false;
const storedSpeed = state.sections[0].speed;
sandbox.applyActiveSpeed();
assert.deepEqual(calls.rates, [1.5, 1], "disabled section speed should apply exactly 1x");
assert.equal(state.sections[0].speed, storedSpeed, "disabling must not mutate the stored section speed");

state.useSectionSpeed = true;
state.activeIndex = -1;
sandbox.applyActiveSpeed();
assert.equal(calls.rates.at(-1), 1, "no active section should apply exactly 1x");

state.activeIndex = 1;
state.useSectionSpeed = false;
sandbox.elements.useSectionSpeedToggle.checked = false;
availableRates = [0.5, 0.75, 1];
sandbox.updateSectionSpeed(1, "0.75");
assert.equal(state.sections[1].speed, 0.75);
assert.equal(state.useSectionSpeed, true, "choosing a section speed should enable speed control");
assert.equal(sandbox.elements.useSectionSpeedToggle.checked, true);
assert.equal(calls.rates.at(-1), 0.75, "the newly selected speed should apply immediately");
assert.equal(calls.syncs, 1);

const ratesBeforeInvalidUpdate = calls.rates.length;
sandbox.updateSectionSpeed(99, 1.25);
assert.equal(calls.rates.length, ratesBeforeInvalidUpdate);
assert.equal(calls.syncs, 1);

console.log("Section speed control passed.");


