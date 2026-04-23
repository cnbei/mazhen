import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getGlossaryProject } from "@/lib/glossary/catalog";
import { translateSpansRequestSchema } from "@/lib/openai/schemas";
import { buildTranslationCacheKey, getCachedSpans, setCachedSpans } from "@/lib/translation/cache";
import { deriveSelectableSpans } from "@/lib/translation/service";

export async function POST(request: Request) {
  try {
    const payload = translateSpansRequestSchema.parse(await request.json());
    const projectDetail = payload.project_id ? getGlossaryProject(payload.project_id) : null;
    const effectiveGlossaryTerms = payload.glossary_terms ?? projectDetail?.terms ?? [];
    const cacheKey = buildTranslationCacheKey({
      sourceText: `${payload.source_text}\n${payload.translated_text}`,
      sourceLang: payload.source_lang,
      targetLang: payload.target_lang,
      projectId: payload.project_id,
    });
    const cached = getCachedSpans<{
      translated_text: string;
      selectable_spans: unknown[];
    }>(cacheKey);

    if (cached) {
      return NextResponse.json(cached);
    }

    const result = await deriveSelectableSpans({
      sourceText: payload.source_text,
      translatedText: payload.translated_text,
      sourceLang: payload.source_lang,
      targetLang: payload.target_lang,
      projectId: payload.project_id,
      glossaryTerms: effectiveGlossaryTerms,
    });

    setCachedSpans(cacheKey, result);
    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    const requestFieldSet = new Set([
      "source_text",
      "translated_text",
      "source_lang",
      "target_lang",
      "project_id",
      "glossary_terms",
    ]);
    const isRequestValidationError = error.issues.every((issue) =>
      requestFieldSet.has(String(issue.path[0] ?? "")),
    );

    if (!isRequestValidationError) {
      return NextResponse.json(
        { error: `模型输出结构校验失败：${error.issues[0]?.message || "结构无效。"}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      { error: "请提供有效的原文、译文和语言参数。" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "服务器发生未知错误。" },
    { status: 500 },
  );
}
