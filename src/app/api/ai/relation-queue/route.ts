/**
 * AI 关联分析队列处理 API
 * @description 批量处理队列中的关联分析任务
 */

import { NextRequest } from "next/server";
import { requireUserSession } from "@/lib/base/auth";
import { getPendingQueueItems, updateQueueItemStatus, cleanupStaleQueueItems, getQueueStats, saveRelatedSites, addReverseRelation } from "@/lib/services";
import { getSiteById, getAllSitesForAdmin } from "@/lib/services/site-repository";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { generateText } from "ai";
import { resolveAiConfig } from "@/lib/utils/ai-config";
import { createLanguageModel } from "@/lib/utils/ai-provider-factory";
import { extractAiJson } from "@/lib/utils/ai-text";

const logger = createLogger("API:AI:RelationQueue");

/** 每次最多处理 5 个队列项 */
const BATCH_SIZE = 5;

export async function POST(request: NextRequest) {
  try {
    await requireUserSession();

    // 清理过期的 processing 状态项
    cleanupStaleQueueItems();

    const pendingItems = getPendingQueueItems(BATCH_SIZE);
    if (pendingItems.length === 0) {
      return jsonOk({ processed: 0, message: "队列为空" });
    }

    // 检查 AI 配置
    const body = await request.json() as { _draftAiConfig?: { aiApiKey?: string; aiBaseUrl?: string; aiModel?: string } } | null;
    const config = await resolveAiConfig(body ?? {});
    if (!config) {
      return jsonError("AI 功能未配置", 400);
    }

    const model = createLanguageModel(config);
    let processed = 0;
    let failed = 0;

    for (const item of pendingItems) {
      // 标记为处理中
      updateQueueItemStatus(item.id, "processing");

      try {
        const site = getSiteById(item.site_id);
        if (!site || !site.aiRelationEnabled) {
          updateQueueItemStatus(item.id, "done");
          continue;
        }

        // 获取候选网站
        const allSites = getAllSitesForAdmin().filter(
          (s) => s.id !== site.id && s.cardType == null
        );

        if (allSites.length === 0) {
          updateQueueItemStatus(item.id, "done");
          continue;
        }

        const sitesForAI = allSites.slice(0, 200).map((s) => ({
          id: s.id,
          name: s.name,
          url: s.url,
          description: s.description ?? "",
          tags: s.tags.map((t) => t.name),
        }));

        const contextHint = site.recommendContext?.trim()
          ? `\n\n该网站的推荐上下文：${site.recommendContext}`
          : "";

        const prompt = `你是一个智能关联分析助手。分析网站与导航站中其他网站的关联程度。

当前网站：名称：${site.name} | URL：${site.url} | 描述：${site.description ?? "无"}${contextHint}
标签：${site.tags.map((t) => t.name).join(", ") || "无"}

其他网站列表：
${sitesForAI.map((s) => `ID: ${s.id} | 名称: ${s.name} | 描述: ${s.description} | 标签: ${s.tags.join(",")}`).join("\n")}

请返回 JSON：
{"recommendations": [{"siteId": "ID", "score": 0.9}]}

要求：最多10个，score>0.5，只返回JSON。`;

        const result = await generateText({ model, prompt });
        const parsed = extractAiJson<{
          recommendations?: Array<{ siteId: string; score: number }>;
        }>(result.text);

        const recommendations = (Array.isArray(parsed.recommendations)
          ? parsed.recommendations.filter((r) => r.score > 0.5)
          : []);

        // 获取当前已锁定的关联
        const existingLocked = site.relatedSites.filter((rs) => rs.locked);

        // AI 推荐的关联（排除已锁定的）
        const newRelations = recommendations
          .filter((r) => !existingLocked.some((l) => l.siteId === r.siteId))
          .map((r, i) => ({
            siteId: r.siteId,
            enabled: true,
            locked: false,
            sortOrder: existingLocked.length + i,
          }));

        // 合并：锁定的保持 + 新的 AI 推荐
        const merged = [
          ...existingLocked.map((l) => ({
            siteId: l.siteId,
            enabled: l.enabled,
            locked: true,
            sortOrder: l.sortOrder,
          })),
          ...newRelations,
        ];

        saveRelatedSites(site.id, merged);

        // 反向传播：将当前网站添加到关联目标网站的关联列表中
        for (const rec of recommendations) {
          try {
            addReverseRelation(site.id, rec.siteId);
          } catch {
            /* 反向传播失败不影响主流程 */
          }
        }

        updateQueueItemStatus(item.id, "done");
        processed++;
        logger.info("队列项处理成功", { siteId: site.id, recommendedCount: recommendations.length });
      } catch (error) {
        logger.error("队列项处理失败", error);
        updateQueueItemStatus(item.id, "pending"); // 重置为待处理，下次重试
        failed++;
      }
    }

    const stats = getQueueStats();
    return jsonOk({ processed, failed, remaining: stats.pending });
  } catch (error) {
    logger.error("队列处理失败", error);
    return jsonError("队列处理失败", 500);
  }
}

/** 获取队列状态 */
export async function GET() {
  try {
    await requireUserSession();
    const stats = getQueueStats();
    return jsonOk(stats);
  } catch {
    return jsonError("未授权", 401);
  }
}
