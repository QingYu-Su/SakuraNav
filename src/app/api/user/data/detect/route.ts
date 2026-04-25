/**
 * 用户数据文件检测 API 路由
 * @description 检测上传文件是否为 SakuraNav 导出的 ZIP 或外部文件
 */

import JSZip from "jszip";
import { requireUserSession } from "@/lib/base/auth";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { SAKURA_MANIFEST_KEY, type ImportDetectResult } from "@/lib/base/types";

const logger = createLogger("API:UserData:Detect");

/**
 * 检测上传文件类型
 */
export async function POST(request: Request) {
  try {
    await requireUserSession();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return jsonError("请选择文件");
    }

    logger.info("检测文件类型", { filename: file.name, size: file.size });

    // 尝试解析为 ZIP 并查找 manifest
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const zip = await JSZip.loadAsync(buffer);
      const manifestFile = zip.file("manifest.json");

      if (manifestFile) {
        const manifestContent = await manifestFile.async("string");
        const manifest = JSON.parse(manifestContent) as { signature?: string };

        if (manifest.signature === SAKURA_MANIFEST_KEY) {
          logger.info("检测到 SakuraNav 配置文件", { filename: file.name });
          const parsed = manifest as { signature: string; scope?: string };
          return jsonOk<ImportDetectResult>({
            type: "sakuranav",
            filename: file.name,
            scope: parsed.scope,
          });
        }
      }
    } catch {
      // 不是有效的 ZIP 文件，继续走外部文件逻辑
    }

    // 外部文件 - 读取文本内容
    const content = await file.text();
    logger.info("检测到外部文件", { filename: file.name, contentLength: content.length });

    return jsonOk<ImportDetectResult>({
      type: "external",
      filename: file.name,
      content: content.slice(0, 100000),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("文件检测失败", error);
    return jsonError(error instanceof Error ? error.message : "检测失败", 500);
  }
}
