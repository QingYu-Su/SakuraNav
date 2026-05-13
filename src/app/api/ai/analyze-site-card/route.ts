/**
* AI 网站卡片分析 API（统一入口）
* @description 通过 AI 分析网站卡片，支持两种范围：
*   scope: "basic" — 仅分析基本信息（标题、描述、标签）
*   scope: "full"  — 全部分析（基本信息 + 推荐上下文 + 关联卡片）
*
* 全部分析模式下，一次 AI 调用同时返回推荐上下文和关联卡片，无需分开请求。
*/

import { NextRequest } from "next/server";
import { requireUserSession, getEffectiveOwnerId } from "@/lib/base/auth";
import { getVisibleTags } from "@/lib/services";
import { getAllCardsForAdmin, getCardById } from "@/lib/services/card-repository";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { generateText } from "ai";
import { resolveAiConfig } from "@/lib/utils/ai-config";
import { createLanguageModel } from "@/lib/utils/ai-provider-factory";
import { extractAiJson } from "@/lib/utils/ai-text";

const logger = createLogger("API:AI:AnalyzeSiteCard");

type AnalysisScope = "basic" | "full";

export async function POST(request: NextRequest) {
  try {
    const session = await requireUserSession();

    const body = await request.json() as {
      url?: string;
      cardId?: string;
      scope?: string;
      _draftAiConfig?: { aiApiKey?: string; aiBaseUrl?: string; aiModel?: string };
    };
    const config = await resolveAiConfig(body);
    if (!config) {
      logger.warning("AI 分析功能未配置");
      return jsonError("AI 功能未配置", 400);
    }

    const url = body.url;
    if (!url || typeof url !== "string") {
      return jsonError("请提供有效的 URL");
    }

    const scope: AnalysisScope = body.scope === "full" ? "full" : "basic";

    const ownerId = getEffectiveOwnerId(session);

    // 获取已有标签列表
    const existingTags = await getVisibleTags(ownerId);
    const tagList = existingTags.map((t) => ({ id: t.id, name: t.name }));

    // 全部分析时，准备候选卡片列表
    let candidateCards: Array<{
      id: string;
      name: string;
      siteUrl: string;
      siteDescription: string;
      tags: string[];
    }> = [];

    let targetCard: Awaited<ReturnType<typeof getCardById>> | undefined = undefined;

    if (scope === "full") {
      targetCard = body.cardId ? await getCardById(body.cardId) : undefined;
      const allCards = (await getAllCardsForAdmin(ownerId)).filter(
        (s) => s.id !== body.cardId && s.cardType == null,
      );
      candidateCards = allCards.slice(0, 200).map((s) => ({
        id: s.id,
        name: s.name,
        siteUrl: s.siteUrl,
        siteDescription: s.siteDescription ?? "",
        tags: s.tags.map((t) => t.name),
      }));
    }

    logger.info("开始 AI 分析网站卡片", { url, scope });

    const model = createLanguageModel(config);
    const result = await generateText({ model, prompt: buildPrompt(url, tagList, scope, candidateCards, targetCard) });
    const parsed = extractAiJson<FullAnalysisResult>(result.text);

    // 基本信息字段
    const response: Record<string, unknown> = {
      title: parsed.title ?? "",
      description: parsed.description ?? "",
      matchedTags: Array.isArray(parsed.matchedTags) ? parsed.matchedTags : [],
      recommendedTags: Array.isArray(parsed.recommendedTags) ? parsed.recommendedTags : [],
    };

    // 全部分析时附加推荐上下文和关联卡片
    if (scope === "full") {
      response.siteRecommendContext = parsed.siteRecommendContext ?? "";
      const recs = Array.isArray(parsed.recommendations)
        ? parsed.recommendations.filter((r) => r.score > 0.7)
        : [];
      // 只保留候选列表中实际存在的 cardId
      const validIds = new Set(candidateCards.map((s) => s.id));
      response.recommendations = recs.filter((r) => validIds.has(r.cardId));
    }

    logger.info("AI 分析完成", {
      url,
      scope,
      title: parsed.title,
      hasContext: !!(parsed.siteRecommendContext),
      recCount: Array.isArray(parsed.recommendations) ? parsed.recommendations.length : 0,
    });

    return jsonOk(response);
  } catch (error) {
    logger.error("AI 分析失败", error);
    return jsonError("AI 服务不可用，请稍后重试", 500);
  }
}

// ──────────────────────────────────────
// 类型 & Prompt 构建
// ──────────────────────────────────────

