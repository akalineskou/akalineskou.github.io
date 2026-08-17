export const ELEMENT_IDS = Object.freeze({
  newPracticeLink: "newPracticeLink",
  playerPanel: "playerPanel",
  sectionsPanel: "sectionsPanel",
  videoInput: "videoInput",
  videoTitleInput: "videoTitleInput",
  loadVideoButton: "loadVideoButton",
  videoStatus: "videoStatus",
  player: "player",
  currentTime: "currentTime",
  activeSectionSelect: "activeSectionSelect",
  playPauseButton: "playPauseButton",
  loopToggle: "loopToggle",
  useSectionSpeedToggle: "useSectionSpeedToggle",
  moveToNextSectionToggle: "moveToNextSectionToggle",
  addSectionButton: "addSectionButton",
  sectionList: "sectionList",
  shareUrl: "shareUrl",
  copyShareButton: "copyShareButton",
  shareStatus: "shareStatus",
  fineTunePanel: "fineTunePanel",
  nudgeAmountButtons: "nudgeAmountButtons",
  nudgeStartDownButton: "nudgeStartDownButton",
  nudgeStartUpButton: "nudgeStartUpButton",
  nudgeEndDownButton: "nudgeEndDownButton",
  nudgeEndUpButton: "nudgeEndUpButton"
});

export function getRequiredElements(documentObject = document) {
  return Object.fromEntries(Object.entries(ELEMENT_IDS).map(([name, id]) => {
    const element = documentObject.getElementById(id);
    if (!element) throw new Error(`Missing required page element: #${id}`);
    return [name, element];
  }));
}

