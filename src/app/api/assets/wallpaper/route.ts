/**
 * 资源上传 API 路由
 * @description 处理壁纸、Logo、Favicon、图标等资源的文件上传
 */

import fs from "node:fs/promises";
import path from "node:path";
import { requireUserSession } from "@/lib/base/auth";
import { createAsset } from "@/lib/services";
import { getAsset, deleteAsset } from "@/lib/services/asset-repository";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Assets");

export const runtime = "nodejs";

function assetLabel(kind: string) {
  switch (kind) {
    case "logo": return "Logo";
    case "favicon": return "Favicon";
    case "icon": return "图标";
    default: return "壁纸";
  }
}

/**
 * 上传资源文件
 * @description 接收 FormData 格式的文件上传，支持壁纸、Logo、Favicon、图标等类型
 * @param request - 包含文件的请求对象
 * @returns 创建的资源记录
 */
export async function POST(request: Request) {
  try {
    await requireUserSession();

    const formData = await request.formData();
    const file = formData.get("file");
    const kindValue = formData.get("kind");
    const kind = typeof kindValue === "string" && kindValue.trim() ? kindValue.trim() : "wallpaper";
    const label = assetLabel(kind);

    /** 可选：传入旧资产 ID，上传成功后自动删除旧文件 */
    const oldAssetIdValue = formData.get("oldAssetId");
    const oldAssetId = typeof oldAssetIdValue === "string" && oldAssetIdValue.trim() ? oldAssetIdValue.trim() : null;

    if (!(file instanceof File)) {
      return jsonError(`请上传${label}文件`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || ".bin";
    const filename = `${crypto.randomUUID()}${ext}`;
    const filePath = path.join(process.env.PROJECT_ROOT ?? process.cwd(), "storage", "uploads", filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    const asset = createAsset({
      filePath,
      mimeType: file.type || "application/octet-stream",
      kind,
    });

    // 删除旧资源文件和记录
    if (oldAssetId) {
      const oldAsset = getAsset(oldAssetId);
      if (oldAsset) {
        try { await fs.unlink(oldAsset.filePath); } catch { /* 文件可能已不存在 */ }
        deleteAsset(oldAsset.id);
        logger.info("旧资源已删除", { oldAssetId });
      }
    }

    logger.info("资源上传成功", { assetId: asset.id, kind, filename: file.name, size: buffer.length });
    return jsonOk(asset);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("资源上传失败: 未授权");
      return jsonError("未授权", 401);
    }

    logger.error("资源上传失败", error);
    return jsonError(error instanceof Error ? error.message : "上传图片失败", 500);
  }
}
