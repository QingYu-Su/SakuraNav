/**
 * 后台 AI 关联分析 API
 * @description 支持两种模式：
 *   1. 指定 siteId：分析单个网站（立即分析按钮 / 单站点重试）
 *   2. processAllPending=true：批量处理所有标记为 pending 的网站（退出编辑/刷新时触发）
 *
 * 重试策略（单站点 & 批处理轮次共享同一套递增间隔）：
 *   1分钟 → 10分钟 → 30分钟 → 1小时 → 5小时 → 10小时 → 24小时
 *   最多重试 7 次（共 8 次尝试），之后放弃
 *
 * 批量处理多轮机制：
 *   - 本轮失败的站点保留 pending 标记，成功的自动清除
 *   - 本轮全部处理完后，按重试间隔安排下一轮（仅处理仍为 pending 的站点）
 *   - 每分析一个站点后等待 1 分钟再处理下一个
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getAllSitesForAdmin, getSiteById } from "@/lib/services/site-repository";
import { applyAiRelationResults, getPendingAiAnalysisSiteIds, clearPendingAiAnalysis } from "@/lib/services/site-relation-repository";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { generateText } from "ai";
import { resolveAiConfig } from "@/lib/utils/ai-config";
import { createLanguageModel } from "@/lib/utils/ai-provider-factory";
import { extractAiJson } from "@/lib/utils/ai-text";

const logger = createLogger("API:AI:BgAnalyze");

/** 最大重试次数 */
const MAX_RETRIES = 7;

/** 重试间隔（毫秒），索引对应重试轮次 */
const RETRY_DELAYS = [
  0,               // 初始请求，无延迟
  60_000,          // 第 1 次重试：1 分钟
  600_000,         // 第 2 次重试：10 分钟
  1_800_000,       // 第 3 次重试：30 分钟
  3_600_000,       // 第 4 次重试：1 小时
  18_000_000,      // 第 5 次重试：5 小时
  36_000_000,      // 第 6 次重试：10 小时
  86_400_000,      // 第 7 次重试：24 小时
];

/** 批量处理中每分析一个站点后的间隔（1 分钟） */
const BATCH_SITE_INTERVAL = 60_000;

export async function POST(request: NextRequest) {
  try {
    const _session = await requireUserSession();
    const body = await request.json() as {
      siteId?: string;
      retryCount?: number;
      processAllPending?: boolean;
      /** 批量处理当前轮次（内部使用，首次调用无需传） */
      round?: number;
    };

    // 模式 1：批量处理所有 pending 网站
    if (body.processAllPending) {
      return await handleProcessAllPending(request, body.round ?? 0);
    }

    // 模式 2：分析指定网站
    const siteId = body.siteId;
    const retryCount = body.retryCount ?? 0;
    if (!siteId) {
      return jsonError("请提供网站 ID");
    }

    return await handleAnalyzeSingleSite(request, siteId, retryCount);
  } catch (error) {
    logger.error("后台 AI 关联分析异常", { error });
    return jsonError(error instanceof Error ? error.message : "分析失败", 500);
  }
}

/**
 * 批量处理所有 pending 网站（多轮机制）
 * - 每轮按顺序逐个分析，间隔 BATCH_SITE_INTERVAL
 * - 失败的站点保留 pending 标记，成功的自动清除
 * - 本轮结束后，若有失败站点且未超出最大轮次，按 RETRY_DELAYS 间隔安排下一轮
 */
async function handleProcessAllPending(request: NextRequest, round: number): Promise<Response> {
  const pendingIds = getPendingAiAnalysisSiteIds();

  if (pendingIds.length === 0) {
    return jsonOk({ ok: true, processedCount: 0, round });
  }

  logger.info("开始批量处理 pending AI 分析", { count: pendingIds.length, round });

  const config = await resolveAiConfig({});
  if (!config) {
    logger.info("AI 未配置，清除所有 pending 标记");
    for (const id of pendingIds) clearPendingAiAnalysis(id);
    return jsonOk({ ok: true, processedCount: 0, skipped: true, round });
  }

  let processedCount = 0;
  const failedIds: string[] = [];

  for (let i = 0; i < pendingIds.length; i++) {
    const siteId = pendingIds[i];
    try {
      await analyzeSite(request, siteId, config);
      processedCount++;
    } catch (error) {
      logger.error("批量处理中单个站点分析失败", { siteId, round, error });
      // 不清除 pending 标记，让失败站点留在下一轮重试
      failedIds.push(siteId);
    }
    // 每分析一个站点后等待 1 分钟再处理下一个（最后一个不等）
    if (i < pendingIds.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_SITE_INTERVAL));
    }
  }

  logger.info("本轮批量 AI 分析完成", { processedCount, failedCount: failedIds.length, round });

  // 有失败站点且未超出最大重试轮次 → 安排下一轮
  if (failedIds.length > 0 && round < MAX_RETRIES) {
    const delay = RETRY_DELAYS[round + 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
    const origin = request.nextUrl.origin;
    const url = `${origin}/api/ai/background-analyze-relations`;
    logger.info("计划下一轮批量 AI 分析", { round: round + 1, delayMs: delay, failedCount: failedIds.length });

    setTimeout(() => {
      void fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ processAllPending: true, round: round + 1 }),
      }).catch(() => { /* 静默忽略 */ });
    }, delay);
  } else if (failedIds.length > 0) {
    // 已达最大重试轮次，清除剩余失败站点的 pending 标记
    logger.warning("批量 AI 分析已达最大重试轮次，放弃剩余失败站点", { failedIds, round });
    for (const id of failedIds) {
      clearPendingAiAnalysis(id);
    }
  }

  return jsonOk({ ok: true, processedCount, failedCount: failedIds.length, round });
}

