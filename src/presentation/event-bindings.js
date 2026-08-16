import { parseTimeInput } from "../domain/time.js";

export function createEventBindings({
  documentObject = document,
  elements,
  videoController,
  playbackController,
  settingsController,
  sectionController,
  shareController,
  fineTuneControl,
  handleKeyboardShortcuts
}) {
  const removeListeners = [];
  let bound = false;

  function listen(target, eventName, listener) {
    target.addEventListener(eventName, listener);
    removeListeners.push(() => target.removeEventListener(eventName, listener));
  }

  function handleSectionInput(event) {
    const target = event.target;
    const index = Number(target.dataset.index);
    const field = target.dataset.field;

    if (field === "name") {
      sectionController.updateSectionName(index, target.value);
      return;
    }

    if (field !== "start" && field !== "end") return;
    const parsed = parseTimeInput(target.value);
    target.classList.toggle("invalid", !Number.isFinite(parsed));
    if (!Number.isFinite(parsed)) return;

    if (sectionController.updateSectionTime(index, field, parsed, {
      render: false,
      preserveInput: target
    })) {
      shareController.syncUrl();
    }
  }

  function handleSectionChange(event) {
    const target = event.target;
    const index = Number(target.dataset.index);
    const field = target.dataset.field;

    if (field === "speed") {
      sectionController.updateSectionSpeed(index, target.value);
      return;
    }
    if (!target.dataset.timeInput) return;

    const parsed = parseTimeInput(target.value);
    if (!Number.isFinite(parsed) || !sectionController.updateSectionTime(index, field, parsed)) {
      target.classList.add("invalid");
    }
  }

  function handleSectionClick(event) {
    const button = event.target.closest?.("button[data-action]");
    if (!button) return;

    const index = Number(button.dataset.index);
    const action = button.dataset.action;
    if (!Number.isInteger(index)) return;

    if (action === "toggle-section") sectionController.toggleSection(index);
    else if (action === "delete") sectionController.deleteSection(index);
    else if (action === "insert-after") sectionController.insertNewSectionAfter(index);
    else if (action === "play-section") playbackController.playSection(index);
    else if (action === "set-start-now") sectionController.setSectionBoundaryToNow(index, "start");
    else if (action === "set-end-now") sectionController.setSectionBoundaryToNow(index, "end");
    else if (action === "seek-to-start") sectionController.seekToBoundary(index, "start");
    else if (action === "seek-to-end") sectionController.seekToBoundary(index, "end");
    else if (action === "start-from-previous-section") sectionController.copyBoundaryFromNeighbor(index, "start");
    else if (action === "end-from-next-section") sectionController.copyBoundaryFromNeighbor(index, "end");
  }

  function handleSectionFocus(event) {
    if (event.target.closest?.('[data-action="toggle-section"], [data-action="delete"]')) return;
    const sectionCard = event.target.closest?.(".section-card[data-index]");
    if (sectionCard) sectionController.activateFromFocus(Number(sectionCard.dataset.index));
  }

  function bind() {
    if (bound) return unbind;
    bound = true;

    listen(elements.loadVideoButton, "click", () => videoController.loadVideoFromInput(elements.videoInput.value));
    listen(elements.videoInput, "keydown", event => {
      if (event.key === "Enter") videoController.loadVideoFromInput(elements.videoInput.value);
    });
    listen(elements.videoTitleInput, "input", () => videoController.handleVideoTitleInput(elements.videoTitleInput.value));
    listen(elements.playPauseButton, "click", playbackController.togglePlayPause);
    listen(elements.loopToggle, "change", () => settingsController.setLoop(elements.loopToggle.checked));
    listen(elements.useSectionSpeedToggle, "change", () => settingsController.setUseSectionSpeed(elements.useSectionSpeedToggle.checked));
    listen(elements.moveToNextSectionToggle, "change", () => settingsController.setMoveToNextSection(elements.moveToNextSectionToggle.checked));
    listen(elements.activeSectionSelect, "change", () => {
      playbackController.handleActiveSectionChange(Number(elements.activeSectionSelect.value));
    });
    listen(elements.addSectionButton, "click", sectionController.addSectionAtPlayhead);
    listen(elements.copyShareButton, "click", shareController.copyShareUrl);
    listen(elements.nudgeAmountButtons, "click", event => {
      const button = event.target.closest?.("button[data-nudge-amount]");
      if (button) fineTuneControl.setAmount(button.dataset.nudgeAmount);
    });
    listen(elements.nudgeStartDownButton, "click", () => sectionController.nudgeSelected("start", -fineTuneControl.getAmount()));
    listen(elements.nudgeStartUpButton, "click", () => sectionController.nudgeSelected("start", fineTuneControl.getAmount()));
    listen(elements.nudgeEndDownButton, "click", () => sectionController.nudgeSelected("end", -fineTuneControl.getAmount()));
    listen(elements.nudgeEndUpButton, "click", () => sectionController.nudgeSelected("end", fineTuneControl.getAmount()));
    listen(elements.sectionList, "input", handleSectionInput);
    listen(elements.sectionList, "change", handleSectionChange);
    listen(elements.sectionList, "click", handleSectionClick);
    listen(elements.sectionList, "focusin", handleSectionFocus);
    listen(documentObject, "keydown", handleKeyboardShortcuts);

    return unbind;
  }

  function unbind() {
    while (removeListeners.length) removeListeners.pop()();
    bound = false;
  }

  return {
    bind,
    unbind,
    handleSectionInput,
    handleSectionChange,
    handleSectionClick,
    handleSectionFocus
  };
}

