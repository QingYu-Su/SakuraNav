/**
 * 资源清理 API 路由
 * @description 清理指定的孤立 icon 资源（物理文件 + 数据库记录）
 * 前端在退出编辑模式或页面刷新时调用，传入待清理的 assetId 列表
 */

import { NextRequest } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { requireUserSession } from "@/lib/base/auth";
import { getAsset, deleteAsset } from "@/lib/services/asset-repository";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Assets:Cleanup");

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const ownerId = session.userId === "__admin__" ? "__admin__" : session.userId;
    const body = (await request.json()) as { assetIds?: string[] };
    const assetIds = body.assetIds;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return jsonOk({ cleaned: 0 });
    }

    // 用户上传目录，用于所有权校验
    const userUploadsDir = path.resolve(path.join(projectRoot, "storage", "uploads", ownerId));

    let cleaned = 0;
    for (const assetId of assetIds) {
      if (typeof assetId !== "string" || !assetId.startsWith("asset-")) continue;
      const asset = await getAsset(assetId);
      if (!asset) continue;

      // 所有权校验：只允许删除自己目录下的资源
      const resolvedFilePath = path.resolve(asset.filePath);
      if (!resolvedFilePath.startsWith(userUploadsDir + path.sep)) {
        logger.warning("资源清理跳过：无权删除其他用户的资源", { assetId, userId: session.userId });
        continue;
      }

      try {
        await fs.unlink(asset.filePath);
      } catch {
        /* 文件可能已不存在 */
      }
      await deleteAsset(asset.id);
      cleaned++;
    }

    logger.info("清理孤立 icon 资源完成", { total: assetIds.length, cleaned });
    return jsonOk({ cleaned });
  } catch {
    logger.warning("清理孤立资源失败: 未授权");
    return jsonError("未授权", 401);
  }
}
