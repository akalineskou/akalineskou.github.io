import { REDUCED_MOTION_QUERY } from "../config/constants.js";

export function createSectionScroller({
  sectionList,
  windowObject = window,
  requestFrame = requestAnimationFrame,
  cancelFrame = cancelAnimationFrame
}) {
  let pendingFrame = null;

  function scrollSectionIntoView(sectionId) {
    if (pendingFrame !== null) cancelFrame(pendingFrame);
    pendingFrame = requestFrame(() => {
      pendingFrame = null;
      const card = Array.from(sectionList.querySelectorAll(".section-card[data-section-id]"))
        .find(sectionCard => sectionCard.dataset.sectionId === sectionId);
      if (!card) return;

      card.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: windowObject.matchMedia(REDUCED_MOTION_QUERY).matches ? "auto" : "smooth"
      });
    });
  }

  return { scrollSectionIntoView };
}

