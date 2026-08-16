import assert from "node:assert/strict";
import test from "node:test";

import { normalizeState, replaceState } from "../../src/domain/practice-state.js";
import { sanitizeYouTubeId } from "../../src/domain/video-id.js";
import { MAX_VIDEO_TITLE_LENGTH, normalizeVideoTitle } from "../../src/domain/video-title.js";

test("video values are sanitized and bounded", () => {
  assert.equal(sanitizeYouTubeId("abcdefghijk"), "abcdefghijk");
  assert.equal(sanitizeYouTubeId("bad"), "");
  assert.equal(normalizeVideoTitle("  Für Elise 🎹  "), "Für Elise 🎹");
  assert.equal(normalizeVideoTitle("x".repeat(250)).length, MAX_VIDEO_TITLE_LENGTH);
});

test("normalizeState applies persisted defaults without losing section values", () => {
  const state = normalizeState({
    videoId: "dQw4w9WgXcQ",
    videoTitle: "  Test title  ",
    loop: false,
    moveToNextSection: true,
    useSectionSpeed: false,
    activeIndex: 9,
    sections: [
      { name: "x".repeat(130), start: 12.3454, end: 10, speed: 0.1 }
    ]
  }, index => `id-${index}`);

  assert.equal(state.videoTitle, "Test title");
  assert.equal(state.loop, false);
  assert.equal(state.moveToNextSection, true);
  assert.equal(state.useSectionSpeed, false);
  assert.equal(state.activeIndex, 0);
  assert.deepEqual(state.sections[0], {
    id: "id-0",
    name: "x".repeat(120),
    start: 12.345,
    end: 12.345,
    speed: 0.25
  });
});

test("invalid and orphan state falls back safely", () => {
  const state = normalizeState({ videoTitle: "Orphan", activeIndex: -9 });
  assert.equal(state.videoId, "");
  assert.equal(state.videoTitle, "");
  assert.equal(state.loop, true);
  assert.equal(state.moveToNextSection, false);
  assert.equal(state.useSectionSpeed, true);
  assert.equal(state.activeIndex, -1);
  assert.deepEqual(state.sections, []);
});

test("replaceState retains a shared object reference", () => {
  const target = normalizeState({});
  const result = replaceState(target, { sections: [{ start: 1, end: 2 }] }, () => "new");
  assert.equal(result, target);
  assert.equal(target.sections[0].id, "new");
});

test("normalization handles null and structurally invalid state inputs", () => {
  assert.deepEqual(normalizeState(null).sections, []);
  assert.deepEqual(normalizeState({ sections: "not-an-array" }).sections, []);

  const state = normalizeState({
    loop: 0,
    moveToNextSection: 1,
    useSectionSpeed: 0,
    activeIndex: 0.5,
    sections: [
      null,
      { id: "existing", name: null, start: 2, end: 3, speed: 1 }
    ]
  }, index => `generated-${index}`);
  assert.equal(state.sections[0].id, "generated-0");
  assert.equal(state.sections[1].id, "existing");
  assert.equal(state.sections[1].name, "");
  assert.equal(state.activeIndex, -1);
  assert.equal(state.loop, true, "only literal false disables looping");
  assert.equal(state.moveToNextSection, false, "only literal true enables move-next");
  assert.equal(state.useSectionSpeed, true, "only literal false disables section speed");

  assert.equal(normalizeState({ activeIndex: 0, sections: [] }).activeIndex, -1);
  assert.equal(replaceState(state, null).sections.length, 0);
});

