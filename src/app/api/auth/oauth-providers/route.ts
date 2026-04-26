/**
 * OAuth 供应商公开配置 API
 * GET /api/auth/oauth-providers → 返回已启用的 OAuth 供应商列表（不含密钥）
 */

import { jsonOk } from "@/lib/utils/utils";
import { getEnabledOAuthProviders } from "@/lib/utils/oauth-providers";

export async function GET() {
  const providers = getEnabledOAuthProviders();
  return jsonOk({ providers });
}
