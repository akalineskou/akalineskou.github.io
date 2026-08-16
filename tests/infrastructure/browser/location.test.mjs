import assert from "node:assert/strict";
import test from "node:test";

import { createBrowserLocation } from "../../../src/infrastructure/browser/location.js";

function makeWindow() {
  const listeners = new Map();
  return {
    location: { href: "https://example.test/app#old", hash: "#old" },
    addEventListener(name, listener) { listeners.set(name, listener); },
    removeEventListener(name) { listeners.delete(name); },
    dispatch(name) { listeners.get(name)?.(); },
    listeners
  };
}

test("browser location builds and synchronizes share URLs", () => {
  const windowObject = makeWindow();
  const replacements = [];
  const location = createBrowserLocation({
    windowObject,
    historyObject: { replaceState: (...args) => replacements.push(args) }
  });
  const state = { videoId: "", sections: [] };

  assert.equal(location.getBaseUrl(), "https://example.test/app");
  assert.match(location.getShareUrl(state), /^https:\/\/example\.test\/app#ytp=/);
  location.syncState(state);
  location.syncState(state);
  assert.equal(replacements.length, 1, "identical state should not rewrite history");
});

test("fallback hash writes suppress only their own hashchange event", () => {
  const windowObject = makeWindow();
  const location = createBrowserLocation({
    windowObject,
    historyObject: { replaceState() { throw new Error("blocked"); } }
  });
  let changes = 0;
  const remove = location.onHashChange(() => { changes += 1; });

  location.syncState({ videoId: "", sections: [] });
  windowObject.dispatch("hashchange");
  assert.equal(changes, 0);
  windowObject.dispatch("hashchange");
  assert.equal(changes, 1);
  remove();
  assert.equal(windowObject.listeners.has("hashchange"), false);
});

