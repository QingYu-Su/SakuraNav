/**
 * 笔记附件文件访问路由
 * @description 通过独立 URL 前缀提供笔记大文件附件的下载服务
 * 使用原始文件名设置 Content-Disposition
 */

import fs from "node:fs/promises";
import { NextRequest } from "next/server";
import { getAsset } from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Cards:Note:Attach");

type Context = {
  params: Promise<{ attachId: string }>;
};

export const runtime = "nodejs";

/**
 * 获取笔记附件文件（下载）
 */
export async function GET(_request: NextRequest, context: Context) {
  const { attachId } = await context.params;
  const asset = await getAsset(attachId);

  if (!asset || asset.kind !== "note-attachment") {
    logger.warning("笔记附件不存在或类型不匹配", { attachId });
    return new Response("Not found", { status: 404 });
  }

  // 检查附件是否已关联笔记（软删除后 note_id 为 null，返回 404）
  if (!asset.noteId) {
    logger.warning("笔记附件已失效（未关联笔记）", { attachId });
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(asset.filePath);
    const downloadName = asset.originalName || "download.bin";

    return new Response(file, {
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(downloadName)}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logger.error("读取笔记附件失败", { attachId, error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
