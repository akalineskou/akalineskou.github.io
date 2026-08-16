import assert from "node:assert/strict";
import test from "node:test";

import { normalizeState } from "../../../src/domain/practice-state.js";
import {
  base64UrlToUtf8,
  compactState,
  decodeStateFromHash,
  encodeStateToHash,
  inflateState,
  utf8ToBase64Url
} from "../../../src/infrastructure/url/state-codec.js";

const state = normalizeState({
  videoId: "dQw4w9WgXcQ",
  videoTitle: "Never Gonna Give You Up 🎤",
  loop: true,
  moveToNextSection: true,
  useSectionSpeed: false,
  activeIndex: 1,
  sections: [
    { name: "Verse 🎸", start: 12.3454, end: 24.9996, speed: 0.75 },
    { name: "Chorus", start: 60, end: 75.125, speed: 1.25 },
    { name: "", start: 80, end: 88, speed: 1 }
  ]
});

test("UTF-8 Base64URL helpers round-trip Unicode", () => {
  const value = "Für Elise 🎹";
  const encoded = utf8ToBase64Url(value);
  assert.match(encoded, /^[A-Za-z0-9_-]+$/);
  assert.equal(base64UrlToUtf8(encoded), value);
  assert.equal(base64UrlToUtf8(null), "");
});

test("compact state preserves v1 optional-field semantics", () => {
  const compact = compactState(state);
  assert.equal(compact.v, 1);
  assert.equal(compact.t, "Never Gonna Give You Up 🎤");
  assert.equal(compact.n, 1);
  assert.equal(compact.r, 0);
  assert.equal(Object.hasOwn(compact, "a"), false);
  assert.equal(compact.s[2][0], "");
  assert.equal(Object.hasOwn(compactState({ ...state, videoTitle: "" }), "t"), false);
  assert.equal(Object.hasOwn(compactState({ ...state, moveToNextSection: false }), "n"), false);
  assert.equal(Object.hasOwn(compactState({ ...state, useSectionSpeed: true }), "r"), false);
  assert.equal(compactState({ ...state, loop: false }).l, 0);
  assert.deepEqual(compactState(null).s, []);
});

test("shared hashes round-trip while omitting runtime selection", () => {
  const hash = encodeStateToHash(state);
  assert.match(hash, /^#ytp=[A-Za-z0-9_-]+$/);
  assert.equal(
    encodeStateToHash({ ...state, activeIndex: 0 }),
    encodeStateToHash({ ...state, activeIndex: 2 })
  );

  const decoded = decodeStateFromHash(hash, index => `decoded-${index}`);
  assert.equal(decoded.videoId, state.videoId);
  assert.equal(decoded.videoTitle, state.videoTitle);
  assert.equal(decoded.loop, true);
  assert.equal(decoded.moveToNextSection, true);
  assert.equal(decoded.useSectionSpeed, false);
  assert.equal(decoded.activeIndex, -1);
  assert.deepEqual(decoded.sections.map(section => section.id), ["decoded-0", "decoded-1", "decoded-2"]);
  assert.deepEqual(decoded.sections.map(section => section.speed), [0.75, 1.25, 1]);
  assert.equal(decoded.sections[0].end, 25);
});

test("empty and legacy hashes retain compatibility defaults", () => {
  const empty = decodeStateFromHash("");
  assert.equal(empty.videoId, "");
  assert.equal(empty.useSectionSpeed, true);
  assert.equal(empty.activeIndex, -1);

  const legacy = inflateState({ v: 1, y: "", l: 1, a: 0, s: [["Legacy", 0, 8, 1]] }, () => "legacy");
  assert.equal(legacy.videoTitle, "");
  assert.equal(legacy.moveToNextSection, false);
  assert.equal(legacy.useSectionSpeed, true);
  assert.equal(legacy.activeIndex, -1);
  assert.equal(legacy.sections[0].id, "legacy");

  const malformedSections = inflateState({
    v: 1,
    y: "",
    l: 1,
    s: [null, ["Partial"]]
  }, index => `shape-${index}`);
  assert.deepEqual(malformedSections.sections.map(section => ({
    name: section.name,
    start: section.start,
    end: section.end,
    speed: section.speed
  })), [
    { name: "", start: 0, end: 0, speed: 1 },
    { name: "Partial", start: 0, end: 0, speed: 1 }
  ]);
  assert.deepEqual(inflateState({ v: 1, s: "invalid" }).sections, []);

  const defaultIds = decodeStateFromHash(encodeStateToHash({ sections: [{ start: 0, end: 1 }] }));
  assert.match(defaultIds.sections[0].id, /^section-/);
  assert.equal(decodeStateFromHash(null).sections.length, 0);
  assert.equal(decodeStateFromHash("#other=value").sections.length, 0);
});

test("malformed and unsupported state is rejected", () => {
  assert.throws(() => decodeStateFromHash("#ytp=invalid"));
  assert.throws(() => decodeStateFromHash(`#ytp=${utf8ToBase64Url("not json")}`));
  assert.throws(() => inflateState(null));
  assert.throws(() => inflateState({ v: 2 }));
});

