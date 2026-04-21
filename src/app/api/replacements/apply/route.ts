import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { applyRequestSchema } from "@/lib/openai/schemas";
import { applyReplacementAndRegenerate } from "@/lib/translation/service";

export async function POST(request: Request) {
  try {
    const payload = applyRequestSchema.parse(await request.json());
    const result = await applyReplacementAndRegenerate(
      payload.source_text,
      payload.source_lang,
      payload.target_lang,
      payload.current_translation,
      payload.selected_span,
      payload.selected_replacement,
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
      { error: "应用替换前，请先选择有效候选词。" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : "服务器发生未知错误。" },
    { status: 500 },
  );
}
