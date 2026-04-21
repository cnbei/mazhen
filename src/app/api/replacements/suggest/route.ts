import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { suggestRequestSchema } from "@/lib/openai/schemas";
import { suggestReplacementCandidates } from "@/lib/translation/service";

export async function POST(request: Request) {
  const rawBody = await request.json();
  const parsed = suggestRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "请求替换建议前，请先选择有效词组。" },
      { status: 400 },
    );
  }

  try {
    const payload = parsed.data;
    const result = await suggestReplacementCandidates(
      payload.source_text,
      payload.source_lang,
      payload.target_lang,
      payload.translated_text,
      payload.selected_span,
      payload.applied_replacements,
    );

    return NextResponse.json(result);
  } catch (error) {
    return handleRouteError(error);
  }
}

function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "替换建议结果格式异常，请重试。" },
      { status: 502 },
    );
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "服务器发生未知错误。" },
    { status: 500 },
  );
}
