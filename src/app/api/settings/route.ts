/**
 * 应用设置 API 路由
 * @description 处理应用全局设置的获取和更新请求，如站点标题、搜索引擎等配置
 */

import { NextRequest } from "next/server";
import { requirePrivilegedSession } from "@/lib/base/auth";
import { getAppSettings, updateAppSettings } from "@/lib/services";
import { appSettingsSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Settings");

/** 将 API Key 掩码为 sk-****xxxx 格式（仅保留末尾 4 位） */
function maskApiKey(key: string): string {
  if (!key || key.length <= 8) return key ? "****" : "";
  return `****${key.slice(-4)}`;
}

export async function GET() {
  try {
    await requirePrivilegedSession();
    const settings = getAppSettings();
    // 对外返回掩码 apiKey，不暴露明文
    return jsonOk({
      ...settings,
      aiApiKey: maskApiKey(settings.aiApiKey),
      aiApiKeyMasked: !!settings.aiApiKey,
    });
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
    await requirePrivilegedSession();
    const body = await request.json();

    // 如果 apiKey 是掩码（以 **** 开头），则不更新该字段
    if (typeof body.aiApiKey === "string" && body.aiApiKey.startsWith("****")) {
      body.aiApiKey = undefined;
    }

    const parsed = appSettingsSchema.safeParse(body);

    if (!parsed.success) {
      logger.warning("更新应用设置失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "站点设置不合法");
    }

    const settings = updateAppSettings(parsed.data);
    logger.info("应用设置更新成功");
    // 返回时同样掩码 apiKey
    return jsonOk({
      ...settings,
      aiApiKey: maskApiKey(settings.aiApiKey),
      aiApiKeyMasked: !!settings.aiApiKey,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("更新应用设置失败: 未授权");
      return jsonError("未授权", 401);
    }
    logger.error("更新应用设置失败", error);
    return jsonError(error instanceof Error ? error.message : "保存失败", 500);
  }
}
