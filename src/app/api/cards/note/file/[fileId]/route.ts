/**
 * 笔记文件访问路由
 * @description 通过伪装 URL 提供笔记文件的下载服务
 * 设置 Content-Disposition: attachment 以触发浏览器下载
 */

import fs from "node:fs/promises";
import path from "node:path";
import { NextRequest } from "next/server";
import { getAsset } from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Cards:Note:File");

type Context = {
  params: Promise<{ fileId: string }>;
};

export const runtime = "nodejs";

/**
 * 获取笔记文件（下载）
 */
export async function GET(_request: NextRequest, context: Context) {
  const { fileId } = await context.params;
  const asset = getAsset(fileId);

  if (!asset || asset.kind !== "note-file") {
    logger.warning("笔记文件不存在或类型不匹配", { fileId });
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(asset.filePath);

    // 从文件路径提取扩展名，用于下载文件名
    const ext = path.extname(asset.filePath).replace(".", "") || "bin";
    const downloadName = `file.${ext}`;

    return new Response(file, {
      headers: {
        "Content-Type": asset.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${downloadName}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logger.error("读取笔记文件失败", { fileId, error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
