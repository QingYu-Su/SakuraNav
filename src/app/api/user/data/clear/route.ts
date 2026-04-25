/**
 * 用户数据清除 API 路由
 * @description 仅清除当前用户的标签和站点（含社交卡片），保留外观配置和全局设置
 */

import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getVisibleTags,
  getAllSitesForAdmin,
  getAppearances,
  getAppSettings,
  clearUserData,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:UserData:Clear");

/**
 * 清除当前用户的标签和站点数据
 * - 管理员：清除管理员空间的所有标签和站点（游客可见的数据一并清空）
 * - 普通用户：仅清除自己空间的数据，不影响其他用户
 */
export async function POST() {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    logger.info("开始清除用户标签和站点", { ownerId, role: session.role });

    clearUserData(ownerId);

    logger.info("用户标签和站点已清除", { ownerId });

    return jsonOk({
      ok: true,
      tags: getVisibleTags(ownerId),
      sites: getAllSitesForAdmin(),
      appearances: getAppearances(ownerId),
      settings: getAppSettings(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("清除用户数据失败", error);
    return jsonError(error instanceof Error ? error.message : "清除失败", 500);
  }
}
