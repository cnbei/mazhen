import {
  applyReplacementResultSchema,
  fastTranslationResultSchema,
  suggestReplacementResultSchema,
  translationSpansResultSchema,
  translationResultSchema,
} from "@/lib/openai/schemas";
import { getFastModelName } from "@/lib/openai/client";
import { runStructuredRequest } from "@/lib/openai/request";
import {
  buildApplyReplacementSystemPrompt,
  buildApplyReplacementUserPrompt,
} from "@/lib/prompts/apply-replacement";
import {
  buildSuggestSystemPrompt,
  buildSuggestUserPrompt,
} from "@/lib/prompts/suggest-replacements";
import {
  buildSpanExtractionSystemPrompt,
  buildSpanExtractionUserPrompt,
  buildTranslateSystemPrompt,
  buildTranslateFastSystemPrompt,
  buildTranslateFastUserPrompt,
  buildTranslateUserPrompt,
} from "@/lib/prompts/translate";
import { normalizeSpans } from "@/lib/translation/mapping";
import type {
  AppliedReplacement,
  FastTranslationResult,
  ReplacementCandidate,
  SelectableSpan,
  TranslationSpansResult,
  TranslationResult,
} from "@/types/translation";
import type { GlossaryTerm, ProjectTone } from "@/types/glossary";
import type { TmCandidate } from "@/lib/translation/tm-memory";
import type { AppLanguageCode } from "@/lib/languages";

export async function translateEnglishToGerman({
  sourceText,
  sourceLang,
  targetLang,
  projectId,
  projectTone,
  glossaryTerms,
  tmCandidates,
}: {
  sourceText: string;
  sourceLang: AppLanguageCode;
  targetLang: AppLanguageCode;
  projectId?: string;
  projectTone?: ProjectTone;
  glossaryTerms?: GlossaryTerm[];
  tmCandidates?: TmCandidate[];
}): Promise<TranslationResult> {
  const result = await runStructuredRequest({
    schema: translationResultSchema,
    schemaName: "translation_result",
    systemPrompt: buildTranslateSystemPrompt({ projectTone, sourceLang, targetLang }),
    userPrompt: buildTranslateUserPrompt({
      sourceText,
      sourceLang,
      targetLang,
      projectId,
      glossaryTerms,
      tmCandidates,
    }),
  });

  return {
    ...result,
    source_text: sourceText,
    translated_text: result.translated_text.trim(),
    selectable_spans: repairSpans(result.translated_text.trim(), result.selectable_spans),
    applied_replacements: [],
  };
}

export async function translateTextFast({
  sourceText,
  sourceLang,
  targetLang,
  projectId,
  projectTone,
  glossaryTerms,
  tmCandidates,
}: {
  sourceText: string;
  sourceLang: AppLanguageCode;
  targetLang: AppLanguageCode;
  projectId?: string;
  projectTone?: ProjectTone;
  glossaryTerms?: GlossaryTerm[];
  tmCandidates?: TmCandidate[];
}): Promise<FastTranslationResult> {
  const result = await runStructuredRequest({
    schema: fastTranslationResultSchema,
    schemaName: "fast_translation_result",
    systemPrompt: buildTranslateFastSystemPrompt({ projectTone, sourceLang, targetLang }),
    userPrompt: buildTranslateFastUserPrompt({
      sourceText,
      sourceLang,
      targetLang,
      projectId,
      glossaryTerms,
      tmCandidates,
    }),
    model: getFastModelName(),
    performanceProfile: "fast",
  });

  return {
    source_text: sourceText,
    translated_text: result.translated_text.trim(),
  };
}

export async function deriveSelectableSpans({
  sourceText,
  translatedText,
  sourceLang,
  targetLang,
  projectId,
  glossaryTerms,
}: {
  sourceText: string;
  translatedText: string;
  sourceLang: AppLanguageCode;
  targetLang: AppLanguageCode;
  projectId?: string;
  glossaryTerms?: GlossaryTerm[];
}): Promise<TranslationSpansResult> {
  const result = await runStructuredRequest({
    schema: translationSpansResultSchema,
    schemaName: "translation_spans_result",
    systemPrompt: buildSpanExtractionSystemPrompt({ sourceLang, targetLang }),
    userPrompt: buildSpanExtractionUserPrompt({
      sourceText,
      translatedText,
      sourceLang,
      targetLang,
      projectId,
      glossaryTerms,
    }),
    model: getFastModelName(),
    performanceProfile: "fast",
  });

  return {
    translated_text: translatedText,
    selectable_spans: repairSpans(translatedText, result.selectable_spans),
  };
}

export async function suggestReplacementCandidates(
  sourceText: string,
  sourceLang: AppLanguageCode,
  targetLang: AppLanguageCode,
  translatedText: string,
  selectedSpan: SelectableSpan,
  appliedReplacements: AppliedReplacement[],
) {
  const baseUserPrompt = buildSuggestUserPrompt({
    sourceText,
    sourceLang,
    targetLang,
    translatedText,
    selectedSpan,
    appliedReplacements,
  });

  try {
    const initialResult = await runStructuredRequest({
      schema: suggestReplacementResultSchema,
      schemaName: "replacement_candidates",
      systemPrompt: buildSuggestSystemPrompt(targetLang),
      userPrompt: baseUserPrompt,
    });

    const initialCandidates = dedupeCandidates(initialResult.replacement_candidates, selectedSpan.text);
    if (initialCandidates.length > 0) {
      return {
        ...initialResult,
        replacement_candidates: initialCandidates,
      };
    }
  } catch {
    // Fallback below.
  }

  try {
    const retryResult = await runStructuredRequest({
      schema: suggestReplacementResultSchema,
      schemaName: "replacement_candidates_retry",
      systemPrompt: buildSuggestSystemPrompt(targetLang),
      userPrompt: [
        baseUserPrompt,
        "",
        "Retry rule:",
        "Provide at least 3 alternatives with different wording from selected_span.text.",
        "For very short spans, you may rewrite to a slightly longer natural phrase.",
      ].join("\n"),
    });

    const retryCandidates = dedupeCandidates(retryResult.replacement_candidates, selectedSpan.text);
    if (retryCandidates.length > 0) {
      return {
        ...retryResult,
        replacement_candidates: retryCandidates,
      };
    }
  } catch {
    // Fallback below.
  }

  const localCandidates = buildLocalFallbackCandidates(selectedSpan.text, targetLang);
  return {
    selected_span_id: selectedSpan.id,
    replacement_candidates: localCandidates,
  };
}

