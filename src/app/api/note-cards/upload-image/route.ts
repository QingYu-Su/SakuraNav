/**
* 笔记图片上传 API 路由
* @description 处理笔记编辑器中的图片上传（剪贴板粘贴等场景）
* 复用现有 asset 基础设施，kind = "note-image"
*/

import fs from "node:fs/promises";
import path from "node:path";
import { requireUserSession } from "@/lib/base/auth";
import { createAsset } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:NoteCards:UploadImage");

export const runtime = "nodejs";

/** 允许的图片 MIME 类型 */
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/bmp",
  "image/avif",
]);

/** 最大图片大小：10MB */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const session = await requireUserSession();
    const ownerId = session.userId === "__admin__" ? "__admin__" : session.userId;

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("请上传图片文件");
    }

    // 校验 MIME 类型
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      return jsonError("不支持的图片格式，仅支持 JPEG/PNG/GIF/WebP/SVG/BMP/AVIF");
    }

    // 校验文件大小
    if (file.size > MAX_FILE_SIZE) {
      return jsonError("图片大小不能超过 10MB");
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = path.extname(file.name) || `.${file.type.split("/")[1] || "bin"}`;
    const filename = `${crypto.randomUUID()}${ext}`;
    const userUploadsDir = path.join(process.env.PROJECT_ROOT ?? process.cwd(), "storage", "uploads", ownerId);
    const filePath = path.join(userUploadsDir, filename);

    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);

    const asset = await createAsset({
      filePath,
      mimeType: file.type,
      kind: "note-image",
    });

    // 使用独立的笔记图片路径，不暴露内部 asset 系统
    const imageUrl = `/api/note-cards/img/${asset.id}`;

    logger.info("笔记图片上传成功", { assetId: asset.id, filename: file.name, size: buffer.length });
    return jsonOk({ url: imageUrl, assetId: asset.id });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("笔记图片上传失败: 未授权");
      return jsonError("未授权", 401);
    }

    logger.error("笔记图片上传失败", error);
    return jsonError(error instanceof Error ? error.message : "上传图片失败", 500);
  }
}
