import assert from "node:assert/strict";
import test from "node:test";

import { createShareController } from "../../src/application/share-controller.js";

function makeHarness(clipboard) {
  const state = { sections: [] };
  const calls = { syncs: 0, statuses: [], focused: 0, selected: 0 };
  const shareUrlElement = {
    value: "",
    focus: () => { calls.focused += 1; },
    select: () => { calls.selected += 1; }
  };
  const controller = createShareController({
    state,
    location: {
      getShareUrl: () => "https://example.test/#ytp=value",
      syncState: value => { assert.equal(value, state); calls.syncs += 1; }
    },
    shareUrlElement,
    shareStatusElement: {},
    appView: { renderShareUrl: url => { shareUrlElement.value = url; } },
    statusPresenter: { setStatus: (...args) => calls.statuses.push(args) },
    clipboard
  });
  return { controller, calls, shareUrlElement };
}

test("share controller synchronizes and copies the rendered URL", async () => {
  const written = [];
  const { controller, calls, shareUrlElement } = makeHarness({ writeText: async value => written.push(value) });
  controller.syncUrl();
  assert.equal(calls.syncs, 1);
  assert.equal(shareUrlElement.value, "https://example.test/#ytp=value");
  await controller.copyShareUrl();
  assert.deepEqual(written, [shareUrlElement.value]);
  assert.equal(calls.statuses.at(-1)[1], "Share URL copied to clipboard.");
  assert.equal(calls.statuses.at(-1)[3], 3000);
});

test("clipboard failures select the URL and remain visible", async () => {
  const { controller, calls } = makeHarness({ writeText: async () => { throw new Error("blocked"); } });
  await controller.copyShareUrl();
  assert.equal(calls.focused, 1);
  assert.equal(calls.selected, 1);
  assert.match(calls.statuses.at(-1)[1], /selected/);
  assert.equal(calls.statuses.at(-1).length, 3, "persistent error should not receive a hide delay");
});

