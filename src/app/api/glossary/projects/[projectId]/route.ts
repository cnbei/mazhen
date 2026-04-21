import { NextResponse } from "next/server";

import { getGlossaryProject } from "@/lib/glossary/catalog";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await context.params;
  const detail = getGlossaryProject(projectId);

  if (!detail) {
    return NextResponse.json({ error: "未找到该项目的术语库。" }, { status: 404 });
  }

  return NextResponse.json(detail);
}
