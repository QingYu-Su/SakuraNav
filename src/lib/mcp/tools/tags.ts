/**
 * @description MCP 工具注册 - 标签模块
 * 注意：社交卡片和笔记卡片只能关联一个标签，对该类卡片进行标签操作时需特别注意此限制。
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getVisibleTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  reorderTags,
} from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("MCP:Tags");

export function registerTagTools(server: McpServer, getSession: () => SessionUser) {
  server.tool("list_tags", "获取所有标签列表。注意：社交卡片和笔记卡片只能关联一个标签，对该类卡片进行标签操作时需特别注意此限制。", {}, async () => {
    const session = getSession();
    const ownerId = getEffectiveOwnerId(session);
    const tags = await getVisibleTags(ownerId);
    return { content: [{ type: "text", text: JSON.stringify(tags, null, 2) }] };
  });

  server.tool(
    "create_tag",
    "创建一个新标签",
    {
      name: z.string().min(1).max(40).describe("标签名称"),
      logoUrl: z.string().max(500).optional().describe("标签 Logo URL"),
      logoBgColor: z.string().max(30).optional().describe("Logo 背景色（十六进制）"),
      description: z.string().max(200).optional().describe("标签描述"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const tag = await createTag({
        name: params.name,
        logoUrl: params.logoUrl ?? null,
        logoBgColor: params.logoBgColor ?? null,
        description: params.description ?? null,
        ownerId,
      });
      logger.info("创建标签", { tagId: tag.id, name: tag.name });
      return { content: [{ type: "text", text: JSON.stringify(tag, null, 2) }] };
    }
  );

  server.tool(
    "update_tag",
    "更新已有标签（部分更新：只修改传递的字段，未传递的字段保持原值不变）",
    {
      id: z.string().describe("标签 ID"),
      name: z.string().min(1).max(40).optional().describe("标签名称"),
      logoUrl: z.string().max(500).nullable().optional().describe("标签 Logo URL（传 null 清空）"),
      logoBgColor: z.string().max(30).nullable().optional().describe("Logo 背景色（传 null 清空）"),
      description: z.string().max(200).nullable().optional().describe("标签描述（传 null 清空）"),
    },
    async (params) => {
      const existing = await getTagById(params.id);
      if (!existing) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "标签不存在" }) }], isError: true };
      }
      const tag = await updateTag({
        id: params.id,
        name: params.name ?? existing.name,
        logoUrl: params.logoUrl !== undefined ? params.logoUrl : existing.logoUrl,
        logoBgColor: params.logoBgColor !== undefined ? params.logoBgColor : existing.logoBgColor,
        description: params.description !== undefined ? params.description : existing.description,
      });
      if (!tag) {
        logger.warning("更新标签失败", { id: params.id });
        return { content: [{ type: "text", text: JSON.stringify({ error: "更新失败" }) }], isError: true };
      }
      logger.info("更新标签", { tagId: tag.id, name: tag.name });
      return { content: [{ type: "text", text: JSON.stringify(tag, null, 2) }] };
    }
  );

  server.tool(
    "delete_tag",
    "删除标签及其关联（网站卡片不受影响）",
    {
      id: z.string().describe("标签 ID"),
    },
    async (params) => {
      await deleteTag(params.id);
      logger.info("删除标签", { tagId: params.id });
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    }
  );

  server.tool(
    "reorder_tags",
    "重新排列标签顺序",
    {
      ids: z.array(z.string()).min(1).describe("按新顺序排列的标签 ID 数组"),
    },
    async (params) => {
      await reorderTags(params.ids);
      logger.info("标签排序", { count: params.ids.length });
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    }
  );
}
