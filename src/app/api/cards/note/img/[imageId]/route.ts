/**
 * 笔记图片访问路由
 * @description 通过伪装 URL 提供笔记图片的读取服务
 * 不暴露服务器内部 asset 系统和文件目录结构
 */

import fs from "node:fs/promises";
import { NextRequest } from "next/server";
import { getAsset } from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Cards:Note:Img");

type Context = {
  params: Promise<{ imageId: string }>;
};

export const runtime = "nodejs";

/**
 * 获取笔记图片
 * @param _request - 请求对象
 * @param context - 包含图片 ID 的路由上下文
 * @returns 图片文件响应
 */
export async function GET(_request: NextRequest, context: Context) {
  const { imageId } = await context.params;
  const asset = getAsset(imageId);

  if (!asset || asset.kind !== "note-image") {
    logger.warning("笔记图片不存在或类型不匹配", { imageId });
    return new Response("Not found", { status: 404 });
  }

  try {
    const file = await fs.readFile(asset.filePath);

    return new Response(file, {
      headers: {
        "Content-Type": asset.mimeType,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    logger.error("读取笔记图片失败", { imageId, error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
