import assert from "node:assert/strict";
import test from "node:test";

import {
  IFRAME_API_URL,
  loadYouTubeIframeApi
} from "../../../src/infrastructure/youtube/iframe-api-loader.js";

function makeEnvironment({ existingScript = false } = {}) {
  const handlers = new Map();
  const listenerOptions = new Map();
  const appended = [];
  const script = {
    src: "",
    async: false,
    addEventListener(name, handler, options) {
      handlers.set(name, handler);
      listenerOptions.set(name, options);
    }
  };
  const documentObject = {
    querySelector: () => existingScript ? script : null,
    createElement: name => {
      assert.equal(name, "script");
      return script;
    },
    head: { append: value => appended.push(value) }
  };
  return { windowObject: {}, documentObject, handlers, listenerOptions, appended, script };
}

test("loader resolves an API that is already available", async () => {
  const YT = { Player() {} };
  const result = await loadYouTubeIframeApi({ windowObject: { YT }, documentObject: {} });
  assert.equal(result, YT);
});

test("loader installs the callback before appending one shared script", async () => {
  const environment = makeEnvironment();
  const first = loadYouTubeIframeApi(environment);
  const second = loadYouTubeIframeApi(environment);
  assert.equal(first, second);
  assert.equal(environment.appended.length, 1);
  assert.equal(environment.script.src, IFRAME_API_URL);
  assert.equal(environment.script.async, true);
  assert.deepEqual(environment.listenerOptions.get("error"), { once: true });

  environment.windowObject.YT = { Player() {} };
  environment.windowObject.onYouTubeIframeAPIReady();
  assert.equal(await first, environment.windowObject.YT);
});

test("loader rejects script failures", async () => {
  const environment = makeEnvironment();
  const promise = loadYouTubeIframeApi(environment);
  environment.handlers.get("error")();
  await assert.rejects(promise, /Could not load/);
});

test("loader reuses an existing script and chains an existing ready callback", async () => {
  const environment = makeEnvironment({ existingScript: true });
  let previousCalls = 0;
  environment.windowObject.onYouTubeIframeAPIReady = () => { previousCalls += 1; };
  const promise = loadYouTubeIframeApi(environment);
  assert.equal(environment.appended.length, 0);
  environment.windowObject.YT = { Player() {} };
  environment.windowObject.onYouTubeIframeAPIReady();
  assert.equal(await promise, environment.windowObject.YT);
  assert.equal(previousCalls, 1);
});

test("loader rejects incomplete initialization and permits retry after script failure", async () => {
  const incomplete = makeEnvironment();
  const incompletePromise = loadYouTubeIframeApi(incomplete);
  incomplete.windowObject.onYouTubeIframeAPIReady();
  await assert.rejects(incompletePromise, /did not initialize/);

  const retry = makeEnvironment();
  const failed = loadYouTubeIframeApi(retry);
  retry.handlers.get("error")();
  await assert.rejects(failed, /Could not load/);
  const second = loadYouTubeIframeApi(retry);
  assert.notEqual(second, failed);
  assert.equal(retry.appended.length, 2);
  retry.windowObject.YT = { Player() {} };
  retry.windowObject.onYouTubeIframeAPIReady();
  assert.equal(await second, retry.windowObject.YT);
});

