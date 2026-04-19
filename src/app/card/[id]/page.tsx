/**
 * QQ 卡片详情页 - 服务端入口
 * @description 根据 ID 查询社交卡片，仅对 QQ 类型卡片展示详情页，否则重定向到首页
 */

import { redirect } from "next/navigation";
import { getCardById } from "@/lib/services";
import { CardDetailClient } from "./card-detail-client";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CardDetailPage({ params }: Props) {
  const { id } = await params;
  const card = getCardById(id);

  if (!card || card.cardType !== "qq") {
    redirect("/");
  }

  return <CardDetailClient card={card} />;
}
