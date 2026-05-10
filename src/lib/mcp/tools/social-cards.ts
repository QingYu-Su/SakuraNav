/**
 * @description MCP 工具注册 - 社交卡片模块
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser, SocialCardPayload } from "@/lib/base/types";
import { getEffectiveOwnerId } from "@/lib/base/auth";
import {
  getSocialCards,
  getCardById,
  createCard,
  updateCard,
  deleteCard,
} from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("MCP:SocialCards");

export function registerSocialCardTools(server: McpServer, getSession: () => SessionUser) {
  server.tool(
    "list_social_cards",
    "获取所有社交卡片列表。注意：社交卡片只能关联一个标签，创建时指定，不可增删改。",
    {},
    async () => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const cards = await getSocialCards(ownerId);
      const result = cards.map((c) => {
        const payload = c.cardData ? JSON.parse(c.cardData) as SocialCardPayload : null;
        return {
          id: c.id,
          cardType: c.cardType,
          label: c.name,
          iconUrl: c.iconUrl,
          iconBgColor: c.iconBgColor,
          payload,
          hint: c.description,
          tags: c.tags,
          globalSortOrder: c.globalSortOrder,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          _tagNote: "此卡片只能绑定一个标签，创建时指定，不可增删改",
        };
      });
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }
  );

  server.tool(
    "create_social_card",
    "创建一张社交卡片。创建时需通过 tagId 指定一个标签。社交/笔记卡片只能关联一个标签，一旦创建后该标签不可修改、删除或新增。",
    {
      cardType: z.enum([
        "qq", "wechat", "email", "bilibili", "github", "blog",
        "wechat-official", "telegram", "xiaohongshu", "douyin",
        "qq-group", "enterprise-wechat",
      ]).describe("卡片类型"),
      label: z.string().min(1).max(40).describe("卡片显示名称"),
      iconUrl: z.string().max(500).nullable().optional().describe("图标 URL"),
      iconBgColor: z.string().max(30).nullable().optional().describe("图标背景色"),
      tagId: z.string().optional().describe("关联的标签 ID（只能关联一个标签）"),
      payload: z.object({
        type: z.enum([
          "qq", "wechat", "email", "bilibili", "github", "blog",
          "wechat-official", "telegram", "xiaohongshu", "douyin",
          "qq-group", "enterprise-wechat",
        ]).describe("载荷类型，应与 cardType 一致"),
        qqNumber: z.string().max(20).optional().describe("QQ 号"),
        wechatId: z.string().max(100).optional().describe("微信号"),
        email: z.string().max(200).optional().describe("邮箱地址"),
        url: z.string().optional().describe("URL（bilibili/github/blog/telegram）"),
        accountName: z.string().max(100).optional().describe("公众号名称"),
        xhsId: z.string().max(100).optional().describe("小红书号"),
        douyinId: z.string().max(100).optional().describe("抖音号"),
        groupNumber: z.string().max(20).optional().describe("QQ 群号"),
        ewcId: z.string().max(100).optional().describe("企业微信 ID"),
        qrCodeUrl: z.string().max(500).optional().describe("二维码图片 URL"),
      }).describe("卡片载荷数据"),
    },
    async (params) => {
      const session = getSession();
      const ownerId = getEffectiveOwnerId(session);
      const tagIds = params.tagId ? [params.tagId] : [];
      const card = await createCard({
        name: params.label,
        url: `social://${params.cardType}`,
        description: null,
        iconUrl: params.iconUrl ?? null,
        iconBgColor: params.iconBgColor ?? null,
        isPinned: false,
        tagIds,
        ownerId,
        cardType: params.cardType,
        cardData: JSON.stringify(params.payload),
      });
      if (!card) return { content: [{ type: "text", text: JSON.stringify({ error: "创建失败" }) }], isError: true };
      logger.info("创建社交卡片", { cardType: params.cardType, label: params.label });
      return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
    }
  );

  server.tool(
    "update_social_card",
    "更新社交卡片（部分更新：只修改传递的字段，未传递的字段保持原值不变）",
    {
      id: z.string().describe("卡片 ID"),
      label: z.string().min(1).max(40).optional().describe("卡片显示名称"),
      iconUrl: z.string().max(500).nullable().optional().describe("图标 URL（传 null 清空）"),
      iconBgColor: z.string().max(30).nullable().optional().describe("图标背景色（传 null 清空）"),
      payload: z.object({
        type: z.enum([
          "qq", "wechat", "email", "bilibili", "github", "blog",
          "wechat-official", "telegram", "xiaohongshu", "douyin",
          "qq-group", "enterprise-wechat",
        ]).describe("载荷类型"),
        qqNumber: z.string().max(20).optional(),
        wechatId: z.string().max(100).optional(),
        email: z.string().max(200).optional(),
        url: z.string().optional(),
        accountName: z.string().max(100).optional(),
        xhsId: z.string().max(100).optional(),
        douyinId: z.string().max(100).optional(),
        groupNumber: z.string().max(20).optional(),
        ewcId: z.string().max(100).optional(),
        qrCodeUrl: z.string().max(500).optional(),
      }).optional().describe("卡片载荷数据"),
    },
    async (params) => {
      const existing = await getCardById(params.id);
      if (!existing) {
        return { content: [{ type: "text", text: JSON.stringify({ error: "卡片不存在" }) }], isError: true };
      }
      const existingPayload = existing.cardData ? JSON.parse(existing.cardData) as SocialCardPayload : {};
      const card = await updateCard({
        id: params.id,
        name: params.label ?? existing.name,
        url: existing.url,
        description: existing.description,
        iconUrl: params.iconUrl !== undefined ? params.iconUrl : existing.iconUrl,
        iconBgColor: params.iconBgColor !== undefined ? params.iconBgColor : existing.iconBgColor,
        isPinned: existing.isPinned,
        tagIds: existing.tags.map((t) => t.id),
        cardType: existing.cardType,
        cardData: JSON.stringify(params.payload ?? existingPayload),
      });
      if (!card) {
        logger.warning("更新社交卡片失败", { id: params.id });
        return { content: [{ type: "text", text: JSON.stringify({ error: "更新失败" }) }], isError: true };
      }
      logger.info("更新社交卡片", { cardId: card.id, label: card.name });
      return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
    }
  );

  server.tool(
    "delete_social_card",
    "删除社交卡片",
    {
      id: z.string().describe("卡片 ID"),
    },
    async (params) => {
      await deleteCard(params.id);
      logger.info("删除社交卡片", { cardId: params.id });
      return { content: [{ type: "text", text: JSON.stringify({ success: true }) }] };
    }
  );
}
