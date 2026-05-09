/**
 * AI 助手对话 API
 * @description 流式对话端点，注册读工具 + plan_operations 工具
 */

import { NextRequest } from "next/server";
import { streamText, type UIMessage, convertToModelMessages, stepCountIs } from "ai";
import { getSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { jsonError } from "@/lib/utils/utils";
import { resolveAiConfig } from "@/lib/utils/ai-config";
import { createLanguageModel } from "@/lib/utils/ai-provider-factory";
import { createReadTools } from "@/lib/ai/assistant-read-tools";
import { createPlanTool } from "@/lib/ai/assistant-plan-tool";
import { AI_ASSISTANT_SYSTEM_PROMPT } from "@/lib/ai/assistant-prompt";
import { createLogger } from "@/lib/base/logger";

const logger = createLogger("API:AI:Chat");

export async function POST(request: NextRequest) {
  try {
    // 1. 认证检查
    const session = await getSession();
    if (!session?.isAuthenticated) {
      return jsonError("请先登录", 401);
    }

    // 2. AI 配置解析
    const body = await request.json() as { messages?: UIMessage[] };
    const config = await resolveAiConfig();
    if (!config) {
      return jsonError("AI 功能未配置，请在设置中配置 AI 相关参数", 400);
    }

    const ownerId = getEffectiveOwnerId(session);
    const model = createLanguageModel(config);

    // 3. 构建工具集
    const readTools = createReadTools({ ownerId });
    const planTool = createPlanTool();

    // 4. 流式对话 — useChat 发送 UIMessage，需转换为 ModelMessage
    const result = streamText({
      model,
      system: AI_ASSISTANT_SYSTEM_PROMPT,
      messages: await convertToModelMessages(body.messages ?? []),
      tools: { ...readTools, ...planTool },
      stopWhen: stepCountIs(8),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    logger.error("AI 对话失败", error);
    return jsonError("AI 服务不可用，请稍后重试", 500);
  }
}
