/**
 * 配置重置 API 路由
 * @description 将所有配置恢复为默认值，需要管理员密码确认
 */

import { requireAdminConfirmation } from "@/lib/auth";
import {
  getAllSitesForAdmin,
  getAppSettings,
  getAppearances,
  getVisibleTags,
  resetContentToDefaults,
} from "@/lib/db";
import { jsonError, jsonOk } from "@/lib/utils";

export const runtime = "nodejs";

/**
 * 重置配置到默认值
 * @param request - 包含确认密码的请求对象
 * @returns 重置后的完整数据
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as { password?: string } | null;
    await requireAdminConfirmation(body?.password);
    resetContentToDefaults();

    return jsonOk({
      ok: true,
      tags: getVisibleTags(true),
      sites: getAllSitesForAdmin(),
      appearances: getAppearances(),
      settings: getAppSettings(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }

    if (error instanceof Error && error.message === "INVALID_PASSWORD") {
      return jsonError("确认密码错误", 403);
    }

    return jsonError(error instanceof Error ? error.message : "恢复默认失败", 500);
  }
}
