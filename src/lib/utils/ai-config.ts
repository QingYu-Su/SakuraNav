/**
 * AI 配置解析工具
 * @description 从请求体中提取前端传递的 AI 草稿配置，优先级高于数据库配置
 */

import { serverConfig } from "@/lib/config/server-config";
import { getSession } from "@/lib/base/auth";

/** 判断 session 是否为管理员 */
function isPrivilegedRole(role?: string): boolean {
  return role === "admin";
}

/** AI 配置覆盖参数的结构 */
interface AiConfigOverride {
  _draftAiConfig?: {
    aiApiKey?: string;
    aiBaseUrl?: string;
    aiModel?: string;
  };
}

export interface ResolvedAiConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/**
 * 解析最终使用的 AI 配置
 * 优先使用请求体中的草稿配置（仅特权用户可覆盖），否则回退到数据库配置
 * @param body 请求体（可能包含 _draftAiConfig 字段）
 * @returns 解析后的 AI 配置；如果配置不完整返回 null
 */
export async function resolveAiConfig(body?: AiConfigOverride): Promise<ResolvedAiConfig | null> {
  const session = await getSession();
  const privileged = session?.isAuthenticated && isPrivilegedRole(session.role);

  const draft = privileged ? body?._draftAiConfig : undefined;
  // 掩码格式的 API Key（以 **** 开头）视为未修改，回退到服务端存储的配置
  const isMasked = (v?: string) => !!v && v.startsWith("****");
  const apiKey = (!isMasked(draft?.aiApiKey) && draft?.aiApiKey) || serverConfig.aiApiKey;
  const baseUrl = (!isMasked(draft?.aiBaseUrl) && draft?.aiBaseUrl) || serverConfig.aiBaseUrl;
  const model = draft?.aiModel || serverConfig.aiModel;

  if (!apiKey || !baseUrl || !model) return null;
  return { apiKey, baseUrl, model };
}
