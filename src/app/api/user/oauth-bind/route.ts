/**
 * OAuth 账号绑定/解绑 API
 * POST  - 绑定 OAuth 账号（发起授权）
 * DELETE - 解绑 OAuth 账号
 * GET   - 获取当前用户的 OAuth 绑定列表
 */

import { NextRequest } from "next/server";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { requireUserSession } from "@/lib/base/auth";
import { getOAuthBindingsByUserId, deleteOAuthAccount, getOAuthAccountCount } from "@/lib/services/oauth-repository";
import { userHasPassword } from "@/lib/services/user-repository";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:User:OAuthBind");

/** 获取当前用户的 OAuth 绑定 */
export async function GET() {
  try {
    const session = await requireUserSession();
    const bindings = await getOAuthBindingsByUserId(session.userId);
    return jsonOk({ bindings });
  } catch {
    return jsonError("未授权", 401);
  }
}

/** 解绑 OAuth 账号 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireUserSession();
    const body = (await request.json()) as { provider?: string };
    const provider = body.provider;

    if (!provider) {
      return jsonError("缺少 provider 参数", 400);
    }

    // 安全检查：如果用户没有密码且这是最后一个绑定，不允许解绑
    const hasPwd = await userHasPassword(session.userId);
    const bindCount = await getOAuthAccountCount(session.userId);
    if (!hasPwd && bindCount <= 1) {
      return jsonError("这是您唯一的登录方式，请先设置密码后再解绑", 400);
    }

    const deleted = await deleteOAuthAccount(session.userId, provider);
    if (!deleted) {
      return jsonError("未找到该绑定", 404);
    }

    logger.info("OAuth 账号已解绑", { userId: session.userId, provider });
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    return jsonError("解绑失败", 500);
  }
}
