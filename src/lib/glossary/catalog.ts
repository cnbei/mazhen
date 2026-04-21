import type { GlossaryProject, GlossaryProjectDetail, GlossaryTerm, ProjectTone } from "@/types/glossary";

type ProjectRecord = {
  id: string;
  name: string;
  description: string;
  tone: ProjectTone;
  terms: GlossaryTerm[];
};

export type ReplaceGlossaryResult = {
  project_id: string;
  project_name: string;
  created: boolean;
  imported_count: number;
  duplicate_count: number;
  total_count: number;
};

const initialRecords: ProjectRecord[] = [
  {
    id: "fishing-journey",
    name: "Fishing Journey",
    description: "休闲海钓题材项目术语",
    tone: "du",
    terms: [
      { source: "1号船", target: "Schiff Nr. 1" },
      { source: "2号船", target: "Schiff Nr. 2" },
      { source: "2星", target: "2 Sterne" },
      { source: "B&W海钓公司", target: "B&W Meeresangeln GmbH" },
      { source: "一击必中", target: "Ein Schlag, ein Fang" },
      { source: "一起兜风", target: "Zusammen auf Tour" },
      { source: "一起跳牵手舞", target: "Tanz Hand in Hand" },
      { source: "七日签到", target: "7-Tage-Anmeldung" },
      { source: "七星瓢虫", target: "Siebenpunkt-Marienkaefer" },
      { source: "万能碎片", target: "Universalscherbe" },
      { source: "万能食材", target: "Universalzutat" },
      { source: "丁鳜", target: "Schleie" },
    ],
  },
  {
    id: "fashion-chronicle",
    name: "Fashion Chronicle",
    description: "换装与潮流题材项目术语",
    tone: "du",
    terms: [
      { source: "《潮流纪》", target: "<i>Chronik der Trends</i>" },
      { source: "《风物志》", target: "<i>Reisebuch der Kultur</i>" },
      { source: "《秘林寻踪》", target: "<i>Auf den Pfaden des Urwalds</i>" },
      { source: "《星星公主的冒险》", target: "<i>Sternenprinzessins Abenteuer</i>" },
      { source: "一分光明", target: "Ein Funken Licht" },
      { source: "一字眉", target: "Monobraue" },
      { source: "一脚蹬", target: "Slip-ons" },
      { source: "七分裤", target: "7/8-Hose" },
      { source: "万圣节", target: "Halloween" },
      { source: "万尼亚", target: "Vanya" },
    ],
  },
  {
    id: "space-event",
    name: "Space Event",
    description: "社群活动与道具命名术语",
    tone: "ihr",
    terms: [
      { source: "UFO", target: "UFO" },
      { source: "1周年庆", target: "1. Jubilaeum" },
      { source: "2星", target: "2 Sterne" },
      { source: "万能碎片", target: "Universalscherbe" },
      { source: "万能食材", target: "Universalzutat" },
      { source: "万尼亚", target: "Vanya" },
    ],
  },
];

const recordsById = new Map<string, ProjectRecord>(
  initialRecords.map((item) => [item.id, cloneProject(item)]),
);

export function listGlossaryProjects(): GlossaryProject[] {
  return [...recordsById.values()].map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    tone: item.tone,
    term_count: item.terms.length,
  }));
}

export function getGlossaryProject(projectId: string): GlossaryProjectDetail | null {
  const project = recordsById.get(projectId);

  if (!project) {
    return null;
  }

  return {
    project: {
      id: project.id,
      name: project.name,
      description: project.description,
      tone: project.tone,
      term_count: project.terms.length,
    },
    terms: project.terms,
  };
}

export function replaceGlossaryTerms(
  projectId: string,
  terms: GlossaryTerm[],
): ReplaceGlossaryResult | null {
  const project = recordsById.get(projectId);

  if (!project) {
    return null;
  }

  const deduped: GlossaryTerm[] = [];
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const term of terms) {
    const source = term.source.trim();
    const target = term.target.trim();

    if (!source || !target) {
      continue;
    }

    const key = source.toLowerCase();
    if (seen.has(key)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(key);
    deduped.push({ source, target });
  }

  project.terms = deduped;

  return {
    project_id: projectId,
    project_name: project.name,
    created: false,
    imported_count: deduped.length,
    duplicate_count: duplicateCount,
    total_count: deduped.length,
  };
}

export function upsertGlossaryProjectTerms({
  projectId,
  projectName,
  terms,
}: {
  projectId?: string;
  projectName?: string;
  terms: GlossaryTerm[];
}): ReplaceGlossaryResult | null {
  const trimmedProjectId = projectId?.trim();
  if (trimmedProjectId) {
    return replaceGlossaryTerms(trimmedProjectId, terms);
  }

  const fallbackName = projectName?.trim() || "我的术语库";
  const nextId = buildUniqueProjectId(fallbackName);
  const createdProject: ProjectRecord = {
    id: nextId,
    name: fallbackName,
    description: "用户上传术语库",
    tone: "neutral",
    terms: [],
  };
  recordsById.set(nextId, createdProject);

  const replaced = replaceGlossaryTerms(nextId, terms);
  if (!replaced) {
    return null;
  }

  return {
    ...replaced,
    created: true,
  };
}

function buildUniqueProjectId(name: string) {
  const normalized =
    name
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
      .replace(/^-+|-+$/g, "") || "glossary";

  let candidate = `custom-${normalized}`;
  let index = 2;
  while (recordsById.has(candidate)) {
    candidate = `custom-${normalized}-${index}`;
    index += 1;
  }
  return candidate;
}

function cloneProject(project: ProjectRecord): ProjectRecord {
  return {
    ...project,
    terms: project.terms.map((term) => ({ ...term })),
  };
}
