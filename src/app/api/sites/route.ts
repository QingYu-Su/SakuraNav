/**
 * 网站管理 API 路由
 * @description 处理网站的增删改查操作，包括获取网站列表、创建、更新和删除网站
 */

import { NextRequest } from "next/server";
import { z } from "zod";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { createSite, deleteSite, getAllSitesForAdmin, updateSite, saveRelatedSites, addReverseRelation } from "@/lib/services";
import { getSiteById } from "@/lib/services/site-repository";
import { siteInputSchema } from "@/lib/config/schemas";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:Sites");

const siteUpdateSchema = siteInputSchema.extend({
  id: siteInputSchema.shape.name,
  originalUrl: z.string().optional(),
});

/** 从 iconUrl 中提取上传资源的 assetId（格式: /api/assets/{id}/file） */
function extractAssetIdFromUrl(url: string | null): string | null {
  if (!url || !url.startsWith("/api/assets/")) return null;
  const match = url.match(/^\/api\/assets\/([^/]+)\/file$/);
  return match?.[1] ?? null;
}

export async function GET() {
  try {
    const session = await requireUserSession();
    const ownerId = getEffectiveOwnerId(session);
    logger.info("获取网站列表");
    return jsonOk({ items: getAllSitesForAdmin(ownerId) });
  } catch {
    logger.warning("获取网站列表失败: 未授权");
    return jsonError("未授权", 401);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const parsed = siteInputSchema.safeParse(await request.json());

    if (!parsed.success) {
      logger.warning("创建网站失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "站点数据不合法");
    }

    const site = createSite({
      ...parsed.data,
      description: parsed.data.description || "",
      iconUrl: parsed.data.iconUrl || null,
      iconBgColor: parsed.data.iconBgColor || null,
      onlineCheckFrequency: parsed.data.onlineCheckFrequency,
      onlineCheckTimeout: parsed.data.onlineCheckTimeout,
      onlineCheckMatchMode: parsed.data.onlineCheckMatchMode,
      onlineCheckKeyword: parsed.data.onlineCheckKeyword,
      onlineCheckFailThreshold: parsed.data.onlineCheckFailThreshold,
      accessRules: parsed.data.accessRules ?? null,
      recommendContext: parsed.data.recommendContext,
      aiRelationEnabled: parsed.data.aiRelationEnabled,
      allowLinkedByOthers: parsed.data.allowLinkedByOthers,
      ownerId: session.userId,
    });

    // 保存关联关系
    if (site?.id && parsed.data.relatedSites.length > 0) {
      saveRelatedSites(site.id, parsed.data.relatedSites.map((rs, i) => ({
        siteId: rs.siteId,
        enabled: rs.enabled,
        locked: rs.locked,
        sortOrder: i,
        source: rs.source,
        reason: rs.reason,
      })));

      // 对 AI 来源的关联建立反向关联（双向）
      for (const rs of parsed.data.relatedSites) {
        if (rs.source === "ai" && rs.enabled) {
          addReverseRelation(site.id, rs.siteId, rs.reason);
        }
      }
    }

    logger.info("网站创建成功", { siteId: site?.id, name: site?.name });
    return jsonOk({ item: site ? getSiteById(site.id) : null });
  } catch (error) {
    logger.error("创建网站失败", error);
    return jsonError(error instanceof Error ? error.message : "创建失败", 500);
  }
}

/**
 * 更新网站信息
 * @param request - 包含更新数据的请求对象
 * @returns 更新后的网站数据
 */
export async function PUT(request: NextRequest) {
  try {
    await requireUserSession();
    const parsed = siteUpdateSchema.safeParse(await request.json());

    if (!parsed.success) {
      logger.warning("更新网站失败: 数据验证失败", { issues: parsed.error.issues });
      return jsonError(parsed.error.issues[0]?.message ?? "站点数据不合法");
    }

    const site = updateSite({
      ...parsed.data,
      id: parsed.data.id,
      description: parsed.data.description || "",
      iconUrl: parsed.data.iconUrl || null,
      iconBgColor: parsed.data.iconBgColor || null,
      onlineCheckFrequency: parsed.data.onlineCheckFrequency,
      onlineCheckTimeout: parsed.data.onlineCheckTimeout,
      onlineCheckMatchMode: parsed.data.onlineCheckMatchMode,
      onlineCheckKeyword: parsed.data.onlineCheckKeyword,
      onlineCheckFailThreshold: parsed.data.onlineCheckFailThreshold,
      accessRules: parsed.data.accessRules ?? null,
      recommendContext: parsed.data.recommendContext,
      aiRelationEnabled: parsed.data.aiRelationEnabled,
      allowLinkedByOthers: parsed.data.allowLinkedByOthers,
    });

    // 保存关联关系
    if (parsed.data.id) {
      saveRelatedSites(parsed.data.id, parsed.data.relatedSites.map((rs, i) => ({
        siteId: rs.siteId,
        enabled: rs.enabled,
        locked: rs.locked,
        sortOrder: i,
        source: rs.source,
        reason: rs.reason,
      })));

      // 对 AI 来源的关联建立反向关联（双向）
      for (const rs of parsed.data.relatedSites) {
        if (rs.source === "ai" && rs.enabled) {
          addReverseRelation(parsed.data.id, rs.siteId, rs.reason);
        }
      }
    }

    logger.info("网站更新成功", { siteId: site?.id, name: site?.name });
    return jsonOk({ item: site ? getSiteById(site.id) : null });
  } catch (error) {
    logger.error("更新网站失败", error);
    return jsonError(error instanceof Error ? error.message : "更新失败", 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await requireUserSession();
    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      logger.warning("删除网站失败: 缺少站点 ID");
      return jsonError("缺少站点 ID");
    }

    // 删除前获取站点的自定义图标 assetId，返回给前端用于延迟删除
    const site = getSiteById(id);
    const iconAssetId = site ? extractAssetIdFromUrl(site.iconUrl) : null;

    deleteSite(id);
    logger.info("网站删除成功", { siteId: id });
    return jsonOk({ ok: true, iconAssetId });
  } catch {
    logger.warning("删除网站失败: 未授权");
    return jsonError("未授权", 401);
  }
}
