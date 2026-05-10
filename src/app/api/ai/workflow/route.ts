/**
 * AI 工作流推荐 API
 * @description 根据用户的自然语言需求，基于导航站中所有网站卡片的信息（基本信息、推荐上下文、关联网站），
 *   推荐一个有顺序的工作流，串联完成用户需求所需的网站。
 *   与 /api/ai/recommend 的区别：本接口关注「如何一步步完成目标」而非「哪些网站相关」，
 *   输出是有序的工作流步骤，每个步骤对应一个网站并说明其在该流程中的作用。
 */

import { NextRequest } from "next/server";
import { getSession } from "@/lib/base/auth";
import { getPaginatedCards } from "@/lib/services";
import { ADMIN_USER_ID } from "@/lib/base/types";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { generateText } from "ai";
import { resolveAiConfig } from "@/lib/utils/ai-config";
import { createLanguageModel } from "@/lib/utils/ai-provider-factory";
import { extractAiJson } from "@/lib/utils/ai-text";

const logger = createLogger("API:AI:Workflow");

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { query?: string; _draftAiConfig?: { aiApiKey?: string; aiBaseUrl?: string; aiModel?: string } };
    const config = await resolveAiConfig(body);
    if (!config) {
      return jsonError("AI 功能未配置", 400);
    }

    const query = body.query?.trim();
    if (!query) {
      return jsonError("请描述您的需求");
    }

    // 获取所有可见站点（基于用户身份）
    const session = await getSession();
    const ownerId = session?.isAuthenticated ? session.userId : ADMIN_USER_ID;
    const allSitesResult = await getPaginatedCards({
      ownerId,
      scope: "all",
      query: null,
      cursor: null,
    });

    if (allSitesResult.items.length === 0) {
      return jsonOk({ steps: [], reasoning: "" });
    }

    // 构建包含完整信息的站点列表（基本信息 + 推荐上下文 + 关联网站 + 备注待办）
    const sitesForAI = allSitesResult.items.slice(0, 200).map((site) => ({
      id: site.id,
      name: site.name,
      siteUrl: site.siteUrl,
      siteDescription: site.siteDescription ?? "",
      tags: site.tags.map((t) => t.name),
      siteRecommendContext: site.siteRecommendContext ?? "",
      siteRelatedSites: site.siteRelatedSites
        .filter((r) => r.enabled)
        .map((r) => r.cardName)
        .slice(0, 10),
      // 仅在 AI 可读开关开启时传递备注/待办
      siteNotes: site.siteNotesAiEnabled && site.siteNotes ? site.siteNotes : "",
      uncompletedTodos: site.siteTodosAiEnabled ? site.siteTodos.filter((t) => !t.completed).map((t) => t.text) : [],
    }));

    logger.info("开始 AI 工作流推荐", { query, siteCount: sitesForAI.length });

    const model = createLanguageModel(config);

    // 构建站点列表文本
    const siteLines = sitesForAI.map((s) => {
      const parts = [`ID: ${s.id} | 名称: ${s.name} | 描述: ${s.siteDescription} | 标签: ${s.tags.join(", ")}`];
      if (s.siteRecommendContext) parts.push(`推荐场景: ${s.siteRecommendContext}`);
      if (s.siteRelatedSites.length) parts.push(`关联网站: ${s.siteRelatedSites.join(", ")}`);
      if (s.siteNotes) parts.push(`备注: ${s.siteNotes}`);
      if (s.uncompletedTodos.length) parts.push(`待办: ${s.uncompletedTodos.join("; ")}`);
      return parts.join(" | ");
    }).join("\n");

    const prompt = `你是一个智能工作流规划助手。用户会描述自己想要完成的目标，你需要从导航站收录的网站中，规划出一个有序的工作流——按步骤串联完成该目标所需的网站。

核心原则：
1. 你规划的不是「哪些网站相关」，而是「如何一步步完成目标」
2. 每个步骤应该是一个明确的行动，对应一个最合适的网站
3. 步骤之间应该有逻辑顺序，形成完整的工作流
4. 优先考虑互补性：哪些网站搭配使用能形成完整的工作流或使用场景
5. 充分利用每个网站的推荐场景和关联网站信息来理解其实际用途

用户需求：${query}

以下是导航站收录的所有网站：
${siteLines}

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字，只返回 JSON）：
{
  "reasoning": "简要说明你的工作流规划思路（80字以内）",
  "steps": [
    {
      "step": 1,
      "siteId": "网站ID",
      "action": "这一步要做什么（15字以内）",
      "reason": "为什么选择这个网站完成这一步（30字以内）"
    }
  ]
}

要求：
1. 最多规划 8 个步骤，每个步骤对应一个不同的网站
2. 步骤按执行顺序排列（step 从 1 开始递增）
3. 每个步骤的 action 应该清晰描述用户在这一步要做什么
4. 只推荐真正对完成用户目标有帮助的网站，宁缺毋滥
5. 如果没有任何网站能帮助完成用户目标，返回空数组
6. 只返回 JSON，不要有其他内容`;

    const result = await generateText({ model, prompt });

    const parsed = extractAiJson<{
      reasoning?: string;
      steps?: Array<{ step: number; siteId: string; action: string; reason: string }>;
    }>(result.text);

    const steps = Array.isArray(parsed.steps) ? parsed.steps : [];

    // 根据 AI 返回结果查找完整站点数据，保持 AI 返回的步骤顺序
    const siteMap = new Map(allSitesResult.items.map((s) => [s.id, s]));
    const workflowSteps = steps
      .filter((r) => siteMap.has(r.siteId))
      .map((r) => ({
        site: siteMap.get(r.siteId)!,
        action: r.action,
        reason: r.reason,
      }));

    logger.info("AI 工作流推荐完成", { query, stepCount: workflowSteps.length });

    return jsonOk({
      steps: workflowSteps,
      reasoning: parsed.reasoning ?? "",
    });
  } catch (error) {
    logger.error("AI 工作流推荐失败", error);
    return jsonError("AI 服务不可用，请稍后重试", 500);
  }
}
