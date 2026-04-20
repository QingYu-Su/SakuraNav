/**
 * 配置导出 API 路由
 * @description 将 storage 目录打包导出为 ZIP 文件（不含 config.yml）
 */

import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { requireAdminConfirmation } from "@/lib/base/auth";
import { jsonError } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Config:Export");

export const runtime = "nodejs";

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/** 需要排除的文件名 */
const EXCLUDED_FILES = new Set(["config.yml", "config.yaml"]);

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

  return `sakura-${parts.join("")}.zip`;
}

/**
 * 递归将目录添加到 ZIP 中
 * @param dirPath 目录绝对路径
 * @param zipPath ZIP 内的相对路径
 * @param zip JSZip 实例
 */
function addDirectoryToZip(dirPath: string, zipPath: string, zip: JSZip) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    // 跳过排除的配置文件
    if (EXCLUDED_FILES.has(entry.name)) continue;

    const full = path.join(dirPath, entry.name);
    const entryZipPath = zipPath ? `${zipPath}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      addDirectoryToZip(full, entryZipPath, zip);
    } else {
      zip.file(entryZipPath, fs.readFileSync(full));
    }
  }
}

/**
 * 导出配置
 * @description 将 storage 目录打包为 ZIP 文件供下载
 */
export async function POST(request: Request) {
  try {
    logger.info("开始导出配置");

    const body = (await request.json().catch(() => null)) as { password?: string } | null;
    await requireAdminConfirmation(body?.password);

    const storageDir = path.join(projectRoot, "storage");
    if (!fs.existsSync(storageDir)) {
      logger.error("导出配置失败: storage 目录不存在");
      return jsonError("storage 目录不存在", 500);
    }

    const zip = new JSZip();
    addDirectoryToZip(storageDir, "", zip);

    const output = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    const fileCount = Object.keys(zip.files).filter((n) => !zip.files[n]!.dir).length;
    logger.info("配置导出成功", { filename: buildExportFilename(), fileCount });

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
