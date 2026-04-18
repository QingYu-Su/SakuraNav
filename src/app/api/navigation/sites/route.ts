/**
 * 导航网站列表 API 路由
 * @description 提供分页获取网站列表的接口，支持按标签筛选和搜索
 */

import { NextRequest } from "next/server";
import { getSession } from "@/lib/base/auth";
import { getPaginatedSites } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";

/**
 * 获取分页网站列表
 * @param request - 包含分页参数、标签ID和搜索关键词的请求对象
 * @returns 分页的网站数据
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  const scopeParam = request.nextUrl.searchParams.get("scope");
  const scope = scopeParam === "tag" ? "tag" : "all";
  const tagId = request.nextUrl.searchParams.get("tagId");
  const query = request.nextUrl.searchParams.get("q");
  const cursor = request.nextUrl.searchParams.get("cursor");

  if (scope === "tag" && !tagId) {
    return jsonError("缺少标签 ID", 400);
  }

  return jsonOk(
    getPaginatedSites({
      isAuthenticated: Boolean(session?.isAuthenticated),
      scope,
      tagId,
      query,
      cursor,
    }),
  );
}
