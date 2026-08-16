import assert from "node:assert/strict";
import test from "node:test";

import { MAX_SPEED, MIN_SPEED, nearestNumber, roundSpeed } from "../../src/domain/speed.js";

test("speed normalization clamps and rounds supported values", () => {
  assert.equal(MIN_SPEED, 0.25);
  assert.equal(MAX_SPEED, 1.5);
  assert.equal(roundSpeed(0.1), 0.25);
  assert.equal(roundSpeed(3), 1.5);
  assert.equal(roundSpeed(0.7554), 0.755);
  assert.equal(roundSpeed("invalid"), 1);
});

test("nearestNumber selects the first closest available rate", () => {
  assert.equal(nearestNumber([0.5, 1, 1.5], 1.4), 1.5);
  assert.equal(nearestNumber([0.5, 1], 0.75), 0.5);
  assert.equal(nearestNumber([], 0.8), 0.8);
});

