/**
 * 导航标签列表 API 路由
 * @description 获取可见的标签列表，根据登录状态返回不同的标签集合
 */

import { getSession } from "@/lib/base/auth";
import { getVisibleTags, getSocialCardCount, getAppSettings } from "@/lib/services";
import { SOCIAL_TAG_ID } from "@/lib/base/types";
import { jsonOk } from "@/lib/utils/utils";

/**
 * 获取可见标签列表
 * @returns 标签列表数据（包含动态注入的"社交卡片"标签）
 */
export async function GET() {
  const session = await getSession();
  const isAuthenticated = Boolean(session?.isAuthenticated);
  const tags = getVisibleTags(isAuthenticated);

  // 动态注入"社交卡片"虚拟标签（仅在有卡片时显示）
  const cardCount = getSocialCardCount();
  if (cardCount > 0) {
    const settings = getAppSettings();
    tags.push({
      id: SOCIAL_TAG_ID,
      name: "社交卡片",
      slug: "social-cards",
      sortOrder: 999999,
      isHidden: false,
      logoUrl: null,
      logoBgColor: null,
      siteCount: cardCount,
      description: settings.socialTagDescription,
    });
  }

  return jsonOk({ items: tags });
}
