export const MAX_VIDEO_TITLE_LENGTH = 200;

export function normalizeVideoTitle(value) {
  return String(value ?? "").trim().slice(0, MAX_VIDEO_TITLE_LENGTH);
}

