import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_NUDGE_AMOUNT,
  NUDGE_AMOUNTS,
  PLAYBACK_SPEED_OPTIONS,
  SHARE_HASH_KEY,
  STATE_VERSION
} from "../../src/config/constants.js";

test("configuration preserves public state and control defaults", () => {
  assert.equal(STATE_VERSION, 1);
  assert.equal(SHARE_HASH_KEY, "ytp");
  assert.equal(DEFAULT_NUDGE_AMOUNT, 0.1);
  assert.deepEqual(NUDGE_AMOUNTS, [0.05, 0.1, 0.25, 0.5, 1]);
  assert.ok(PLAYBACK_SPEED_OPTIONS.includes(0.25));
  assert.ok(PLAYBACK_SPEED_OPTIONS.includes(1));
  assert.ok(PLAYBACK_SPEED_OPTIONS.includes(1.5));
  assert.equal(Object.isFrozen(NUDGE_AMOUNTS), true);
  assert.equal(Object.isFrozen(PLAYBACK_SPEED_OPTIONS), true);
});

