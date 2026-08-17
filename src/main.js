import { VIDEO_STATUS_HIDE_AFTER_MS } from "./config/constants.js";
import { createAppController } from "./application/app-controller.js";
import { createPlaybackController } from "./application/playback-controller.js";
import { createSectionController } from "./application/section-controller.js";
import { createSettingsController } from "./application/settings-controller.js";
import { createShareController } from "./application/share-controller.js";
import { createVideoController } from "./application/video-controller.js";
import { normalizeState } from "./domain/practice-state.js";
import { createBrowserLocation } from "./infrastructure/browser/location.js";
import { createYouTubePlayer } from "./infrastructure/youtube/youtube-player.js";
import { createAppView } from "./presentation/app-view.js";
import { getRequiredElements } from "./presentation/dom-elements.js";
import { createEventBindings } from "./presentation/event-bindings.js";
import { createFineTuneControl } from "./presentation/fine-tune-control.js";
import { createKeyboardShortcuts } from "./presentation/keyboard-shortcuts.js";
import { createPanelLayout } from "./presentation/panel-layout.js";
import { createSectionScroller } from "./presentation/section-scroller.js";
import { createSectionView } from "./presentation/section-view.js";
import { createStatusPresenter } from "./presentation/status-presenter.js";

const elements = getRequiredElements();
const state = normalizeState({});
const expandedSectionIds = new Set();
const location = createBrowserLocation();
const statusPresenter = createStatusPresenter();
const appView = createAppView({ elements });
appView.renderNewPracticeLink(location.getBaseUrl());
const sectionView = createSectionView(elements);
const sectionScroller = createSectionScroller({ sectionList: elements.sectionList });
const fineTuneControl = createFineTuneControl({ container: elements.nudgeAmountButtons });
const panelLayout = createPanelLayout({
  playerPanel: elements.playerPanel,
  sectionsPanel: elements.sectionsPanel
});
const player = createYouTubePlayer({ container: elements.player });

const setVideoStatus = (message, kind = "") => {
  statusPresenter.setStatus(
    elements.videoStatus,
    message,
    kind,
    kind === "bad" ? 0 : VIDEO_STATUS_HIDE_AFTER_MS
  );
};

let appController;
const shareController = createShareController({
  state,
  location,
  shareUrlElement: elements.shareUrl,
  shareStatusElement: elements.shareStatus,
  appView,
  statusPresenter
});
const playbackController = createPlaybackController({
  state,
  player,
  view: appView,
  syncAndRender: () => appController.syncAndRender()
});
const videoController = createVideoController({
  state,
  player,
  playback: playbackController,
  appView,
  syncUrl: shareController.syncUrl,
  syncAndRender: () => appController.syncAndRender(),
  setVideoStatus
});
const sectionController = createSectionController({
  state,
  expandedSectionIds,
  playback: playbackController,
  sectionView,
  appView,
  syncUrl: shareController.syncUrl,
  syncAndRender: () => appController.syncAndRender(),
  sectionScroller,
  onSectionAdded: () => statusPresenter.setStatus(
    elements.shareStatus,
    "Section added and encoded into the URL.",
    "good"
  )
});
const settingsController = createSettingsController({
  state,
  playback: playbackController,
  syncAndRender: () => appController.syncAndRender()
});
const handleKeyboardShortcuts = createKeyboardShortcuts({
  getNudgeAmount: fineTuneControl.getAmount,
  nudgeTimeInput: sectionController.nudgeTimeInput,
  stepNudgeAmount: fineTuneControl.stepAmount,
  isFineTuneVisible: () => !elements.fineTunePanel.hidden,
  togglePlayPause: playbackController.togglePlayPause,
  playSection: playbackController.playSection,
  hasActiveSection: () => state.activeIndex >= 0 && !!state.sections[state.activeIndex],
  setActiveBoundaryToNow: field => sectionController.setSectionBoundaryToNow(state.activeIndex, field)
});
const eventBindings = createEventBindings({
  elements,
  videoController,
  playbackController,
  settingsController,
  sectionController,
  shareController,
  fineTuneControl,
  handleKeyboardShortcuts
});

appController = createAppController({
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
});

fineTuneControl.render();
appController.start(eventBindings.bind);

