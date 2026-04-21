import { NextResponse } from "next/server";

import { parseGlossaryText } from "@/lib/glossary/parser";
import { upsertGlossaryProjectTerms } from "@/lib/glossary/catalog";

const MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024;
const MAX_PARSED_TERMS = 120000;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const projectId = String(formData.get("project_id") ?? "").trim();
    const projectName = String(formData.get("project_name") ?? "").trim();
    const file = formData.get("file");

    if (!projectId && !projectName) {
      return NextResponse.json(
        { error: "请先选择项目，或输入新项目名称。" },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "请上传术语文件。" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "文件过大，请控制在 8MB 以内。" },
        { status: 400 },
      );
    }

    const text = await file.text();
    const terms = parseGlossaryText(text);

    if (terms.length === 0) {
      return NextResponse.json(
        { error: "未识别到有效术语行，请确认包含 source/target 两列。" },
        { status: 400 },
      );
    }

    if (terms.length > MAX_PARSED_TERMS) {
      return NextResponse.json(
        { error: "术语条数过多，请拆分后再上传。" },
        { status: 400 },
      );
    }

    const result = upsertGlossaryProjectTerms({
      projectId,
      projectName,
      terms,
    });

    if (!result) {
      return NextResponse.json({ error: "项目不存在。" }, { status: 404 });
    }

    return NextResponse.json({
      project_id: result.project_id,
      project_name: result.project_name,
      created: result.created,
      imported_count: result.imported_count,
      duplicate_count: result.duplicate_count,
      total_count: result.total_count,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "上传时发生未知错误。" },
      { status: 500 },
    );
  }
}
