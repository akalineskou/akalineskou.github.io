import { sanitizeYouTubeId } from "../../domain/video-id.js";

export function isYouTubeHost(host) {
  return host === "youtube.com"
    || host.endsWith(".youtube.com")
    || host === "youtube-nocookie.com"
    || host.endsWith(".youtube-nocookie.com");
}

export function extractYouTubeId(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") {
      return sanitizeYouTubeId(url.pathname.split("/").filter(Boolean)[0]);
    }

    if (isYouTubeHost(host)) {
      const fromQuery = sanitizeYouTubeId(url.searchParams.get("v"));
      if (fromQuery) return fromQuery;

      const parts = url.pathname.split("/").filter(Boolean);
      const markerIndex = parts.findIndex(part => ["embed", "shorts", "live", "v"].includes(part));
      if (markerIndex >= 0 && parts[markerIndex + 1]) {
        return sanitizeYouTubeId(parts[markerIndex + 1]);
      }
    }
  } catch (_error) {
    const looseMatch = raw.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
    if (looseMatch) return looseMatch[1];
  }

  return "";
}

export function formatYouTubeUrl(videoId) {
  const sanitizedId = sanitizeYouTubeId(videoId);
  return sanitizedId ? `https://www.youtube.com/watch?v=${sanitizedId}` : "";
}

