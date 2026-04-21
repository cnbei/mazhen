import type { GlossaryMatch, GlossaryTerm } from "@/types/glossary";

export function findGlossaryMatches({
  sourceText,
  terms,
  topK = 12,
}: {
  sourceText: string;
  terms: GlossaryTerm[];
  topK?: number;
}): GlossaryMatch[] {
  const text = normalize(sourceText);
  if (!text) {
    return [];
  }

  const segments = splitSegments(sourceText).map(normalize).filter(Boolean);
  const matches: GlossaryMatch[] = [];

  for (const term of terms) {
    const source = normalize(term.source);
    if (!source) {
      continue;
    }

    if (text.includes(source)) {
      matches.push({
        source: term.source,
        target: term.target,
        score: 1,
        match_type: "exact",
      });
      continue;
    }

    let bestScore = 0;

    for (const segment of segments) {
      const score = scoreSimilarity(source, segment);
      if (score > bestScore) {
        bestScore = score;
      }
    }

    if (bestScore >= 0.3) {
      matches.push({
        source: term.source,
        target: term.target,
        score: roundScore(bestScore),
        match_type: "fuzzy",
      });
    }
  }

  matches.sort((a, b) => b.score - a.score || b.source.length - a.source.length);
  return matches.slice(0, topK);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function splitSegments(text: string) {
  return text
    .split(/[\n。！？!?;；,.，:：]/)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0)
    .slice(0, 160);
}

function scoreSimilarity(a: string, b: string) {
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  if (a.includes(b) || b.includes(a)) {
    const ratio = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return Math.max(0.7, ratio * 0.9);
  }

  const aNgrams = buildNgrams(a, 2);
  const bNgrams = buildNgrams(b, 2);

  const inter = intersectionSize(aNgrams, bNgrams);
  const union = aNgrams.size + bNgrams.size - inter;
  const jaccard = union > 0 ? inter / union : 0;

  const charOverlap = overlapRatio(a, b);

  return jaccard * 0.65 + charOverlap * 0.35;
}

function buildNgrams(value: string, n: number) {
  const compact = value.replace(/\s+/g, "");
  const grams = new Set<string>();

  if (compact.length < n) {
    grams.add(compact);
    return grams;
  }

  for (let i = 0; i <= compact.length - n; i += 1) {
    grams.add(compact.slice(i, i + n));
  }

  return grams;
}

function intersectionSize(a: Set<string>, b: Set<string>) {
  let count = 0;

  for (const item of a) {
    if (b.has(item)) {
      count += 1;
    }
  }

  return count;
}

function overlapRatio(a: string, b: string) {
  const aSet = new Set(a.replace(/\s+/g, "").split(""));
  const bSet = new Set(b.replace(/\s+/g, "").split(""));

  const inter = intersectionSize(aSet, bSet);
  return inter / Math.max(1, aSet.size);
}

function roundScore(value: number) {
  return Math.round(value * 1000) / 1000;
}
