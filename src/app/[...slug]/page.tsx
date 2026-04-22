/**
 * 动态路由页面组件
 * @description 捕获所有未匹配路径，返回 404
 * @note 登录入口已固定为 /login 路由
 */

import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default async function CatchAllPage({ params }: Props) {
  void params;
  notFound();
}
