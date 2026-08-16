import assert from "node:assert/strict";
import test from "node:test";

import { createSectionScroller } from "../../src/presentation/section-scroller.js";

function makeCard(id) {
  return {
    dataset: { sectionId: id },
    calls: [],
    scrollIntoView(options) { this.calls.push(options); }
  };
}

test("section scrolling waits for rendering and cancels stale frames", () => {
  let cards = [];
  let nextFrame = 1;
  let reduceMotion = false;
  const callbacks = new Map();
  const canceled = new Set();
  const scroller = createSectionScroller({
    sectionList: { querySelectorAll: () => cards },
    windowObject: { matchMedia: () => ({ matches: reduceMotion }) },
    requestFrame(callback) {
      const id = nextFrame++;
      callbacks.set(id, callback);
      return id;
    },
    cancelFrame: id => canceled.add(id)
  });
  const first = makeCard("first");
  const second = makeCard("second");
  cards = [first, second];

  scroller.scrollSectionIntoView("first");
  scroller.scrollSectionIntoView("second");
  assert.equal(canceled.has(1), true);
  callbacks.get(2)();
  assert.equal(first.calls.length, 0);
  assert.deepEqual(second.calls[0], { block: "nearest", inline: "nearest", behavior: "smooth" });

  const postRender = makeCard("later");
  cards = [];
  scroller.scrollSectionIntoView("later");
  cards = [postRender];
  reduceMotion = true;
  callbacks.get(3)();
  assert.equal(postRender.calls[0].behavior, "auto");

  cards = [];
  scroller.scrollSectionIntoView("missing");
  callbacks.get(4)();
});

