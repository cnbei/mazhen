import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getGlossaryProject } from "@/lib/glossary/catalog";
import { translateRequestSchema } from "@/lib/openai/schemas";
import { translateEnglishToGerman } from "@/lib/translation/service";
import { findTmCandidates, upsertTmEntry } from "@/lib/translation/tm-memory";

export async function POST(request: Request) {
  try {
    const payload = translateRequestSchema.parse(await request.json());
    const projectDetail = payload.project_id ? getGlossaryProject(payload.project_id) : null;
    const effectiveGlossaryTerms = payload.glossary_terms ?? projectDetail?.terms ?? [];
    const tmCandidates = payload.project_id
      ? findTmCandidates(payload.project_id, payload.source_text, 5)
      : [];

    const result = await translateEnglishToGerman({
      sourceText: payload.source_text,
      sourceLang: payload.source_lang,
      targetLang: payload.target_lang,
      projectId: payload.project_id,
      projectTone: projectDetail?.project.tone,
      glossaryTerms: effectiveGlossaryTerms,
      tmCandidates,
    });

    if (payload.project_id) {
      upsertTmEntry(payload.project_id, payload.source_text, result.translated_text);
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    const requestFieldSet = new Set(["source_text", "source_lang", "target_lang", "project_id", "glossary_terms"]);
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
      { error: "请提供有效的原文、语言参数和项目参数。" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "服务器发生未知错误。" },
    { status: 500 },
  );
}