type FullAnalysisResult = {
  title?: string;
  description?: string;
  matchedTags?: Array<{ id: string; score: number }>;
  recommendedTags?: Array<{ name: string; score: number }>;
  siteRecommendContext?: string;
  recommendations?: Array<{ cardId: string; reason: string; score: number }>;
};

function buildPrompt(
  url: string,
  tagList: Array<{ id: string; name: string }>,
  scope: AnalysisScope,
  candidateCards: Array<{ id: string; name: string; siteUrl: string; siteDescription: string; tags: string[] }>,
  targetCard?: Awaited<ReturnType<typeof getCardById>>,
): string {
  const tagSection = `已有的标签列表：\n${tagList.map((t) => `- ${t.name} (ID: ${t.id})`).join("\n")}`;

  if (scope === "basic") {
    return `你是一个网站信息分析助手。请分析以下网站 URL，并返回该网站的信息。

网站 URL: ${url}

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字，只返回 JSON）：
{
  "title": "网站标题",
  "description": "网站的一句话描述（50字以内）",
  "matchedTags": [{"id": "已有标签中匹配的标签ID", "score": 0.95}],
  "recommendedTags": [{"name": "推荐的新标签名称", "score": 0.8}]
}

${tagSection}

注意：
1. title 应该是网站的官方名称，简洁准确
2. description 应该是一句话概括网站用途
3. matchedTags 从已有标签中选择最匹配的，最多3个，score 范围 0-1 表示该标签与网站内容的关联度
4. recommendedTags 是你认为适合但还不存在的标签，最多3个，score 范围 0-1 表示关联度
5. 如果 matchedTags 中有 2 个以上 score ≥ 0.85 的高关联标签，说明已有标签已充分覆盖该网站的分类需求，此时 recommendedTags 应返回空数组
6. 只返回 JSON，不要有其他内容`;
  }

  // scope === "full"
  const contextHint = targetCard?.siteRecommendContext?.trim()
    ? `\n- 推荐上下文（用户提供，辅助参考）：${targetCard.siteRecommendContext}`
    : "";
  const cardName = targetCard?.name ?? "";

  const cardListSection = candidateCards.length > 0
    ? `\n以下是导航站中的其他网站列表：\n${candidateCards.map((s) => `ID: ${s.id} | 名称: ${s.name} | URL: ${s.siteUrl} | 描述: ${s.siteDescription} | 标签: ${s.tags.join(", ")}`).join("\n")}`
    : "\n（导航站中暂无其他网站）";

  return `你是一个综合分析助手。请分析以下网站 URL，同时完成三项任务：(A) 基本信息、(B) 推荐上下文、(C) 关联网站。

网站 URL: ${url}${cardName ? `\n网站名称：${cardName}` : ""}${contextHint}

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字，只返回 JSON）：
{
  "title": "网站标题",
  "description": "网站的一句话描述（50字以内）",
  "matchedTags": [{"id": "已有标签中匹配的标签ID", "score": 0.95}],
  "recommendedTags": [{"name": "推荐的新标签名称", "score": 0.8}],
  "siteRecommendContext": "推荐上下文（50-200字）",
  "recommendations": [
    {
      "cardId": "推荐的网站ID",
      "reason": "关联理由（20字以内）",
      "score": 0.9
    }
  ]
}

${tagSection}
${cardListSection}

要求：
1. title 应该是网站的官方名称，简洁准确
2. description 应该是一句话概括网站用途
3. matchedTags 从已有标签中选择最匹配的，最多3个，score 范围 0-1 表示该标签与网站内容的关联度
4. recommendedTags 是你认为适合但还不存在的标签，最多3个，score 范围 0-1 表示关联度
5. 如果 matchedTags 中有 2 个以上 score ≥ 0.85 的高关联标签，说明已有标签已充分覆盖该网站的分类需求，此时 recommendedTags 应返回空数组
6. siteRecommendContext 是对该网站自身的补充说明，聚焦于：典型使用场景、适合的用户群体、核心功能与用途。这是对 description 的延伸，不要提及与其他网站的关系
7. recommendations 最多推荐 10 个网站，按关联度从高到低排列，score 范围 0-1（>0.7 才推荐，宁缺毋滥，如果确实没有强关联的网站则返回空数组）
8. 关联判断的核心标准是「互补性与工作流搭配」：打开该网站的用户，下一步可能还需要打开哪些网站。功能互补、前后工作流衔接的权重最高；仅仅是同标签下的其他网站，除非确实存在使用场景上的搭配关系，否则不应关联
9. 只返回 JSON，不要有其他内容`;
}
