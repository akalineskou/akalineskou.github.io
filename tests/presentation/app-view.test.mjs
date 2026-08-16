import assert from "node:assert/strict";
import test from "node:test";

import { createAppView } from "../../src/presentation/app-view.js";

function makeElements() {
  return {
    videoTitleInput: { hidden: true, value: "" },
    videoInput: { value: "" },
    shareUrl: { value: "" },
    currentTime: { textContent: "" },
    loopToggle: { checked: false },
    useSectionSpeedToggle: { checked: false },
    moveToNextSectionToggle: { checked: false },
    nudgeStartDownButton: { disabled: false },
    nudgeStartUpButton: { disabled: false },
    nudgeEndDownButton: { disabled: false },
    nudgeEndUpButton: { disabled: false }
  };
}

test("app view renders title, URL, controls, and readout", () => {
  const elements = makeElements();
  const documentObject = { title: "" };
  const view = createAppView({ elements, documentObject });
  const state = {
    videoId: "abcdefghijk",
    videoTitle: "Configured title",
    loop: true,
    useSectionSpeed: true,
    moveToNextSection: false,
    activeIndex: 0,
    sections: [{}]
  };

  view.renderVideoTitle(state);
  assert.equal(elements.videoTitleInput.hidden, false);
  assert.equal(elements.videoTitleInput.value, "Configured title");
  assert.equal(documentObject.title, "YouTube Practice Sections: Configured title");
  elements.videoTitleInput.value = "  raw focused text  ";
  state.videoTitle = "Normalized title";
  view.renderDocumentTitle(state);
  assert.equal(elements.videoTitleInput.value, "  raw focused text  ");
  assert.equal(documentObject.title, "YouTube Practice Sections: Normalized title");
  view.renderVideoInput(state.videoId);
  assert.equal(elements.videoInput.value, "https://www.youtube.com/watch?v=abcdefghijk");
  view.renderControls(state);
  assert.equal(elements.loopToggle.checked, true);
  assert.equal(elements.useSectionSpeedToggle.checked, true);
  assert.equal(elements.nudgeStartDownButton.disabled, false);
  view.renderCurrentTime(83.25);
  assert.equal(elements.currentTime.textContent, "01:23.250");

  state.videoId = "";
  state.videoTitle = "";
  state.activeIndex = -1;
  state.sections = [];
  view.renderVideoTitle(state);
  view.renderControls(state);
  assert.equal(elements.videoTitleInput.hidden, true);
  assert.equal(documentObject.title, "YouTube Practice Sections");
  assert.equal(elements.nudgeEndUpButton.disabled, true);
});


