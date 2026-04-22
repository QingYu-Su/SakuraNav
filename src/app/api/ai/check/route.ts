/**
 * AI 连通性检查 API
 * @description 检查 AI API 是否已配置且可连通
 */

import { requireUserSession } from "@/lib/base/auth";
import { serverConfig } from "@/lib/config/server-config";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const logger = createLogger("API:AI:Check");

export async function POST() {
  try {
    await requireUserSession();

    const apiKey = serverConfig.aiApiKey;
    const baseUrl = serverConfig.aiBaseUrl;
    const model = serverConfig.aiModel;

    if (!apiKey || !baseUrl || !model) {
      return jsonError("AI 功能未配置，请在 config.yml 中添加 model 相关配置", 400);
    }

    // 尝试一次最小化 API 调用以验证连通性
    let normalizedBase = baseUrl.replace(/\/+$/, "");
    if (normalizedBase.endsWith("/v1")) {
      normalizedBase = normalizedBase.slice(0, -3);
    }

    const openai = createOpenAI({ apiKey, baseURL: normalizedBase });

    await generateText({
      model: openai.chat(model),
      prompt: "Reply with OK",
      maxOutputTokens: 10,
    });

    logger.info("AI 连通性检查通过");
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }

    logger.error("AI 连通性检查失败", error);
    return jsonError("AI 服务连接失败，请检查 config.yml 中的 model 配置和网络连接", 500);
  }
}
