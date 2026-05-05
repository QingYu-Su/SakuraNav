/**
 * 用户数据导出 API 路由
 * @description 导出当前用户的数据为 ZIP 包
 * 支持两种导出范围：full（全部，含外观）和 data-only（仅标签卡片）
 * 使用 HMAC-SHA256 对 data.json 签名，防止数据被篡改或伪装
 */

import fs from "node:fs";
import path from "node:path";
import JSZip from "jszip";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { getAsset, collectExportData, computeDataSignature } from "@/lib/services";
import { jsonError } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { SAKURA_MANIFEST_KEY } from "@/lib/base/types";

const logger = createLogger("API:UserData:Export");

export const runtime = "nodejs";

/**
 * 生成导出文件名
 */
function buildExportFilename(username: string, scope: string) {
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
  const scopeSuffix = scope === "full" ? "" : scope === "sites-only" ? "-sites" : "-data";
  return `sakura-${username}${scopeSuffix}-${parts.join("")}.zip`;
}

/**
 * 导出当前用户的数据
 * @query scope - "full"（含外观）或 "data-only"（仅标签卡片），默认 "full"
 */
export async function POST(request: Request) {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    logger.info("开始导出用户数据", { ownerId });

    // 解析 scope 参数
    const url = new URL(request.url);
    const rawScope = url.searchParams.get("scope") ?? "full";
    const scope: "full" | "data-only" | "sites-only" =
      rawScope === "data-only" || rawScope === "sites-only" ? rawScope : "full";
    const includeAppearance = scope === "full";
    const sitesOnly = scope === "sites-only";

    // 使用可扩展的数据收集服务
    const exportData = await collectExportData(ownerId, includeAppearance, sitesOnly);

    // 构建数据 JSON（使用原始数据库列名，保证可扩展性）
    const dataJson: Record<string, unknown> = {
      tags: exportData.tags,
      sites: exportData.sites,
      site_tags: exportData.site_tags,
      site_relations: exportData.site_relations,
    };
    if (exportData.appearances) {
      dataJson.appearances = exportData.appearances;
    }

    // 序列化 data.json 并计算 HMAC 签名
    const dataJsonString = JSON.stringify(dataJson);
    const signature = await computeDataSignature(dataJsonString);

    // 构建 manifest（含签名）
    const manifest = {
      signature: SAKURA_MANIFEST_KEY,
      version: 5,
      scope: "user" as const,
      hasAppearance: includeAppearance,
      sitesOnly,
      exportedAt: new Date().toISOString(),
      /** HMAC-SHA256 签名，用于导入时校验数据完整性 */
      dataSignature: signature,
    };

    // 打包为 ZIP
    const zip = new JSZip();
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));
    zip.file("data.json", dataJsonString);

    // 打包所有引用的 asset 文件
    for (const assetId of exportData.assetIds) {
      const asset = await getAsset(assetId);
      if (asset && fs.existsSync(asset.filePath)) {
        const fileBuffer = fs.readFileSync(asset.filePath);
        zip.file(`assets/${assetId}${path.extname(asset.filePath) || ""}`, fileBuffer);
      }
    }

    const output = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    });

    logger.info("用户数据导出成功", {
      ownerId,
      scope,
      tags: exportData.tags.length,
      sites: exportData.sites.length,
      appearances: exportData.appearances?.length ?? 0,
      assets: exportData.assetIds.length,
    });

    return new Response(Buffer.from(output), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${buildExportFilename(session.username, scope)}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("导出用户数据失败", error);
    return jsonError(error instanceof Error ? error.message : "导出失败", 500);
  }
}
