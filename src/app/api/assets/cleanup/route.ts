/**
 * 资源清理 API 路由
 * @description 清理指定的孤立 icon 资源（物理文件 + 数据库记录）
 * 前端在退出编辑模式或页面刷新时调用，传入待清理的 assetId 列表
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getAsset, deleteAsset } from "@/lib/services/asset-repository";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import fs from "node:fs/promises";

const logger = createLogger("API:Assets:Cleanup");

export async function POST(request: NextRequest) {
  try {
    await requireUserSession();
    const body = (await request.json()) as { assetIds?: string[] };
    const assetIds = body.assetIds;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return jsonOk({ cleaned: 0 });
    }

    let cleaned = 0;
    for (const assetId of assetIds) {
      if (typeof assetId !== "string" || !assetId.startsWith("asset-")) continue;
      const asset = getAsset(assetId);
      if (asset) {
        try {
          await fs.unlink(asset.filePath);
        } catch {
          /* 文件可能已不存在 */
        }
        deleteAsset(asset.id);
        cleaned++;
      }
    }

    logger.info("清理孤立 icon 资源完成", { total: assetIds.length, cleaned });
    return jsonOk({ cleaned });
  } catch {
    logger.warning("清理孤立资源失败: 未授权");
    return jsonError("未授权", 401);
  }
}
