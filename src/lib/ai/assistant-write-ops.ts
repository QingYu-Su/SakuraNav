/**
 * AI 助手 - 写操作执行器
 * @description 接收已确认的操作计划，调用 Repository 层执行
 */

import {
  createTag,
  updateTag,
  deleteTag,
  reorderTags,
  getTagById,
  createSite,
  updateSite,
  deleteSite,
  getSiteById,
  createCard,
  updateCard,
  deleteCard,
  getCardById,
} from "@/lib/services";
import type { SocialCardPayload } from "@/lib/base/types";
import { ensureUrlProtocol } from "@/lib/services/online-check-service";
import type { WriteOpType } from "./assistant-plan-tool";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("AI:WriteOps");

type OpResult = { success: boolean; type: string; description: string; data?: unknown; error?: string };

/** 执行单个写操作 */
export async function executeOneOp(type: WriteOpType, params: Record<string, unknown>, ownerId: string): Promise<OpResult> {
  try {
    switch (type) {
      // ── 标签 ──
      case "create_tag": {
        const tag = await createTag({
          name: params.name as string,
          logoUrl: (params.logoUrl as string) ?? null,
          logoBgColor: (params.logoBgColor as string) ?? null,
          description: (params.description as string) ?? null,
          ownerId,
        });
        return { success: true, type, description: `创建标签「${tag.name}」`, data: { id: tag.id, name: tag.name } };
      }
      case "update_tag": {
        const tagName = (params.name as string) ?? "";
        if (!tagName.trim()) return { success: false, type, description: "更新标签失败：名称不能为空", error: "EMPTY_NAME" };
        const tag = await updateTag({
          id: params.id as string,
          name: tagName,
          logoUrl: (params.logoUrl as string) ?? null,
          logoBgColor: (params.logoBgColor as string) ?? null,
          description: (params.description as string) ?? null,
        });
        if (!tag) return { success: false, type, description: "标签不存在", error: "NOT_FOUND" };
        return { success: true, type, description: `更新标签「${tag.name}」`, data: { id: tag.id, name: tag.name } };
      }
      case "delete_tag": {
        const tagId = params.id as string;
        const existing = await getTagById(tagId);
        const tagName = existing?.name ?? tagId;
        await deleteTag(tagId);
        return { success: true, type, description: `删除标签「${tagName}」` };
      }
      case "reorder_tags": {
        await reorderTags(params.ids as string[]);
        return { success: true, type, description: "标签排序已更新" };
      }

      // ── 网站 ──
      case "create_site": {
        const url = ensureUrlProtocol(params.url as string);
        const site = await createSite({
          name: params.name as string,
          url,
          description: (params.description as string) ?? null,
          iconUrl: (params.iconUrl as string) ?? null,
          iconBgColor: (params.iconBgColor as string) ?? null,
          isPinned: (params.isPinned as boolean) ?? false,
          tagIds: (params.tagIds as string[]) ?? [],
          ownerId,
          skipOnlineCheck: true,
        });
        if (!site) return { success: false, type, description: "创建网站失败", error: "CREATE_FAILED" };
        return { success: true, type, description: `创建网站「${site.name}」`, data: { id: site.id, name: site.name } };
      }
      case "update_site": {
        const existing = await getSiteById(params.id as string);
        if (!existing) return { success: false, type, description: "网站不存在", error: "NOT_FOUND" };
        const url = ensureUrlProtocol(params.url as string);
        const tagIdsParam = params.tagIds as string[] | undefined;
        const site = await updateSite({
          id: params.id as string,
          name: (params.name as string) ?? existing.name,
          url: url ?? existing.url,
          description: (params.description as string) ?? existing.description,
          iconUrl: (params.iconUrl as string) ?? existing.iconUrl,
          iconBgColor: (params.iconBgColor as string) ?? existing.iconBgColor,
          isPinned: (params.isPinned as boolean) ?? existing.isPinned,
          tagIds: Array.isArray(tagIdsParam) && tagIdsParam.length > 0 ? tagIdsParam : existing.tags.map((t) => t.id),
          skipOnlineCheck: true,
        });
        if (!site) return { success: false, type, description: "更新网站失败", error: "UPDATE_FAILED" };
        return { success: true, type, description: `更新网站「${site.name}」`, data: { id: site.id, name: site.name } };
      }
      case "delete_site": {
        const siteId = params.id as string;
        const existing = await getSiteById(siteId);
        const siteName = existing?.name ?? siteId;
        await deleteSite(siteId);
        return { success: true, type, description: `删除网站「${siteName}」` };
      }
      case "batch_create_sites": {
        const sites = params.sites as Array<{ name: string; url: string; description?: string; tagIds?: string[] }>;
        const created = [];
        for (const item of sites) {
          const url = ensureUrlProtocol(item.url);
          const site = await createSite({
            name: item.name,
            url,
            description: item.description ?? null,
            iconUrl: null,
            isPinned: false,
            tagIds: item.tagIds ?? [],
            ownerId,
            skipOnlineCheck: true,
          });
          if (site) created.push({ id: site.id, name: site.name });
        }
        return { success: true, type, description: `批量创建了 ${created.length} 个网站`, data: { created: created.length, sites: created } };
      }

      // ── 社交卡片 ──
      case "create_card": {
        const card = await createCard({
          cardType: (params.cardType as "qq" | "wechat" | "email" | "bilibili" | "github" | "blog" | "wechat-official" | "telegram" | "xiaohongshu" | "douyin" | "qq-group" | "enterprise-wechat"),
          label: params.label as string,
          iconUrl: (params.iconUrl as string) ?? null,
          iconBgColor: (params.iconBgColor as string) ?? null,
          payload: params.payload as SocialCardPayload,
        });
        return { success: true, type, description: `创建卡片「${card.label}」`, data: { id: card.id, label: card.label } };
      }
      case "update_card": {
        const card = await updateCard({
          id: params.id as string,
          label: params.label as string,
          iconUrl: (params.iconUrl as string) ?? null,
          iconBgColor: (params.iconBgColor as string) ?? null,
          payload: params.payload as SocialCardPayload,
        });
        if (!card) return { success: false, type, description: "卡片不存在", error: "NOT_FOUND" };
        return { success: true, type, description: `更新卡片「${card.label}」`, data: { id: card.id, label: card.label } };
      }
      case "delete_card": {
        const cardId = params.id as string;
        const existing = await getCardById(cardId);
        const cardLabel = existing?.label ?? cardId;
        await deleteCard(cardId);
        return { success: true, type, description: `删除卡片「${cardLabel}」` };
      }

      // ── 笔记 ──
      case "create_note": {
        const cardData = JSON.stringify({ title: params.title as string, content: (params.content as string) ?? "" });
        const site = await createSite({
          name: params.title as string,
          url: `note://${crypto.randomUUID()}`,
          description: null,
          iconUrl: (params.iconUrl as string) ?? null,
          iconBgColor: (params.iconBgColor as string) ?? null,
          isPinned: false,
          tagIds: [],
          ownerId,
          cardType: "note",
          cardData,
        });
        if (!site) return { success: false, type, description: "创建笔记失败", error: "CREATE_FAILED" };
        return { success: true, type, description: `创建笔记「${site.name}」`, data: { id: site.id, title: site.name } };
      }
      case "update_note": {
        const existing = await getSiteById(params.id as string);
        if (!existing || existing.cardType !== "note") return { success: false, type, description: "笔记不存在", error: "NOT_FOUND" };
        const cardData = JSON.stringify({ title: params.title as string, content: (params.content as string) ?? "" });
        const site = await updateSite({
          id: params.id as string,
          name: (params.title as string) ?? existing.name,
          url: existing.url,
          description: existing.description,
          iconUrl: (params.iconUrl as string) ?? existing.iconUrl,
          iconBgColor: (params.iconBgColor as string) ?? existing.iconBgColor,
          isPinned: existing.isPinned,
          tagIds: existing.tags.map((t) => t.id),
          cardType: "note",
          cardData,
        });
        if (!site) return { success: false, type, description: "更新笔记失败", error: "UPDATE_FAILED" };
        return { success: true, type, description: `更新笔记「${site.name}」`, data: { id: site.id, title: site.name } };
      }
      case "delete_note": {
        const noteId = params.id as string;
        const existing = await getSiteById(noteId);
        const noteName = existing?.name ?? noteId;
        await deleteSite(noteId);
        return { success: true, type, description: `删除笔记「${noteName}」` };
      }

      default:
        return { success: false, type, description: `未知操作类型: ${type}`, error: "UNKNOWN_OP" };
    }
  } catch (error) {
    logger.error("写操作执行失败", { type, error });
    return { success: false, type, description: `操作失败: ${error instanceof Error ? error.message : "未知错误"}`, error: "EXECUTION_ERROR" };
  }
}

/** 批量执行操作计划 */
export async function executeOperations(
  operations: Array<{ type: WriteOpType; params: Record<string, unknown> }>,
  ownerId: string,
): Promise<OpResult[]> {
  const results: OpResult[] = [];
  for (const op of operations) {
    const result = await executeOneOp(op.type, op.params, ownerId);
    results.push(result);
  }
  return results;
}
