import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getAppearances, updateAppearances } from "@/lib/db";
import { appearanceSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";

export async function GET() {
  try {
    await requireAdminSession();
    return jsonOk(getAppearances());
  } catch {
    return jsonError("未授权", 401);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = appearanceSchema.safeParse(await request.json());
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "外观配置不合法");
    }

    updateAppearances(parsed.data);
    return jsonOk(getAppearances());
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "保存失败", 500);
  }
}
