/**
 * 应用设置 API 路由
 * @description 处理应用全局设置的获取和更新请求，如站点标题、搜索引擎等配置
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getAppSettings, updateAppSettings } from "@/lib/services";
import { appSettingsSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Settings");

export async function GET() {
  try {
    await requireUserSession();
    return jsonOk(getAppSettings());
  } catch {
    logger.warning("获取应用设置失败: 未授权");
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
    await requireUserSession();
    const parsed = appSettingsSchema.safeParse(await request.json());

    if (!parsed.success) {
      logger.warning("更新应用设置失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "站点设置不合法");
    }

    const settings = updateAppSettings(parsed.data);
    logger.info("应用设置更新成功");
    return jsonOk(settings);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("更新应用设置失败: 未授权");
      return jsonError("未授权", 401);
    }
    logger.error("更新应用设置失败", error);
    return jsonError(error instanceof Error ? error.message : "保存失败", 500);
  }
}
