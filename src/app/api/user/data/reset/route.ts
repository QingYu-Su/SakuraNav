/**
 * 用户数据重置 API 路由
 * @description 重置当前用户的所有数据。管理员恢复到初始种子状态；普通用户恢复到管理员当前数据。
 */

import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getVisibleTags,
  getAllSitesForAdmin,
  getAppearances,
  getAppSettings,
  resetUserData,
  resetAdminToSeedState,
} from "@/lib/services";
import { copyAdminDataToUser } from "@/lib/services/user-repository";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:UserData:Reset");

/**
 * 重置当前用户的数据
 * - 管理员：恢复到初始种子状态（清空所有数据 + 重新 seed）
 * - 普通用户：恢复到管理员当前数据（删除用户数据 + 复制管理员数据）
 */
export async function POST() {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    logger.info("开始重置用户数据", { ownerId, role: session.role });

    if (session.role === "admin") {
      // 管理员：恢复到初始种子状态
      resetAdminToSeedState();
      logger.info("管理员数据已重置到种子状态", { ownerId });
    } else {
      // 普通用户：先清除用户数据，再从管理员复制
      resetUserData(ownerId);
      copyAdminDataToUser(ownerId);
      logger.info("普通用户数据已重置为管理员当前状态", { ownerId });
    }

    return jsonOk({
      ok: true,
      tags: getVisibleTags(ownerId),
      sites: getAllSitesForAdmin(ownerId),
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
