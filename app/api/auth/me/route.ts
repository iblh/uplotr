import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getRequestUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const user = await getRequestUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    username: user.username,
    role: user.role,
  });
}
