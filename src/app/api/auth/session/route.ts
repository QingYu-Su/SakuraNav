/**
 * 会话状态 API 路由
 * @description 获取当前用户的登录状态和会话信息
 */

import { getSession } from "@/lib/base/auth";
import { jsonOk } from "@/lib/utils/utils";

/**
 * 获取当前会话状态
 * @returns 会话认证信息和用户名
 */
export async function GET() {
  const session = await getSession();
  return jsonOk({
    isAuthenticated: Boolean(session?.isAuthenticated),
    username: session?.username ?? null,
  });
}
