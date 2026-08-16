import assert from "node:assert/strict";
import test from "node:test";

import { escapeHtml, formatSectionLabel, formatSpeedLabel } from "../../src/presentation/formatters.js";

test("presentation formatters produce safe concise labels", () => {
  assert.equal(formatSectionLabel({ name: "" }, 0), "1.");
  assert.equal(formatSectionLabel({ name: "Verse" }, 1), "2. Verse");
  assert.equal(formatSpeedLabel(1), "1×");
  assert.equal(formatSpeedLabel(0.755), "0.755×");
  assert.equal(escapeHtml(`<tag a="b">'&`), "&lt;tag a=&quot;b&quot;&gt;&#39;&amp;");
});

