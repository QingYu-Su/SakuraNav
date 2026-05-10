/**
* 社交卡片详情页 - 服务端入口
* @description 根据 ID 查询社交卡片，对支持详情页的类型展示详情页，否则重定向到首页
*/

import { redirect } from "next/navigation";
import { getCardById } from "@/lib/services";
import { cardToSocialCard } from "@/lib/base/types";
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
  const card = await getCardById(id);

  if (!card || !card.cardType || !DETAIL_PAGE_TYPES.has(card.cardType)) {
    redirect("/");
  }

  const socialCard = cardToSocialCard(card);
  if (!socialCard) {
    redirect("/");
  }

  return <CardDetailClient card={socialCard} />;
}
