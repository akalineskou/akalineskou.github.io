import assert from "node:assert/strict";
import test from "node:test";

import {
  extractYouTubeId,
  formatYouTubeUrl,
  isYouTubeHost
} from "../../../src/infrastructure/url/youtube-url.js";

test("YouTube IDs are extracted from supported URL forms", () => {
  const id = "dQw4w9WgXcQ";
  assert.equal(extractYouTubeId(""), "");
  assert.equal(extractYouTubeId(null), "");
  assert.equal(extractYouTubeId(id), id);
  assert.equal(extractYouTubeId(`https://www.youtube.com/watch?v=${id}&t=42s`), id);
  assert.equal(extractYouTubeId(`https://youtu.be/${id}?si=abc`), id);
  assert.equal(extractYouTubeId(`https://www.youtube.com/embed/${id}`), id);
  assert.equal(extractYouTubeId(`https://www.youtube.com/shorts/${id}`), id);
  assert.equal(extractYouTubeId(`https://youtube.com/live/${id}`), id);
  assert.equal(extractYouTubeId(`https://youtube.com/v/${id}`), id);
  assert.equal(extractYouTubeId(`https://www.youtube-nocookie.com/embed/${id}`), id);
  assert.equal(extractYouTubeId(`https://youtube.com/embed/${id}?v=bad`), id);
  assert.equal(extractYouTubeId("https://youtube.com/embed"), "");
  assert.equal(extractYouTubeId("https://youtu.be/short"), "");
  assert.equal(extractYouTubeId(`not a URL youtu.be/${id}`), id);
  assert.equal(extractYouTubeId(`https://notyoutube.com/watch?v=${id}`), "");
  assert.equal(extractYouTubeId("not a video"), "");
});

test("canonical URLs and host checks are stable", () => {
  assert.equal(formatYouTubeUrl("dQw4w9WgXcQ"), "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assert.equal(formatYouTubeUrl("prefix-dQw4w9WgXcQ-suffix"), "https://www.youtube.com/watch?v=prefix-dQw4");
  assert.equal(formatYouTubeUrl(""), "");
  assert.equal(isYouTubeHost("youtube.com"), true);
  assert.equal(isYouTubeHost("music.youtube.com"), true);
  assert.equal(isYouTubeHost("youtube-nocookie.com"), true);
  assert.equal(isYouTubeHost("privacy.youtube-nocookie.com"), true);
  assert.equal(isYouTubeHost("notyoutube.com"), false);
});

