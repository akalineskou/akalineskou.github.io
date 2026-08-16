import assert from "node:assert/strict";
import test from "node:test";

import {
  createSectionView,
  renderSectionList,
  renderSpeedOptions,
  renderTimeField
} from "../../src/presentation/section-view.js";

test("section renderer emits collapsible, escaped, accessible controls", () => {
  const state = {
    activeIndex: 0,
    sections: [
      { id: 'a"<&', name: "<b>Literal & safe</b>", start: 1, end: 2, speed: 0.75 },
      { id: "b", name: "", start: 3, end: 4, speed: 1 }
    ]
  };
  const html = renderSectionList(state, new Set([state.sections[0].id]));

  assert.match(html, /section-card expanded active/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /class="section-details"/);
  assert.match(html, /class="section-details" hidden/);
  assert.match(html, /&lt;b&gt;Literal &amp; safe&lt;\/b&gt;/);
  assert.doesNotMatch(html, /<b>Literal & safe<\/b>/);
  assert.match(html, /data-action="play-section"/);
  assert.match(html, /data-action="insert-after"/);
  assert.match(html, /data-action="delete"/);
  assert.match(html, /start-from-previous-section/);
  assert.match(html, /end-from-next-section/);
  assert.match(html, /data-section-id="a&quot;&lt;&amp;"/);

  assert.match(renderSectionList({ activeIndex: -1, sections: [] }, new Set()), /No sections yet/);
  assert.match(renderTimeField(state.sections[0], 0, "start", "Start", 2), /set-start-now/);
  assert.match(renderSpeedOptions(0.755), /value="0.755" selected/);
  assert.match(renderSpeedOptions(1), /value="1" selected/);
});

test("incremental updates preserve focused raw time input and use textContent", () => {
  const startInput = { value: "raw", classList: { remove() {} } };
  const endInput = { value: "old", classList: { remove() {} } };
  const nameSummary = { textContent: "" };
  const timeSummary = { textContent: "" };
  const activeToggles = [];
  const card = {
    dataset: { index: "0" },
    classList: { toggle: (...args) => activeToggles.push(args) },
    querySelector(selector) {
      if (selector.includes('data-field="start"')) return startInput;
      if (selector.includes('data-field="end"')) return endInput;
      if (selector === ".section-summary-name") return nameSummary;
      if (selector === ".section-summary-time") return timeSummary;
      return null;
    }
  };
  let currentCard = card;
  const sectionList = {
    innerHTML: "",
    querySelector: () => currentCard,
    querySelectorAll: () => [card]
  };
  const activeSectionSelect = { innerHTML: "", value: "" };
  const fineTunePanel = { hidden: true };
  const view = createSectionView({ sectionList, activeSectionSelect, fineTunePanel });
  const state = {
    activeIndex: 0,
    sections: [{ id: "a", name: "<safe>", start: 3, end: 4, speed: 1 }]
  };

  view.updateName(state, 0);
  assert.equal(nameSummary.textContent, "1. <safe>");
  view.updateTime(state, 0, { preserveInput: startInput });
  assert.equal(startInput.value, "raw");
  assert.equal(endInput.value, "00:04.000");
  assert.equal(timeSummary.textContent, "00:03.000 – 00:04.000");

  view.renderActiveSelect(state);
  assert.match(activeSectionSelect.innerHTML, /1\. &lt;safe&gt;/);
  assert.equal(activeSectionSelect.value, "0");

  view.render(state, new Set(["a"]));
  assert.equal(fineTunePanel.hidden, false);
  assert.match(sectionList.innerHTML, /section-card expanded active/);
  view.render(state, new Set());
  assert.equal(fineTunePanel.hidden, true);

  view.updateActiveClasses(state);
  assert.deepEqual(activeToggles, [["active", true]]);
  state.activeIndex = 99;
  view.renderActiveSelect(state);
  assert.equal(activeSectionSelect.value, "-1");
  assert.match(activeSectionSelect.innerHTML, /value="-1" selected/);

  view.updateName({ sections: [] }, 0);
  view.updateTime({ sections: [] }, 0);
  currentCard = null;
  view.updateName(state, 0);
  view.updateTime(state, 0);

  currentCard = { querySelector: () => null };
  state.activeIndex = 0;
  view.updateName(state, 0);
  view.updateTime(state, 0);
});

