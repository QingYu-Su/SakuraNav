/**
 * 配置导入 API 路由
 * @description 从 ZIP 压缩包还原 storage 目录，然后重新初始化数据库
 */

import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { requireAdminConfirmation } from "@/lib/base/auth";
import { resetDbConnection } from "@/lib/database";
import { getDb } from "@/lib/database";
import { seedDatabase } from "@/lib/database/seed";
import {
  getAllSitesForAdmin,
  getAppSettings,
  getAppearances,
  getVisibleTags,
} from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Config:Import");

export const runtime = "nodejs";

/** 项目根目录 */
const projectRoot = process.env.PROJECT_ROOT ?? process.cwd();

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
 * 导入配置
 * @description 从 ZIP 压缩包还原 storage 目录
 */
export async function POST(request: Request) {
  try {
    logger.info("开始导入配置");

    const formData = await request.formData();
    const file = formData.get("file");
    const password = formData.get("password");

    await requireAdminConfirmation(typeof password === "string" ? password : null);

    if (!(file instanceof File)) {
      logger.warning("导入配置失败: 未选择文件");
      return jsonError("请先选择配置压缩包");
    }

    logger.info("正在解析配置文件", { filename: file.name, size: file.size });

    const zip = await JSZip.loadAsync(Buffer.from(await file.arrayBuffer()));

    // 判断 ZIP 内的结构：根目录可能是 "storage/..." 或直接 "database/..." / "uploads/..."
    const entries = Object.keys(zip.files);
    const hasStoragePrefix = entries.some((e) => e.startsWith("storage/"));

    const storageDir = path.join(projectRoot, "storage");
    const databaseDir = path.join(storageDir, "database");
    const uploadsDir = path.join(storageDir, "uploads");

    // 先关闭数据库连接并清除单例，释放对 .sqlite 文件的占用
    // Windows 不允许删除/覆盖正在被进程打开的文件
    logger.info("关闭数据库连接以释放文件锁");
    resetDbConnection();

    // 清空现有 storage 子目录内容（保留目录结构）
    if (fs.existsSync(databaseDir)) cleanDirectory(databaseDir);
    if (fs.existsSync(uploadsDir)) cleanDirectory(uploadsDir);
    fs.mkdirSync(databaseDir, { recursive: true });
    fs.mkdirSync(uploadsDir, { recursive: true });

    // 将 ZIP 内容写入 storage 目录
    const writeEntry = async (relativePath: string, zipEntry: JSZip.JSZipObject) => {
      if (zipEntry.dir) return;

      // 排除 config.yml（隐私文件，不导入）
      const basename = path.basename(relativePath);
      if (basename === "config.yml" || basename === "config.yaml") return;

      const targetPath = path.join(storageDir, relativePath);
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      const buffer = await zipEntry.async("nodebuffer");
      fs.writeFileSync(targetPath, buffer);
    };

    if (hasStoragePrefix) {
      // ZIP 结构: storage/database/... 和 storage/uploads/...
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        // 去掉 "storage/" 前缀
        const targetRelative = relativePath.slice("storage/".length);
        if (!targetRelative) continue;
        await writeEntry(targetRelative, zipEntry);
      }
    } else {
      // ZIP 结构: database/... 和 uploads/...（无 storage 外层）
      for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
        await writeEntry(relativePath, zipEntry);
      }
    }

    logger.info("文件写入完成，重新初始化数据库");

    // 重新打开数据库（此时会读取新导入的 .sqlite 文件，并执行 seed）
    seedDatabase(getDb());

    logger.info("配置导入成功");
    return jsonOk({
      ok: true,
      tags: getVisibleTags(true),
      sites: getAllSitesForAdmin(),
      appearances: getAppearances(),
      settings: getAppSettings(),
    });
  } catch (error) {
    // 即使出错也要确保数据库连接可用
    try { getDb(); } catch { /* 忽略 */ }

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      logger.warning("导入配置失败: 未授权");
      return jsonError("未授权", 401);
    }

    if (error instanceof Error && error.message === "INVALID_PASSWORD") {
      logger.warning("导入配置失败: 密码错误");
      return jsonError("确认密码错误", 403);
    }

    logger.error("导入配置失败", error);
    return jsonError(error instanceof Error ? error.message : "导入失败", 500);
  }
}
