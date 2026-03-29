/**
 * 应用设置 API 路由
 * @description 处理应用全局设置的获取和更新请求，如站点标题、搜索引擎等配置
 */

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

/**
 * 更新应用设置
 * @param request - 包含新设置的请求对象
 * @returns 更新后的设置数据
 */
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
