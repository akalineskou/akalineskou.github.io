import assert from "node:assert/strict";
import test from "node:test";

import { formatTime, parseTimeInput, roundSeconds } from "../../src/domain/time.js";

test("roundSeconds normalizes values to non-negative milliseconds", () => {
  assert.equal(roundSeconds(12.3454), 12.345);
  assert.equal(roundSeconds(12.3456), 12.346);
  assert.equal(roundSeconds(-1), 0);
  assert.equal(roundSeconds(Number.POSITIVE_INFINITY), 0);
  assert.equal(roundSeconds("bad"), 0);
});

test("time input accepts seconds and two- or three-part clock notation", () => {
  assert.equal(parseTimeInput("83.250"), 83.25);
  assert.equal(parseTimeInput("1:23.250"), 83.25);
  assert.equal(parseTimeInput("01:02:03.250"), 3723.25);
  assert.equal(parseTimeInput("1,250"), 1.25);
  assert.ok(Number.isNaN(parseTimeInput("")));
  assert.ok(Number.isNaN(parseTimeInput("1:bad")));
  assert.ok(Number.isNaN(parseTimeInput("1:2:3:4")));
});

test("formatTime emits stable millisecond clock notation", () => {
  assert.equal(formatTime(83.25), "01:23.250");
  assert.equal(formatTime(3723.25), "01:02:03.250");
  assert.equal(formatTime(-1), "00:00.000");
  assert.equal(formatTime(Number.NaN), "00:00.000");
});

