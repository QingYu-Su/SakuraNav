/**
 * AI 连通性检查 API
 * @description 检查 AI API 是否已配置且可连通
 */

import { requireUserSession } from "@/lib/base/auth";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { generateText } from "ai";
import { resolveAiConfig } from "@/lib/utils/ai-config";
import { createLanguageModel } from "@/lib/utils/ai-provider-factory";

const logger = createLogger("API:AI:Check");

export async function POST(request: Request) {
  try {
    await requireUserSession();

    let body: { _draftAiConfig?: { aiApiKey?: string; aiBaseUrl?: string; aiModel?: string } } = {};
    try { body = await request.json() as typeof body; } catch { /* 无请求体 */ }

    const config = await resolveAiConfig(body as Parameters<typeof resolveAiConfig>[0]);
    if (!config) {
      return jsonError("AI 功能未配置", 400);
    }

    // 尝试一次最小化 API 调用以验证连通性
    // 不设置 maxOutputTokens：部分供应商的推理模型（如 GLM 5.x）不接受过低的 token 限制
    const model = createLanguageModel(config);

    await generateText({
      model,
      prompt: "Reply with OK",
    });

    logger.info("AI 连通性检查通过");
    return jsonOk({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }

    logger.error("AI 连通性检查失败", error);
    return jsonError("AI 服务不可用，请检查网络连接", 500);
  }
}
