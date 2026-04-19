/**
 * 社交卡片详情页 - 服务端入口
 * @description 根据 ID 查询社交卡片站点，对 QQ/微信类型卡片展示详情页，否则重定向到首页
 */

import { redirect } from "next/navigation";
import { getSiteById } from "@/lib/services";
import { siteToSocialCard } from "@/lib/base/types";
import { CardDetailClient } from "./card-detail-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CardDetailPage({ params }: Props) {
  const { id } = await params;
  const site = getSiteById(id);

  if (!site || (site.cardType !== "qq" && site.cardType !== "wechat")) {
    redirect("/");
  }

  const card = siteToSocialCard(site);
  if (!card) {
    redirect("/");
  }

  return <CardDetailClient card={card} />;
}
