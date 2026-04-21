import { NextResponse } from "next/server";
import { z } from "zod";

import { getGlossaryProject } from "@/lib/glossary/catalog";
import { findGlossaryMatches } from "@/lib/glossary/matcher";

const matchRequestSchema = z.object({
  project_id: z.string().trim().min(1),
  source_text: z.string().trim().min(1).max(20000),
  top_k: z.number().int().min(1).max(30).optional(),
});

export async function POST(request: Request) {
  try {
    const payload = matchRequestSchema.parse(await request.json());
    const detail = getGlossaryProject(payload.project_id);

    if (!detail) {
      return NextResponse.json({ error: "项目不存在。" }, { status: 404 });
    }

    const matches = findGlossaryMatches({
      sourceText: payload.source_text,
      terms: detail.terms,
      topK: payload.top_k ?? 12,
    });

    return NextResponse.json({
      project_id: payload.project_id,
      matches,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "术语匹配请求参数无效。" }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "术语匹配时发生未知错误。" },
      { status: 500 },
    );
  }
}
