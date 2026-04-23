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

  const csvBody = [
    "source,target",
    ...detail.terms.map((term) => `${escapeCsv(term.source)},${escapeCsv(term.target)}`),
  ].join("\n");

  return new NextResponse(`\uFEFF${csvBody}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(
        `${detail.project.name}.csv`,
      )}`,
    },
  });
}

function escapeCsv(value: string) {
  const normalized = value.replace(/"/g, "\"\"");

  if (/[",\n]/.test(normalized)) {
    return `"${normalized}"`;
  }

  return normalized;
}
