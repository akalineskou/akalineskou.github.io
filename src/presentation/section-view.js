import { PLAYBACK_SPEED_OPTIONS } from "../config/constants.js";
import { roundSpeed } from "../domain/speed.js";
import { formatTime } from "../domain/time.js";
import { escapeHtml, formatSectionLabel, formatSpeedLabel } from "./formatters.js";

export function renderSpeedOptions(currentSpeed) {
  const speed = roundSpeed(currentSpeed);
  const options = PLAYBACK_SPEED_OPTIONS.includes(speed)
    ? PLAYBACK_SPEED_OPTIONS
    : [...PLAYBACK_SPEED_OPTIONS, speed].sort((left, right) => left - right);

  return options.map(option => (
    `<option value="${option}"${option === speed ? " selected" : ""}>${formatSpeedLabel(option)}</option>`
  )).join("");
}

export function renderTimeField(section, index, field, label, sectionCount) {
  const neighborButton = field === "start" && index > 0
    ? `<button class="small" data-action="start-from-previous-section" data-index="${index}" type="button">Previous section</button>`
    : field === "end" && index < sectionCount - 1
      ? `<button class="small" data-action="end-from-next-section" data-index="${index}" type="button">Next section</button>`
      : "";
  const escapedId = escapeHtml(section.id);

  return `
    <div class="field">
      <label for="${field}-${escapedId}">${label}</label>
      <div class="time-input-wrap">
        <input id="${field}-${escapedId}" data-field="${field}" data-index="${index}" data-time-input="true" type="text" inputmode="decimal" value="${formatTime(section[field])}">
        <div class="time-input-actions">
          <button class="small" data-action="set-${field}-now" data-index="${index}" type="button" aria-label="Set section ${label.toLowerCase()} to current time">Now</button>
          ${neighborButton}
          <button class="small" data-action="seek-to-${field}" data-index="${index}" type="button" aria-label="Seek to ${label.toLowerCase()}">Go</button>
        </div>
      </div>
    </div>
  `;
}

export function renderSectionList(state, expandedSectionIds) {
  if (state.sections.length === 0) {
    return `<div class="empty-state">No sections yet. Move the video to the start of a phrase and click <strong>Add section</strong>.</div>`;
  }

  return state.sections.map((section, index) => {
    const expanded = expandedSectionIds.has(section.id);
    const detailsId = `section-details-${section.id}`;
    const sectionLabel = formatSectionLabel(section, index);
    const escapedId = escapeHtml(section.id);
    const escapedDetailsId = escapeHtml(detailsId);
    const escapedLabel = escapeHtml(sectionLabel);

    return `
      <article class="section-card ${expanded ? "expanded" : "collapsed"}${index === state.activeIndex ? " active" : ""}" data-index="${index}" data-section-id="${escapedId}">
        <div class="section-summary">
          <button class="section-toggle" data-action="toggle-section" data-index="${index}" type="button" aria-expanded="${expanded}" aria-controls="${escapedDetailsId}">
            <span class="section-toggle-icon" aria-hidden="true">▶</span>
            <span class="section-summary-text">
              <strong class="section-summary-name">${escapedLabel}</strong>
              <span class="section-summary-time">${formatTime(section.start)} – ${formatTime(section.end)}</span>
            </span>
          </button>
          <div class="section-summary-controls">
            <select id="speed-${escapedId}" data-field="speed" data-index="${index}" aria-label="Speed for section ${escapedLabel}">
              ${renderSpeedOptions(section.speed)}
            </select>
            <button class="primary small" data-action="play-section" data-index="${index}" type="button">Play</button>
          </div>
        </div>
        <div id="${escapedDetailsId}" class="section-details"${expanded ? "" : " hidden"}>
          <div class="field">
            <label for="name-${escapedId}">Name</label>
            <input id="name-${escapedId}" data-field="name" data-index="${index}" type="text" value="${escapeHtml(section.name)}" maxlength="120">
          </div>
          <div class="section-fields">
            ${renderTimeField(section, index, "start", "Start", state.sections.length)}
            ${renderTimeField(section, index, "end", "End", state.sections.length)}
          </div>
          <div class="section-actions">
            <button class="primary small" data-action="insert-after" data-index="${index}" type="button">New section after</button>
            <button class="danger small" data-action="delete" data-index="${index}" type="button" aria-label="Delete section ${escapedLabel}">Delete</button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

export function createSectionView({ sectionList, activeSectionSelect, fineTunePanel }) {
  function render(state, expandedSectionIds) {
    fineTunePanel.hidden = !state.sections.some(section => expandedSectionIds.has(section.id));
    sectionList.innerHTML = renderSectionList(state, expandedSectionIds);
  }

  function renderActiveSelect(state) {
    const activeIndex = state.sections[state.activeIndex] ? state.activeIndex : -1;
    activeSectionSelect.innerHTML = [
      `<option value="-1"${activeIndex === -1 ? " selected" : ""}>None</option>`,
      ...state.sections.map((section, index) => (
        `<option value="${index}"${index === activeIndex ? " selected" : ""}>${escapeHtml(formatSectionLabel(section, index))}</option>`
      ))
    ].join("");
    activeSectionSelect.value = String(activeIndex);
  }

  function updateActiveClasses(state) {
    sectionList.querySelectorAll(".section-card[data-index]").forEach(card => {
      card.classList.toggle("active", Number(card.dataset.index) === state.activeIndex);
    });
  }

  function updateName(state, index) {
    const section = state.sections[index];
    const card = sectionList.querySelector(`.section-card[data-index="${index}"]`);
    if (!section || !card) return;

    const summary = card.querySelector(".section-summary-name");
    if (summary) summary.textContent = formatSectionLabel(section, index);
  }

  function updateTime(state, index, { preserveInput } = {}) {
    const section = state.sections[index];
    const card = sectionList.querySelector(`.section-card[data-index="${index}"]`);
    if (!section || !card) return;

    for (const field of ["start", "end"]) {
      const input = card.querySelector(`[data-time-input="true"][data-field="${field}"]`);
      if (!input) continue;
      if (input !== preserveInput) input.value = formatTime(section[field]);
      input.classList.remove("invalid");
    }

    const summary = card.querySelector(".section-summary-time");
    if (summary) summary.textContent = `${formatTime(section.start)} – ${formatTime(section.end)}`;
  }

  return { render, renderActiveSelect, updateActiveClasses, updateName, updateTime };
}

