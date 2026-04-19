/**
 * 初始化引导 API 路由
 * @description 提供管理员初始化数据接口，一次性获取所有管理所需的数据（标签、网站、外观、设置、社交卡片）
 */

import { requireAdminSession } from "@/lib/base/auth";
import {
  getAllSitesForAdmin,
  getAppSettings,
  getAppearances,
  getVisibleTags,
  getAllCards,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";

/**
 * 获取管理员初始化数据
 * @returns 包含标签、网站、外观、设置和社交卡片的完整数据
 */
export async function GET() {
  try {
    await requireAdminSession();

    return jsonOk({
      tags: getVisibleTags(true),
      sites: getAllSitesForAdmin(),
      appearances: getAppearances(),
      settings: getAppSettings(),
      cards: getAllCards(),
    });
  } catch {
    return jsonError("未授权", 401);
  }
}
