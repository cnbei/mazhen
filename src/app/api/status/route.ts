import { NextResponse } from "next/server";

import { getServerStatus } from "@/lib/server-status";

export async function GET() {
  return NextResponse.json({
    server: getServerStatus(),
  });
}
