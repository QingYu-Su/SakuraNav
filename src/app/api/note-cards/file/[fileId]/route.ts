/**
* 笔记文件访问路由
* @description 通过伪装 URL 提供笔记文件的下载服务
* 设置 Content-Disposition: attachment 以触发浏览器下载
*/

import fs from "node:fs/promises";
import { NextRequest } from "next/server";
import { getAsset } from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:NoteCards:File");

type Context = {
  params: Promise<{ fileId: string }>;
};

export const runtime = "nodejs";

/**
* 获取笔记文件（下载）
*/
export async function GET(_request: NextRequest, context: Context) {
  const { fileId } = await context.params;
  const asset = await getAsset(fileId);

  if (!asset || (asset.kind !== "note-file" && asset.kind !== "note-attachment")) {
    logger.warning("笔记文件不存在或类型不匹配", { fileId });
    return new Response("Not found", { status: 404 });
  }

  // 检查附件是否已关联笔记（软删除后 note_id 为 null，返回 404）
  if (!asset.noteId) {
    logger.warning("笔记文件已失效（未关联笔记）", { fileId });
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(asset.filePath);

    // 优先使用原始文件名，否则从路径提取
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
    logger.error("读取笔记文件失败", { fileId, error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
