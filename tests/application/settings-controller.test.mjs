import assert from "node:assert/strict";
import test from "node:test";

import { createSettingsController } from "../../src/application/settings-controller.js";

test("settings controller updates one concern and synchronizes", () => {
  const state = { loop: true, useSectionSpeed: true, moveToNextSection: false };
  let speedApplications = 0;
  let renders = 0;
  const controller = createSettingsController({
    state,
    playback: { applyActiveSpeed: () => { speedApplications += 1; } },
    syncAndRender: () => { renders += 1; }
  });

  controller.setLoop(false);
  controller.setMoveToNextSection(true);
  controller.setUseSectionSpeed(false);
  assert.deepEqual(state, { loop: false, useSectionSpeed: false, moveToNextSection: true });
  assert.equal(speedApplications, 1);
  assert.equal(renders, 3);
});

