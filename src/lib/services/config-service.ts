/**
 * @description 配置服务 - 处理配置重置功能
 */

import fs from "node:fs";
import { getDb } from "@/lib/database";
import { seedDatabase } from "@/lib/database/seed";
import { listStoredAssets } from "./asset-repository";

/**
 * 重置所有内容到默认值
 * @description 删除所有数据表内容、填充默认种子数据、清理旧资源文件
 */
export function resetContentToDefaults() {
  const db = getDb();
  const oldAssets = listStoredAssets();

  const transaction = db.transaction(() => {
    db.prepare("DELETE FROM theme_appearances").run();
    db.prepare("DELETE FROM app_settings").run();
    db.prepare("DELETE FROM site_tags").run();
    db.prepare("DELETE FROM sites").run();
    db.prepare("DELETE FROM tags").run();
    db.prepare("DELETE FROM assets").run();
  });

  transaction();
  seedDatabase(db);

  // 清理旧的资源文件
  for (const asset of oldAssets) {
    if (fs.existsSync(asset.filePath)) {
      fs.rmSync(asset.filePath, { force: true });
    }
  }
}
