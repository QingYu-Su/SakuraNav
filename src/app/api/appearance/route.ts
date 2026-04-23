/**
 * 外观设置 API 路由
 * @description 处理外观配置的获取和更新请求，包括主题、壁纸等外观相关设置
 */

import { NextRequest } from "next/server";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { getAppearances, updateAppearances } from "@/lib/services";
import { appearanceSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Appearance");

export async function GET() {
  try {
    const session = await requireUserSession();
    return jsonOk(getAppearances(getEffectiveOwnerId(session)));
  } catch {
    logger.warning("获取外观设置失败: 未授权");
    return jsonError("未授权", 401);
  }
}

/**
 * 更新外观配置
 * @param request - 包含新外观配置的请求对象
 * @returns 更新后的外观配置
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const parsed = appearanceSchema.safeParse(await request.json());
    if (!parsed.success) {
      logger.warning("更新外观设置失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "外观配置不合法");
    }

    const ownerId = getEffectiveOwnerId(session);
    updateAppearances(ownerId, parsed.data);
    logger.info("外观设置更新成功", { ownerId });
    return jsonOk(getAppearances(ownerId));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("更新外观设置失败: 未授权");
      return jsonError("未授权", 401);
    }
    logger.error("更新外观设置失败", error);
    return jsonError(error instanceof Error ? error.message : "保存失败", 500);
  }
}
