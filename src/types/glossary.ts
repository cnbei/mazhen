export type ProjectTone = "du" | "ihr" | "neutral";

export type GlossaryProject = {
  id: string;
  name: string;
  description: string;
  term_count: number;
  tone: ProjectTone;
};

export type GlossaryTerm = {
  source: string;
  target: string;
};

export type GlossaryProjectDetail = {
  project: GlossaryProject;
  terms: GlossaryTerm[];
};

export type GlossaryMatch = {
  source: string;
  target: string;
  score: number;
  match_type: "exact" | "fuzzy";
};
