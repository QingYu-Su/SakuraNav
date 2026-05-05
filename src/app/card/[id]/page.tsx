/**
 * 社交卡片详情页 - 服务端入口
 * @description 根据 ID 查询社交卡片站点，对支持详情页的类型展示详情页，否则重定向到首页
 */

import { redirect } from "next/navigation";
import { getSiteById } from "@/lib/services";
import { siteToSocialCard } from "@/lib/base/types";
import { CardDetailClient } from "./card-detail-client";

/** 支持详情页展示的卡片类型 */
const DETAIL_PAGE_TYPES = new Set([
  "qq", "wechat", "email",
  "wechat-official", "xiaohongshu", "douyin", "qq-group", "enterprise-wechat",
]);

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CardDetailPage({ params }: Props) {
  const { id } = await params;
  const site = await getSiteById(id);

  if (!site || !site.cardType || !DETAIL_PAGE_TYPES.has(site.cardType)) {
    redirect("/");
  }

  const card = siteToSocialCard(site);
  if (!card) {
    redirect("/");
  }

  return <CardDetailClient card={card} />;
}
