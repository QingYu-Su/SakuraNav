/**
 * OAuth 登录回调 API
 * GET /api/auth/oauth/[provider]/callback → 处理第三方授权回调
 */

import { NextRequest, NextResponse } from "next/server";
import { getOAuthConfig, exchangeCodeForUser, getOAuthBaseUrl } from "@/lib/utils/oauth-providers";
import { createOAuthUser } from "@/lib/services/user-repository";
import { getOAuthAccount, createOAuthAccount } from "@/lib/services/oauth-repository";
import { copyAdminDataToUser } from "@/lib/services/user-repository";
import { createSessionToken } from "@/lib/base/auth";
import { createLogger } from "@/lib/base/logger";
import type { OAuthProvider } from "@/lib/base/types";

const logger = createLogger("API:OAuth:Callback");

/** 构造前端重定向 URL，优先使用管理面板配置的基础 URL，避免 0.0.0.0 等不可访问地址 */
function buildRedirectUrl(path: string, requestUrl: string): URL {
  const baseUrl = getOAuthBaseUrl();
  const origin = baseUrl ? baseUrl.replace(/\/+$/, "") : new URL(requestUrl).origin;
  return new URL(path, `${origin}/`);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  // 验证 state（CSRF 保护）
  const savedState = request.cookies.get("oauth_state")?.value;
  if (!state || !savedState || state !== savedState) {
    logger.warning("OAuth 回调 state 验证失败", { provider });
    return NextResponse.redirect(buildRedirectUrl("/login?oauth=error", request.url));
  }

  if (!code) {
    logger.warning("OAuth 回调缺少 code", { provider });
    return NextResponse.redirect(buildRedirectUrl("/login?oauth=error", request.url));
  }

  const config = getOAuthConfig(provider);
  if (!config?.enabled) {
    return NextResponse.redirect(buildRedirectUrl("/login?oauth=error", request.url));
  }

  try {
    // 构造回调 URL（必须与 start 时一致）— 使用管理面板中配置的基础 URL
    const baseUrl = getOAuthBaseUrl();
    const callbackUrl = baseUrl
      ? `${baseUrl.replace(/\/+$/, "")}/api/auth/oauth/${provider}/callback`
      : new URL(`/api/auth/oauth/${provider}/callback`, request.url).href;

    // 交换授权码获取用户信息
    const userInfo = await exchangeCodeForUser(provider as OAuthProvider, config, code, callbackUrl);

    if (!userInfo.id) {
      throw new Error("无法获取第三方用户 ID");
    }

    logger.info("OAuth 用户信息获取成功", { provider, providerAccountId: userInfo.id });

    // 查找已有的 OAuth 绑定
    const existingOAuth = getOAuthAccount(provider, userInfo.id);

    // 绑定模式：已登录用户发起 OAuth 用于绑定新供应商
    const bindUserId = request.cookies.get("oauth_bind_user")?.value;
    if (bindUserId) {
      const bindRedirect = (path: string) => {
        const res = NextResponse.redirect(buildRedirectUrl(path, request.url));
        res.cookies.set("oauth_bind_user", "", { maxAge: 0, path: "/" });
        res.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });
        return res;
      };

      if (existingOAuth) {
        if (existingOAuth.userId === bindUserId) {
          // 已绑定到当前用户
          logger.info("OAuth 已绑定到当前用户，无需重复绑定", { provider, userId: bindUserId });
          return bindRedirect("/profile");
        }
        // 已绑定到其他用户
        logger.warning("OAuth 绑定冲突: 已绑定到其他用户", { provider, boundUserId: existingOAuth.userId });
        return bindRedirect("/profile?oauth=conflict");
      }

      // 未绑定：绑定到当前登录用户
      const bindUser = await import("@/lib/services/user-repository").then((m) => m.getUserById(bindUserId));
      if (!bindUser) {
        return bindRedirect("/profile?oauth=error");
      }

      createOAuthAccount({
        userId: bindUser.id,
        provider: provider as OAuthProvider,
        providerAccountId: userInfo.id,
        profileData: {
          displayName: userInfo.displayName ?? "",
          avatarUrl: userInfo.avatarUrl ?? "",
          email: userInfo.email ?? "",
        },
      });

      logger.info("OAuth 账号绑定成功", { provider, userId: bindUserId });
      return bindRedirect("/profile?oauth=bound");
    }

    // 正常登录流程
    let userId: string;
    let username: string;
    let role: string;

    if (existingOAuth) {
      // 已绑定 → 直接登录该用户
      userId = existingOAuth.userId;
      const user = await import("@/lib/services/user-repository").then((m) => m.getUserById(userId));
      if (!user) {
        throw new Error("关联用户不存在");
      }
      username = user.username;
      role = user.role;
      logger.info("OAuth 用户已绑定，直接登录", { provider, userId });
    } else {
      // 未绑定 → 创建新用户
      const newUser = createOAuthUser(provider, userInfo.displayName);
      userId = newUser.id;
      username = newUser.username;
      role = newUser.role;

      // 复制管理员数据到新用户
      copyAdminDataToUser(userId);

      // 创建 OAuth 绑定
      createOAuthAccount({
        userId,
        provider: provider as OAuthProvider,
        providerAccountId: userInfo.id,
        profileData: {
          displayName: userInfo.displayName ?? "",
          avatarUrl: userInfo.avatarUrl ?? "",
          email: userInfo.email ?? "",
        },
      });

      logger.info("OAuth 新用户创建成功", { provider, userId, username });
    }

    // 创建会话
    const token = await createSessionToken(username, userId, role as "admin" | "user");

    // 重定向到登录页（带成功标记）
    const response = NextResponse.redirect(buildRedirectUrl("/login?oauth=success", request.url));
    response.cookies.set("sakura-nav-session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 天
    });
    // 清除 oauth_state cookie
    response.cookies.set("oauth_state", "", { maxAge: 0, path: "/" });

    return response;
  } catch (error) {
    logger.error("OAuth 回调处理失败", { provider, error });
    return NextResponse.redirect(buildRedirectUrl("/login?oauth=error", request.url));
  }
}
