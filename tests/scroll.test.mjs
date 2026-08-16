import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(join(__dirname, "..", "index.html"), "utf8");
const match = indexHtml.match(/function scrollSectionIntoView\(sectionId\)[\s\S]*?(?=\n\s*function setStatus)/);
assert.ok(match, "scrollSectionIntoView should exist in index.html");

let nextFrame = 1;
let cards = [];
let reduceMotion = false;
const callbacks = new Map();
const canceled = new Set();
const sandbox = {
  elements: {
    sectionList: {
      querySelectorAll(selector) {
        assert.equal(selector, ".section-card[data-section-id]");
        return cards;
      }
    }
  },
  window: {
    matchMedia(query) {
      assert.equal(query, "(prefers-reduced-motion: reduce)");
      return { matches: reduceMotion };
    }
  },
  requestAnimationFrame(callback) {
    const frame = nextFrame++;
    callbacks.set(frame, callback);
    return frame;
  },
  cancelAnimationFrame(frame) {
    canceled.add(frame);
  }
};

vm.createContext(sandbox);
vm.runInContext(`let sectionScrollFrame = null;
${match[0]}
this.scrollSectionIntoView = scrollSectionIntoView;`, sandbox);
const { scrollSectionIntoView } = sandbox;

function makeCard(id) {
  return {
    dataset: { sectionId: id },
    calls: [],
    scrollIntoView(options) {
      this.calls.push({ ...options });
    }
  };
}

const first = makeCard("first");
const second = makeCard("second");
cards = [first, second];
scrollSectionIntoView("first");
scrollSectionIntoView("second");
assert.equal(canceled.has(1), true, "a newer scroll request should cancel the previous frame");
callbacks.get(2)();
assert.equal(first.calls.length, 0);
assert.equal(second.calls.length, 1);
assert.deepEqual(second.calls[0], { block: "nearest", inline: "nearest", behavior: "smooth" });

cards = [];
scrollSectionIntoView("missing");
callbacks.get(3)();

reduceMotion = true;
cards = [first];
scrollSectionIntoView("first");
callbacks.get(4)();
assert.deepEqual(first.calls[0], { block: "nearest", inline: "nearest", behavior: "auto" });

const postRender = makeCard("post-render");
cards = [];
scrollSectionIntoView("post-render");
cards = [postRender];
callbacks.get(5)();
assert.equal(postRender.calls.length, 1, "the card should be looked up after rendering in the animation frame");

console.log("New-section scrolling passed.");

