import { getPromptLanguageName, type AppLanguageCode } from "@/lib/languages";
import type { ProjectTone } from "@/types/glossary";

export function buildTranslateSystemPrompt({
  projectTone,
  sourceLang,
  targetLang,
}: {
  projectTone?: ProjectTone;
  sourceLang: AppLanguageCode;
  targetLang: AppLanguageCode;
}) {
  const sourceName = getPromptLanguageName(sourceLang);
  const targetName = getPromptLanguageName(targetLang);

  const toneInstruction =
    targetLang === "de"
      ? projectTone === "du"
        ? "Use direct second-person singular style (du/dein) when the context addresses players."
        : projectTone === "ihr"
          ? "Use second-person plural style (ihr/euer) when the context addresses community users."
          : "Use neutral standard German style."
      : "Keep a consistent, natural style suitable for game and community localization.";

  return [
    `You translate text from ${sourceName} into natural, high-frequency ${targetName} for a professional localization workflow.`,
    `Source language is expected to be primarily ${sourceName}, but detect source language robustly if mixed.`,
    targetLang === "de" ? "Target locale is standard German (de-DE)." : "Target locale should be standard mainstream usage.",
    toneInstruction,
    "Prefer common usage, readability, and idiomatic phrasing over literal translation.",
    "If glossary terms are provided, they are hard constraints. Use the exact glossary target for matched source terms.",
    "Return JSON only with no markdown and no extra commentary.",
    "Choose 3 to 7 editable spans when useful.",
    "Selectable spans must be exact substrings of translated_text and use correct character offsets.",
    "Only mark words or short phrases whose alternatives can naturally change tone, register, or emphasis.",
    "Do not mark punctuation-only spans.",
    "All keys must always be present.",
    "Use null for rationale when there is no note.",
  ].join(" ");
}

export function buildTranslateUserPrompt({
  sourceText,
  sourceLang,
  targetLang,
  projectId,
  glossaryTerms,
  tmCandidates,
}: {
  sourceText: string;
  sourceLang: AppLanguageCode;
  targetLang: AppLanguageCode;
  projectId?: string;
  glossaryTerms?: Array<{ source: string; target: string }>;
  tmCandidates?: Array<{ source_text: string; target_text: string; score: number; match_type: string }>;
}) {
  const glossaryBlock =
    glossaryTerms && glossaryTerms.length > 0
      ? glossaryTerms.map((term) => `${term.source} => ${term.target}`).join("\n")
      : "none";
  const tmBlock =
    tmCandidates && tmCandidates.length > 0
      ? tmCandidates
          .map(
            (item) =>
              `[${item.match_type}:${(item.score * 100).toFixed(1)}] ${item.source_text} => ${item.target_text}`,
          )
          .join("\n")
      : "none";

  return [
    `Translate the following text from ${getPromptLanguageName(sourceLang)} to ${getPromptLanguageName(targetLang)}.`,
    "Then identify useful editable spans in the target output.",
    "Return exactly one JSON object with keys: source_text, translated_text, selectable_spans, applied_replacements.",
    "When glossary terms are present, prioritize terminology consistency over stylistic variation for those terms.",
    "",
    `source_lang: ${sourceLang}`,
    `target_lang: ${targetLang}`,
    `project_id: ${projectId || "none"}`,
    "tm_candidates:",
    tmBlock,
    "",
    "glossary_terms:",
    glossaryBlock,
    "",
    `source_text: ${sourceText}`,
  ].join("\n");
}
