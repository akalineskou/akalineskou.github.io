export function roundSeconds(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.round(number * 1000) / 1000);
}

export function parseTimeInput(value) {
  const raw = String(value || "").trim();
  if (!raw) return Number.NaN;

  const normalized = raw.replace(/,/g, ".");
  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    return roundSeconds(Number(normalized));
  }

  const parts = normalized.split(":");
  if (parts.length < 2 || parts.length > 3) return Number.NaN;
  if (!parts.every(part => /^\d+(?:\.\d+)?$/.test(part))) return Number.NaN;

  const multipliers = parts.length === 2 ? [60, 1] : [3600, 60, 1];
  return roundSeconds(parts.reduce((sum, part, index) => sum + Number(part) * multipliers[index], 0));
}

export function formatTime(seconds) {
  const totalMilliseconds = Math.round(roundSeconds(seconds) * 1000);
  const milliseconds = totalMilliseconds % 1000;
  const totalSeconds = Math.floor(totalMilliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const ms = String(milliseconds).padStart(3, "0");
  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  return hours > 0
    ? `${String(hours).padStart(2, "0")}:${mm}:${ss}.${ms}`
    : `${mm}:${ss}.${ms}`;
}

