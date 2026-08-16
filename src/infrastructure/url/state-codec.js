import { SHARE_HASH_KEY, STATE_VERSION } from "../../config/constants.js";
import { createSectionId } from "../../domain/section.js";
import { normalizeState } from "../../domain/practice-state.js";
import { roundSeconds } from "../../domain/time.js";
import { roundSpeed } from "../../domain/speed.js";

export function compactState(state) {
  const normalized = normalizeState(state || {});
  const compact = {
    v: STATE_VERSION,
    y: normalized.videoId,
    l: normalized.loop ? 1 : 0,
    s: normalized.sections.map(section => [
      section.name,
      roundSeconds(section.start),
      roundSeconds(section.end),
      roundSpeed(section.speed)
    ])
  };

  if (normalized.videoTitle) compact.t = normalized.videoTitle;
  if (normalized.moveToNextSection) compact.n = 1;
  if (!normalized.useSectionSpeed) compact.r = 0;
  return compact;
}

export function inflateState(compact, idFactory = createSectionId) {
  if (!compact || compact.v !== STATE_VERSION) {
    throw new Error("Unsupported or missing shared state version.");
  }

  return normalizeState({
    videoId: compact.y,
    videoTitle: compact.t,
    loop: compact.l !== 0,
    moveToNextSection: compact.n === 1,
    useSectionSpeed: compact.r !== 0,
    activeIndex: -1,
    sections: Array.isArray(compact.s)
      ? compact.s.map(entry => ({
          name: Array.isArray(entry) ? entry[0] : "",
          start: Array.isArray(entry) ? entry[1] : 0,
          end: Array.isArray(entry) ? entry[2] : 0,
          speed: Array.isArray(entry) ? entry[3] : 1
        }))
      : []
  }, idFactory);
}

export function utf8ToBase64Url(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToUtf8(value) {
  const encoded = String(value || "");
  const padded = encoded
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(encoded.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function encodeStateToHash(state) {
  return `#${SHARE_HASH_KEY}=${utf8ToBase64Url(JSON.stringify(compactState(state)))}`;
}

export function decodeStateFromHash(hash, idFactory = createSectionId) {
  const rawHash = String(hash || "").replace(/^#/, "");
  const payload = new URLSearchParams(rawHash).get(SHARE_HASH_KEY);
  if (!payload) return normalizeState({}, idFactory);
  return inflateState(JSON.parse(base64UrlToUtf8(payload)), idFactory);
}

