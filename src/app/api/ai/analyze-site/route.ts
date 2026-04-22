/**
 * AI 网站分析 API
 * @description 通过 AI 分析网站 URL，自动获取网站标题、描述、图标和推荐标签
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { serverConfig } from "@/lib/config/server-config";
import { getVisibleTags } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const logger = createLogger("API:AI:AnalyzeSite");

export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();

    const apiKey = serverConfig.aiApiKey;
    const baseUrl = serverConfig.aiBaseUrl;
    const model = serverConfig.aiModel;

    if (!apiKey || !baseUrl || !model) {
      logger.warning("AI 分析功能未配置");
      return jsonError("AI 分析功能未配置，请在 config.yml 中添加 model 配置项", 400);
    }

    const body = await request.json() as { url?: string };
    const url = body.url;

    if (!url || typeof url !== "string") {
      return jsonError("请提供有效的 URL");
    }

    // 获取已有标签列表
    const existingTags = getVisibleTags(session.userId);
    const tagList = existingTags.map((t) => ({ id: t.id, name: t.name }));

    logger.info("开始 AI 分析网站", { url });

    // normalize baseURL: 去掉末尾斜杠，去掉 /v1 后缀（@ai-sdk/openai 会自动拼接）
    let normalizedBase = baseUrl.replace(/\/+$/, "");
    if (normalizedBase.endsWith("/v1")) {
      normalizedBase = normalizedBase.slice(0, -3);
    }

    const openai = createOpenAI({
      apiKey,
      baseURL: normalizedBase,
    });

    const prompt = `你是一个网站信息分析助手。请分析以下网站 URL，并返回该网站的信息。

网站 URL: ${url}

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字，只返回 JSON）：
{
  "title": "网站标题",
  "description": "网站的一句话描述（50字以内）",
  "matchedTagIds": ["已有标签中匹配的标签ID，最多选3个"],
  "recommendedTags": ["推荐的新标签名称，最多3个，这些标签在已有标签中不存在"]
}

已有的标签列表：
${tagList.map((t) => `- ${t.name} (ID: ${t.id})`).join("\n")}

注意：
1. title 应该是网站的官方名称，简洁准确
2. description 应该是一句话概括网站用途
3. matchedTagIds 从已有标签中选择最匹配的，最多3个
4. recommendedTags 是你认为适合但还不存在的标签，最多3个
5. 只返回 JSON，不要有其他内容`;

    const result = await generateText({
      model: openai.chat(model),
      prompt,
      maxOutputTokens: 500,
    });

    const text = result.text.trim();
    // 尝试解析 AI 返回的 JSON（可能被 markdown 代码块包裹）
    let jsonStr = text;
    const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (mdMatch) {
      jsonStr = mdMatch[1]!.trim();
    }

    let parsed: {
      title?: string;
      description?: string;
      matchedTagIds?: string[];
      recommendedTags?: string[];
    };

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      logger.error("AI 返回内容解析失败", { text });
      return jsonError("AI 返回内容格式异常，请重试", 500);
    }

    logger.info("AI 分析完成", {
      url,
      title: parsed.title,
      matchedCount: parsed.matchedTagIds?.length ?? 0,
      recommendedCount: parsed.recommendedTags?.length ?? 0,
    });

    return jsonOk({
      title: parsed.title ?? "",
      description: parsed.description ?? "",
      matchedTagIds: Array.isArray(parsed.matchedTagIds) ? parsed.matchedTagIds : [],
      recommendedTags: Array.isArray(parsed.recommendedTags) ? parsed.recommendedTags : [],
    });
  } catch (error) {
    logger.error("AI 分析失败", error);
    return jsonError(
      error instanceof Error ? error.message : "AI 分析失败，请稍后重试",
      500,
    );
  }
}
