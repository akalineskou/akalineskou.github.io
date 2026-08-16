import { APP_TITLE } from "../config/constants.js";
import { formatTime } from "../domain/time.js";
import { formatYouTubeUrl } from "../infrastructure/url/youtube-url.js";

export function createAppView({ elements, documentObject = document }) {
  function renderDocumentTitle(state) {
    documentObject.title = state.videoTitle ? `${APP_TITLE}: ${state.videoTitle}` : APP_TITLE;
  }

  function renderVideoTitle(state) {
    elements.videoTitleInput.hidden = !state.videoId;
    elements.videoTitleInput.value = state.videoTitle;
    renderDocumentTitle(state);
  }

  function renderControls(state) {
    elements.loopToggle.checked = state.loop;
    elements.useSectionSpeedToggle.checked = state.useSectionSpeed;
    elements.moveToNextSectionToggle.checked = state.moveToNextSection;

    const hasActiveSection = state.activeIndex >= 0 && state.activeIndex < state.sections.length;
    elements.nudgeStartDownButton.disabled = !hasActiveSection;
    elements.nudgeStartUpButton.disabled = !hasActiveSection;
    elements.nudgeEndDownButton.disabled = !hasActiveSection;
    elements.nudgeEndUpButton.disabled = !hasActiveSection;
  }

  function renderVideoInput(videoId) {
    elements.videoInput.value = formatYouTubeUrl(videoId);
  }

  function renderShareUrl(url) {
    elements.shareUrl.value = url;
  }

  function renderCurrentTime(seconds) {
    elements.currentTime.textContent = formatTime(seconds);
  }

  return {
    renderDocumentTitle,
    renderVideoTitle,
    renderControls,
    renderVideoInput,
    renderShareUrl,
    renderCurrentTime
  };
}


