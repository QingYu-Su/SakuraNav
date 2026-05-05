/**
 * 导航标签列表 API 路由
 * @description 获取可见标签列表，根据用户身份返回对应数据空间的标签
 */

import { getSession } from "@/lib/base/auth";
import { getVisibleTags, getSocialCardCount, getNoteCardCount, getAppSettings, getVirtualTagSortOrders, insertVirtualTagsBySortOrder } from "@/lib/services";
import { ADMIN_USER_ID, SOCIAL_TAG_ID, NOTE_TAG_ID } from "@/lib/base/types";
import type { Tag } from "@/lib/base/types";
import { jsonOk } from "@/lib/utils/utils";

/**
 * 获取可见标签列表
 * @description 游客看到管理员数据，登录用户看到自己的数据
 */
export async function GET() {
  const session = await getSession();
  const ownerId = session?.isAuthenticated ? session.userId : ADMIN_USER_ID;
  const tags = await getVisibleTags(ownerId);

  // 读取虚拟标签的存储排序位置
  const virtualSortOrders = await getVirtualTagSortOrders();

  // 构建虚拟标签配置
  const virtualConfigs: Tag[] = [];

  // 动态注入"社交卡片"虚拟标签（仅在有卡片时显示）
  const cardCount = await getSocialCardCount(ownerId);
  if (cardCount > 0) {
    const settings = await getAppSettings();
    virtualConfigs.push({
      id: SOCIAL_TAG_ID,
      name: "社交卡片",
      slug: "social-cards",
      sortOrder: virtualSortOrders[SOCIAL_TAG_ID] ?? 0,
      isHidden: false,
      logoUrl: null,
      logoBgColor: null,
      siteCount: cardCount,
      description: settings.socialTagDescription,
    });
  }

  // 动态注入"笔记卡片"虚拟标签（仅在有卡片时显示）
  const noteCardCount = await getNoteCardCount(ownerId);
  if (noteCardCount > 0) {
    virtualConfigs.push({
      id: NOTE_TAG_ID,
      name: "笔记卡片",
      slug: "note-cards",
      sortOrder: virtualSortOrders[NOTE_TAG_ID] ?? virtualConfigs.length,
      isHidden: false,
      logoUrl: null,
      logoBgColor: null,
      siteCount: noteCardCount,
      description: null,
    });
  }

  // 将虚拟标签按存储的位置索引插入到真实标签列表中
  insertVirtualTagsBySortOrder(tags, virtualConfigs);

  return jsonOk({ items: tags });
}
