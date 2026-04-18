/**
 * 搜索建议 API 路由
 * @description 提供搜索联想功能，支持本地网站/标签搜索和Google/百度搜索建议
 */

import { NextRequest } from "next/server";
import { getSession } from "@/lib/base/auth";
import { getSearchSuggestions } from "@/lib/services";
import { SearchEngine } from "@/lib/base/types";
import { jsonError, jsonOk } from "@/lib/utils/utils";

export const runtime = "nodejs";

type SuggestionItem = {
  value: string;
  kind: "query" | "site" | "tag";
};

function normalizeGoogleSuggestions(payload: unknown): SuggestionItem[] {
  if (!Array.isArray(payload)) return [];
  const values = Array.isArray(payload[1]) ? payload[1] : [];
  return values
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .slice(0, 8)
    .map((value) => ({ value, kind: "query" as const }));
}

function normalizeBaiduSuggestions(payload: unknown): SuggestionItem[] {
  if (!payload || typeof payload !== "object") return [];
  const raw = (payload as { g?: Array<{ q?: string }> }).g;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => item?.q?.trim() ?? "")
    .filter(Boolean)
    .slice(0, 8)
    .map((value) => ({ value, kind: "query" as const }));
}

async function fetchGoogleSuggestions(query: string) {
  const response = await fetch(
    `https://suggestqueries.google.com/complete/search?client=firefox&hl=zh-CN&q=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0 SakuraNav",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("获取 Google 联想失败");
  }

  return normalizeGoogleSuggestions(await response.json().catch(() => null));
}

async function fetchBaiduSuggestions(query: string) {
  const response = await fetch(
    `https://www.baidu.com/sugrec?prod=pc&wd=${encodeURIComponent(query)}`,
    {
      headers: {
        Accept: "application/json,text/plain,*/*",
        "User-Agent": "Mozilla/5.0 SakuraNav",
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error("获取 Baidu 联想失败");
  }

  return normalizeBaiduSuggestions(await response.json().catch(() => null));
}

/**
 * 构建后备搜索建议
 * @param query - 搜索关键词
 * @param localItems - 本地搜索建议
 * @returns 组合后的搜索建议数组
 */
function buildFallbackQuerySuggestions(query: string, localItems: SuggestionItem[]) {
  const candidates = [
    query,
    `${query} 官网`,
    `${query} 教程`,
    `${query} 下载`,
    `${query} github`,
    ...localItems.map((item) => item.value),
  ];

  const seen = new Set<string>();
  return candidates
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .slice(0, 8)
    .map((value) => ({ value, kind: "query" as const }));
}

/**
 * 获取搜索建议
 * @description 根据搜索引擎类型返回本地或远程搜索建议
 * @param request - 包含搜索关键词和引擎类型的请求对象
 * @returns 搜索建议列表
 */
export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    const engine = (request.nextUrl.searchParams.get("engine")?.trim() ?? "google") as SearchEngine;
    const session = await getSession();
    const localItems = getSearchSuggestions({
      query,
      isAuthenticated: Boolean(session?.isAuthenticated),
      limit: 8,
    }).map((item) => ({ ...item, kind: item.kind as "site" | "tag" }));

    if (!query) {
      return jsonOk({ items: [] satisfies SuggestionItem[] });
    }

    if (!["google", "baidu", "local"].includes(engine)) {
      return jsonError("不支持的搜索引擎");
    }

    if (engine === "local") {
      return jsonOk({ items: localItems });
    }

    let items: SuggestionItem[] = [];

    if (engine === "google") {
      try {
        items = await fetchGoogleSuggestions(query);
      } catch {
        items = buildFallbackQuerySuggestions(query, localItems);
      }
    } else {
      items = await fetchBaiduSuggestions(query);
    }

    return jsonOk({ items });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "获取搜索联想失败", 500);
  }
}
