import { replaceState } from "../domain/practice-state.js";

export function createAppController({
  state,
  expandedSectionIds,
  elements,
  appView,
  sectionView,
  shareController,
  videoController,
  playbackController,
  location,
  statusPresenter,
  setVideoStatus,
  panelLayout
}) {
  let removeEventListeners = null;
  let removeHashListener = null;
  let removePlayerListeners = [];

  function renderAll() {
    appView.renderVideoTitle(state);
    shareController.renderShareUrl();
    sectionView.renderActiveSelect(state);
    sectionView.render(state, expandedSectionIds);
    appView.renderControls(state);
  }

  function syncAndRender() {
    shareController.syncUrl();
    renderAll();
  }

  function applyState(nextState, { loadVideo = false, syncUrl = false } = {}) {
    replaceState(state, nextState);
    expandedSectionIds.clear();
    videoController.prepareTitleCapture();
    playbackController.guardSectionBoundary(playbackController.getActiveSection());
    appView.renderVideoInput(state.videoId);

    if (loadVideo && state.videoId) void videoController.loadVideoById(state.videoId);
    if (syncUrl) shareController.syncUrl();
    renderAll();
  }

  function handleHashChange() {
    try {
      applyState(location.readState(), { loadVideo: true, syncUrl: false });
      statusPresenter.setStatus(elements.shareStatus, "Loaded updated state from the URL.", "good");
    } catch (error) {
      statusPresenter.setStatus(elements.shareStatus, `Could not load URL state: ${error.message}`, "bad");
    }
  }

  function start(bindEvents) {
    try {
      applyState(location.readState(), { loadVideo: true, syncUrl: false });
      if (state.videoId) setVideoStatus("Loaded state from the URL.", "good");
      else setVideoStatus("Paste a YouTube URL to begin.");
    } catch (error) {
      setVideoStatus(`Could not read shared URL: ${error.message}`, "bad");
      applyState({}, { loadVideo: false, syncUrl: true });
    }

    removeEventListeners = bindEvents();
    removeHashListener = location.onHashChange(handleHashChange);
    removePlayerListeners = videoController.bindPlayerEvents();
    renderAll();
    panelLayout.start();
    playbackController.startTicker();
  }

  function stop() {
    if (removeEventListeners) removeEventListeners();
    removeEventListeners = null;
    if (removeHashListener) removeHashListener();
    removeHashListener = null;
    removePlayerListeners.forEach(removeListener => removeListener());
    removePlayerListeners = [];
    panelLayout.stop();
    playbackController.stopTicker();
  }

  return { renderAll, syncAndRender, applyState, handleHashChange, start, stop };
}


