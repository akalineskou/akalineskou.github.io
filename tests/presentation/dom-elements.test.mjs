import assert from "node:assert/strict";
import test from "node:test";

import { ELEMENT_IDS, getRequiredElements } from "../../src/presentation/dom-elements.js";

test("DOM registry resolves every required static element", () => {
  const elementsById = new Map(Object.values(ELEMENT_IDS).map(id => [id, { id }]));
  const elements = getRequiredElements({ getElementById: id => elementsById.get(id) });
  assert.equal(Object.keys(elements).length, Object.keys(ELEMENT_IDS).length);
  assert.equal(elements.newPracticeLink.id, "newPracticeLink");
  assert.equal(elements.player.id, "player");
});

test("DOM registry fails fast for incomplete markup", () => {
  assert.throws(
    () => getRequiredElements({ getElementById: () => null }),
    /Missing required page element/
  );
});

