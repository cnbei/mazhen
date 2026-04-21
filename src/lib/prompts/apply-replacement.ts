import { getPromptLanguageName, type AppLanguageCode } from "@/lib/languages";
import type {
  AppliedReplacement,
  ReplacementCandidate,
  SelectableSpan,
} from "@/types/translation";

export function buildApplyReplacementSystemPrompt(targetLang: AppLanguageCode) {
  const targetName = getPromptLanguageName(targetLang);

  return [
    `You rewrite ${targetName} translations after the user chooses a replacement word or short phrase.`,
    "Regenerate the full sentence or paragraph so it stays natural and grammatically correct.",
    "Preserve the source meaning.",
    "Use the chosen replacement naturally in the result.",
    "Return JSON only with no markdown and no extra commentary.",
    "Provide refreshed selectable spans with exact offsets in the new translated_text.",
    "All keys must always be present.",
  ].join(" ");
}

export function buildApplyReplacementUserPrompt({
  sourceText,
  sourceLang,
  targetLang,
  currentTranslation,
  selectedSpan,
  selectedReplacement,
  appliedReplacements,
}: {
  sourceText: string;
  sourceLang: AppLanguageCode;
  targetLang: AppLanguageCode;
  currentTranslation: string;
  selectedSpan: SelectableSpan;
  selectedReplacement: ReplacementCandidate;
  appliedReplacements: AppliedReplacement[];
}) {
  return [
    "Rewrite the translation so the chosen replacement fits naturally.",
    "It is acceptable to adjust nearby grammar or word order if that improves fluency.",
    "Prefer the exact replacement text when possible.",
    "Return exactly one JSON object with keys: translated_text, selectable_spans, applied_replacements.",
    "",
    `source_lang: ${sourceLang}`,
    `target_lang: ${targetLang}`,
    `source_text: ${sourceText}`,
    `current_translation: ${currentTranslation}`,
    `selected_span: ${JSON.stringify(selectedSpan)}`,
    `selected_replacement: ${JSON.stringify(selectedReplacement)}`,
    `applied_replacements: ${JSON.stringify(appliedReplacements)}`,
  ].join("\n");
}
