import assert from "node:assert/strict";
import test from "node:test";

import { ELEMENT_IDS } from "../src/presentation/dom-elements.js";

function createElement(id) {
  return {
    id,
    value: "",
    hidden: false,
    checked: false,
    disabled: false,
    innerHTML: "",
    textContent: "",
    className: "",
    dataset: {},
    listeners: new Map(),
    style: { setProperty() {}, removeProperty() {} },
    classList: { add() {}, remove() {}, toggle() {} },
    addEventListener(name, listener) { this.listeners.set(name, listener); },
    removeEventListener(name) { this.listeners.delete(name); },
    querySelectorAll() { return []; },
    querySelector() { return null; },
    closest() { return null; },
    setAttribute() {},
    getBoundingClientRect() { return { height: 400 }; },
    focus() {},
    select() {},
    scrollIntoView() {}
  };
}

test("composition root boots against the static DOM contract", async () => {
  const elements = new Map(
    Object.values(ELEMENT_IDS).map(id => [id, createElement(id)])
  );
  const documentListeners = new Map();
  const windowListeners = new Map();

  globalThis.document = {
    title: "",
    head: { append() {} },
    getElementById: id => elements.get(id) || null,
    addEventListener: (name, listener) => documentListeners.set(name, listener),
    removeEventListener: name => documentListeners.delete(name),
    querySelector: () => null,
    createElement: () => createElement("script")
  };
  globalThis.window = {
    location: { href: "https://example.test/", hash: "" },
    addEventListener: (name, listener) => windowListeners.set(name, listener),
    removeEventListener: name => windowListeners.delete(name),
    matchMedia: () => ({ matches: false })
  };
  globalThis.history = { replaceState() {} };
  globalThis.requestAnimationFrame = callback => {
    callback();
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.setInterval = () => 1;
  globalThis.clearInterval = () => {};
  globalThis.setTimeout = () => 1;
  globalThis.clearTimeout = () => {};

  await import("../src/main.js?runtime-smoke");

  assert.equal(document.title, "YouTube Practice Sections");
  assert.match(elements.get("sectionList").innerHTML, /No sections yet/);
  assert.match(elements.get("shareUrl").value, /^https:\/\/example\.test\/#ytp=/);
  assert.equal(elements.get("videoStatus").textContent, "Paste a YouTube URL to begin.");
  assert.equal(documentListeners.has("keydown"), true);
  assert.equal(windowListeners.has("hashchange"), true);

  elements.get("loopToggle").checked = false;
  elements.get("loopToggle").listeners.get("change")();

  elements.get("addSectionButton").listeners.get("click")();
  assert.match(elements.get("shareStatus").textContent, /Section added/);
  assert.equal(elements.get("fineTunePanel").hidden, false);

  elements.get("activeSectionSelect").value = "0";
  elements.get("activeSectionSelect").listeners.get("change")();

  const keyboardEvent = key => ({
    key,
    target: { tagName: "BODY" },
    defaultPrevented: false,
    preventDefault() { this.defaultPrevented = true; }
  });
  const amountEvent = keyboardEvent("=");
  documentListeners.get("keydown")(amountEvent);
  assert.equal(amountEvent.defaultPrevented, true);
  const boundaryEvent = keyboardEvent("s");
  documentListeners.get("keydown")(boundaryEvent);
  assert.equal(boundaryEvent.defaultPrevented, true);

  elements.get("videoInput").value = "abcdefghijk";
  elements.get("loadVideoButton").listeners.get("click")();
  assert.match(elements.get("videoStatus").textContent, /Video loaded/);
});

