/**
 * OAuth 连通性测试 API
 * POST - 测试指定供应商的配置是否可用（管理员）
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/base/auth";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import type { OAuthProvider } from "@/lib/base/types";

const logger = createLogger("API:OAuthTest");

/** 各供应商的测试逻辑 — 用最小代价验证凭证是否有效 */
async function testProvider(provider: OAuthProvider, config: Record<string, string>): Promise<{ ok: boolean; message: string }> {
  switch (provider) {
    case "github": {
      // 用 client_id + client_secret 检查 GitHub App 信息
      const res = await fetch(`https://api.github.com/applications/${config.clientId}`, {
        method: "GET",
        headers: {
          Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64")}`,
          Accept: "application/json",
        },
      });
      if (res.ok) return { ok: true, message: "GitHub 应用验证成功" };
      if (res.status === 401) return { ok: false, message: "Client ID 或 Client Secret 不正确" };
      if (res.status === 404) return { ok: false, message: "未找到对应的 GitHub OAuth App，请检查 Client ID" };
      return { ok: false, message: `GitHub 返回错误 (${res.status})` };
    }
    case "wechat": {
      // 用 AppID + AppSecret 获取 access_token（基本凭证测试）
      const appId = config.appId || config.clientId;
      const secret = config.appSecret || config.clientSecret;
      const res = await fetch(`https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${secret}`);
      const data = await res.json() as Record<string, string>;
      if (data.access_token) return { ok: true, message: "微信应用验证成功（access_token 已获取）" };
      if (data.errcode === "40125" || data.errcode === "40001") return { ok: false, message: "AppSecret 不正确" };
      if (data.errcode === "40013") return { ok: false, message: "AppID 不正确" };
      return { ok: false, message: `微信返回错误: ${data.errmsg ?? data.errcode ?? "未知错误"}` };
    }
    case "wecom": {
      // 用 corpid + secret 获取 access_token
      const res = await fetch(`https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${config.corpId}&corpsecret=${config.secret}`);
      const data = await res.json() as Record<string, string>;
      if (data.access_token) return { ok: true, message: "企业微信应用验证成功（access_token 已获取）" };
      if (data.errcode === "40001" || data.errcode === "40091") return { ok: false, message: "Corp ID 或 Secret 不正确" };
      return { ok: false, message: `企业微信返回错误: ${data.errmsg ?? data.errcode ?? "未知错误"}` };
    }
    case "feishu": {
      // 用 app_id + app_secret 获取 app_access_token
      const appId = config.appId || config.clientId;
      const secret = config.appSecret || config.clientSecret;
      const res = await fetch("https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ app_id: appId, app_secret: secret }),
      });
      const data = await res.json() as Record<string, string>;
      if (data.app_access_token) return { ok: true, message: "飞书应用验证成功（app_access_token 已获取）" };
      return { ok: false, message: `飞书返回错误: ${data.msg ?? data.code ?? "请检查 App ID 和 App Secret"}` };
    }
    case "dingtalk": {
      // 用 appKey + appSecret 获取 access_token
      const appKey = config.appKey || config.clientId;
      const secret = config.appSecret || config.clientSecret;
      const res = await fetch("https://api.dingtalk.com/v1.0/oauth2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appKey, appSecret: secret }),
      });
      const data = await res.json() as Record<string, string>;
      if (data.accessToken) return { ok: true, message: "钉钉应用验证成功（access_token 已获取）" };
      return { ok: false, message: `钉钉返回错误: ${data.message ?? "请检查 App Key 和 App Secret"}` };
    }
    default:
      return { ok: false, message: `不支持的供应商: ${provider}` };
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json() as { provider?: string; config?: Record<string, string> };
    if (!body.provider || !body.config) {
      return jsonError("缺少 provider 或 config 参数");
    }

    const provider = body.provider as OAuthProvider;
    logger.info(`测试 OAuth 供应商: ${provider}`);

    const result = await testProvider(provider, body.config);
    return jsonOk(result);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("OAuth 测试失败", error);
    return jsonError("测试请求失败", 500);
  }
}
