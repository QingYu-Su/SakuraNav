/**
 * @description MCP 工具注册 - 社交卡片模块
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SessionUser, SocialCardPayload } from "@/lib/base/types";
import {
  getAllCards,
  createCard,
  updateCard,
  deleteCard,
} from "@/lib/services";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("MCP:Cards");

export function registerCardTools(server: McpServer, _getSession: () => SessionUser) {
  server.tool(
    "list_cards",
    "获取所有社交卡片列表",
    {},
    async () => {
      const cards = await getAllCards();
      return { content: [{ type: "text", text: JSON.stringify(cards, null, 2) }] };
    }
  );

  server.tool(
    "create_card",
    "创建一张社交卡片",
    {
      cardType: z.enum([
        "qq", "wechat", "email", "bilibili", "github", "blog",
        "wechat-official", "telegram", "xiaohongshu", "douyin",
        "qq-group", "enterprise-wechat",
      ]).describe("卡片类型"),
      label: z.string().min(1).max(40).describe("卡片显示名称"),
      iconUrl: z.string().max(500).nullable().optional().describe("图标 URL"),
      iconBgColor: z.string().max(30).nullable().optional().describe("图标背景色"),
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
      const card = await createCard({
        cardType: params.cardType,
        label: params.label,
        iconUrl: params.iconUrl ?? null,
        iconBgColor: params.iconBgColor ?? null,
        payload: params.payload as SocialCardPayload,
      });
      logger.info("创建社交卡片", { cardType: params.cardType, label: params.label });
      return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
    }
  );

  server.tool(
    "update_card",
    "更新社交卡片",
    {
      id: z.string().describe("卡片 ID"),
      label: z.string().min(1).max(40).describe("卡片显示名称"),
      iconUrl: z.string().max(500).nullable().optional().describe("图标 URL"),
      iconBgColor: z.string().max(30).nullable().optional().describe("图标背景色"),
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
      }).describe("卡片载荷数据"),
    },
    async (params) => {
      const card = await updateCard({
        id: params.id,
        label: params.label,
        iconUrl: params.iconUrl ?? null,
        iconBgColor: params.iconBgColor ?? null,
        payload: params.payload as SocialCardPayload,
      });
      if (!card) {
        logger.warning("更新社交卡片失败: 卡片不存在", { id: params.id });
        return { content: [{ type: "text", text: JSON.stringify({ error: "卡片不存在" }) }], isError: true };
      }
      logger.info("更新社交卡片", { cardId: card.id, label: params.label });
      return { content: [{ type: "text", text: JSON.stringify(card, null, 2) }] };
    }
  );

  server.tool(
    "delete_card",
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
