/**
 * AI Provider 工厂
 * @description 根据解析后的 AI 配置，自动匹配供应商类型并创建对应的 LanguageModel 实例。
 * 通过 baseUrl 匹配 AI_PROVIDERS 预设来确定使用哪个 SDK provider。
 *
 * URL 构建规则（各 SDK 均直接使用 baseURL，不追加版本前缀）：
 * - @ai-sdk/openai:    ${baseURL}/chat/completions
 * - @ai-sdk/anthropic:  ${baseURL}/messages
 * - @ai-sdk/google:     ${baseURL}/models/${modelId}:generateContent
 */

import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AI_PROVIDERS } from "@/lib/base/types";
import type { AiSdkType } from "@/lib/base/types";
import type { ResolvedAiConfig } from "./ai-config";

/**
 * 根据 baseUrl 查找匹配的预设供应商 SDK 类型
 * 未匹配到预设时默认使用 openai（兼容格式），适用于自定义 API 端点
 */
function resolveSdkType(baseUrl: string): AiSdkType {
  // 去掉末尾斜杠后精确匹配，以兼容用户输入的微小差异
  const normalized = baseUrl.replace(/\/+$/, "");
  const matched = AI_PROVIDERS.find((p) => p.baseUrl.replace(/\/+$/, "") === normalized);
  return matched?.sdkType ?? "openai";
}

/**
 * 根据解析后的 AI 配置创建对应的 LanguageModel 实例
 * 自动根据 baseUrl 匹配供应商类型，选择正确的 AI SDK provider
 */
export function createLanguageModel(config: ResolvedAiConfig) {
  const sdkType = resolveSdkType(config.baseUrl);

  switch (sdkType) {
    case "anthropic": {
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || undefined,
      });
      return anthropic(config.model);
    }

    case "google": {
      const google = createGoogleGenerativeAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || undefined,
      });
      return google(config.model);
    }

    default: {
      // OpenAI 兼容格式：直接使用 baseUrl，SDK 内部会追加 /chat/completions
      const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseUrl || undefined,
      });
      return openai.chat(config.model);
    }
  }
}
