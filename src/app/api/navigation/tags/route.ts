/**
 * 导航标签列表 API 路由
 * @description 获取可见标签列表，根据用户身份返回对应数据空间的标签
 */

import { getSession } from "@/lib/base/auth";
import { getVisibleTags, getSocialCardCount, getAppSettings } from "@/lib/services";
import { ADMIN_USER_ID, SOCIAL_TAG_ID } from "@/lib/base/types";
import { jsonOk } from "@/lib/utils/utils";

/**
 * 获取可见标签列表
 * @description 游客看到管理员数据，登录用户看到自己的数据
 */
export async function GET() {
  const session = await getSession();
  const ownerId = session?.isAuthenticated ? session.userId : ADMIN_USER_ID;
  const tags = getVisibleTags(ownerId);

  // 动态注入"社交卡片"虚拟标签（仅在有卡片时显示）
  const cardCount = getSocialCardCount(ownerId);
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
