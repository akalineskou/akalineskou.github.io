import assert from "node:assert/strict";
import test from "node:test";

import {
  copySectionBoundaryFromNeighbor,
  createPracticeSection,
  createSectionId,
  getAppendedSectionStart,
  insertSectionAfter,
  removeSectionAt,
  setSectionTimeValue
} from "../../src/domain/section.js";

test("section creation is normalized and supports an injected ID factory", () => {
  const sections = [{ end: 30 }];
  const created = createPracticeSection(sections, 1.2345, 3, 1, () => "fixed-id");
  assert.deepEqual(created, {
    id: "fixed-id",
    name: "",
    start: 1.235,
    end: 9.235,
    speed: 1.5
  });
  assert.equal(getAppendedSectionStart([], 1.2345), 1.235);
  assert.equal(getAppendedSectionStart(sections, 999), 30);
  assert.equal(getAppendedSectionStart([{ end: 0 }], 999), 0);
  assert.match(createSectionId(2, { now: () => 100, random: () => 0.5 }), /^section-2s-2-/);
});

test("insertion leaves surrounding sections unchanged", () => {
  const sections = [
    { id: "a", name: "First", start: 4, end: 10, speed: 0.75 },
    { id: "b", name: "Third", start: 20, end: 30, speed: 0.5 }
  ];
  const before = structuredClone(sections);
  const inserted = insertSectionAfter(sections, 0, () => "inserted");

  assert.deepEqual(inserted, { id: "inserted", name: "", start: 10, end: 18, speed: 0.75 });
  assert.deepEqual(sections[0], before[0]);
  assert.deepEqual(sections[2], before[1]);
  assert.equal(insertSectionAfter(sections, 99), null);
});

test("boundary edits keep start and end ordered", () => {
  const crossing = { start: 2, end: 3 };
  assert.equal(setSectionTimeValue(crossing, "start", 5), true);
  assert.deepEqual(crossing, { start: 5, end: 5 });
  assert.equal(setSectionTimeValue(crossing, "end", 1), true);
  assert.deepEqual(crossing, { start: 1, end: 1 });
  assert.equal(setSectionTimeValue(crossing, "invalid", 2), false);

  const sections = [
    { start: 0, end: 12.5 },
    { start: 15, end: 25 },
    { start: 30, end: 42 }
  ];
  assert.equal(copySectionBoundaryFromNeighbor(sections, 1, "start"), true);
  assert.equal(sections[1].start, 12.5);
  assert.equal(copySectionBoundaryFromNeighbor(sections, 1, "end"), true);
  assert.equal(sections[1].end, 30);
  assert.equal(copySectionBoundaryFromNeighbor(sections, 0, "start"), false);
  assert.equal(copySectionBoundaryFromNeighbor(sections, 2, "end"), false);
});

test("deletion preserves active identity where possible", () => {
  const makeSections = () => [{ id: "a" }, { id: "b" }, { id: "c" }];

  let sections = makeSections();
  let result = removeSectionAt(sections, 2, 0);
  assert.equal(result.activeIndex, 1);
  assert.equal(sections[result.activeIndex].id, "c");

  sections = makeSections();
  result = removeSectionAt(sections, 1, 1);
  assert.equal(result.activeIndex, 1);
  assert.equal(sections[result.activeIndex].id, "c");
  result = removeSectionAt(sections, 1, 1);
  assert.equal(result.activeIndex, 0);
  result = removeSectionAt(sections, 0, 0);
  assert.equal(result.activeIndex, -1);

  sections = makeSections();
  result = removeSectionAt(sections, 1, 99);
  assert.deepEqual(result, { removed: null, activeIndex: 1 });
  assert.equal(sections.length, 3);
});