export async function applyReplacementAndRegenerate(
  sourceText: string,
  sourceLang: AppLanguageCode,
  targetLang: AppLanguageCode,
  currentTranslation: string,
  selectedSpan: SelectableSpan,
  selectedReplacement: ReplacementCandidate,
  appliedReplacements: AppliedReplacement[],
) {
  const result = await runStructuredRequest({
    schema: applyReplacementResultSchema,
    schemaName: "applied_replacement_result",
    systemPrompt: buildApplyReplacementSystemPrompt(targetLang),
    userPrompt: buildApplyReplacementUserPrompt({
      sourceText,
      sourceLang,
      targetLang,
      currentTranslation,
      selectedSpan,
      selectedReplacement,
      appliedReplacements,
    }),
  });

  const nextAppliedReplacement: AppliedReplacement = {
    span_id: selectedSpan.id,
    original_text: selectedSpan.text,
    replacement_text: selectedReplacement.replacement_text,
    usage_note: selectedReplacement.usage_note,
  };

  return {
    translated_text: result.translated_text.trim(),
    selectable_spans: repairSpans(result.translated_text.trim(), result.selectable_spans),
    applied_replacements: [...appliedReplacements, nextAppliedReplacement],
  };
}

function dedupeCandidates(
  candidates: ReplacementCandidate[],
  currentText: string,
): ReplacementCandidate[] {
  const seen = new Set<string>([currentText.trim().toLowerCase()]);
  const deduped: ReplacementCandidate[] = [];

  for (const candidate of candidates) {
    const key = candidate.replacement_text.trim().toLowerCase();
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(candidate);
  }

  return deduped.slice(0, 5);
}

function repairSpans(translatedText: string, spans: SelectableSpan[]) {
  const repaired = spans.map((span, index) => {
    const safeId = span.id || `span_${index + 1}`;

    if (translatedText.slice(span.start, span.end) === span.text) {
      return {
        ...span,
        id: safeId,
      };
    }

    const fallback = findUniqueSubstring(translatedText, span.text);

    if (!fallback) {
      return {
        ...span,
        id: safeId,
      };
    }

    return {
      ...span,
      id: safeId,
      start: fallback.start,
      end: fallback.end,
    };
  });

  return normalizeSpans(translatedText, repaired).slice(0, 7);
}

function findUniqueSubstring(text: string, value: string) {
  if (!value) {
    return null;
  }

  const firstIndex = text.indexOf(value);

  if (firstIndex === -1) {
    return null;
  }

  const secondIndex = text.indexOf(value, firstIndex + 1);
  if (secondIndex !== -1) {
    return null;
  }

  return {
    start: firstIndex,
    end: firstIndex + value.length,
  };
}

function buildLocalFallbackCandidates(
  selectedText: string,
  targetLang: AppLanguageCode,
): ReplacementCandidate[] {
  const normalized = normalizeToken(selectedText);
  if (!normalized) {
    return [];
  }

  const bank: Record<AppLanguageCode, Record<string, string[]>> = {
    zh: {
      "你好": ["您好", "嗨", "哈喽"],
    },
    en: {
      hi: ["hello", "hey", "greetings"],
      hello: ["hi", "hey", "greetings"],
    },
    de: {
      hi: ["Hallo", "Hey", "Guten Tag"],
      hallo: ["Hi", "Hey", "Guten Tag"],
      hey: ["Hi", "Hallo", "Guten Tag"],
    },
    fr: {
      salut: ["bonjour", "coucou", "bien le bonjour"],
      bonjour: ["salut", "coucou", "bien le bonjour"],
    },
  };

  const local = bank[targetLang][normalized] || [];
  const deduped = dedupeCandidates(
    local.map((text, index) => ({
      id: `local_${index + 1}`,
      replacement_text: matchCase(text, selectedText),
      usage_note: "本地兜底建议",
    })),
    selectedText,
  );

  return deduped.slice(0, 5);
}

function normalizeToken(value: string) {
  return value
    .trim()
    .replace(/^[^0-9A-Za-z\u00c0-\u024f\u4e00-\u9fff]+/, "")
    .replace(/[^0-9A-Za-z\u00c0-\u024f\u4e00-\u9fff]+$/, "")
    .toLowerCase();
}

function matchCase(candidate: string, original: string) {
  const trimmedOriginal = original.trim();
  if (!trimmedOriginal) {
    return candidate;
  }

  const first = trimmedOriginal[0];
  if (first.toUpperCase() === first && first.toLowerCase() !== first) {
    return candidate.charAt(0).toUpperCase() + candidate.slice(1);
  }

  return candidate;
}
