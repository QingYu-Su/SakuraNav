/**
 * 配置导入 API 路由
 * @description 从 ZIP 压缩包还原配置，支持三种导入模式：清除后导入、增量导入、覆盖导入
 */

import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import JSZip from "jszip";
import { requireAdminSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { resetDbConnection } from "@/lib/database";
import { getDb } from "@/lib/database";
import { seedDatabase } from "@/lib/database/seed";
import {
  getAllSitesForAdmin,
  getAppSettings,
  getAppearances,
  getVisibleTags,
  mergeImportFromZip,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { verifyCsrfToken } from "@/lib/utils/csrf";
import type { ImportMode } from "@/lib/base/types";

const logger = createLogger("API:Config:Import");

export const runtime = "nodejs";

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

/** ZIP 炸弹防护配置 */
const ZIP_LIMITS = {
  /** 最大条目数（文件+目录） */
  maxEntries: 10000,
  /** 解压后总大小上限：500 MB */
  maxTotalSize: 500 * 1024 * 1024,
  /** 单文件大小上限：50 MB */
  maxSingleFileSize: 50 * 1024 * 1024,
  /** 上传 ZIP 文件大小上限：200 MB */
  maxUploadSize: 200 * 1024 * 1024,
};

/**
 * 递归清空目录内容（保留目录本身）
 */
function cleanDirectory(dirPath: string) {
  if (!fs.existsSync(dirPath)) return;
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const full = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      fs.rmSync(full, { recursive: true, force: true });
    } else {
      fs.unlinkSync(full);
    }
  }
}

/**
 * 将 ZIP 内容写入指定目录
 * @description 包含 ZIP Slip 路径遍历防护 + ZIP 炸弹防护（文件数/总大小/单文件大小限制）
 * @throws Error 当超出安全限制时
 */
async function extractZipToDir(zip: JSZip, targetDir: string) {
  const entries = Object.entries(zip.files);

  // 炸弹防护：文件数限制
  if (entries.length > ZIP_LIMITS.maxEntries) {
    throw new Error(`ZIP 包含 ${entries.length} 个文件，超出安全限制（最大 ${ZIP_LIMITS.maxEntries} 个）`);
  }

  const hasStoragePrefix = entries.some(([, e]) => !e.dir && e.name.startsWith("storage/"));

  // 规范化目标目录路径，用于后续的路径遍历检查
  const resolvedTargetDir = path.resolve(targetDir);

  let totalExtractedSize = 0;

  for (const [relativePath, zipEntry] of entries) {
    if (zipEntry.dir) continue;

    // 排除 manifest 和 config.yml
    const basename = path.basename(relativePath);
    if (basename === "manifest.json" || basename === "config.yml" || basename === "config.yaml") continue;

    let targetRelative = relativePath;
    if (hasStoragePrefix) {
      targetRelative = relativePath.slice("storage/".length);
      if (!targetRelative) continue;
    }

    const targetPath = path.resolve(resolvedTargetDir, targetRelative);

    // ZIP Slip 防护：确保解压路径在目标目录内，防止路径遍历攻击
    if (!targetPath.startsWith(resolvedTargetDir + path.sep) && targetPath !== resolvedTargetDir) {
      logger.warning("ZIP 解压跳过可疑路径", { relativePath, targetPath });
      continue;
    }

    const buffer = await zipEntry.async("nodebuffer");

    // 炸弹防护：单文件大小限制
    if (buffer.length > ZIP_LIMITS.maxSingleFileSize) {
      throw new Error(`文件 ${relativePath} 大小 ${Math.round(buffer.length / 1024 / 1024)}MB 超出单文件限制（最大 ${Math.round(ZIP_LIMITS.maxSingleFileSize / 1024 / 1024)}MB）`);
    }

    // 炸弹防护：累计总大小限制
    totalExtractedSize += buffer.length;
    if (totalExtractedSize > ZIP_LIMITS.maxTotalSize) {
      throw new Error(`解压总大小 ${Math.round(totalExtractedSize / 1024 / 1024)}MB 超出安全限制（最大 ${Math.round(ZIP_LIMITS.maxTotalSize / 1024 / 1024)}MB）`);
    }

    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, buffer);
  }
}

/**
 * 返回导入成功后的 AdminBootstrap 数据
 */
function buildBootstrapResponse(ownerId: string) {
  return jsonOk({
    ok: true,
    tags: getVisibleTags(ownerId),
    sites: getAllSitesForAdmin(ownerId),
    appearances: getAppearances(ownerId),
    settings: getAppSettings(),
  });
}

/**
 * 导入配置
 */
export async function POST(request: Request) {
  try {
    logger.info("开始导入配置");

    const session = await requireAdminSession();
    const ownerId = getEffectiveOwnerId(session);

    // CSRF 校验
    if (!verifyCsrfToken(request)) {
      return jsonError("安全验证失败，请刷新页面重试", 403);
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const mode = (formData.get("mode") as ImportMode | null) ?? "clean";

    if (!(file instanceof File)) {
      logger.warning("导入配置失败: 未选择文件");
      return jsonError("请先选择配置压缩包");
    }

    if (!["clean", "incremental", "overwrite"].includes(mode)) {
      return jsonError("无效的导入模式");
    }

    logger.info("正在解析配置文件", { filename: file.name, size: file.size, mode });

    // 炸弹防护：上传文件大小限制
    if (file.size > ZIP_LIMITS.maxUploadSize) {
      return jsonError(`文件大小 ${Math.round(file.size / 1024 / 1024)}MB 超出上传限制（最大 ${Math.round(ZIP_LIMITS.maxUploadSize / 1024 / 1024)}MB）`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = await JSZip.loadAsync(buffer);

    if (mode === "clean") {
      // ── 清除后导入：完整替换 storage 目录 ──
      const storageDir = path.join(projectRoot, "storage");
      const databaseDir = path.join(storageDir, "database");
      const uploadsDir = path.join(storageDir, "uploads");

      logger.info("关闭数据库连接以释放文件锁");
      resetDbConnection();

      if (fs.existsSync(databaseDir)) cleanDirectory(databaseDir);
      if (fs.existsSync(uploadsDir)) cleanDirectory(uploadsDir);
      fs.mkdirSync(databaseDir, { recursive: true });
      fs.mkdirSync(uploadsDir, { recursive: true });

      await extractZipToDir(zip, storageDir);

      logger.info("文件写入完成，重新初始化数据库");
      seedDatabase(getDb());

      logger.info("配置导入成功（清除模式）");
      return buildBootstrapResponse(ownerId);
    }

    // ── 增量/覆盖模式：数据库级别合并 ──
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sakura-import-"));

    try {
      await extractZipToDir(zip, tempDir);
      mergeImportFromZip(tempDir, mode as "incremental" | "overwrite");

      logger.info("配置导入成功", { mode });
      return buildBootstrapResponse(ownerId);
    } finally {
      // 清理临时目录
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    // 确保数据库连接可用
    try {
      getDb();
    } catch {
      /* 忽略 */
    }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("导入配置失败: 未授权");
      return jsonError("未授权", 401);
    }

    logger.error("导入配置失败", error);
    return jsonError(error instanceof Error ? error.message : "导入失败", 500);
  }
}
