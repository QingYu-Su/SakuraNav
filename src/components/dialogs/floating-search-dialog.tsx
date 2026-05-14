/**
 * 浮动搜索对话框组件
 * @description 提供全局搜索功能，支持多搜索引擎切换、站内搜索、搜索建议等
 */

"use client";

import {
  ChevronDown,
  ChevronUp,
  CircleAlert,
  LoaderCircle,
  Search,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { type PaginatedCards, type SearchEngineConfig, type Card, type ThemeMode } from "@/lib/base/types";
import { showSiteContextMenu } from "@/components/ui/site-context-menu";
import { cn, isMobileViewport } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
import { Tooltip } from "@/components/ui/tooltip";
import { useSearchBar } from "@/hooks/use-search-bar";
import {
  getDialogOverlayClass,
  getDialogPanelClass,
  getDialogCloseBtnClass,
  getSearchDropdownClass,
  getSearchDropdownActiveClass,
  getSearchDropdownInactiveClass,
  getSearchDropdownDismissClass,
  getSearchDropdownDividerClass,
  getSearchDropdownLoadingClass,
  getLocalSearchContainerClass,
  getLocalSearchCloseBtnClass,
  getLocalSearchAiHintClass,
  getLocalSearchAiPanelClass,
  getLocalSearchAiCardClass,
  getLocalSearchAiIconClass,
  getLocalSearchResultCardClass,
  getLocalSearchIconClass,
} from "../sakura-nav/style-helpers";

export function FloatingSearchDialog({
  open,
  activeTagId,
  activeTagName,
  onClose,
  engines,
  themeMode,
}: {
  open: boolean;
  activeTagId: string | null;
  activeTagName: string;
  onClose: () => void;
  engines?: SearchEngineConfig[];
  themeMode: ThemeMode;
}) {
  const {
    searchEngine,
    query,
    searchMenuOpen,
    searchSuggestions,
    searchSuggestionsOpen,
    searchSuggestionsBusy,
    activeSuggestionIndex,
    hoveredSuggestionIndex,
    suggestionInteractionMode,
    localSearchActive,
    localSearchQuery,
    aiResults,
    aiResultsBusy,
    aiReasoning,
    aiError,
    workflowSteps,
    workflowBusy,
    workflowReasoning,
    workflowError,
    searchFormRef,
    highlightedSuggestionIndex,
    engineMeta,
    engineList,
    setActiveSuggestionIndex,
    setHoveredSuggestionIndex,
    setSuggestionInteractionMode,
    handleQueryChange,
    handleSuggestionFocus,
    cycleSearchEngine,
    stepSearchEngine,
    selectEngine,
    submitSearch,
    applySuggestion,
    dismissSuggestions,
    clearInput,
    activateLocalSearch,
    closeLocalSearch,
    triggerAiRecommend,
    closeAiPanel,
    triggerAiWorkflow,
    closeWorkflowPanel,
  } = useSearchBar({ active: open, engines });

  /* ---- 悬浮搜索栏独立状态 ---- */
  const [localResults, setLocalResults] = useState<Card[]>([]);
  const [localResultsBusy, setLocalResultsBusy] = useState(false);
  const [resultsDismissed, setResultsDismissed] = useState(false);
  const localResultsRequestIdRef = useRef(0);

  /* ---- 派生 ---- */
  const showAiHint = localSearchActive && !!localSearchQuery && !aiResultsBusy && aiResults.length === 0 && !aiError && !workflowBusy && workflowSteps.length === 0 && !workflowError;
  const showAiPanel = localSearchActive && (aiResultsBusy || aiResults.length > 0 || !!aiError);
  const showWorkflowPanel = localSearchActive && (workflowBusy || workflowSteps.length > 0 || !!workflowError);

  /* ---- query 变化时重置 resultsDismissed ---- */
  useEffect(() => {
    setResultsDismissed(false);
  }, [localSearchQuery]);

  /* ---- 站内搜索结果获取（无延迟，直接请求） ---- */
  useEffect(() => {
    if (!open || !localSearchActive || !localSearchQuery) {
      setLocalResults([]);
      setLocalResultsBusy(false);
      return;
    }
    if (resultsDismissed) return;

    const requestId = ++localResultsRequestIdRef.current;
    setLocalResultsBusy(true);

    void (async () => {
      try {
        const params = new URLSearchParams();
        params.set("scope", activeTagId ? "tag" : "all");
        if (activeTagId) params.set("tagId", activeTagId);
        params.set("q", localSearchQuery);
        const data = await requestJson<PaginatedCards>(`/api/navigation/cards?${params.toString()}`);
        if (requestId !== localResultsRequestIdRef.current) return;
        setLocalResults(data.items.slice(0, 8));
      } catch {
        if (requestId !== localResultsRequestIdRef.current) return;
        setLocalResults([]);
      } finally {
        if (requestId === localResultsRequestIdRef.current) {
          setLocalResultsBusy(false);
        }
      }
    })();
  }, [activeTagId, localSearchActive, localSearchQuery, open, resultsDismissed]);

  /* ---- 全局键盘/点击事件 ---- */
  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!searchFormRef.current?.contains(event.target as Node)) {
        // 使用 hook 提供的关闭函数不行，因为那里没暴露 setSearchSuggestionsOpen 等
        // 直接用 closeSuggestionMenus... 但 hook 失活 effect 也处理了
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open, searchFormRef]);

  /* ---- 关闭站内搜索（中断进行中的请求 + 清理状态） ---- */
  function handleCloseLocalSearch() {
    ++localResultsRequestIdRef.current;
    setLocalResults([]);
    setLocalResultsBusy(false);
    closeLocalSearch();
  }

  /* ---- 中止搜索并清除结果（不关闭面板） ---- */
  function handleClearResults() {
    ++localResultsRequestIdRef.current;
    setLocalResults([]);
    setLocalResultsBusy(false);
    setResultsDismissed(true);
  }

  /* ---- 关闭 AI 推荐面板 ---- */
  function handleCloseAiPanel() {
    closeAiPanel();
  }

  /* ---- 关闭 AI 工作流面板 ---- */
  function handleCloseWorkflowPanel() {
    closeWorkflowPanel();
  }

  if (!open) return null;

  return (
    <div
      className={cn(getDialogOverlayClass(themeMode), "animate-drawer-fade fixed inset-0 z-[55] flex items-center justify-center p-4")}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className={cn(getDialogPanelClass(themeMode), "animate-panel-rise w-full max-w-[980px] rounded-[34px] border p-5 backdrop-blur-2xl sm:p-6")}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className={cn("text-xs uppercase tracking-[0.28em]", themeMode === "light" ? "text-slate-400" : "text-white/50")}>Quick Search</p>
            <h2 className="mt-1 text-2xl font-semibold">悬浮搜索</h2>
            <p className={cn("mt-2 text-sm", themeMode === "light" ? "text-slate-500" : "text-white/68")}>
              {localSearchActive
                ? `搜索范围：${activeTagId ? activeTagName : "全部卡片"}`
                : "在这里可以单独发起搜索。"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(getDialogCloseBtnClass(themeMode), "inline-flex h-11 w-11 items-center justify-center rounded-2xl border transition")}
            aria-label="关闭悬浮搜索"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          ref={searchFormRef}
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch();
          }}
          onKeyDown={(event) => {
            if (event.key === "Tab" && !event.altKey && !event.ctrlKey && !event.metaKey) {
              event.preventDefault();
              stepSearchEngine(event.shiftKey ? -1 : 1);
              return;
            }

            if (!searchSuggestionsOpen || !searchSuggestions.length) {
              return;
            }

            if (event.key === "ArrowDown") {
              event.preventDefault();
              const baseIndex =
                highlightedSuggestionIndex >= 0 ? highlightedSuggestionIndex : activeSuggestionIndex;
              setSuggestionInteractionMode("keyboard");
              setHoveredSuggestionIndex(-1);
              setActiveSuggestionIndex(
                baseIndex < 0 ? 0 : (baseIndex + 1) % searchSuggestions.length,
              );
              return;
            }

            if (event.key === "ArrowUp") {
              event.preventDefault();
              const baseIndex =
                highlightedSuggestionIndex >= 0 ? highlightedSuggestionIndex : activeSuggestionIndex;
              setSuggestionInteractionMode("keyboard");
              setHoveredSuggestionIndex(-1);
              setActiveSuggestionIndex(
                baseIndex <= 0 ? searchSuggestions.length - 1 : baseIndex - 1,
              );
              return;
            }

            if (event.key === "Enter" && highlightedSuggestionIndex >= 0) {
              event.preventDefault();
              const suggestion = searchSuggestions[highlightedSuggestionIndex];
              if (suggestion) {
                applySuggestion(suggestion.value);
              }
            }
          }}
          className={cn(
            "mx-auto flex w-full flex-col gap-3 rounded-[30px] border p-3 sm:flex-row sm:items-center",
            themeMode === "light" ? "border-slate-200/50 bg-white/80" : "border-white/20 bg-white/10",
          )}
        >
          {/* 第一行：搜索引擎选择器 */}
          <div className="relative self-center sm:self-auto">
            <button
              type="button"
              onClick={cycleSearchEngine}
              className="inline-flex min-w-[156px] items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-[opacity] hover:opacity-90 isolate"
              style={{ backgroundColor: engineMeta?.accent ?? "#5f86ff" }}
            >
              {engineMeta?.iconUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={engineMeta.iconUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/18 text-sm">
                  {(engineMeta?.name ?? "").charAt(0)}
                </span>
              )}
              {engineMeta?.name ?? "搜索"}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  searchMenuOpen ? "rotate-180" : "",
                )}
              />
            </button>
            {searchMenuOpen ? (
              <div className={cn(getSearchDropdownClass(themeMode), "absolute left-0 top-[calc(100%+10px)] z-20 w-full overflow-hidden rounded-3xl border p-2 text-left")}>
                {engineList.map((engine) => (
                  <button
                    key={engine.id}
                    type="button"
                    onClick={() => selectEngine(engine.id)}
                    className={cn(
                      "flex w-full items-center rounded-2xl px-3 py-3 text-sm transition",
                      searchEngine === engine.id
                        ? getSearchDropdownActiveClass(themeMode)
                        : getSearchDropdownInactiveClass(themeMode),
                    )}
                  >
                    <span className="flex items-center gap-3">
                      {engine.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={engine.iconUrl} alt="" className="h-8 w-8 rounded-full object-cover" />
                      ) : (
                        <span
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                          style={{ backgroundColor: engine.accent }}
                        >
                          {engine.name.charAt(0)}
                        </span>
                      )}
                      {engine.name}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {/* 第二行：搜索输入框 */}
          <div className={cn(
            "relative flex flex-1 items-center gap-3 rounded-2xl border px-4 py-3",
            themeMode === "light" ? "border-slate-200/50 bg-slate-50/80" : "border-white/18 bg-white/18",
          )}>
            <button
              type="button"
              disabled={!query}
              onClick={clearInput}
              className={cn(
                "inline-flex h-7 w-7 items-center justify-center rounded-full transition",
                query
                  ? themeMode === "light" ? "bg-slate-900/8 text-slate-600 opacity-80 hover:bg-slate-900/14 hover:opacity-100" : "bg-white/12 opacity-80 hover:bg-white/20 hover:opacity-100"
                  : "cursor-default opacity-25",
              )}
              aria-label="清除输入"
            >
              <X className="h-4 w-4" />
            </button>
            <input
              autoFocus
              value={query}
              onChange={(event) => handleQueryChange(event.target.value)}
              onFocus={handleSuggestionFocus}
              placeholder="输入搜索内容，按 Tab 切换搜索引擎"
              className={cn("min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-60", themeMode === "light" ? "text-slate-900 placeholder:text-slate-400" : "text-white placeholder:text-white")}
            />
            <div className="hidden sm:flex items-center gap-0">
              <button
                type="button"
                disabled={!query.trim()}
                onClick={activateLocalSearch}
                className={cn(
                  "h-10 shrink-0 items-center gap-1.5 rounded-2xl border px-3 text-xs font-semibold transition inline-flex",
                  themeMode === "light"
                    ? "border-orange-500/30 bg-orange-500/12 text-orange-700 hover:bg-orange-500/22"
                    : "border-orange-400/40 bg-orange-500/16 text-orange-200 hover:bg-orange-500/26",
                  !query.trim() && "cursor-default opacity-40",
                )}
              >
                <Search className="h-3.5 w-3.5" />
                站内搜索
              </button>
              <button
                type="submit"
                className={cn(
                  "h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition inline-flex",
                  themeMode === "light" ? "border-slate-200/50 bg-slate-100 text-slate-600 hover:bg-slate-200" : "border-white/20 bg-white/18 text-white hover:bg-white/26",
                )}
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            {searchSuggestionsOpen ? (
              <div className={cn(getSearchDropdownClass(themeMode), "absolute left-0 top-[calc(100%+10px)] z-20 w-full overflow-hidden rounded-3xl border p-2 text-left")}>
                <button
                  type="button"
                  onClick={dismissSuggestions}
                  onMouseEnter={() => {
                    setActiveSuggestionIndex(-1);
                    setHoveredSuggestionIndex(-1);
                    setSuggestionInteractionMode("keyboard");
                  }}
                  className={cn("flex w-full cursor-pointer items-center gap-2 rounded-2xl px-3 py-3 text-sm transition", getSearchDropdownDismissClass(themeMode))}
                >
                  <ChevronUp className="h-3.5 w-3.5" />
                  收起搜索建议
                </button>
                <div className={cn("my-1 border-t", getSearchDropdownDividerClass(themeMode))} />
                {searchSuggestionsBusy && !searchSuggestions.length ? (
                  <div className={cn("flex items-center gap-2 rounded-2xl px-3 py-3 text-sm", getSearchDropdownLoadingClass(themeMode))}>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    正在获取联想词...
                  </div>
                ) : null}
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.kind}-${suggestion.value}-${index}`}
                    type="button"
                    onClick={() => applySuggestion(suggestion.value)}
                    onMouseEnter={() => {
                      setSuggestionInteractionMode("pointer");
                      setHoveredSuggestionIndex(index);
                    }}
                    onMouseMove={() => {
                      if (
                        suggestionInteractionMode !== "pointer" ||
                        hoveredSuggestionIndex !== index
                      ) {
                        setSuggestionInteractionMode("pointer");
                        setHoveredSuggestionIndex(index);
                      }
                    }}
                    className={cn(
                      "flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-sm transition",
                      highlightedSuggestionIndex === index ? getSearchDropdownActiveClass(themeMode) : getSearchDropdownInactiveClass(themeMode),
                    )}
                  >
                    <span className="truncate">{suggestion.value}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {/* 移动端：站内搜索 + 普通搜索独立按钮行 */}
          <div className="flex gap-3 sm:hidden">
            <button
              type="button"
              disabled={!query.trim()}
              onClick={activateLocalSearch}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold transition",
                themeMode === "light"
                  ? "border-orange-500/30 bg-orange-500/12 text-orange-700 hover:bg-orange-500/22"
                  : "border-orange-400/40 bg-orange-500/16 text-orange-200 hover:bg-orange-500/26",
                !query.trim() && "cursor-default opacity-40",
              )}
            >
              <Search className="h-4 w-4" />
              站内搜索
            </button>
            <button
              type="submit"
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition-[opacity] hover:opacity-90",
              )}
              style={{ backgroundColor: engineMeta?.accent ?? "#5f86ff" }}
            >
              <Search className="h-4 w-4" />
              普通搜索
            </button>
          </div>
        </form>

        {localSearchActive ? (
          <div className={cn("mt-5", getLocalSearchContainerClass(themeMode, 0, 0))}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">站内搜索结果</h3>
                <p className="mt-1 text-sm opacity-62">
                  {localSearchQuery ? `搜索："${localSearchQuery}"` : "站内搜索结果"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCloseLocalSearch}
                  className={getLocalSearchCloseBtnClass(themeMode, 0, 0)}
                  aria-label="关闭站内搜索"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {showAiHint && localSearchQuery ? (
              <div className={cn("mb-3 flex items-center justify-center rounded-[22px] border border-dashed px-4 py-3 text-sm", getLocalSearchAiHintClass(themeMode, 0, 0))}>
                <span className="opacity-60">没有找到想要的网站？试试&nbsp;</span>
                <Tooltip tip="AI 根据关键词智能推荐最相关的网站" themeMode={themeMode}>
                  <button
                    type="button"
                    onClick={triggerAiRecommend}
                    className={cn("inline-flex items-center gap-1 font-semibold transition", themeMode === "light" ? "text-purple-600 hover:text-purple-500" : "text-purple-300 hover:text-purple-200")}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI 智能推荐
                  </button>
                </Tooltip>
                {!showWorkflowPanel ? (
                  <>
                    <span className="opacity-60">&nbsp;或&nbsp;</span>
                    <Tooltip tip="AI 为你规划一条完整的网站使用工作流" themeMode={themeMode}>
                      <button
                        type="button"
                        onClick={triggerAiWorkflow}
                        className={cn("inline-flex items-center gap-1 font-semibold transition", themeMode === "light" ? "text-purple-600 hover:text-purple-500" : "text-purple-300 hover:text-purple-200")}
                      >
                        <Workflow className="h-3.5 w-3.5" />
                        AI 工作流规划
                      </button>
                    </Tooltip>
                  </>
                ) : null}
              </div>
            ) : null}

            {showAiPanel ? (
              <div className={cn("mb-3 rounded-[22px] border p-4", getLocalSearchAiPanelClass(themeMode, 0, 0))}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="flex items-center gap-2 text-base font-semibold">
                      <Sparkles className={cn("h-4 w-4", themeMode === "light" ? "text-purple-500" : "text-purple-400")} />
                      AI 智能推荐
                    </h4>
                    {aiReasoning ? (
                      <p className={cn("mt-1 text-sm", themeMode === "light" ? "text-purple-600/80" : "text-purple-300/80")}>{aiReasoning}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseAiPanel}
                    className={getLocalSearchCloseBtnClass(themeMode, 0, 0)}
                    aria-label="关闭 AI 推荐"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {aiError ? (
                  <div className={cn(
                    "flex items-center gap-2 rounded-[22px] border border-dashed px-4 py-3 text-sm",
                    themeMode === "light" ? "border-amber-300/30 bg-amber-500/5 text-amber-600" : "border-amber-400/20 bg-amber-500/8 text-amber-300",
                  )}>
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    {aiError}
                  </div>
                ) : aiResultsBusy && !aiResults.length ? (
                  <div className={cn(
                    "flex items-center gap-2 rounded-[22px] border border-dashed px-4 py-5 text-sm",
                    themeMode === "light" ? "border-purple-300/24 bg-purple-500/5 text-purple-600/70" : "border-purple-400/20 bg-purple-500/6 text-purple-300/70",
                  )}>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    AI 正在分析所有网站，为你寻找最匹配的结果...
                  </div>
                ) : aiResults.length ? (
                  <div className="site-card-grid gap-3">
                    {aiResults.map(({ site, reason }) => (
                      <a
                        key={site.id}
                        href={site.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={getLocalSearchAiCardClass(themeMode, 0, 0)}
                        onClick={isMobileViewport() ? (e) => { e.preventDefault(); window.location.href = site.siteUrl; } : undefined}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); showSiteContextMenu(site, e.clientX, e.clientY); }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            {site.iconUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={site.iconUrl}
                                alt={`${site.name} icon`}
                                className={getLocalSearchAiIconClass(themeMode, 0, 0)}
                              />
                            ) : (
                              <span className={cn(getLocalSearchAiIconClass(themeMode, 0, 0), "inline-flex items-center justify-center text-sm font-semibold")}>
                                {site.name.charAt(0)}
                              </span>
                            )}
                            {site.siteTodos.filter((t) => !t.completed).length > 0 && (
                              <span className="absolute -top-1 -right-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-black bg-red-500 px-0.5 text-[8px] font-bold leading-none text-white">
                                {site.siteTodos.filter((t) => !t.completed).length > 99 ? "99+" : site.siteTodos.filter((t) => !t.completed).length}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h5 className="truncate text-sm font-semibold">{site.name}</h5>
                            {reason ? (
                              <p className={cn("mt-1 text-xs", themeMode === "light" ? "text-purple-700/80" : "text-purple-300/90")}>
                                <span className={themeMode === "light" ? "text-purple-500/70" : "text-purple-400/70"}>推荐理由：</span>{reason}
                              </p>
                            ) : null}
                            {site.siteDescription ? (
                              <p className={cn("mt-1 line-clamp-2 text-xs", themeMode === "light" ? "text-slate-500" : "text-white/55")}>{site.siteDescription}</p>
                            ) : null}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {showWorkflowPanel ? (
              <div className={cn("mb-3 rounded-[22px] border p-4", getLocalSearchAiPanelClass(themeMode, 0, 0))}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h4 className="flex items-center gap-2 text-base font-semibold">
                      <Workflow className={cn("h-4 w-4", themeMode === "light" ? "text-purple-500" : "text-purple-400")} />
                      AI 工作流规划
                    </h4>
                    {workflowReasoning ? (
                      <p className={cn("mt-1 text-sm", themeMode === "light" ? "text-purple-600/80" : "text-purple-300/80")}>{workflowReasoning}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseWorkflowPanel}
                    className={getLocalSearchCloseBtnClass(themeMode, 0, 0)}
                    aria-label="关闭工作流面板"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {workflowError ? (
                  <div className={cn(
                    "flex items-center gap-2 rounded-[22px] border border-dashed px-4 py-3 text-sm",
                    themeMode === "light" ? "border-amber-300/30 bg-amber-500/5 text-amber-600" : "border-amber-400/20 bg-amber-500/8 text-amber-300",
                  )}>
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    {workflowError}
                  </div>
                ) : workflowBusy && !workflowSteps.length ? (
                  <div className={cn(
                    "flex items-center gap-2 rounded-[22px] border border-dashed px-4 py-5 text-sm",
                    themeMode === "light" ? "border-purple-300/24 bg-purple-500/5 text-purple-600/70" : "border-purple-400/20 bg-purple-500/6 text-purple-300/70",
                  )}>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    AI 正在分析所有网站，为你规划最佳工作流...
                  </div>
                ) : workflowSteps.length > 0 ? (
                  <div className="space-y-0">
                    {workflowSteps.map((step, index) => (
                      <div key={step.site.id} className="flex items-stretch gap-0">
                        {/* 左侧连线 + 步骤号 */}
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            themeMode === "light"
                              ? "bg-purple-500/12 text-purple-600 ring-2 ring-purple-200/50"
                              : "bg-purple-500/20 text-purple-300 ring-2 ring-purple-400/30",
                          )}>
                            {index + 1}
                          </div>
                          {index < workflowSteps.length - 1 ? (
                            <div className={cn("w-0.5 flex-1 min-h-4", themeMode === "light" ? "bg-purple-200/50" : "bg-purple-400/30")} />
                          ) : null}
                        </div>
                        {/* 步骤内容 */}
                        <a
                          href={step.site.siteUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn("group mb-2 ml-3 flex-1 rounded-[20px] border p-3.5 transition hover:-translate-y-0.5", getLocalSearchAiCardClass(themeMode, 0, 0))}
                          onClick={isMobileViewport() ? (e) => { e.preventDefault(); window.location.href = step.site.siteUrl; } : undefined}
                          onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); showSiteContextMenu(step.site, e.clientX, e.clientY); }}
                        >
                          <div className="flex items-start gap-3">
                            <div className="relative shrink-0">
                              {step.site.iconUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={step.site.iconUrl}
                                  alt={`${step.site.name} icon`}
                                  className={getLocalSearchAiIconClass(themeMode, 0, 0)}
                                />
                              ) : (
                                <span className={cn(getLocalSearchAiIconClass(themeMode, 0, 0), "inline-flex items-center justify-center text-sm font-semibold")}>
                                  {step.site.name.charAt(0)}
                                </span>
                              )}
                              {step.site.siteTodos.filter((t) => !t.completed).length > 0 && (
                                <span className="absolute -top-1 -right-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-black bg-red-500 px-0.5 text-[8px] font-bold leading-none text-white">
                                  {step.site.siteTodos.filter((t) => !t.completed).length > 99 ? "99+" : step.site.siteTodos.filter((t) => !t.completed).length}
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <h5 className="truncate text-sm font-semibold">{step.site.name}</h5>
                                <span className={cn(
                                  "inline-flex shrink-0 items-center gap-0.5 rounded-lg px-1.5 py-0.5 text-[10px] font-semibold",
                                  themeMode === "light" ? "bg-purple-500/10 text-purple-600" : "bg-purple-500/16 text-purple-300",
                                )}>
                                  {step.action}
                                </span>
                              </div>
                              {step.reason ? (
                                <p className={cn("mt-1 text-xs", themeMode === "light" ? "text-purple-600/80" : "text-purple-300/90")}>{step.reason}</p>
                              ) : null}
                            </div>
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {resultsDismissed ? null : !localSearchQuery ? (
              <div className={cn(
                "flex items-center justify-center rounded-[22px] border border-dashed px-4 py-5 text-sm",
                themeMode === "light" ? "border-slate-200/50 bg-slate-50/40 text-slate-400" : "border-white/12 bg-white/4 text-white/58",
              )}>
                输入关键词开始搜索。
              </div>
            ) : (
              <div className={cn(
                "relative rounded-[22px] border p-3",
                themeMode === "light" ? "border-slate-200/50 bg-slate-50/60" : "border-white/10 bg-white/6",
              )}>
                <button
                  type="button"
                  onClick={handleClearResults}
                  className={cn("absolute top-2 right-2 z-10", getLocalSearchCloseBtnClass(themeMode, 0, 0))}
                  aria-label="清除搜索结果"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                {localResultsBusy && !localResults.length ? (
                  <div className={cn(
                    "flex items-center justify-center gap-2 rounded-[18px] border border-dashed px-4 py-8 text-sm",
                    themeMode === "light" ? "border-slate-200/50 bg-slate-50/40 text-slate-400" : "border-white/12 bg-white/4 text-white/58",
                  )}>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    正在搜索...
                  </div>
                ) : localResults.length ? (
                  <div className="site-card-grid gap-3">
                    {localResults.map((site, index) => (
                      <a
                        key={site.id}
                        href={site.siteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "animate-in fade-in slide-in-from-bottom-2 duration-200",
                          getLocalSearchResultCardClass(themeMode, 0, 0),
                        )}
                        style={{ animationDelay: `${index * 40}ms`, animationFillMode: "both" }}
                        onClick={isMobileViewport() ? (e) => { e.preventDefault(); window.location.href = site.siteUrl; } : undefined}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); showSiteContextMenu(site, e.clientX, e.clientY); }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="relative shrink-0">
                            {site.iconUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={site.iconUrl}
                                alt={`${site.name} icon`}
                                className={getLocalSearchIconClass(themeMode, 0, 0)}
                              />
                            ) : (
                              <span className={cn(getLocalSearchIconClass(themeMode, 0, 0), "inline-flex items-center justify-center text-sm font-semibold")}>
                                {site.name.charAt(0)}
                              </span>
                            )}
                            {site.siteTodos.filter((t) => !t.completed).length > 0 && (
                              <span className="absolute -top-1 -right-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full border border-black bg-red-500 px-0.5 text-[8px] font-bold leading-none text-white">
                                {site.siteTodos.filter((t) => !t.completed).length > 99 ? "99+" : site.siteTodos.filter((t) => !t.completed).length}
                              </span>
                            )}
                          </div>
                          <div className="min-w-0">
                            <h4 className="truncate text-sm font-semibold">{site.name}</h4>
                            <p className="mt-1 line-clamp-2 text-sm opacity-65">{site.siteDescription}</p>
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : !localResultsBusy ? (
                  <div className={cn(
                    "flex items-center justify-center rounded-[18px] border border-dashed px-4 py-5 text-sm opacity-58",
                    themeMode === "light" ? "border-slate-300/40 bg-slate-50/60" : "border-white/12 bg-white/4",
                  )}>
                    当前范围内没有匹配的网站。
                  </div>
                ) : null}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
