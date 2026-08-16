export function isTypingTarget(target) {
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target && target.tagName)
    || !!(target && target.isContentEditable);
}

export function isSectionTimeInput(target) {
  return !!(
    target
    && target.dataset
    && target.dataset.timeInput
    && ["start", "end"].includes(target.dataset.field)
  );
}

export function createKeyboardShortcuts({
  getNudgeAmount,
  nudgeTimeInput,
  stepNudgeAmount,
  isFineTuneVisible,
  togglePlayPause,
  playSection,
  hasActiveSection,
  setActiveBoundaryToNow
}) {
  return function handleKeyboardShortcuts(event) {
    if (event.defaultPrevented) return;

    const key = String(event.key || "").toLowerCase();
    if ((key === "," || key === ".") && isSectionTimeInput(event.target)) {
      event.preventDefault();
      nudgeTimeInput(event.target, (key === "," ? -1 : 1) * getNudgeAmount());
      return;
    }

    const decreasesAmount = key === "-" || key === "_";
    const increasesAmount = key === "=" || key === "+";
    if (decreasesAmount || increasesAmount) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (!isFineTuneVisible()) return;
      if (isTypingTarget(event.target) && !isSectionTimeInput(event.target)) return;
      event.preventDefault();
      stepNudgeAmount(decreasesAmount ? -1 : 1);
      return;
    }

    if (isTypingTarget(event.target)) return;

    if (key === " ") {
      event.preventDefault();
      togglePlayPause();
    } else if (key === "p") {
      event.preventDefault();
      playSection();
    } else if (key === "s") {
      event.preventDefault();
      if (hasActiveSection()) setActiveBoundaryToNow("start");
    } else if (key === "e") {
      event.preventDefault();
      if (hasActiveSection()) setActiveBoundaryToNow("end");
    }
  };
}


