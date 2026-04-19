/**
 * 配置导入 API 路由
 * @description 从ZIP压缩包导入配置数据，替换现有的标签、网站、外观和设置
 */

import JSZip from "jszip";
import { requireAdminConfirmation } from "@/lib/base/auth";
import {
  getAllSitesForAdmin,
  getAppSettings,
  getAppearances,
  getVisibleTags,
  replaceConfigArchive,
} from "@/lib/services";
import { configArchiveSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Config:Import");

export const runtime = "nodejs";

/**
 * 导入配置
 * @description 从ZIP压缩包解析并替换现有配置
 * @param request - 包含配置文件和确认密码的请求对象
 * @returns 导入后的完整数据
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
    const configEntry = zip.file("config.json");

    if (!configEntry) {
      logger.warning("导入配置失败: 压缩包缺少 config.json");
      return jsonError("压缩包中缺少 config.json");
    }

    const parsed = configArchiveSchema.safeParse(
      JSON.parse(await configEntry.async("string")),
    );

    if (!parsed.success) {
      logger.warning("导入配置失败: 配置包格式不合法", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "配置包格式不合法");
    }

    const assetFiles = new Map<string, Buffer>();
    for (const asset of parsed.data.assets) {
      const zipEntry = zip.file(asset.archivePath);
      if (!zipEntry) {
        logger.warning("导入配置失败: 资源文件缺失", { archivePath: asset.archivePath });
        return jsonError(`压缩包缺少资源文件：${asset.archivePath}`);
      }

      assetFiles.set(asset.id, Buffer.from(await zipEntry.async("uint8array")));
    }

    logger.info("正在替换配置数据", {
      tags: parsed.data.tags.length,
      sites: parsed.data.sites.length,
      assets: parsed.data.assets.length
    });

    replaceConfigArchive(parsed.data, assetFiles);

    logger.info("配置导入成功");

    return jsonOk({
      ok: true,
      tags: getVisibleTags(true),
      sites: getAllSitesForAdmin(),
      appearances: getAppearances(),
      settings: getAppSettings(),
    });
  } catch (error) {
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
