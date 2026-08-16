import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(__dirname, "..", "index.html"), "utf8");
const match = indexHtml.match(/\/\* URL_STATE_UTILS_START \*\/[\s\S]*?\/\* URL_STATE_UTILS_END \*\//);
assert.ok(match, "URL state utility block should exist in index.html");

const sandbox = {
  URL,
  URLSearchParams,
  TextEncoder,
  TextDecoder,
  Number,
  Math,
  Date: class FixedDate extends Date {
    static now() {
      return 1_700_000_000_000;
    }
  }
};
Object.defineProperties(sandbox, {
  btoa: { value: value => Buffer.from(value, "binary").toString("base64") },
  atob: { value: value => Buffer.from(value, "base64").toString("binary") }
});

vm.createContext(sandbox);
vm.runInContext(`${match[0]}
this.actions = {
  formatSectionLabel,
  getAppendedSectionStart,
  createPracticeSection,
  insertSectionAfter,
  removeSectionAt,
  setSectionTimeValue,
  copySectionBoundaryFromNeighbor
};`, sandbox);

const {
  formatSectionLabel,
  getAppendedSectionStart,
  createPracticeSection,
  insertSectionAfter,
  removeSectionAt,
  setSectionTimeValue,
  copySectionBoundaryFromNeighbor
} = sandbox.actions;

const sections = [
  { id: "a", name: "Section 1", start: 4, end: 10, speed: 0.75 },
  { id: "b", name: "Section 3", start: 20, end: 30, speed: 0.5 }
];
const firstBefore = { ...sections[0] };
const followingBefore = { ...sections[1] };
const inserted = insertSectionAfter(sections, 0);
assert.equal(sections.length, 3);
assert.equal(sections[1], inserted);
assert.equal(inserted.name, "");
assert.equal(inserted.start, 10);
assert.equal(inserted.end, 18);
assert.equal(inserted.speed, 0.75);
assert.deepEqual({ ...sections[0] }, firstBefore, "source section should not change");
assert.deepEqual({ ...sections[2] }, followingBefore, "following section should not change");
assert.equal(insertSectionAfter(sections, 99), null);

const created = createPracticeSection(sections, 1.2345, 3);
assert.equal(created.name, "");
assert.equal(created.start, 1.235);
assert.equal(created.end, 9.235);
assert.equal(created.speed, 1.5);
assert.equal(formatSectionLabel(created, 0), "1.");
assert.equal(formatSectionLabel({ name: "Verse" }, 1), "2. Verse");
assert.equal(getAppendedSectionStart([], 1.2345), 1.235, "the first section should use the playhead");
assert.equal(getAppendedSectionStart(sections, 999), 30, "later sections should use the final displayed section end");
assert.equal(getAppendedSectionStart([{ end: 0 }], 999), 0, "a zero final end must not fall back to the playhead");

const boundarySections = [
  { id: "previous", start: 0, end: 12.5 },
  { id: "current", start: 15, end: 25 },
  { id: "next", start: 30, end: 42 }
];
assert.equal(copySectionBoundaryFromNeighbor(boundarySections, 1, "start"), true);
assert.equal(boundarySections[1].start, 12.5);
assert.equal(boundarySections[0].end, 12.5, "previous section should not change");
assert.equal(copySectionBoundaryFromNeighbor(boundarySections, 1, "end"), true);
assert.equal(boundarySections[1].end, 30);
assert.equal(boundarySections[2].start, 30, "next section should not change");
assert.equal(copySectionBoundaryFromNeighbor(boundarySections, 0, "start"), false);
assert.equal(copySectionBoundaryFromNeighbor(boundarySections, 2, "end"), false);
assert.equal(copySectionBoundaryFromNeighbor(boundarySections, 1, "invalid"), false);

const crossing = { start: 2, end: 3 };
assert.equal(setSectionTimeValue(crossing, "start", 5), true);
assert.equal(crossing.start, 5);
assert.equal(crossing.end, 5);
assert.equal(setSectionTimeValue(crossing, "end", 1), true);
assert.equal(crossing.start, 1);
assert.equal(crossing.end, 1);

const setSectionBoundaryToNowMatch = indexHtml.match(/function setSectionBoundaryToNow\(index, field\)[\s\S]*?(?=\n\s*function updateSectionTime)/);
assert.ok(setSectionBoundaryToNowMatch, "setSectionBoundaryToNow should exist in index.html");

function createBoundaryNowHarness(section, initialCurrentTime) {
  let currentTime = initialCurrentTime;
  const state = { sections: [section] };
  const updates = [];
  const boundarySandbox = {
    state,
    getCurrentPlayerTime() {
      return currentTime;
    },
    updateSectionTime(index, field, value) {
      updates.push({ index, field, value });
      setSectionTimeValue(state.sections[index], field, value);
    }
  };
  vm.createContext(boundarySandbox);
  vm.runInContext(`${setSectionBoundaryToNowMatch[0]}\nthis.setSectionBoundaryToNow = setSectionBoundaryToNow;`, boundarySandbox);
  return {
    section,
    updates,
    setSectionBoundaryToNow: boundarySandbox.setSectionBoundaryToNow
  };
}

let boundaryNow = createBoundaryNowHarness({ ...inserted }, 5);
boundaryNow.setSectionBoundaryToNow(0, "end");
assert.deepEqual(boundaryNow.section, { ...inserted, start: 5, end: 5 }, "End Now before Start should move both boundaries to Now");
assert.deepEqual(boundaryNow.updates, [{ index: 0, field: "end", value: 5 }], "End Now should use the current playback time");

boundaryNow = createBoundaryNowHarness({ ...inserted }, 14);
boundaryNow.setSectionBoundaryToNow(0, "end");
assert.deepEqual(boundaryNow.section, { ...inserted, end: 14 }, "End Now should use an in-range playhead");

boundaryNow = createBoundaryNowHarness({ ...inserted }, 0);
boundaryNow.setSectionBoundaryToNow(0, "end");
assert.equal(boundaryNow.section.start, 0, "End Now should allow the zero player fallback to cross Start");
assert.equal(boundaryNow.section.end, 0);

boundaryNow = createBoundaryNowHarness({ ...inserted }, 30);
boundaryNow.setSectionBoundaryToNow(0, "start");
assert.equal(boundaryNow.section.start, 30);
assert.equal(boundaryNow.section.end, 30, "Start Now after End should move both boundaries to Now");
assert.deepEqual(boundaryNow.updates, [{ index: 0, field: "start", value: 30 }], "Start Now should use the current playback time");

boundaryNow = createBoundaryNowHarness({ ...inserted }, 14);
boundaryNow.setSectionBoundaryToNow(0, "start");
assert.deepEqual(boundaryNow.section, { ...inserted, start: 14 }, "Start Now should use an in-range playhead without changing End");

function makeSections() {
  return [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
    { id: "c", name: "C" }
  ];
}

let deletionSections = makeSections();
let result = removeSectionAt(deletionSections, 2, 0);
assert.equal(result.removed.id, "a");
assert.equal(result.activeIndex, 1);
assert.equal(deletionSections[result.activeIndex].id, "c", "deleting before active should preserve active section identity");

deletionSections = makeSections();
result = removeSectionAt(deletionSections, 0, 2);
assert.equal(result.activeIndex, 0);
assert.equal(deletionSections[result.activeIndex].id, "a", "deleting after active should preserve active section");

deletionSections = makeSections();
result = removeSectionAt(deletionSections, 1, 1);
assert.equal(result.activeIndex, 1);
assert.equal(deletionSections[result.activeIndex].id, "c", "deleting active middle should select its successor");

result = removeSectionAt(deletionSections, 1, 1);
assert.equal(result.activeIndex, 0);
assert.equal(deletionSections[result.activeIndex].id, "a", "deleting active last should select the preceding section");

result = removeSectionAt(deletionSections, 0, 0);
assert.equal(result.activeIndex, -1);
assert.equal(deletionSections.length, 0);

const invalidDeletionSections = makeSections();
result = removeSectionAt(invalidDeletionSections, 1, 99);
assert.equal(result.removed, null);
assert.equal(result.activeIndex, 1);
assert.equal(invalidDeletionSections.length, 3);

const deleteSectionMatch = indexHtml.match(/function deleteSection\(index\)[\s\S]*?(?=\n\s*function setSectionBoundaryToNow)/);
assert.ok(deleteSectionMatch, "deleteSection should exist in index.html");

function createDeleteHarness(sections, activeIndex, expandedIds) {
  const state = { sections, activeIndex };
  const expandedSectionIds = new Set(expandedIds);
  const selectedIndexes = [];
  const deleteSandbox = {
    state,
    expandedSectionIds,
    removeSectionAt,
    selectSection(index) {
      selectedIndexes.push(index);
      state.activeIndex = sections[index] ? index : -1;
    }
  };
  vm.createContext(deleteSandbox);
  vm.runInContext(`${deleteSectionMatch[0]}\nthis.deleteSection = deleteSection;`, deleteSandbox);
  return { ...deleteSandbox, selectedIndexes };
}

let deleteHarness = createDeleteHarness(makeSections(), 0, ["a"]);
deleteHarness.deleteSection(0);
assert.deepEqual(deleteHarness.state.sections.map(section => section.id), ["b", "c"]);
assert.deepEqual(Array.from(deleteHarness.expandedSectionIds), ["c"], "deletion should expand only the final remaining section");
assert.equal(deleteHarness.state.activeIndex, 1, "the expanded final section should become active");
assert.deepEqual(deleteHarness.selectedIndexes, [1]);

deleteHarness = createDeleteHarness([{ id: "only" }], 0, ["only"]);
deleteHarness.deleteSection(0);
assert.equal(deleteHarness.state.sections.length, 0);
assert.equal(deleteHarness.expandedSectionIds.size, 0);
assert.equal(deleteHarness.state.activeIndex, -1);
assert.deepEqual(deleteHarness.selectedIndexes, [-1]);

deleteHarness = createDeleteHarness(makeSections(), 1, ["b"]);
deleteHarness.deleteSection(99);
assert.deepEqual(Array.from(deleteHarness.expandedSectionIds), ["b"], "invalid deletion should preserve expansion");
assert.deepEqual(deleteHarness.selectedIndexes, []);

console.log("Section actions passed.");

