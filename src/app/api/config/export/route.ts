/**
 * 配置导出 API 路由
 * @description 将所有配置数据（标签、网站、外观、设置、资源文件）打包导出为ZIP文件
 */

import fs from "node:fs/promises";
import JSZip from "jszip";
import { requireAdminConfirmation } from "@/lib/auth";
import { buildConfigArchive, listStoredAssets } from "@/lib/services";
import { jsonError } from "@/lib/utils";
import { createLogger } from "@/lib/logger";

const logger = createLogger("API:Config:Export");

export const runtime = "nodejs";

/**
 * 生成导出文件名
 * @returns 带时间戳的ZIP文件名
 */
function buildExportFilename() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ];

  return `sakuranav-config-${parts.join("")}.zip`;
}

/**
 * 导出配置
 * @description 将配置打包为ZIP文件供下载
 * @param request - 包含确认密码的请求对象
 * @returns ZIP文件响应
 */
export async function POST(request: Request) {
  try {
    logger.info("开始导出配置");
    
    const body = (await request.json().catch(() => null)) as { password?: string } | null;
    await requireAdminConfirmation(body?.password);

    const archive = buildConfigArchive();
    const storedAssets = new Map(
      listStoredAssets().map((asset) => [asset.id, asset.filePath]),
    );
    const zip = new JSZip();

    zip.file("config.json", JSON.stringify(archive, null, 2));

    await Promise.all(
      archive.assets.map(async (asset) => {
        const filePath = storedAssets.get(asset.id);
        if (!filePath) {
          const error = new Error(`缺少资源文件：${asset.id}`);
          logger.error("导出配置失败: 资源文件缺失", { assetId: asset.id });
          throw error;
        }

        const fileBuffer = await fs.readFile(filePath);
        zip.file(asset.archivePath, fileBuffer);
      }),
    );

    const output = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    logger.info("配置导出成功", { 
      filename: buildExportFilename(),
      tags: archive.tags.length,
      sites: archive.sites.length,
      assets: archive.assets.length
    });

    return new Response(Buffer.from(output), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${buildExportFilename()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("导出配置失败: 未授权");
      return jsonError("未授权", 401);
    }

    if (error instanceof Error && error.message === "INVALID_PASSWORD") {
      logger.warning("导出配置失败: 密码错误");
      return jsonError("确认密码错误", 403);
    }

    logger.error("导出配置失败", error);
    return jsonError(error instanceof Error ? error.message : "导出失败", 500);
  }
}
