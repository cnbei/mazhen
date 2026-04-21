import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyRequestSchema,
  suggestRequestSchema,
  translateRequestSchema,
} from "../lib/openai/schemas.ts";

describe("API request schemas", () => {
  it("accepts a valid translate request", () => {
    const result = translateRequestSchema.safeParse({
      source_text: "This is a test.",
    });

    assert.equal(result.success, true);
  });

  it("rejects an invalid suggest request", () => {
    const result = suggestRequestSchema.safeParse({
      source_text: "Hello",
      translated_text: "Hallo",
      selected_span: null,
      applied_replacements: [],
    });

    assert.equal(result.success, false);
  });

  it("accepts a valid apply request", () => {
    const result = applyRequestSchema.safeParse({
      source_text: "We need a practical solution.",
      current_translation: "Wir brauchen eine praktische Loesung.",
      selected_span: {
        id: "span_1",
        text: "praktische",
        start: 20,
        end: 30,
      },
      selected_replacement: {
        id: "candidate_1",
        replacement_text: "alltagstaugliche",
        usage_note: "more idiomatic",
      },
      applied_replacements: [],
    });

    assert.equal(result.success, true);
  });
});
