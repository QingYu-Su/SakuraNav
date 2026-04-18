/**
 * AI 推荐 & 站内搜索逻辑 Hook
 * @description 从 useSearchBar 中提取的 AI 智能推荐和站内搜索相关状态与逻辑。
 */

import { useEffect, useRef, useState } from "react";
import { type Site } from "@/lib/base/types";
import { postJson, requestJson } from "@/lib/base/api";

/* ---------- Hook 选项 ---------- */

export interface UseAiRecommendOptions {
  /**
   * 搜索栏是否处于激活状态。
   * 失活时自动重置所有 AI / 站内搜索状态。
   * @default true
   */
  active?: boolean;
  /** 当前搜索栏输入文本，用于 activateLocalSearch 捕获查询 */
  query: string;
}

/* ---------- Hook 返回值类型 ---------- */

export interface UseAiRecommendReturn {
  /* ---- 状态 ---- */
  localSearchActive: boolean;
  localSearchQuery: string;
  aiResults: Array<{ site: Site; reason: string }>;
  aiResultsBusy: boolean;
  aiReasoning: string;

  /* ---- Refs ---- */
  aiRequestIdRef: React.RefObject<number>;

  /* ---- 操作函数 ---- */
  /** 激活站内搜索（捕获当前 query） */
  activateLocalSearch: () => void;
  /** 关闭站内搜索（清除 localSearch / ai 状态） */
  closeLocalSearch: () => void;
  /** 触发 AI 智能推荐 */
  triggerAiRecommend: () => void;
  /** 关闭 AI 推荐面板（丢弃进行中的请求） */
  closeAiPanel: () => void;
}

/* ---------- Hook 实现 ---------- */

export function useAiRecommend(options: UseAiRecommendOptions): UseAiRecommendReturn {
  const active = options?.active ?? true;
  const query = options.query;

  /* ---- 状态 ---- */

  const [localSearchActive, setLocalSearchActive] = useState(false);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [aiResults, setAiResults] = useState<Array<{ site: Site; reason: string }>>([]);
  const [aiResultsBusy, setAiResultsBusy] = useState(false);
  const [aiReasoning, setAiReasoning] = useState("");

  /* ---- Refs ---- */

  const aiRequestIdRef = useRef(0);

  /* ---- 失活时重置 ---- */

  useEffect(() => {
    if (!active) {
      ++aiRequestIdRef.current;
      // 使用 setTimeout 将 setState 移出 effect 同步执行路径，避免 cascading render
      setTimeout(() => {
        setLocalSearchActive(false);
        setLocalSearchQuery("");
        setAiResults([]);
        setAiReasoning("");
        setAiResultsBusy(false);
      }, 0);
    }
  }, [active]);

  /* ---- 操作函数 ---- */

  function activateLocalSearch() {
    if (!query.trim()) return;
    setLocalSearchActive(true);
    setLocalSearchQuery(query.trim());
    setAiResults([]);
    setAiReasoning("");
  }

  function closeLocalSearch() {
    ++aiRequestIdRef.current;
    setLocalSearchActive(false);
    setLocalSearchQuery("");
    setAiResults([]);
    setAiReasoning("");
    setAiResultsBusy(false);
  }

  function triggerAiRecommend() {
    if (!localSearchQuery) return;
    const aiRequestId = ++aiRequestIdRef.current;
    setAiResults([]);
    setAiReasoning("");
    setAiResultsBusy(true);
    void requestJson<{
      items: Array<{ site: Site; reason: string }>;
      reasoning: string;
    }>("/api/ai/recommend", postJson({ query: localSearchQuery }))
      .then((data) => {
        if (aiRequestId !== aiRequestIdRef.current) return;
        setAiResults(data.items);
        setAiReasoning(data.reasoning);
      })
      .catch(() => {
        if (aiRequestId !== aiRequestIdRef.current) return;
        setAiResults([]);
        setAiReasoning("");
      })
      .finally(() => {
        if (aiRequestId === aiRequestIdRef.current) setAiResultsBusy(false);
      });
  }

  function closeAiPanel() {
    ++aiRequestIdRef.current;
    setAiResults([]);
    setAiReasoning("");
    setAiResultsBusy(false);
  }

  return {
    localSearchActive,
    localSearchQuery,
    aiResults,
    aiResultsBusy,
    aiReasoning,
    aiRequestIdRef,
    activateLocalSearch,
    closeLocalSearch,
    triggerAiRecommend,
    closeAiPanel,
  };
}
