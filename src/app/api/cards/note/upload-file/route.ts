/**
 * 笔记文件上传 API 路由
 * @description 处理笔记编辑器中的文件上传（剪贴板粘贴非图片文件等场景）
 * 复用现有 asset 基础设施，kind = "note-file"
 */

import fs from "node:fs/promises";
import path from "node:path";
import { requireUserSession } from "@/lib/base/auth";
import { createAsset } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Cards:Note:UploadFile");

export const runtime = "nodejs";

/** 允许的图片 MIME 前缀（文件上传端点拒绝图片类型，图片应走 upload-image） */
const IMAGE_MIME_PREFIX = "image/";

/** 危险文件扩展名黑名单 */
const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "scr", "msi", "msp", "cpl",
  "sh", "bash", "ps1", "vbs", "vbe", "wsf", "wsh",
  "jar", "class", "app", "dll", "sys",
]);

/** 最大文件大小：100MB */
const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await requireUserSession();
    const ownerId = session.userId === "__admin__" ? "__admin__" : session.userId;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("请上传文件");
    }

    // 拒绝图片类型（图片应通过 upload-image 端点上传）
    if (file.type.startsWith(IMAGE_MIME_PREFIX)) {
      return jsonError("图片文件请通过图片上传功能上传");
    }

    // 校验文件扩展名
    const ext = path.extname(file.name).toLowerCase().replace(".", "");
    if (BLOCKED_EXTENSIONS.has(ext)) {
      return jsonError("不支持上传该类型的文件");
    }

    // 校验文件大小
    if (file.size > MAX_FILE_SIZE) {
      return jsonError("文件大小不能超过 100MB");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const safeExt = ext || "bin";
    const filename = `${crypto.randomUUID()}.${safeExt}`;
    const userUploadsDir = path.join(process.env.PROJECT_ROOT ?? process.cwd(), "storage", "uploads", ownerId);
    const filePath = path.join(userUploadsDir, filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    const asset = createAsset({
      filePath,
      mimeType: file.type || "application/octet-stream",
      kind: "note-file",
      originalName: file.name,
      fileSize: buffer.length,
    });

    // 使用独立的笔记文件路径，不暴露内部 asset 系统
    const fileUrl = `/api/cards/note/file/${asset.id}`;

    logger.info("笔记文件上传成功", { assetId: asset.id, filename: file.name, size: buffer.length });
    return jsonOk({ url: fileUrl, assetId: asset.id, filename: file.name });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("笔记文件上传失败: 未授权");
      return jsonError("未授权", 401);
    }

    logger.error("笔记文件上传失败", error);
    return jsonError(error instanceof Error ? error.message : "上传文件失败", 500);
  }
}
