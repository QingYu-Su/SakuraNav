/**
 * @description MCP 工具注册 - 标签模块
 * 注意：社交卡片和笔记卡片只能关联一个标签，对该类卡片进行标签操作时需特别注意此限制。
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser } from "@/lib/base/types";
import { SOCIAL_TAG_ID, NOTE_TAG_ID, VIRTUAL_TAG_IDS } from "@/lib/base/types";
import { getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getVisibleTags,
  getTagById,
  createTag,
  updateTag,
  deleteTag,
  reorderTags,
  injectVirtualTags,
} from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("MCP:Tags");

/** 虚拟标签说明文案 */
const VIRTUAL_TAG_NOTE = "这是一个虚拟标签，不在数据库中存储，由系统根据 card_type 自动生成。不支持创建和更新，仅支持排序和删除（删除会触发该类型卡片的批量清理）。";

export function registerTagTools(server: McpServer, getSession: () => SessionUser) {
  server.tool(
    "list_tags",
    "获取所有标签列表，包含网站标签和虚拟标签（社交卡片、笔记卡片）。返回数据中虚拟标签会附带 _note 说明其特殊性。",
    {},
    async () => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const tags = await getVisibleTags(ownerId);
      // 注入虚拟标签
      await injectVirtualTags(tags, ownerId);
      // 为虚拟标签添加说明注释
      const annotated = tags.map((tag) => {
        if (VIRTUAL_TAG_IDS.has(tag.id)) {
          let specificNote = VIRTUAL_TAG_NOTE;
          if (tag.id === SOCIAL_TAG_ID) {
            specificNote += " 删除此标签将批量删除所有社交卡片。";
          } else if (tag.id === NOTE_TAG_ID) {
            specificNote += " 删除此标签将批量删除所有笔记卡片。";
          }
          return { ...tag, _note: specificNote };
        }
        return tag;
      });
      return { content: [{ type: "text", text: JSON.stringify(annotated, null, 2) }] };
    }
  );

  server.tool(
    "list_site_tags",
    "获取网站标签列表（仅真实标签，不包含社交卡片和笔记卡片的虚拟标签）",
    {},
    async () => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const tags = await getVisibleTags(ownerId);
      return { content: [{ type: "text", text: JSON.stringify(tags, null, 2) }] };
    }
  );

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
    "删除标签。普通网站标签删除后不影响网站卡片；虚拟标签（社交卡片/笔记卡片）删除会触发该类型卡片的批量清理",
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
