/**
 * 配置重置 API 路由
 * @description 将所有配置恢复为默认值，需要管理员密码确认
 */

import { requireAdminConfirmation } from "@/lib/base/auth";
import {
  getAllSitesForAdmin,
  getAppSettings,
  getAppearances,
  getVisibleTags,
  resetContentToDefaults,
  getAllCards,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Config:Reset");

export const runtime = "nodejs";

/**
 * 重置配置到默认值
 * @param request - 包含确认密码的请求对象
 * @returns 重置后的完整数据
 */
export async function POST(request: Request) {
  try {
    logger.info("开始重置配置");
    const body = (await request.json().catch(() => null)) as { password?: string } | null;
    await requireAdminConfirmation(body?.password);
    resetContentToDefaults();

    logger.info("配置重置成功");
    return jsonOk({
      ok: true,
      tags: getVisibleTags(true),
      sites: getAllSitesForAdmin(),
      appearances: getAppearances(),
      settings: getAppSettings(),
      cards: getAllCards(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("重置配置失败: 未授权");
      return jsonError("未授权", 401);
    }

    if (error instanceof Error && error.message === "INVALID_PASSWORD") {
      logger.warning("重置配置失败: 密码错误");
      return jsonError("确认密码错误", 403);
    }

    logger.error("重置配置失败", error);
    return jsonError(error instanceof Error ? error.message : "恢复默认失败", 500);
  }
}
