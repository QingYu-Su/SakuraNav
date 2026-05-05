/**
 * 初始化引导 API 路由
 * @description 提供管理员初始化数据接口，一次性获取所有管理所需的数据（标签、网站、外观、设置、社交卡片）
 */

import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getAllSitesForAdmin,
  getAppSettings,
  getAppearances,
  getVisibleTags,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";

/** 将 API Key 掩码为 ****xxxx 格式 */
function maskApiKey(key: string): string {
  if (!key || key.length <= 8) return key ? "****" : "";
  return `****${key.slice(-4)}`;
}

/**
 * 获取管理员初始化数据
 * @returns 包含标签、网站、外观、设置的完整数据（社交卡片已包含在 sites 中）
 */
export async function GET() {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    const settings = await getAppSettings();

    return jsonOk({
      tags: await getVisibleTags(ownerId),
      sites: await getAllSitesForAdmin(ownerId),
      appearances: await getAppearances(ownerId),
      settings: {
        ...settings,
        aiApiKey: maskApiKey(settings.aiApiKey),
        aiApiKeyMasked: !!settings.aiApiKey,
      },
    });
  } catch {
    return jsonError("未授权", 401);
  }
}
