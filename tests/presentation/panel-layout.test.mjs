import assert from "node:assert/strict";
import test from "node:test";

import { createPanelLayout } from "../../src/presentation/panel-layout.js";

test("desktop section height follows the player and resets on narrow screens", () => {
  let narrow = false;
  const styles = new Map();
  const listeners = new Map();
  let observed = null;
  let disconnected = false;
  class FakeResizeObserver {
    constructor(callback) { this.callback = callback; }
    observe(element) { observed = element; }
    disconnect() { disconnected = true; }
  }
  const playerPanel = { getBoundingClientRect: () => ({ height: 412.2 }) };
  const sectionsPanel = {
    style: {
      setProperty: (name, value) => styles.set(name, value),
      removeProperty: name => styles.delete(name)
    }
  };
  const layout = createPanelLayout({
    playerPanel,
    sectionsPanel,
    windowObject: {
      matchMedia: () => ({ matches: narrow }),
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: name => listeners.delete(name)
    },
    ResizeObserverClass: FakeResizeObserver
  });

  layout.start();
  assert.equal(styles.get("--player-panel-height"), "413px");
  assert.equal(observed, playerPanel);
  narrow = true;
  layout.update();
  assert.equal(styles.has("--player-panel-height"), false);
  layout.stop();
  assert.equal(disconnected, true);
  assert.equal(listeners.has("resize"), false);
});


