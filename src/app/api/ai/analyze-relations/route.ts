/**
 * AI 关联分析 API
 * @description 分析指定网站与站内其他网站的关联关系，返回推荐的关联网站列表
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getAllSitesForAdmin } from "@/lib/services/site-repository";
import { getSiteById } from "@/lib/services/site-repository";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { generateText } from "ai";
import { resolveAiConfig } from "@/lib/utils/ai-config";
import { createLanguageModel } from "@/lib/utils/ai-provider-factory";
import { extractAiJson } from "@/lib/utils/ai-text";

const logger = createLogger("API:AI:AnalyzeRelations");

export async function POST(request: NextRequest) {
  try {
    const _session = await requireUserSession();
    const body = await request.json() as { siteId?: string; _draftAiConfig?: { aiApiKey?: string; aiBaseUrl?: string; aiModel?: string } };
    const config = await resolveAiConfig(body);
    if (!config) {
      return jsonError("AI 功能未配置", 400);
    }

    const siteId = body.siteId;
    if (!siteId) {
      return jsonError("请提供网站 ID");
    }

    const site = getSiteById(siteId);
    if (!site) {
      return jsonError("网站不存在");
    }

    // 获取所有同用户的普通网站（排除自身和社交卡片）
    const allSites = getAllSitesForAdmin().filter(
      (s) => s.id !== siteId && s.cardType == null
    );

    if (allSites.length === 0) {
      return jsonOk({ recommendations: [] });
    }

    // 构建精简的站点列表发送给 AI（最多 200 个）
    const sitesForAI = allSites.slice(0, 200).map((s) => ({
      id: s.id,
      name: s.name,
      url: s.url,
      description: s.description ?? "",
      tags: s.tags.map((t) => t.name),
      // 仅在 AI 可读开关开启时传递备注/待办
      notes: s.notesAiEnabled && s.notes ? s.notes : "",
      uncompletedTodos: s.todosAiEnabled ? s.todos.filter((t) => !t.completed).map((t) => t.text) : [],
    }));

    logger.info("开始 AI 关联分析", { siteId, siteName: site.name, candidateCount: sitesForAI.length });

    const model = createLanguageModel(config);

    const contextHint = site.recommendContext?.trim()
      ? `\n\n该网站的推荐上下文（用户提供，用于辅助分析）：${site.recommendContext}`
      : "";

    // 当前网站的备注/待办上下文
    const notesHint = site.notesAiEnabled && site.notes?.trim()
      ? `\n- 备注：${site.notes.trim()}`
      : "";
    const todosHint = site.todosAiEnabled && site.todos.filter((t) => !t.completed).length
      ? `\n- 待办：${site.todos.filter((t) => !t.completed).map((t) => t.text).join("; ")}`
      : "";

    const prompt = `你是一个智能关联分析助手。你需要分析一个网站卡片与导航站中其他网站卡片的关联程度，找出最相关的网站。

当前网站信息：
- 名称：${site.name}
- URL：${site.url}
- 描述：${site.description ?? "无"}${contextHint}${notesHint}${todosHint}
- 标签：${site.tags.map((t) => t.name).join(", ") || "无"}

以下是导航站中的其他网站列表：
${sitesForAI.map((s) => {
  const base = `ID: ${s.id} | 名称: ${s.name} | URL: ${s.url} | 描述: ${s.description} | 标签: ${s.tags.join(", ")}`;
  const extras: string[] = [];
  if (s.notes) extras.push(`备注: ${s.notes}`);
  if (s.uncompletedTodos.length) extras.push(`待办: ${s.uncompletedTodos.join("; ")}`);
  return extras.length ? `${base} | ${extras.join(" | ")}` : base;
}).join("\n")}

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字，只返回 JSON）：
{
  "recommendations": [
    {
      "siteId": "推荐的网站ID",
      "reason": "关联理由（20字以内）",
      "score": 0.9
    }
  ]
}

要求：
1. 最多推荐 10 个网站，按关联度从高到低排列
2. score 范围 0-1，表示关联程度（>0.5 才推荐）
3. 关联判断应考虑：功能相似性、领域相关性、互补性、标签重叠等
4. 宁缺毋滥，没有关联的网站不要推荐
5. 只返回 JSON，不要有其他内容`;

    const result = await generateText({ model, prompt });

    const parsed = extractAiJson<{
      recommendations?: Array<{ siteId: string; reason: string; score: number }>;
    }>(result.text);

    const recommendations = Array.isArray(parsed.recommendations)
      ? parsed.recommendations.filter((r) => r.score > 0.5)
      : [];

    logger.info("AI 关联分析完成", {
      siteId,
      recommendedCount: recommendations.length,
    });

    return jsonOk({ recommendations });
  } catch (error) {
    logger.error("AI 关联分析失败", error);
    return jsonError("AI 服务不可用，请稍后重试", 500);
  }
}
