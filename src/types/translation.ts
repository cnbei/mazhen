export type SelectableSpan = {
  id: string;
  text: string;
  start: number;
  end: number;
  rationale?: string | null;
};

export type ReplacementCandidate = {
  id: string;
  replacement_text: string;
  usage_note: string;
};

export type AppliedReplacement = {
  span_id: string;
  original_text: string;
  replacement_text: string;
  usage_note: string;
};

export type TranslationResult = {
  source_text: string;
  translated_text: string;
  selectable_spans: SelectableSpan[];
  applied_replacements: AppliedReplacement[];
};

export type FastTranslationResult = {
  source_text: string;
  translated_text: string;
};

export type TranslationSpansResult = {
  translated_text: string;
  selectable_spans: SelectableSpan[];
};

export type SuggestReplacementResult = {
  selected_span_id: string;
  replacement_candidates: ReplacementCandidate[];
};

export type ApplyReplacementResult = {
  translated_text: string;
  selectable_spans: SelectableSpan[];
  applied_replacements: AppliedReplacement[];
};
