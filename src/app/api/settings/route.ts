import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/auth";
import { getAppSettings, updateAppSettings } from "@/lib/db";
import { appSettingsSchema } from "@/lib/schemas";
import { jsonError, jsonOk } from "@/lib/utils";

export async function GET() {
  try {
    await requireAdminSession();
    return jsonOk(getAppSettings());
  } catch {
    return jsonError("未授权", 401);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const parsed = appSettingsSchema.safeParse(await request.json());

    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "站点设置不合法");
    }

    return jsonOk(updateAppSettings(parsed.data));
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "保存失败", 500);
  }
}
