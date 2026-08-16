import { normalizeVideoTitle } from "../domain/video-title.js";
import { sanitizeYouTubeId } from "../domain/video-id.js";
import { extractYouTubeId } from "../infrastructure/url/youtube-url.js";

export function createVideoController({
  state,
  player,
  playback,
  appView,
  syncUrl,
  syncAndRender,
  setVideoStatus
}) {
  let pendingVideoTitleId = "";

  function prepareTitleCapture() {
    pendingVideoTitleId = state.videoId && !state.videoTitle ? state.videoId : "";
  }

  function handleVideoTitleInput(value) {
    pendingVideoTitleId = "";
    state.videoTitle = normalizeVideoTitle(value);
    appView.renderDocumentTitle(state);
    syncUrl();
  }

  function captureVideoTitleFromPlayer() {
    if (!pendingVideoTitleId || state.videoTitle) return false;

    const videoData = player.getVideoData();
    const videoId = sanitizeYouTubeId(videoData.video_id);
    if (!videoId || videoId !== pendingVideoTitleId || videoId !== state.videoId) return false;

    const videoTitle = normalizeVideoTitle(videoData.title);
    if (!videoTitle) return false;

    state.videoTitle = videoTitle;
    pendingVideoTitleId = "";
    appView.renderVideoTitle(state);
    syncUrl();
    return true;
  }

  async function loadVideoById(videoId) {
    if (!videoId) return false;
    try {
      await player.load(videoId);
      captureVideoTitleFromPlayer();
      playback.applyActiveSpeed();
      return true;
    } catch (error) {
      setVideoStatus(error.message || "Could not load the YouTube player.", "bad");
      return false;
    }
  }

  function loadVideoFromInput(input) {
    const videoId = extractYouTubeId(input);
    if (!videoId) {
      setVideoStatus("That does not look like a valid YouTube URL.", "bad");
      return false;
    }

    if (videoId !== state.videoId) state.videoTitle = "";
    state.videoId = videoId;
    prepareTitleCapture();
    appView.renderVideoInput(videoId);
    void loadVideoById(videoId);
    setVideoStatus("Video loaded. Add or play a section to begin practicing.", "good");
    syncAndRender();
    return true;
  }

  function bindPlayerEvents() {
    const refreshFromPlayer = () => {
      captureVideoTitleFromPlayer();
      playback.applyActiveSpeed();
    };

    return [
      player.on("ready", refreshFromPlayer),
      player.on("stateChange", refreshFromPlayer),
      player.on("playbackRateChange", () => playback.applyActiveSpeed()),
      player.on("error", event => {
        setVideoStatus(`YouTube player error ${event.data}. Check that the video allows embedding.`, "bad");
      })
    ];
  }

  return {
    prepareTitleCapture,
    handleVideoTitleInput,
    captureVideoTitleFromPlayer,
    loadVideoById,
    loadVideoFromInput,
    bindPlayerEvents
  };
}


