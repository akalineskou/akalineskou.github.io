import { SHARE_STATUS_HIDE_AFTER_MS } from "../config/constants.js";

export function createShareController({
  state,
  location,
  shareUrlElement,
  shareStatusElement,
  appView,
  statusPresenter,
  clipboard = globalThis.navigator?.clipboard
}) {
  function renderShareUrl() {
    appView.renderShareUrl(location.getShareUrl(state));
  }

  function syncUrl() {
    location.syncState(state);
    renderShareUrl();
  }

  async function copyShareUrl() {
    renderShareUrl();
    try {
      await clipboard.writeText(shareUrlElement.value);
      statusPresenter.setStatus(
        shareStatusElement,
        "Share URL copied to clipboard.",
        "good",
        SHARE_STATUS_HIDE_AFTER_MS
      );
    } catch (_error) {
      shareUrlElement.focus();
      shareUrlElement.select();
      statusPresenter.setStatus(
        shareStatusElement,
        "Clipboard unavailable. The URL is selected so you can copy it manually.",
        "bad"
      );
    }
  }

  return { renderShareUrl, syncUrl, copyShareUrl };
}


