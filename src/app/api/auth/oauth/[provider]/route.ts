/**
 * OAuth 登录启动 API
 * GET /api/auth/oauth/[provider] → 重定向到第三方授权页面
 */

import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizationUrl, getOAuthConfig } from "@/lib/utils/oauth-providers";
import { createLogger } from "@/lib/base/logger";
import type { OAuthProvider } from "@/lib/base/types";

const logger = createLogger("API:OAuth:Start");

const VALID_PROVIDERS: OAuthProvider[] = ["github", "wechat", "wecom", "feishu", "dingtalk"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  if (!VALID_PROVIDERS.includes(provider as OAuthProvider)) {
    return NextResponse.redirect(new URL("/login?oauth=error", request.url));
  }

  const config = getOAuthConfig(provider);
  if (!config?.enabled) {
    logger.warning("OAuth 供应商未启用", { provider });
    return NextResponse.redirect(new URL("/login?oauth=error", request.url));
  }

  // 构造回调 URL
  const callbackUrl = new URL(`/api/auth/oauth/${provider}/callback`, request.url).href;

  // 生成 state 参数（CSRF 保护）
  const state = crypto.randomUUID().replace(/-/g, "");

  // 构建授权 URL
  const authUrl = buildAuthorizationUrl(provider as OAuthProvider, config, callbackUrl, state);

  // 将 state 存入 cookie（callback 时验证）
  const response = NextResponse.redirect(authUrl);
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 分钟有效
  });

  logger.info("OAuth 授权重定向", { provider });
  return response;
}
