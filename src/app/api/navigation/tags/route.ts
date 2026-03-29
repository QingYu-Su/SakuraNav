/**
 * 导航标签列表 API 路由
 * @description 获取可见的标签列表，根据登录状态返回不同的标签集合
 */

import { getSession } from "@/lib/auth";
import { getVisibleTags } from "@/lib/db";
import { jsonOk } from "@/lib/utils";

/**
 * 获取可见标签列表
 * @returns 标签列表数据
 */
export async function GET() {
  const session = await getSession();
  return jsonOk({
    items: getVisibleTags(Boolean(session?.isAuthenticated)),
  });
}
