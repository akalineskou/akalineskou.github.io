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

function makeTimeInput(field, initialValue) {
  let value = initialValue;
  let assignments = 0;
  let invalid = false;
  return {
    dataset: { index: "0", field, timeInput: "true" },
    selectionStart: 1,
    selectionEnd: 1,
    get value() {
      return value;
    },
    set value(nextValue) {
      assignments += 1;
      value = nextValue;
    },
    setUserValue(nextValue) {
      value = nextValue;
    },
    getAssignments() {
      return assignments;
    },
    classList: {
      toggle(_name, force) {
        invalid = force;
      },
      remove() {
        invalid = false;
      }
    },
    isInvalid() {
      return invalid;
    }
  };
}

const startInput = makeTimeInput("start", "1");
const endInput = makeTimeInput("end", "2");
const summary = { textContent: "1.000 – 2.000" };
const card = {
  querySelector(selector) {
    if (selector.includes('data-field="start"')) return startInput;
    if (selector.includes('data-field="end"')) return endInput;
    if (selector === ".section-summary-time") return summary;
    return null;
  }
};
const state = { sections: [{ start: 1, end: 2 }] };
const calls = { syncs: 0, updates: [] };
const sandbox = {
  state,
  elements: {
    sectionList: {
      querySelector() {
        return card;
      }
    }
  },
  parseTimeInput(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  },
  formatTime(value) {
    return Number(value).toFixed(3);
  },
  updateSectionTime(index, field, value, options) {
    calls.updates.push({ index, field, value, options });
    const section = state.sections[index];
    section[field] = value;
    if (section.start > section.end) section[field === "start" ? "end" : "start"] = value;
  },
  syncUrl() {
    calls.syncs += 1;
  }
};

vm.createContext(sandbox);
vm.runInContext(`
  ${extractFunction("handleSectionInput", "handleSectionChange")}
  ${extractFunction("updateSectionTimeDisplay", "handleKeyboardShortcuts")}
  this.handleSectionInput = handleSectionInput;
`, sandbox);

function inputTime(input, value) {
  input.setUserValue(value);
  sandbox.handleSectionInput({ target: input });
}

inputTime(startInput, "3");
assert.deepEqual(state.sections[0], { start: 3, end: 3 });
assert.equal(startInput.value, "3", "the focused input should retain the user's raw text");
assert.equal(startInput.getAssignments(), 0, "the focused input value must not be reassigned");
assert.equal(startInput.selectionStart, 1);
assert.equal(startInput.selectionEnd, 1);
assert.equal(endInput.value, "3.000", "a paired boundary changed by normalization should refresh");
assert.equal(summary.textContent, "3.000 – 3.000");
assert.equal(calls.syncs, 1);
assert.equal(calls.updates[0].options.render, false);

inputTime(startInput, "partial");
assert.equal(startInput.isInvalid(), true);
assert.deepEqual(state.sections[0], { start: 3, end: 3 }, "invalid input should not change state");
assert.equal(summary.textContent, "3.000 – 3.000", "invalid input should not change the summary");
assert.equal(calls.syncs, 1, "invalid input should not update the URL");

state.sections[0].start = 5;
state.sections[0].end = 6;
startInput.setUserValue("5");
endInput.setUserValue("4");
const endAssignmentsBefore = endInput.getAssignments();
sandbox.handleSectionInput({ target: endInput });
assert.deepEqual(state.sections[0], { start: 4, end: 4 });
assert.equal(endInput.value, "4", "the focused End input should retain raw text");
assert.equal(endInput.getAssignments(), endAssignmentsBefore);
assert.equal(startInput.value, "4.000");
assert.equal(summary.textContent, "4.000 – 4.000");
assert.equal(calls.syncs, 2);

console.log("Live manual section-time summaries passed.");

