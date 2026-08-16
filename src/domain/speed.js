export const MIN_SPEED = 0.25;
export const MAX_SPEED = 1.5;

export function roundSpeed(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 1;
  return Math.min(MAX_SPEED, Math.max(MIN_SPEED, Math.round(number * 1000) / 1000));
}

export function nearestNumber(values, target) {
  if (!Array.isArray(values) || values.length === 0) return target;
  return values.reduce((nearest, value) => (
    Math.abs(value - target) < Math.abs(nearest - target) ? value : nearest
  ), values[0]);
}

