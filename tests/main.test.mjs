import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { ELEMENT_IDS } from "../src/presentation/dom-elements.js";

const testsDirectory = dirname(fileURLToPath(import.meta.url));
const root = join(testsDirectory, "..");
const indexHtml = readFileSync(join(root, "index.html"), "utf8");
const mainSource = readFileSync(join(root, "src", "main.js"), "utf8");
const stylesCss = readFileSync(join(root, "resources", "styles.css"), "utf8");
const faviconSvg = readFileSync(join(root, "resources", "favicon.svg"), "utf8");

function readJavaScript(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? readJavaScript(path) : entry.name.endsWith(".js") ? [readFileSync(path, "utf8")] : [];
  }).join("\n");
}

test("index loads one module composition root and no monolithic runtime", () => {
  assert.match(indexHtml, /<link rel="stylesheet" href="resources\/styles\.css">/);
  assert.doesNotMatch(indexHtml, /<style[\s>]/);
  assert.match(indexHtml, /<script type="module" src="src\/main\.js"><\/script>/);
  assert.equal((indexHtml.match(/<script/g) || []).length, 1);
  assert.doesNotMatch(indexHtml, /youtube\.com\/iframe_api/);
  assert.doesNotMatch(indexHtml, /URL_STATE_UTILS_START|function boot\(/);
  assert.match(mainSource, /createAppController/);
  assert.match(mainSource, /appController\.start\(eventBindings\.bind\)/);
});

test("static markup contains every element required by the composition root", () => {
  for (const id of Object.values(ELEMENT_IDS)) {
    assert.equal((indexHtml.match(new RegExp(`id="${id}"`, "g")) || []).length, 1, `#${id} should exist once`);
  }
  assert.match(indexHtml, /<header>\s*<h1>YouTube Practice Sections<\/h1>/);
  assert.match(indexHtml, /id="videoTitleInput"[^>]*maxlength="200"[^>]*hidden/);
  assert.match(indexHtml, /id="loopToggle"[^>]*checked/);
  assert.match(indexHtml, /id="useSectionSpeedToggle"[^>]*checked/);
  assert.match(indexHtml, /id="moveToNextSectionToggle"/);
  assert.match(indexHtml, /id="fineTunePanel"[^>]*aria-describedby="fineTuneHint"[^>]*hidden/);
  assert.match(indexHtml, /data-nudge-amount="0\.05"/);
  assert.match(indexHtml, /data-nudge-amount="0\.1" aria-pressed="true"/);
  assert.match(indexHtml, /Press <kbd>-<\/kbd> \/ <kbd>\+<\/kbd> to decrease \/ increase the amount\./);
});

test("responsive two-column and scrolling layout contracts remain intact", () => {
  assert.match(stylesCss, /\.grid\s*{[^}]*grid-template-columns: minmax\(0, 1\.15fr\) minmax\(360px, 0\.85fr\);/s);
  assert.match(stylesCss, /\.sections-panel\s*{[^}]*grid-template-rows: auto minmax\(0, 1fr\);[^}]*max-height: var\(--player-panel-height, none\);[^}]*overflow: hidden;/s);
  assert.match(stylesCss, /\.section-list\s*{[^}]*overflow-y: auto;/s);
  assert.match(stylesCss, /@media \(max-width: 980px\)[\s\S]*?grid-template-areas:\s*"player"\s*"sections"\s*"fine"\s*"support";/);
  assert.match(stylesCss, /\.time-input-actions > \[data-action\^="seek-to-"]\s*{[^}]*margin-left: auto;/s);
  assert.match(stylesCss, /\.active-section-block\s*{[^}]*flex: 0 0 12rem;[^}]*margin-left: auto;/s);
  assert.match(stylesCss, /\.video-load-row\s*{[^}]*flex-wrap: nowrap;/s);
  assert.match(stylesCss, /\.share-url-row\s*{[^}]*flex-wrap: nowrap;/s);
});

test("favicon and URL-only storage constraints remain intact", () => {
  assert.match(indexHtml, /<link rel="icon" href="resources\/favicon\.svg" type="image\/svg\+xml">/);
  assert.match(faviconSvg, /<rect[^>]*fill="#0f172a"/);
  assert.match(faviconSvg, /<path[^>]*fill="#fff"/);
  const source = readJavaScript(join(root, "src"));
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.cookie/);
});

test("tests mirror every top-level source folder", () => {
  const sourceFolders = readdirSync(join(root, "src"), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  const testFolders = readdirSync(join(root, "tests"), { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();
  assert.deepEqual(testFolders, sourceFolders);
});

