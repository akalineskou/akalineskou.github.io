import {
  copySectionBoundaryFromNeighbor,
  createPracticeSection,
  getAppendedSectionStart,
  insertSectionAfter,
  removeSectionAt,
  setSectionTimeValue
} from "../domain/section.js";
import { roundSpeed } from "../domain/speed.js";

export function createSectionController({
  state,
  expandedSectionIds,
  playback,
  sectionView,
  appView,
  syncUrl,
  syncAndRender,
  sectionScroller,
  onSectionAdded = () => {}
}) {
  function toggleSection(index) {
    const section = state.sections[index];
    if (!section) return false;

    if (expandedSectionIds.has(section.id)) {
      expandedSectionIds.delete(section.id);
      sectionView.render(state, expandedSectionIds);
      return true;
    }

    expandedSectionIds.clear();
    expandedSectionIds.add(section.id);
    playback.selectSection(index);
    syncAndRender();
    return true;
  }

  function activateFromFocus(index) {
    if (!Number.isInteger(index) || !state.sections[index] || state.activeIndex === index) return false;
    playback.selectSection(index);
    syncUrl();
    sectionView.renderActiveSelect(state);
    sectionView.updateActiveClasses(state);
    appView.renderControls(state);
    return true;
  }

  function addSectionAtPlayhead() {
    const start = getAppendedSectionStart(state.sections, playback.getCurrentPlayerTime());
    const activeSection = playback.getActiveSection();
    const section = createPracticeSection(state.sections, start, activeSection ? activeSection.speed : 1);
    state.sections.push(section);
    expandedSectionIds.clear();
    expandedSectionIds.add(section.id);
    playback.selectSection(state.sections.length - 1);
    syncAndRender();
    sectionScroller.scrollSectionIntoView(section.id);
    onSectionAdded();
    return section;
  }

  function insertNewSectionAfter(index) {
    const section = insertSectionAfter(state.sections, index);
    if (!section) return null;

    expandedSectionIds.clear();
    expandedSectionIds.add(section.id);
    playback.selectSection(index + 1);
    syncAndRender();
    sectionScroller.scrollSectionIntoView(section.id);
    return section;
  }

  function deleteSection(index) {
    const result = removeSectionAt(state.sections, state.activeIndex, index);
    if (!result.removed) return false;

    expandedSectionIds.clear();
    const lastIndex = state.sections.length - 1;
    const lastSection = state.sections[lastIndex];
    if (lastSection) expandedSectionIds.add(lastSection.id);
    playback.selectSection(lastIndex);
    syncAndRender();
    return true;
  }

  function updateSectionTime(index, field, value, { render = true, preserveInput } = {}) {
    const section = state.sections[index];
    if (!section || !setSectionTimeValue(section, field, value)) return false;

    if (render) syncAndRender();
    else sectionView.updateTime(state, index, { preserveInput });
    return true;
  }

  function setSectionBoundaryToNow(index, field) {
    if (!state.sections[index]) return false;
    playback.selectSection(index);
    return updateSectionTime(index, field, playback.getCurrentPlayerTime());
  }

  function copyBoundaryFromNeighbor(index, field) {
    if (!state.sections[index]) return false;
    playback.selectSection(index);
    if (!copySectionBoundaryFromNeighbor(state.sections, index, field)) return false;
    syncAndRender();
    return true;
  }

  function updateSectionSpeed(index, value) {
    const section = state.sections[index];
    if (!section) return false;

    section.speed = roundSpeed(value);
    state.useSectionSpeed = true;
    appView.renderControls(state);
    playback.applyActiveSpeed();
    syncUrl();
    return true;
  }

  function updateSectionName(index, value) {
    const section = state.sections[index];
    if (!section) return false;

    section.name = String(value).slice(0, 120);
    sectionView.updateName(state, index);
    syncUrl();
    sectionView.renderActiveSelect(state);
    return true;
  }

  function nudgeSelected(field, delta) {
    if (!["start", "end"].includes(field)) return false;
    const section = playback.getActiveSection();
    if (!section) return false;
    return updateSectionTime(state.activeIndex, field, section[field] + delta);
  }

  function nudgeTimeInput(input, delta) {
    const index = Number(input && input.dataset.index);
    const field = input && input.dataset.field;
    const section = state.sections[index];
    if (!Number.isInteger(index) || !section || !["start", "end"].includes(field)) return false;

    updateSectionTime(index, field, section[field] + delta, { render: false });
    syncUrl();
    return true;
  }

  function seekToBoundary(index, field) {
    const section = state.sections[index];
    if (!section || !["start", "end"].includes(field)) return false;
    playback.selectSection(index);
    playback.seekTo(section[field]);
    syncAndRender();
    return true;
  }

  return {
    toggleSection,
    activateFromFocus,
    addSectionAtPlayhead,
    insertNewSectionAfter,
    deleteSection,
    updateSectionTime,
    setSectionBoundaryToNow,
    copyBoundaryFromNeighbor,
    updateSectionSpeed,
    updateSectionName,
    nudgeSelected,
    nudgeTimeInput,
    seekToBoundary
  };
}



