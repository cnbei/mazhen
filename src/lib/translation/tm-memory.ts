export type TmEntry = {
  source_text: string;
  target_text: string;
  updated_at: number;
};

export type TmCandidate = {
  source_text: string;
  target_text: string;
  score: number;
  match_type: "exact" | "fuzzy";
};

const tmByProject = new Map<string, Map<string, TmEntry>>();

export function upsertTmEntry(projectId: string, sourceText: string, targetText: string) {
  const projectKey = normalize(projectId);
  if (!projectKey) {
    return;
  }

  let projectMap = tmByProject.get(projectKey);
  if (!projectMap) {
    projectMap = new Map<string, TmEntry>();
    tmByProject.set(projectKey, projectMap);
  }

  const sourceKey = normalize(sourceText);
  if (!sourceKey) {
    return;
  }

  projectMap.set(sourceKey, {
    source_text: sourceText,
    target_text: targetText,
    updated_at: Date.now(),
  });
}

export function findTmCandidates(projectId: string, sourceText: string, topK = 5): TmCandidate[] {
  const projectMap = tmByProject.get(normalize(projectId));
  if (!projectMap) {
    return [];
  }

  const sourceNorm = normalize(sourceText);
  if (!sourceNorm) {
    return [];
  }

  const exact = projectMap.get(sourceNorm);
  const candidates: TmCandidate[] = [];

  if (exact) {
    candidates.push({
      source_text: exact.source_text,
      target_text: exact.target_text,
      score: 1,
      match_type: "exact",
    });
  }

  for (const [key, entry] of projectMap.entries()) {
    if (key === sourceNorm) {
      continue;
    }

    const score = similarityScore(sourceNorm, key);
    if (score < 0.42) {
      continue;
    }

    candidates.push({
      source_text: entry.source_text,
      target_text: entry.target_text,
      score: Math.round(score * 1000) / 1000,
      match_type: "fuzzy",
    });
  }

  candidates.sort((a, b) => b.score - a.score);
  return candidates.slice(0, topK);
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim();
}

function similarityScore(a: string, b: string) {
  if (!a || !b) {
    return 0;
  }

  if (a === b) {
    return 1;
  }

  const aN = buildNgrams(a, 2);
  const bN = buildNgrams(b, 2);
  const inter = intersectionSize(aN, bN);
  const union = aN.size + bN.size - inter;
  const jaccard = union > 0 ? inter / union : 0;

  const lengthRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length);

  return jaccard * 0.8 + lengthRatio * 0.2;
}

function buildNgrams(value: string, n: number) {
  const compact = value.replace(/\s+/g, "");
  const grams = new Set<string>();

  if (compact.length <= n) {
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
