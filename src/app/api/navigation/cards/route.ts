/**
* 导航全部卡片列表 API 路由
* @description 提供分页获取全部类型卡片列表的接口，基于用户身份隔离数据空间
*/

import { NextRequest } from "next/server";
import { getOptionalSession } from "@/lib/base/auth";
import { getPaginatedCards } from "@/lib/services";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { jsonError, jsonOk } from "@/lib/utils/utils";

/**
* 获取分页全部卡片列表
* @description 游客看到管理员数据，登录用户看到自己的数据
*/
export async function GET(request: NextRequest) {
  const session = await getOptionalSession();
  const ownerId = session?.isAuthenticated ? session.userId : ADMIN_USER_ID;
  const scopeParam = request.nextUrl.searchParams.get("scope");
  const scope = scopeParam === "tag" ? "tag" : "all";
  const tagId = request.nextUrl.searchParams.get("tagId");
  const query = request.nextUrl.searchParams.get("q");
  const cursor = request.nextUrl.searchParams.get("cursor");

  if (scope === "tag" && !tagId) {
    return jsonError("缺少标签 ID", 400);
  }

  return jsonOk(
    await getPaginatedCards({
      ownerId,
      scope,
      tagId,
      query,
      cursor,
    }),
  );
}
