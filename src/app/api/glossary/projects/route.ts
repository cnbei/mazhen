import { NextResponse } from "next/server";

import { listGlossaryProjects } from "@/lib/glossary/catalog";

export async function GET() {
  return NextResponse.json({
    projects: listGlossaryProjects(),
  });
}
