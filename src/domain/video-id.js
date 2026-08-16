const YOUTUBE_ID_PATTERN = /[a-zA-Z0-9_-]{11}/;

export function sanitizeYouTubeId(value) {
  const match = String(value || "").match(YOUTUBE_ID_PATTERN);
  return match ? match[0] : "";
}

