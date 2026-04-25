/**
 * AI 智能推荐 API
 * @description 根据用户自然语言需求，从导航站收录的所有网站中推荐匹配度最高的网站
 */

import { NextRequest } from "next/server";
import { getSession } from "@/lib/base/auth";
import { getPaginatedSites } from "@/lib/services";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { resolveAiConfig } from "@/lib/utils/ai-config";

const logger = createLogger("API:AI:Recommend");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { query?: string; _draftAiConfig?: { aiApiKey?: string; aiBaseUrl?: string; aiModel?: string } };
    const config = await resolveAiConfig(body);
    if (!config) {
      return jsonError("AI 功能未配置", 400);
    }

    const query = body.query?.trim();

    if (!query) {
      return jsonError("请输入您的需求描述");
    }

    // 获取所有可见站点（基于用户身份）
    const session = await getSession();
    const ownerId = session?.isAuthenticated ? session.userId : ADMIN_USER_ID;
    const allSitesResult = getPaginatedSites({
      ownerId,
      scope: "all",
      query: null,
      cursor: null,
    });

    if (allSitesResult.items.length === 0) {
      return jsonOk({ items: [], reasoning: "" });
    }

    // 构建精简的站点列表发送给 AI（最多 200 个站点）
    const sitesForAI = allSitesResult.items.slice(0, 200).map((site) => ({
      id: site.id,
      name: site.name,
      description: site.description ?? "",
      tags: site.tags.map((t) => t.name),
    }));

    logger.info("开始 AI 推荐", { query, siteCount: sitesForAI.length });

    // normalize baseURL
    let normalizedBase = config.baseUrl.replace(/\/+$/, "");
    if (normalizedBase.endsWith("/v1")) {
      normalizedBase = normalizedBase.slice(0, -3);
    }

    const openai = createOpenAI({
      apiKey: config.apiKey,
      baseURL: normalizedBase,
    });

    const prompt = `你是一个智能导航助手。用户会描述自己的需求，你需要从以下网站列表中推荐最匹配的网站。

注意：推荐时不要只看字面匹配，要深入理解用户的真实意图，推理出哪些网站能满足用户的需求。即使用户的描述和网站的名称、标签、描述没有直接对上，只要你能推理出该网站可能对用户有帮助，就应该推荐。

用户需求：${query}

以下是导航站收录的所有网站：
${sitesForAI.map((s) => `ID: ${s.id} | 名称: ${s.name} | 描述: ${s.description} | 标签: ${s.tags.join(", ")}`).join("\n")}

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字，只返回 JSON）：
{
  "reasoning": "简要说明你的推荐思路（50字以内）",
  "recommendations": [
    {
      "siteId": "推荐的网站ID",
      "reason": "推荐理由（20字以内）"
    }
  ]
}

要求：
1. 最多推荐 6 个网站，按匹配度从高到低排列
2. 只推荐真正相关的网站，宁缺毋滥
3. 如果没有任何网站与用户需求相关，返回空数组
4. 只返回 JSON，不要有其他内容`;

    const result = await generateText({
      model: openai.chat(config.model),
      prompt,
      maxOutputTokens: 800,
    });

    const text = result.text.trim();
    let jsonStr = text;
    const mdMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (mdMatch) {
      jsonStr = mdMatch[1]!.trim();
    }

    let parsed: {
      reasoning?: string;
      recommendations?: Array<{ siteId: string; reason: string }>;
    };

    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      logger.error("AI 返回内容解析失败", { text });
      return jsonError("AI 服务不可用，请稍后重试", 500);
    }

    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [];

    // 根据推荐结果查找完整站点数据，保持 AI 返回的顺序
    const siteMap = new Map(allSitesResult.items.map((s) => [s.id, s]));
    const recommendedSites = recommendations
      .filter((r) => siteMap.has(r.siteId))
      .map((r) => ({
        site: siteMap.get(r.siteId)!,
        reason: r.reason,
      }));

    logger.info("AI 推荐完成", {
      query,
      recommendedCount: recommendedSites.length,
    });

    return jsonOk({
      items: recommendedSites,
      reasoning: parsed.reasoning ?? "",
    });
  } catch (error) {
    logger.error("AI 推荐失败", error);
    return jsonError("AI 服务不可用，请稍后重试", 500);
  }
}
