/**
 * 用户数据重置 API 路由
 * @description 重置当前用户的所有数据（标签、站点、外观配置），不影响其他用户和全局设置
 */

import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getVisibleTags,
  getAllSitesForAdmin,
  getAppearances,
  getAppSettings,
  resetUserData,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:UserData:Reset");

/**
 * 重置当前用户的数据
 */
export async function POST() {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    logger.info("开始重置用户数据", { ownerId });

    resetUserData(ownerId);

    logger.info("用户数据重置成功", { ownerId });
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
    logger.error("重置用户数据失败", error);
    return jsonError(error instanceof Error ? error.message : "重置失败", 500);
  }
}
