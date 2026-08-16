import { decodeStateFromHash, encodeStateToHash } from "../url/state-codec.js";

export function createBrowserLocation({ windowObject = window, historyObject = history } = {}) {
  let ignoreNextHashChange = false;
  let lastRenderedHash = "";

  function getBaseUrl() {
    return windowObject.location.href.split("#")[0];
  }

  function getShareUrl(state) {
    return `${getBaseUrl()}${encodeStateToHash(state)}`;
  }

  function readState() {
    return decodeStateFromHash(windowObject.location.hash);
  }

  function syncState(state) {
    const hash = encodeStateToHash(state);
    if (hash === lastRenderedHash || windowObject.location.hash === hash) {
      lastRenderedHash = hash;
      return hash;
    }

    lastRenderedHash = hash;
    try {
      historyObject.replaceState(null, "", `${getBaseUrl()}${hash}`);
    } catch (_error) {
      ignoreNextHashChange = true;
      windowObject.location.hash = hash;
    }
    return hash;
  }

  function onHashChange(listener) {
    const handler = () => {
      if (ignoreNextHashChange) {
        ignoreNextHashChange = false;
        return;
      }
      listener();
    };
    windowObject.addEventListener("hashchange", handler);
    return () => windowObject.removeEventListener("hashchange", handler);
  }

  return { getBaseUrl, getShareUrl, readState, syncState, onHashChange };
}

