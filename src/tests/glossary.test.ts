import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { findGlossaryMatches } from "../lib/glossary/matcher.ts";
import { parseGlossaryText } from "../lib/glossary/parser.ts";

describe("glossary parser", () => {
  it("parses TSV with header", () => {
    const text = "source\ttarget\n1号船\tSchiff Nr. 1\n万圣节\tHalloween\n";
    const terms = parseGlossaryText(text);

    assert.equal(terms.length, 2);
    assert.equal(terms[0].source, "1号船");
    assert.equal(terms[1].target, "Halloween");
  });

  it("parses TXT source=target lines", () => {
    const text = "增伤 = Schadensverstaerkung\n一击必中 = Ein Schlag, ein Fang\n";
    const terms = parseGlossaryText(text);

    assert.equal(terms.length, 2);
    assert.equal(terms[0].source, "增伤");
  });

  it("parses TXT with multi-space columns", () => {
    const text = "source   target\n七分裤   7/8-Hose\n万圣节   Halloween\n三刺鱼   Dreistachliger Stichling\n";
    const terms = parseGlossaryText(text);

    assert.equal(terms.length, 3);
    assert.equal(terms[0].source, "七分裤");
    assert.equal(terms[2].target, "Dreistachliger Stichling");
  });
});

describe("glossary fuzzy match", () => {
  it("returns exact and fuzzy matches sorted by score", () => {
    const matches = findGlossaryMatches({
      sourceText: "这个套装可以增加增伤效果，并提升暴击率。",
      terms: [
        { source: "增伤", target: "Schadensverstaerkung" },
        { source: "暴击伤害", target: "Kritischer Schaden" },
        { source: "签到", target: "Anmeldung" },
      ],
      topK: 5,
    });

    assert.equal(matches.length >= 1, true);
    assert.equal(matches[0].source, "增伤");
    assert.equal(matches[0].match_type, "exact");
  });
});
