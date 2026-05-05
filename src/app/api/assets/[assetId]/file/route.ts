/**
 * 资源文件 API 路由
 * @description 根据资源ID获取上传的文件内容（如壁纸、Logo等）
 */

import fs from "node:fs/promises";
import { NextRequest } from "next/server";
import { getAsset } from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Assets:File");

type Context = {
  params: Promise<{ assetId: string }>;
};

export const runtime = "nodejs";

/**
 * 获取资源文件
 * @param _request - 请求对象（未使用）
 * @param context - 包含资源ID的路由上下文
 * @returns 文件内容响应
 */
export async function GET(_request: NextRequest, context: Context) {
  const { assetId } = await context.params;
  const asset = await getAsset(assetId);

  if (!asset) {
    logger.warning("资源文件不存在", { assetId });
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
    logger.error("读取资源文件失败", { assetId, error });
    return new Response("Internal Server Error", { status: 500 });
  }
}
