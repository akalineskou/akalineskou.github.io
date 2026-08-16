import { STATE_VERSION } from "../config/constants.js";
import { createSectionId } from "./section.js";
import { roundSeconds } from "./time.js";
import { roundSpeed } from "./speed.js";
import { sanitizeYouTubeId } from "./video-id.js";
import { normalizeVideoTitle } from "./video-title.js";

export function normalizeState(rawState, idFactory = createSectionId) {
  const source = rawState || {};
  const rawSections = Array.isArray(source.sections) ? source.sections : [];
  const sections = rawSections.map((rawSection, index) => {
    const section = rawSection || {};
    const start = roundSeconds(section.start);
    return {
      id: section.id || idFactory(index),
      name: String(section.name ?? "").slice(0, 120),
      start,
      end: Math.max(start, roundSeconds(section.end)),
      speed: roundSpeed(section.speed)
    };
  });

  let activeIndex = Number.isInteger(source.activeIndex) ? source.activeIndex : -1;
  if (activeIndex >= sections.length) activeIndex = sections.length - 1;
  if (activeIndex < -1) activeIndex = -1;

  const videoId = sanitizeYouTubeId(source.videoId);
  return {
    version: STATE_VERSION,
    videoId,
    videoTitle: videoId ? normalizeVideoTitle(source.videoTitle) : "",
    loop: source.loop !== false,
    moveToNextSection: source.moveToNextSection === true,
    useSectionSpeed: source.useSectionSpeed !== false,
    activeIndex,
    sections
  };
}

export function replaceState(target, nextState, idFactory = createSectionId) {
  return Object.assign(target, normalizeState(nextState, idFactory));
}