/** 分析单个站点（含重试逻辑，使用与批处理相同的递增间隔） */
async function handleAnalyzeSingleSite(
  request: NextRequest,
  siteId: string,
  retryCount: number,
): Promise<Response> {
  const config = await resolveAiConfig({});
  if (!config) {
    logger.info("AI 未配置，跳过分析", { siteId });
    clearPendingAiAnalysis(siteId);
    return jsonOk({ ok: true, skipped: true });
  }

  try {
    await analyzeSite(request, siteId, config);
    return jsonOk({ ok: true, recommendedCount: 0 });
  } catch (error) {
    logger.error("后台 AI 关联分析失败", { error, siteId, retryCount });

    // 重试逻辑（与批处理共享 RETRY_DELAYS 间隔）
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAYS[retryCount + 1] ?? RETRY_DELAYS[RETRY_DELAYS.length - 1];
      const origin = request.nextUrl.origin;
      const url = `${origin}/api/ai/background-analyze-relations`;
      logger.info("计划重试后台 AI 关联分析", { siteId, retryCount: retryCount + 1, delayMs: delay });

      setTimeout(() => {
        void fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ siteId, retryCount: retryCount + 1 }),
        }).catch(() => { /* 静默忽略 */ });
      }, delay);
    } else {
      logger.warning("后台 AI 关联分析已达最大重试次数，放弃", { siteId, retryCount });
      clearPendingAiAnalysis(siteId);
    }

    return jsonOk({ ok: true, retried: true });
  }
}

/** 分析单个网站并写入结果 */
async function analyzeSite(
  request: NextRequest,
  siteId: string,
  config: NonNullable<Awaited<ReturnType<typeof resolveAiConfig>>>,
): Promise<void> {
  const site = getSiteById(siteId);
  if (!site) {
    logger.info("网站不存在，跳过分析", { siteId });
    clearPendingAiAnalysis(siteId);
    return;
  }

  // 检查是否仍然开启了智能关联
  if (!site.aiRelationEnabled) {
    clearPendingAiAnalysis(siteId);
    return;
  }

  // 获取所有同用户的普通网站（排除自身和社交卡片，且排除不允许被关联的）
  const allSites = getAllSitesForAdmin().filter(
    (s) => s.id !== siteId && s.cardType == null && s.allowLinkedByOthers !== false
  );

  if (allSites.length === 0) {
    logger.info("无候选网站，跳过分析", { siteId });
    clearPendingAiAnalysis(siteId);
    return;
  }

  const sitesForAI = allSites.slice(0, 200).map((s) => ({
    id: s.id,
    name: s.name,
    url: s.url,
    description: s.description ?? "",
    tags: s.tags.map((t) => t.name),
  }));

  logger.info("开始 AI 关联分析", { siteId, siteName: site.name, candidateCount: sitesForAI.length });

  const model = createLanguageModel(config);

  const contextHint = site.recommendContext?.trim()
    ? `\n\n该网站的推荐上下文（用户提供，用于辅助分析）：${site.recommendContext}`
    : "";

  const prompt = `你是一个智能关联分析助手。你需要分析一个网站卡片与导航站中其他网站卡片的关联程度，找出最相关的网站。

当前网站信息：
- 名称：${site.name}
- URL：${site.url}
- 描述：${site.description ?? "无"}${contextHint}
- 标签：${site.tags.map((t) => t.name).join(", ") || "无"}

以下是导航站中的其他网站列表：
${sitesForAI.map((s) => `ID: ${s.id} | 名称: ${s.name} | URL: ${s.url} | 描述: ${s.description} | 标签: ${s.tags.join(", ")}`).join("\n")}

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

  // 直接写入数据库（双向关联 + 保留手动/锁定的关联 + 清除 pending 标记）
  applyAiRelationResults(siteId, recommendations);

  logger.info("AI 关联分析完成", { siteId, recommendedCount: recommendations.length });
}
