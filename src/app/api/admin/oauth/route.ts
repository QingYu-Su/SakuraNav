/**
 * OAuth 管理 API
 * GET  - 获取所有 OAuth 配置（管理员，密钥掩码）
 * PUT  - 更新 OAuth 配置（管理员）
 */

import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/base/auth";
import { jsonOk, jsonError } from "@/lib/utils/utils";
import { getOAuthConfigs, saveOAuthConfigs, getOAuthBaseUrl, saveOAuthBaseUrl } from "@/lib/utils/oauth-providers";
import { oauthProviderConfigSchema } from "@/lib/config/schemas";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:OAuthConfig");

/** 掩码敏感字段 */
function maskSecret(value: string | undefined): string {
  if (!value || value.length <= 8) return value ? "****" : "";
  return `****${value.slice(-4)}`;
}

/** 掩码配置中的密钥 */
function maskConfigs(configs: Record<string, Record<string, unknown>>): Record<string, Record<string, unknown>> {
  const masked: Record<string, Record<string, unknown>> = {};
  for (const [key, config] of Object.entries(configs)) {
    masked[key] = {
      ...config,
      clientSecret: config.clientSecret ? maskSecret(config.clientSecret as string) : "",
      appSecret: config.appSecret ? maskSecret(config.appSecret as string) : "",
      secret: config.secret ? maskSecret(config.secret as string) : "",
    };
  }
  return masked;
}

export async function GET() {
  try {
    await requireAdminSession();
    const configs = getOAuthConfigs();
    const baseUrl = getOAuthBaseUrl();
    return jsonOk({ configs: maskConfigs(configs as Record<string, Record<string, unknown>>), baseUrl });
  } catch {
    return jsonError("未授权", 401);
  }
}

export async function PUT(request: NextRequest) {
  try {
    await requireAdminSession();
    const body = await request.json() as Record<string, unknown>;
    const configs = getOAuthConfigs();

    // 保存 baseUrl（如果提供了）
    if (typeof body.baseUrl === "string" && body.baseUrl.trim()) {
      saveOAuthBaseUrl(body.baseUrl.trim());
    }

    // 逐个供应商验证和合并
    const providerEntries = (body.configs ?? body) as Record<string, Record<string, unknown>>;
    for (const [provider, newConfig] of Object.entries(providerEntries)) {
      if (provider === "baseUrl") continue; // 跳过非供应商字段
      const parsed = oauthProviderConfigSchema.safeParse(newConfig);
      if (!parsed.success) {
        return jsonError(`供应商 ${provider} 配置不合法: ${parsed.error.issues[0]?.message}`);
      }

      const existing = configs[provider] ?? {};
      const merged = { ...existing, ...parsed.data };

      // 如果密钥是掩码，保留原值
      if (typeof merged.clientSecret === "string" && merged.clientSecret.startsWith("****")) {
        merged.clientSecret = existing.clientSecret || "";
      }
      if (typeof merged.appSecret === "string" && merged.appSecret.startsWith("****")) {
        merged.appSecret = existing.appSecret || "";
      }
      if (typeof merged.secret === "string" && merged.secret.startsWith("****")) {
        merged.secret = existing.secret || "";
      }

      configs[provider] = merged;
    }

    saveOAuthConfigs(configs);
    logger.info("OAuth 配置已更新");
    return jsonOk({ ok: true, configs: maskConfigs(configs as Record<string, Record<string, unknown>>), baseUrl: getOAuthBaseUrl() });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }
    logger.error("OAuth 配置更新失败", error);
    return jsonError("保存失败", 500);
  }
}
