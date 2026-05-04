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
import { isRateLimited, getClientIp } from "@/lib/utils/rate-limit";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Assets");

export const runtime = "nodejs";

/** 各资源类型允许的 MIME 类型白名单 */
const ALLOWED_MIME_TYPES: Record<string, Set<string>> = {
  wallpaper: new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif", "image/bmp",
    "video/mp4", "video/webm",
  ]),
  logo: new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif",
  ]),
  favicon: new Set([
    "image/x-icon", "image/vnd.microsoft.icon", "image/png", "image/svg+xml",
  ]),
  icon: new Set([
    "image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml", "image/avif", "image/bmp",
  ]),
};

/** 各资源类型最大文件大小（字节） */
const MAX_FILE_SIZE: Record<string, number> = {
  wallpaper: 20 * 1024 * 1024,  // 20MB（支持视频壁纸）
  logo: 5 * 1024 * 1024,        // 5MB
  favicon: 1 * 1024 * 1024,     // 1MB
  icon: 5 * 1024 * 1024,        // 5MB
};

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
    const session = await requireUserSession();
    const ownerId = session.userId === "__admin__" ? "__admin__" : session.userId;

    // 速率限制
    const ip = getClientIp(request);
    if (isRateLimited(ip, "upload")) {
      return jsonError("请求过于频繁，请稍后再试", 429);
    }

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

    // 文件类型校验
    const allowedMimes = ALLOWED_MIME_TYPES[kind] ?? ALLOWED_MIME_TYPES.wallpaper;
    const mimeType = file.type || "application/octet-stream";
    if (!allowedMimes.has(mimeType)) {
      return jsonError(`不支持的${label}文件格式（${mimeType}）`);
    }

    // 文件大小校验
    const maxSize = MAX_FILE_SIZE[kind] ?? MAX_FILE_SIZE.wallpaper;
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024);
      return jsonError(`${label}文件大小不能超过 ${maxMB}MB`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || ".bin";
    const filename = `${crypto.randomUUID()}${ext}`;
    const userUploadsDir = path.join(process.env.PROJECT_ROOT ?? process.cwd(), "storage", "uploads", ownerId);
    const filePath = path.join(userUploadsDir, filename);

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
