import { loadYouTubeIframeApi } from "./iframe-api-loader.js";

const PLAYER_HOST = "https://www.youtube-nocookie.com";
const PLAYER_EVENTS = ["ready", "stateChange", "playbackRateChange", "error"];

export function createYouTubePlayer({
  container,
  apiLoader = loadYouTubeIframeApi
}) {
  const listeners = Object.fromEntries(PLAYER_EVENTS.map(eventName => [eventName, new Set()]));
  let api = null;
  let player = null;
  let ready = false;

  function emit(eventName, value) {
    listeners[eventName].forEach(listener => listener(value));
  }

  function on(eventName, listener) {
    if (!listeners[eventName]) throw new Error(`Unsupported player event: ${eventName}`);
    listeners[eventName].add(listener);
    return () => listeners[eventName].delete(listener);
  }

  async function load(videoId) {
    if (!videoId) return;
    api = await apiLoader();

    if (player) {
      player.loadVideoById(videoId);
      return;
    }

    container.innerHTML = "";
    player = new api.Player(container.id, {
      host: PLAYER_HOST,
      videoId,
      playerVars: {
        playsinline: 1,
        rel: 0,
        modestbranding: 1,
        enablejsapi: 1
      },
      events: {
        onReady: event => {
          ready = true;
          emit("ready", event);
        },
        onStateChange: event => emit("stateChange", event),
        onPlaybackRateChange: event => emit("playbackRateChange", event),
        onError: event => emit("error", event)
      }
    });
  }

  function isReady() {
    return ready;
  }

  function play() {
    if (ready && player && typeof player.playVideo === "function") player.playVideo();
  }

  function pause() {
    if (ready && player && typeof player.pauseVideo === "function") player.pauseVideo();
  }

  function seek(time) {
    if (ready && player && typeof player.seekTo === "function") player.seekTo(time, true);
  }

  function getCurrentTime(fallback = 0) {
    return ready && player && typeof player.getCurrentTime === "function"
      ? player.getCurrentTime()
      : fallback;
  }

  function isPlaying() {
    return !!(
      ready
      && player
      && typeof player.getPlayerState === "function"
      && api
      && api.PlayerState
      && player.getPlayerState() === api.PlayerState.PLAYING
    );
  }

  function setPlaybackRate(rate) {
    if (ready && player && typeof player.setPlaybackRate === "function") {
      player.setPlaybackRate(rate);
    }
  }

  function getAvailablePlaybackRates() {
    return ready && player && typeof player.getAvailablePlaybackRates === "function"
      ? player.getAvailablePlaybackRates()
      : [];
  }

  function getVideoData() {
    return player && typeof player.getVideoData === "function" ? player.getVideoData() || {} : {};
  }

  return {
    load,
    on,
    isReady,
    play,
    pause,
    seek,
    getCurrentTime,
    isPlaying,
    setPlaybackRate,
    getAvailablePlaybackRates,
    getVideoData
  };
}

export { PLAYER_HOST };

