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

const summaries = [
  { textContent: "1. First" },
  { textContent: "2. Second" }
];
const cards = summaries.map(summary => ({
  querySelector(selector) {
    return selector === ".section-summary-name" ? summary : null;
  }
}));
const state = {
  sections: [
    { name: "First" },
    { name: "Second" }
  ]
};
const calls = { syncs: 0, activeSelectRenders: 0 };
const sandbox = {
  state,
  elements: {
    sectionList: {
      querySelector(selector) {
        const index = Number(selector.match(/data-index="(\d+)"/)?.[1]);
        return cards[index] || null;
      }
    }
  },
  syncUrl() {
    calls.syncs += 1;
  },
  renderActiveSectionSelect() {
    calls.activeSelectRenders += 1;
  }
};

vm.createContext(sandbox);
vm.runInContext(`
  ${extractFunction("formatSectionLabel", "getAppendedSectionStart")}
  ${extractFunction("handleSectionInput", "handleSectionChange")}
  ${extractFunction("updateSectionNameDisplay", "getActiveSection")}
  this.handleSectionInput = handleSectionInput;
  this.formatSectionLabel = formatSectionLabel;
`, sandbox);

function typeName(index, value) {
  sandbox.handleSectionInput({
    target: {
      dataset: { index: String(index), field: "name" },
      value
    }
  });
}

typeName(1, "<b>Literal & safe</b>");
assert.equal(state.sections[1].name, "<b>Literal & safe</b>");
assert.equal(summaries[1].textContent, "2. <b>Literal & safe</b>", "summary should update immediately as literal text");
assert.equal(summaries[0].textContent, "1. First", "other summaries should not change");
assert.equal(calls.syncs, 1);
assert.equal(calls.activeSelectRenders, 1);

typeName(1, "");
assert.equal(state.sections[1].name, "");
assert.equal(summaries[1].textContent, "2.");
assert.equal(sandbox.formatSectionLabel({ name: "" }, 0), "1.");
assert.equal(sandbox.formatSectionLabel({ name: "Named" }, 1), "2. Named");

const longName = "x".repeat(130);
typeName(0, longName);
assert.equal(state.sections[0].name.length, 120);
assert.equal(summaries[0].textContent, `1. ${"x".repeat(120)}`);

const callsBeforeInvalidInput = { ...calls };
typeName(99, "Missing");
assert.deepEqual(calls, callsBeforeInvalidInput, "invalid section indices should be ignored");

assert.equal(calls.syncs, 3);
assert.equal(calls.activeSelectRenders, 3);
console.log("Live section summary names passed.");

