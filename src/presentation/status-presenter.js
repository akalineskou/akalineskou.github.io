export function createStatusPresenter({
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout
} = {}) {
  const hideTimers = new WeakMap();

  function setStatus(element, message, kind = "", hideAfterMs = 0) {
    const previousTimer = hideTimers.get(element);
    if (previousTimer !== undefined) {
      clearTimeoutFn(previousTimer);
      hideTimers.delete(element);
    }

    element.textContent = message;
    element.className = `status ${kind}`.trim();

    if (hideAfterMs > 0) {
      const timer = setTimeoutFn(() => {
        if (hideTimers.get(element) !== timer) return;
        hideTimers.delete(element);
        element.textContent = "";
        element.className = "status";
      }, hideAfterMs);
      hideTimers.set(element, timer);
    }
  }

  return { setStatus };
}

