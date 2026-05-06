/**
 * 导航标签列表 API 路由
 * @description 获取可见标签列表，根据用户身份返回对应数据空间的标签
 */

import { getSession } from "@/lib/base/auth";
import { getVisibleTags, injectVirtualTags } from "@/lib/services";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { jsonOk } from "@/lib/utils/utils";

/**
 * 获取可见标签列表
 * @description 游客看到管理员数据，登录用户看到自己的数据
 */
export async function GET() {
  const session = await getSession();
  const ownerId = session?.isAuthenticated ? session.userId : ADMIN_USER_ID;
  const tags = await getVisibleTags(ownerId);
  await injectVirtualTags(tags, ownerId);

  return jsonOk({ items: tags });
}
