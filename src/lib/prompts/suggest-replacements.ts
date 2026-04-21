import { getPromptLanguageName, type AppLanguageCode } from "@/lib/languages";
import type { AppliedReplacement, SelectableSpan } from "@/types/translation";

export function buildSuggestSystemPrompt(targetLang: AppLanguageCode) {
  const targetName = getPromptLanguageName(targetLang);

  return [
    `You propose replacement candidates for a selected word or short phrase inside a ${targetName} sentence.`,
    `Candidates must be natural, common, and grammatically appropriate in ${targetName}.`,
    "Prefer high-frequency wording.",
    "Return 3 to 5 candidates with concise usage notes such as more formal, more neutral, more common in speech, or stronger emphasis.",
    "Do not repeat the current span text as a candidate.",
    "Return JSON only with no markdown and no extra commentary.",
    "All keys must always be present.",
  ].join(" ");
}

export function buildSuggestUserPrompt({
  sourceText,
  sourceLang,
  targetLang,
  translatedText,
  selectedSpan,
  appliedReplacements,
}: {
  sourceText: string;
  sourceLang: AppLanguageCode;
  targetLang: AppLanguageCode;
  translatedText: string;
  selectedSpan: SelectableSpan;
  appliedReplacements: AppliedReplacement[];
}) {
  return [
    "Suggest natural replacements for the selected span.",
    "The suggestions must fit the sentence and preserve the original meaning closely.",
    "Return exactly one JSON object with keys: selected_span_id, replacement_candidates.",
    "",
    `source_lang: ${sourceLang}`,
    `target_lang: ${targetLang}`,
    `source_text: ${sourceText}`,
    `translated_text: ${translatedText}`,
    `selected_span: ${JSON.stringify(selectedSpan)}`,
    `applied_replacements: ${JSON.stringify(appliedReplacements)}`,
  ].join("\n");
}
