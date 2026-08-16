import {
  SECTION_BOUNDARY_SETTLE_MS,
  TICK_INTERVAL_MS
} from "../config/constants.js";
import { nearestNumber, roundSpeed } from "../domain/speed.js";
import { roundSeconds } from "../domain/time.js";

export function createPlaybackController({
  state,
  player,
  view,
  syncAndRender,
  now = Date.now,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval
}) {
  let tickTimer = null;
  let boundaryTransitionSectionId = "";
  let boundaryTransitionUntil = 0;

  function getActiveSection() {
    return state.sections[state.activeIndex] || null;
  }

  function guardSectionBoundary(section, settleMs = SECTION_BOUNDARY_SETTLE_MS) {
    boundaryTransitionSectionId = section ? section.id : "";
    boundaryTransitionUntil = section ? now() + settleMs : 0;
  }

  function applyActiveSpeed() {
    if (!player.isReady()) return;
    const section = getActiveSection();
    if (!state.useSectionSpeed || !section) {
      player.setPlaybackRate(1);
      return;
    }

    const desired = roundSpeed(section.speed);
    const available = player.getAvailablePlaybackRates();
    player.setPlaybackRate(available.length ? nearestNumber(available, desired) : desired);
  }

  function selectSection(index) {
    state.activeIndex = Number.isInteger(index) && state.sections[index] ? index : -1;
    guardSectionBoundary(getActiveSection());
    applyActiveSpeed();
  }

  function seekTo(time) {
    player.seek(roundSeconds(time));
  }

  function getCurrentPlayerTime({ fallback = 0 } = {}) {
    return roundSeconds(player.getCurrentTime(fallback));
  }

  function playVideo() {
    if (!player.isReady()) return;
    applyActiveSpeed();
    player.play();
  }

  function togglePlayPause() {
    if (!player.isReady()) return;
    if (player.isPlaying()) player.pause();
    else playVideo();
  }

  function playSection(index = state.activeIndex) {
    const section = state.sections[index];
    if (!section) return false;

    selectSection(index);
    state.loop = true;
    seekTo(section.start);
    player.play();
    syncAndRender();
    return true;
  }

  function handleActiveSectionChange(index) {
    const wasPlayingActiveSection = !!getActiveSection() && player.isPlaying();
    if (wasPlayingActiveSection && Number.isInteger(index) && state.sections[index]) {
      playSection(index);
      return;
    }

    selectSection(index);
    syncAndRender();
  }

  function tick() {
    const current = getCurrentPlayerTime({ fallback: 0 });
    view.renderCurrentTime(current);

    const section = getActiveSection();
    if (!section || (!state.loop && !state.moveToNextSection) || !player.isReady() || !player.isPlaying()) return;

    if (boundaryTransitionSectionId === section.id) {
      if (now() < boundaryTransitionUntil) return;
      const isInsideSection = current >= Math.max(0, section.start - 0.05) && current < section.end - 0.015;
      if (!isInsideSection) return;
      boundaryTransitionSectionId = "";
      boundaryTransitionUntil = 0;
      return;
    }

    if (current < section.end - 0.015) return;

    const nextSection = state.sections[state.activeIndex + 1];
    if (state.moveToNextSection && nextSection) {
      state.activeIndex += 1;
      guardSectionBoundary(nextSection);
      applyActiveSpeed();
      seekTo(nextSection.start);
      player.play();
      syncAndRender();
    } else if (state.loop) {
      guardSectionBoundary(section);
      seekTo(section.start);
      player.play();
    }
  }

  function startTicker() {
    stopTicker();
    tickTimer = setIntervalFn(tick, TICK_INTERVAL_MS);
  }

  function stopTicker() {
    if (tickTimer !== null) clearIntervalFn(tickTimer);
    tickTimer = null;
  }

  return {
    getActiveSection,
    getCurrentPlayerTime,
    guardSectionBoundary,
    applyActiveSpeed,
    selectSection,
    seekTo,
    playVideo,
    togglePlayPause,
    playSection,
    handleActiveSectionChange,
    tick,
    startTicker,
    stopTicker
  };
}

