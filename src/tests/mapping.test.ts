import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeSpans, sliceTranslationWithSpans } from "../lib/translation/mapping.ts";

describe("normalizeSpans", () => {
  it("keeps valid non-overlapping spans", () => {
    const text = "Wir brauchen eine bessere Loesung.";
    const spans = normalizeSpans(text, [
      { id: "1", text: "bessere", start: 18, end: 25 },
      { id: "2", text: "Loesung", start: 26, end: 33 },
    ]);

    assert.equal(spans.length, 2);
  });

  it("drops spans with mismatched offsets", () => {
    const text = "Wir brauchen eine bessere Loesung.";
    const spans = normalizeSpans(text, [
      { id: "1", text: "bessere", start: 0, end: 8 },
    ]);

    assert.deepEqual(spans, []);
  });
});

describe("sliceTranslationWithSpans", () => {
  it("splits text into text and span parts", () => {
    const parts = sliceTranslationWithSpans("Gute Idee, ehrlich gesagt.", [
      { id: "1", text: "ehrlich", start: 11, end: 18 },
    ]);

    assert.deepEqual(parts, [
      { type: "text", value: "Gute Idee, " },
      {
        type: "span",
        value: "ehrlich",
        span: { id: "1", text: "ehrlich", start: 11, end: 18 },
      },
      { type: "text", value: " gesagt." },
    ]);
  });
});
