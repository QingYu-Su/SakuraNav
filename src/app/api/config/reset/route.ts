/**
 * 配置重置 API 路由
 * @description 清空 uploads 目录并将数据库重置为默认值，需要管理员密码确认
 */

import fs from "node:fs";
import path from "node:path";
import { requireAdminConfirmation, requireAdminSession, getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getAllSitesForAdmin,
  getAppSettings,
  getAppearances,
  getVisibleTags,
  resetContentToDefaults,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Config:Reset");

export const runtime = "nodejs";

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/**
 * 重置配置到默认值
 * @description 清空 uploads 目录 + 重置数据库到默认
 */
export async function POST(request: Request) {
  try {
    logger.info("开始重置配置");
    const body = (await request.json().catch(() => null)) as { password?: string } | null;
    const session = await requireAdminSession();
    const ownerId = getEffectiveOwnerId(session);
    await requireAdminConfirmation(body?.password);

    // 清空 uploads 目录（按用户划分的子目录）
    const uploadsDir = path.join(projectRoot, "storage", "uploads");
    if (fs.existsSync(uploadsDir)) {
      for (const entry of fs.readdirSync(uploadsDir, { withFileTypes: true })) {
        const full = path.join(uploadsDir, entry.name);
        if (entry.isDirectory()) {
          fs.rmSync(full, { recursive: true, force: true });
        } else {
          fs.unlinkSync(full);
        }
      }
      logger.info("已清空 uploads 目录");
    }

    // 重置数据库到默认
    resetContentToDefaults();

    logger.info("配置重置成功");
    return jsonOk({
      ok: true,
      tags: getVisibleTags(ownerId),
      sites: getAllSitesForAdmin(),
      appearances: getAppearances(ownerId),
      settings: getAppSettings(),
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
