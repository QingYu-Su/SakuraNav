/**
 * @description MCP 工具注册 - 网站模块
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getPaginatedSites,
  getSiteById,
  createSite,
  updateSite,
  deleteSite,
  getAllSitesForAdmin,
  performSingleSiteOnlineCheck,
  ensureUrlProtocol,
} from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("MCP:Sites");

export function registerSiteTools(server: McpServer, getSession: () => SessionUser) {
  server.tool(
    "list_sites",
    "获取网站列表（支持分页和筛选）",
    {
      tagId: z.string().optional().describe("按标签 ID 筛选"),
      query: z.string().optional().describe("搜索关键词"),
      cursor: z.string().optional().describe("分页游标"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const scope = params.tagId ? "tag" : "all";
      const result = await getPaginatedSites({
        ownerId,
        scope: scope as "all" | "tag",
        tagId: params.tagId ?? null,
        query: params.query ?? null,
        cursor: params.cursor ?? null,
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "get_site",
    "获取单个网站详情",
    {
      id: z.string().describe("网站 ID"),
    },
    async (params) => {
      const site = await getSiteById(params.id);
      if (!site) return { content: [{ type: "text", text: JSON.stringify({ error: "网站不存在" }) }], isError: true };
      return { content: [{ type: "text", text: JSON.stringify(site, null, 2) }] };
    }
  );

  server.tool(
    "create_site",
    "创建一个新网站",
    {
      name: z.string().min(1).max(80).describe("网站名称"),
      url: z.string().describe("网站 URL"),
      description: z.string().max(200).optional().describe("网站描述"),
      iconUrl: z.string().max(500).optional().describe("图标 URL"),
      iconBgColor: z.string().max(30).optional().describe("图标背景色"),
      isPinned: z.boolean().optional().describe("是否置顶"),
      skipOnlineCheck: z.boolean().optional().describe("是否跳过在线检测"),
      tagIds: z.array(z.string()).default([]).describe("关联的标签 ID 数组"),
      notes: z.string().max(5000).optional().describe("备注"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const url = ensureUrlProtocol(params.url);
      const skipOnlineCheck = params.skipOnlineCheck ?? false;
      const site = await createSite({
        name: params.name,
        url,
        description: params.description ?? null,
        iconUrl: params.iconUrl ?? null,
        iconBgColor: params.iconBgColor ?? null,
        isPinned: params.isPinned ?? false,
        skipOnlineCheck,
        tagIds: params.tagIds,
        ownerId,
        notes: params.notes ?? "",
      });
      if (!site) return { content: [{ type: "text", text: JSON.stringify({ error: "创建失败" }) }], isError: true };
      logger.info("创建网站", { siteId: site.id, name: site.name, url: site.url });
      // 异步触发在线检查（不阻塞响应）
      if (!skipOnlineCheck && site.id) {
        performSingleSiteOnlineCheck(site.id).catch((err) => logger.error("MCP 创建后在线检查失败", err));
      }
      return { content: [{ type: "text", text: JSON.stringify(site, null, 2) }] };
    }
  );

  server.tool(
    "update_site",
    "更新已有网站",
    {
      id: z.string().describe("网站 ID"),
      name: z.string().min(1).max(80).describe("网站名称"),
      url: z.string().describe("网站 URL"),
      description: z.string().max(200).nullable().optional().describe("网站描述"),
      iconUrl: z.string().max(500).nullable().optional().describe("图标 URL"),
      iconBgColor: z.string().max(30).nullable().optional().describe("图标背景色"),
      isPinned: z.boolean().optional().describe("是否置顶"),
      skipOnlineCheck: z.boolean().optional().describe("是否跳过在线检测"),
      tagIds: z.array(z.string()).default([]).describe("关联的标签 ID 数组"),
      notes: z.string().max(5000).optional().describe("备注"),
    },
    async (params) => {
      const url = ensureUrlProtocol(params.url);
      const skipOnlineCheck = params.skipOnlineCheck ?? false;
      // 检查 URL 是否变更，用于决定是否触发在线检查
      const oldSite = await getSiteById(params.id);
      const site = await updateSite({
        id: params.id,
        name: params.name,
        url,
        description: params.description ?? null,
        iconUrl: params.iconUrl ?? null,
        iconBgColor: params.iconBgColor ?? null,
        isPinned: params.isPinned ?? false,
        skipOnlineCheck,
        tagIds: params.tagIds,
        notes: params.notes ?? "",
      });
      if (!site) {
        logger.warning("更新网站失败: 网站不存在", { id: params.id });
        return { content: [{ type: "text", text: JSON.stringify({ error: "网站不存在" }) }], isError: true };
      }
      logger.info("更新网站", { siteId: site.id, name: site.name });
      // URL 变更或 skipOnlineCheck 从 true→false 时触发在线检查
      const urlChanged = oldSite && oldSite.url !== url;
      const checkEnabled = oldSite?.skipOnlineCheck && !skipOnlineCheck;
      if (!skipOnlineCheck && (urlChanged || checkEnabled) && site.id) {
        performSingleSiteOnlineCheck(site.id).catch((err) => logger.error("MCP 更新后在线检查失败", err));
      }
      return { content: [{ type: "text", text: JSON.stringify(site, null, 2) }] };
    }
  );

  server.tool(
    "delete_site",
    "删除网站",
    {
      id: z.string().describe("网站 ID"),
    },
    async (params) => {
      await deleteSite(params.id);
      logger.info("删除网站", { siteId: params.id });
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    }
  );

  server.tool(
    "batch_create_sites",
    "批量创建网站",
    {
      sites: z.array(z.object({
        name: z.string().min(1).max(80).describe("网站名称"),
        url: z.string().describe("网站 URL"),
        description: z.string().max(200).optional().describe("网站描述"),
        tagIds: z.array(z.string()).default([]).describe("关联标签 ID"),
      })).min(1).max(50).describe("网站数据数组（最多 50 个）"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const results = [];
      for (const item of params.sites) {
        const url = ensureUrlProtocol(item.url);
        const site = await createSite({
          name: item.name,
          url,
          description: item.description ?? null,
          iconUrl: null,
          isPinned: false,
          tagIds: item.tagIds,
          ownerId,
        });
        if (site) {
          results.push({ id: site.id, name: site.name, url: site.url });
          // 异步触发在线检查
          performSingleSiteOnlineCheck(site.id).catch((err) => logger.error("MCP 批量创建后在线检查失败", err));
        }
      }
      logger.info("批量创建网站", { total: params.sites.length, created: results.length });
      return { content: [{ type: "text", text: JSON.stringify({ created: results.length, sites: results }, null, 2) }] };
    }
  );

  server.tool(
    "list_all_sites",
    "获取全部网站（不分页，返回完整列表）",
    {},
    async () => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const sites = await getAllSitesForAdmin(ownerId);
      return { content: [{ type: "text", text: JSON.stringify(sites.map(s => ({ id: s.id, name: s.name, url: s.url, tags: s.tags })), null, 2) }] };
    }
  );
}
