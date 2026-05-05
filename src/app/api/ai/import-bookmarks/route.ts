/**
 * AI 书签分析 API
 * @description 使用 AI 分析外部文件内容，提取有效网站信息
 */

import { requireUserSession } from "@/lib/base/auth";
import { getVisibleTags } from "@/lib/services";
import { jsonError, jsonOk } from "@/lib/utils/utils";
import { createLogger } from "@/lib/base/logger";
import { generateText } from "ai";
import type { BookmarkAnalysisResult } from "@/lib/base/types";
import { resolveAiConfig } from "@/lib/utils/ai-config";
import { createLanguageModel } from "@/lib/utils/ai-provider-factory";
import { extractAiJson } from "@/lib/utils/ai-text";

const logger = createLogger("API:AI:ImportBookmarks");

export async function POST(request: Request) {
  try {
    const session = await requireUserSession();

    const body = (await request.json()) as { content?: string; filename?: string; _draftAiConfig?: { aiApiKey?: string; aiBaseUrl?: string; aiModel?: string } };
    const config = await resolveAiConfig(body);
    if (!config) {
      return jsonError("AI 功能未配置", 400);
    }

    const content = body.content?.trim();
    const filename = body.filename ?? "";

    if (!content) {
      return jsonError("文件内容为空");
    }

    // 获取已有标签用于匹配
    const existingTags = await getVisibleTags(session.userId);
    const tagList = existingTags.map((t) => ({ id: t.id, name: t.name }));

    logger.info("开始 AI 书签分析", {
      filename,
      contentLength: content.length,
      tagCount: tagList.length,
    });

    const model = createLanguageModel(config);

    const prompt = `你是一个书签分析助手。用户会提供一个书签导出文件的内容，你需要从中提取出所有有效的网站信息。

文件名：${filename}

文件内容（可能包含 HTML 书签、Markdown 链接、纯文本 URL 列表等格式）：
---
${content.slice(0, 30000)}
---

以下是导航站已有的标签列表：
${tagList.map((t) => `ID: ${t.id} | 名称: ${t.name}`).join("\n")}

请严格按照以下 JSON 格式返回结果（不要包含任何其他文字，只返回 JSON）：
{
  "items": [
    {
      "name": "网站名称",
      "url": "网站URL",
      "description": "网站描述（20字以内）",
      "matchedTagIds": ["匹配到的已有标签ID"],
      "recommendedTags": ["推荐创建的新标签名"]
    }
  ]
}

要求：
1. 提取所有有效的网站链接
2. 如果能从上下文推断出网站名称和描述，请填写
3. 尽可能匹配到已有的标签，通过标签的语义相似度进行匹配
4. 如果某些网站应该属于新标签，推荐新标签名
5. 跳过无效的 URL（如 javascript:、chrome:// 等内部链接）
6. 确保 URL 以 http:// 或 https:// 开头
7. 最多提取 100 个网站
8. 只返回 JSON，不要有其他内容`;

    const result = await generateText({
      model,
      prompt,
    });

    const parsed = extractAiJson<BookmarkAnalysisResult>(result.text);

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    logger.info("AI 书签分析完成", { itemCount: items.length });

    return jsonOk<BookmarkAnalysisResult>({ items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return jsonError("未授权", 401);
    }

    logger.error("AI 书签分析失败", error);
    return jsonError("AI 服务不可用，请稍后重试", 500);
  }
}
