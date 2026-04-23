import { z } from "zod";
const languageCodeSchema = z.enum(["zh", "en", "de", "fr"]);

export const selectableSpanSchema = z.object({
  id: z.string(),
  text: z.string(),
  start: z.number().int().min(0),
  end: z.number().int().min(0),
  rationale: z.string().nullable().optional(),
});

export const replacementCandidateSchema = z.object({
  id: z.string(),
  replacement_text: z.string(),
  usage_note: z.string(),
});

export const appliedReplacementSchema = z.object({
  span_id: z.string(),
  original_text: z.string(),
  replacement_text: z.string(),
  usage_note: z.string(),
});

export const translationResultSchema = z.object({
  source_text: z.string().optional().default(""),
  translated_text: z.string().optional().default(""),
  selectable_spans: z
    .array(
      z.object({
        id: z.string().optional().default(""),
        text: z.string().optional().default(""),
        start: z.number().int().min(0).optional().default(0),
        end: z.number().int().min(0).optional().default(0),
        rationale: z.string().nullable().optional().default(null),
      }),
    )
    .optional()
    .default([]),
  applied_replacements: z
    .array(
      z.object({
        span_id: z.string().optional().default(""),
        original_text: z.string().optional().default(""),
        replacement_text: z.string().optional().default(""),
        usage_note: z.string().optional().default(""),
      }),
    )
    .optional()
    .default([]),
});

export const fastTranslationResultSchema = z.object({
  source_text: z.string().optional().default(""),
  translated_text: z.string().optional().default(""),
});

export const translationSpansResultSchema = z.object({
  translated_text: z.string().optional().default(""),
  selectable_spans: z
    .array(
      z.object({
        id: z.string().optional().default(""),
        text: z.string().optional().default(""),
        start: z.number().int().min(0).optional().default(0),
        end: z.number().int().min(0).optional().default(0),
        rationale: z.string().nullable().optional().default(null),
      }),
    )
    .optional()
    .default([]),
});

export const suggestReplacementResultSchema = z.object({
  selected_span_id: z.string(),
  replacement_candidates: z.array(replacementCandidateSchema).max(5),
});

export const applyReplacementResultSchema = z.object({
  translated_text: z.string(),
  selectable_spans: z.array(selectableSpanSchema),
  applied_replacements: z.array(appliedReplacementSchema),
});

export const translateRequestSchema = z.object({
  source_text: z.string().trim().min(1).max(3000),
  source_lang: languageCodeSchema.optional().default("zh"),
  target_lang: languageCodeSchema.optional().default("de"),
  project_id: z.string().trim().min(1).max(120).optional(),
  glossary_terms: z
    .array(
      z.object({
        source: z.string().trim().min(1).max(200),
        target: z.string().trim().min(1).max(300),
      }),
    )
    .max(200)
    .optional(),
});

export const translateSpansRequestSchema = z.object({
  source_text: z.string().trim().min(1).max(3000),
  translated_text: z.string().trim().min(1).max(3000),
  source_lang: languageCodeSchema.optional().default("zh"),
  target_lang: languageCodeSchema.optional().default("de"),
  project_id: z.string().trim().min(1).max(120).optional(),
  glossary_terms: z
    .array(
      z.object({
        source: z.string().trim().min(1).max(200),
        target: z.string().trim().min(1).max(300),
      }),
    )
    .max(200)
    .optional(),
});

export const suggestRequestSchema = z.object({
  source_text: z.string().trim().min(1).max(3000),
  translated_text: z.string().trim().min(1).max(3000),
  source_lang: languageCodeSchema.optional().default("zh"),
  target_lang: languageCodeSchema.optional().default("de"),
  selected_span: selectableSpanSchema,
  applied_replacements: z.array(appliedReplacementSchema),
});

export const applyRequestSchema = z.object({
  source_text: z.string().trim().min(1).max(3000),
  current_translation: z.string().trim().min(1).max(3000),
  source_lang: languageCodeSchema.optional().default("zh"),
  target_lang: languageCodeSchema.optional().default("de"),
  selected_span: selectableSpanSchema,
  selected_replacement: replacementCandidateSchema,
  applied_replacements: z.array(appliedReplacementSchema),
});
