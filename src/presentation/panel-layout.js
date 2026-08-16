import { NARROW_LAYOUT_QUERY } from "../config/constants.js";

export function createPanelLayout({
  playerPanel,
  sectionsPanel,
  windowObject = window,
  ResizeObserverClass = windowObject.ResizeObserver
}) {
  let resizeObserver = null;

  function update() {
    if (windowObject.matchMedia(NARROW_LAYOUT_QUERY).matches) {
      sectionsPanel.style.removeProperty("--player-panel-height");
      return;
    }

    const height = Math.ceil(playerPanel.getBoundingClientRect().height);
    sectionsPanel.style.setProperty("--player-panel-height", `${height}px`);
  }

  function start() {
    update();
    windowObject.addEventListener("resize", update);
    if (typeof ResizeObserverClass === "function") {
      resizeObserver = new ResizeObserverClass(update);
      resizeObserver.observe(playerPanel);
    }
  }

  function stop() {
    windowObject.removeEventListener("resize", update);
    if (resizeObserver) resizeObserver.disconnect();
    resizeObserver = null;
  }

  return { start, stop, update };
}


