import { roundSeconds } from "./time.js";
import { roundSpeed } from "./speed.js";

const SECTION_DURATION_SECONDS = 8;
const TIME_FIELDS = new Set(["start", "end"]);

export function createSectionId(index, { now = Date.now, random = Math.random } = {}) {
  return `section-${now().toString(36)}-${index}-${random().toString(36).slice(2, 8)}`;
}

export function getAppendedSectionStart(sections, playhead) {
  const lastSection = sections[sections.length - 1];
  return lastSection ? roundSeconds(lastSection.end) : roundSeconds(playhead);
}

export function createPracticeSection(
  sections,
  start,
  speed,
  idIndex = sections.length,
  idFactory = createSectionId
) {
  const normalizedStart = roundSeconds(start);
  return {
    id: idFactory(idIndex),
    name: "",
    start: normalizedStart,
    end: roundSeconds(normalizedStart + SECTION_DURATION_SECONDS),
    speed: roundSpeed(speed)
  };
}

export function insertSectionAfter(sections, index, idFactory = createSectionId) {
  const previous = sections[index];
  if (!previous) return null;

  const section = createPracticeSection(sections, previous.end, previous.speed, index + 1, idFactory);
  sections.splice(index + 1, 0, section);
  return section;
}

export function removeSectionAt(sections, activeIndex, index) {
  if (!Number.isInteger(index) || !sections[index]) return { removed: null, activeIndex };

  const [removed] = sections.splice(index, 1);
  let nextActiveIndex = activeIndex;

  if (sections.length === 0) {
    nextActiveIndex = -1;
  } else if (activeIndex > index) {
    nextActiveIndex = activeIndex - 1;
  } else if (activeIndex === index) {
    nextActiveIndex = Math.min(index, sections.length - 1);
  }

  return { removed, activeIndex: nextActiveIndex };
}

export function setSectionTimeValue(section, field, value) {
  if (!section || !TIME_FIELDS.has(field)) return false;

  const time = roundSeconds(value);
  if (field === "start") {
    section.start = time;
    if (section.end < section.start) section.end = section.start;
  } else {
    section.end = time;
    if (section.start > section.end) section.start = section.end;
  }
  return true;
}

export function copySectionBoundaryFromNeighbor(sections, index, field) {
  if (!sections[index] || !TIME_FIELDS.has(field)) return false;

  const neighbor = field === "start" ? sections[index - 1] : sections[index + 1];
  if (!neighbor) return false;

  return setSectionTimeValue(
    sections[index],
    field,
    field === "start" ? neighbor.end : neighbor.start
  );
}

