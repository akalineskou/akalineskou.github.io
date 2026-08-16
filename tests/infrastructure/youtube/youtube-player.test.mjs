import assert from "node:assert/strict";
import test from "node:test";

import {
  PLAYER_HOST,
  createYouTubePlayer
} from "../../../src/infrastructure/youtube/youtube-player.js";

test("player iframe always uses the canonical youtube.com host", async () => {
  let options;
  const api = {
    Player: function Player(_id, playerOptions) { options = playerOptions; }
  };
  const player = createYouTubePlayer({
    container: { id: "player", innerHTML: "" },
    apiLoader: async () => api
  });

  await player.load("abcdefghijk");

  assert.equal(PLAYER_HOST, "https://www.youtube.com");
  assert.equal(options.host, "https://www.youtube.com");
});

test("YouTube adapter hides the global API behind a narrow player port", async () => {
  const calls = { load: [], play: 0, pause: 0, seek: [], rates: [] };
  let options;
  let playerInstance;
  const api = {
    PlayerState: { PLAYING: 1 },
    Player: function Player(id, playerOptions) {
      assert.equal(id, "player");
      options = playerOptions;
      playerInstance = this;
      this.loadVideoById = idValue => calls.load.push(idValue);
      this.playVideo = () => { calls.play += 1; };
      this.pauseVideo = () => { calls.pause += 1; };
      this.seekTo = (...args) => calls.seek.push(args);
      this.setPlaybackRate = rate => calls.rates.push(rate);
      this.getAvailablePlaybackRates = () => [0.5, 1];
      this.getCurrentTime = () => 12.5;
      this.getPlayerState = () => 1;
      this.getVideoData = () => ({ video_id: "abcdefghijk", title: "Title" });
    }
  };
  const container = { id: "player", innerHTML: "placeholder" };
  const player = createYouTubePlayer({ container, apiLoader: async () => api });
  let readyEvents = 0;
  const eventValues = [];
  const removeReady = player.on("ready", () => { readyEvents += 1; });
  player.on("stateChange", event => eventValues.push(["state", event.data]));
  player.on("playbackRateChange", event => eventValues.push(["rate", event.data]));
  player.on("error", event => eventValues.push(["error", event.data]));

  await player.load("abcdefghijk");
  assert.equal(container.innerHTML, "");
  assert.equal(options.host, PLAYER_HOST);
  assert.equal(player.isReady(), false);
  player.play();
  assert.equal(calls.play, 0);

  options.events.onReady({ target: playerInstance });
  assert.equal(player.isReady(), true);
  assert.equal(readyEvents, 1);
  options.events.onStateChange({ data: 1 });
  options.events.onPlaybackRateChange({ data: 0.5 });
  options.events.onError({ data: 101 });
  assert.deepEqual(eventValues, [["state", 1], ["rate", 0.5], ["error", 101]]);
  assert.equal(removeReady(), true);
  options.events.onReady({ target: playerInstance });
  assert.equal(readyEvents, 1, "removed listeners must not receive later events");
  player.play();
  player.pause();
  player.seek(8);
  player.setPlaybackRate(0.5);
  assert.equal(player.isPlaying(), true);
  assert.equal(player.getCurrentTime(), 12.5);
  assert.deepEqual(player.getAvailablePlaybackRates(), [0.5, 1]);
  assert.deepEqual(player.getVideoData(), { video_id: "abcdefghijk", title: "Title" });
  assert.deepEqual(calls, { load: [], play: 1, pause: 1, seek: [[8, true]], rates: [0.5] });

  await player.load("zyxwvutsrqp");
  assert.deepEqual(calls.load, ["zyxwvutsrqp"]);
});

test("unsupported adapter events fail fast", () => {
  const player = createYouTubePlayer({ container: { id: "player", innerHTML: "" }, apiLoader: async () => ({}) });
  assert.throws(() => player.on("unknown", () => {}), /Unsupported player event/);
});

test("unloaded adapter methods are safe fallbacks and empty loads are ignored", async () => {
  let loaderCalls = 0;
  const player = createYouTubePlayer({
    container: { id: "player", innerHTML: "placeholder" },
    apiLoader: async () => { loaderCalls += 1; return {}; }
  });
  await player.load("");
  player.play();
  player.pause();
  player.seek(2);
  player.setPlaybackRate(0.5);
  assert.equal(loaderCalls, 0);
  assert.equal(player.getCurrentTime(), 0);
  assert.equal(player.getCurrentTime(7), 7);
  assert.equal(player.isPlaying(), false);
  assert.deepEqual(player.getAvailablePlaybackRates(), []);
  assert.deepEqual(player.getVideoData(), {});
});

test("ready players with missing methods use no-op and fallback paths", async () => {
  let options;
  const api = {
    Player: function Player(_id, playerOptions) { options = playerOptions; }
  };
  const player = createYouTubePlayer({
    container: { id: "player", innerHTML: "" },
    apiLoader: async () => api
  });
  await player.load("abcdefghijk");
  options.events.onReady({});
  player.play();
  player.pause();
  player.seek(1);
  player.setPlaybackRate(1);
  assert.equal(player.getCurrentTime(9), 9);
  assert.equal(player.isPlaying(), false);
  assert.deepEqual(player.getAvailablePlaybackRates(), []);
  assert.deepEqual(player.getVideoData(), {});
});

test("player data and state fallbacks handle null data and paused playback", async () => {
  let options;
  const api = {
    PlayerState: { PLAYING: 1 },
    Player: function Player(_id, playerOptions) {
      options = playerOptions;
      this.getPlayerState = () => 2;
      this.getVideoData = () => null;
    }
  };
  const player = createYouTubePlayer({
    container: { id: "player", innerHTML: "" },
    apiLoader: async () => api
  });
  await player.load("abcdefghijk");
  options.events.onReady({});
  assert.equal(player.isPlaying(), false);
  assert.deepEqual(player.getVideoData(), {});
});

test("loader and player-constructor errors propagate to callers", async () => {
  const loaderFailure = createYouTubePlayer({
    container: { id: "player", innerHTML: "" },
    apiLoader: async () => { throw new Error("loader failed"); }
  });
  await assert.rejects(loaderFailure.load("abcdefghijk"), /loader failed/);

  const constructorFailure = createYouTubePlayer({
    container: { id: "player", innerHTML: "" },
    apiLoader: async () => ({ Player: function Player() { throw new Error("constructor failed"); } })
  });
  await assert.rejects(constructorFailure.load("abcdefghijk"), /constructor failed/);
});

