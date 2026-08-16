const IFRAME_API_URL = "https://www.youtube.com/iframe_api";
const apiPromises = new WeakMap();

export function loadYouTubeIframeApi({ windowObject = window, documentObject = document } = {}) {
  if (windowObject.YT && typeof windowObject.YT.Player === "function") {
    return Promise.resolve(windowObject.YT);
  }
  if (apiPromises.has(windowObject)) return apiPromises.get(windowObject);

  const promise = new Promise((resolve, reject) => {
    const previousReadyCallback = windowObject.onYouTubeIframeAPIReady;
    windowObject.onYouTubeIframeAPIReady = () => {
      if (typeof previousReadyCallback === "function") previousReadyCallback();
      if (windowObject.YT && typeof windowObject.YT.Player === "function") {
        resolve(windowObject.YT);
      } else {
        reject(new Error("The YouTube IFrame API did not initialize correctly."));
      }
    };

    let script = documentObject.querySelector(`script[src="${IFRAME_API_URL}"]`);
    if (!script) {
      script = documentObject.createElement("script");
      script.src = IFRAME_API_URL;
      script.async = true;
      documentObject.head.append(script);
    }
    script.addEventListener("error", () => {
      apiPromises.delete(windowObject);
      reject(new Error("Could not load the YouTube IFrame API."));
    }, { once: true });
  });

  apiPromises.set(windowObject, promise);
  return promise;
}

export { IFRAME_API_URL };

