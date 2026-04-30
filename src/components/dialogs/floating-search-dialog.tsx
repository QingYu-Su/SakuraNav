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
  X,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
} from "react";

import { type PaginatedSites, type SearchEngineConfig, type Site, type ThemeMode } from "@/lib/base/types";
import { showSiteContextMenu } from "@/components/ui/site-context-menu";
import { cn } from "@/lib/utils/utils";
import { requestJson } from "@/lib/base/api";
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
  } = useSearchBar({ active: open, engines });

  /* ---- 悬浮搜索栏独立状态 ---- */
  const [localResults, setLocalResults] = useState<Site[]>([]);
  const [localResultsBusy, setLocalResultsBusy] = useState(false);
  const localResultsRequestIdRef = useRef(0);

  /* ---- 派生 ---- */
  const showAiHint = localSearchActive && !localResultsBusy && !aiResultsBusy && aiResults.length === 0 && !aiError;
  const showAiPanel = localSearchActive && (aiResultsBusy || aiResults.length > 0 || !!aiError);

  /* ---- 站内搜索结果获取 ---- */
  useEffect(() => {
    if (!open || !localSearchActive || !localSearchQuery) {
      setLocalResults([]);
      setLocalResultsBusy(false);
      return;
    }

    const requestId = ++localResultsRequestIdRef.current;

    const timeoutId = window.setTimeout(() => {
      setLocalResultsBusy(true);
      void (async () => {
        try {
          const params = new URLSearchParams();
          params.set("scope", activeTagId ? "tag" : "all");
          if (activeTagId) params.set("tagId", activeTagId);
          params.set("q", localSearchQuery);
          const data = await requestJson<PaginatedSites>(`/api/navigation/sites?${params.toString()}`);
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
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [activeTagId, localSearchActive, localSearchQuery, open]);

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

  /* ---- 关闭站内搜索（包装 hook 函数，增加本地清理） ---- */
  function handleCloseLocalSearch() {
    ++localResultsRequestIdRef.current;
    setLocalResults([]);
    setLocalResultsBusy(false);
    closeLocalSearch();
  }

  /* ---- 关闭 AI 推荐面板 ---- */
  function handleCloseAiPanel() {
    closeAiPanel();
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
                ? `搜索范围：${activeTagId ? activeTagName : "全部网站"}`
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
          <div className="relative">
            <button
              type="button"
              onClick={cycleSearchEngine}
              className="inline-flex min-w-[156px] items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
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
            <button
              type="button"
              disabled={!query.trim()}
              onClick={activateLocalSearch}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl border px-3 text-xs font-semibold transition",
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
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition",
                themeMode === "light" ? "border-slate-200/50 bg-slate-100 text-slate-600 hover:bg-slate-200" : "border-white/20 bg-white/18 text-white hover:bg-white/26",
              )}
            >
              <Search className="h-4 w-4" />
            </button>
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
        </form>

        {localSearchActive ? (
          <div className={cn("mt-5 rounded-[28px] border p-4", themeMode === "light" ? "border-slate-200/50 bg-slate-50/60" : "border-white/10 bg-white/6")}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">站内搜索结果</h3>
                <p className={cn("mt-1 text-sm", themeMode === "light" ? "text-slate-500" : "text-white/62")}>
                  这里会显示这次搜索的结果。
                </p>
              </div>
              <div className="flex items-center gap-2">
                {localResultsBusy ? <LoaderCircle className={cn("h-4 w-4 animate-spin", themeMode === "light" ? "text-slate-400" : "text-white/68")} /> : null}
                <button
                  type="button"
                  onClick={handleCloseLocalSearch}
                  className={cn(
                    "inline-flex h-7 w-7 items-center justify-center rounded-xl border transition",
                    themeMode === "light" ? "border-slate-200/50 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600" : "border-white/12 bg-white/8 text-white/60 hover:bg-white/14 hover:text-white",
                  )}
                  aria-label="关闭站内搜索"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {showAiHint ? (
              <div className={cn(
                "mb-3 flex items-center justify-center rounded-[22px] border border-dashed px-4 py-3 text-sm",
                themeMode === "light" ? "border-purple-300/30 bg-purple-50/60" : "border-purple-400/20 bg-purple-500/6",
              )}>
                <span className={themeMode === "light" ? "text-slate-500" : "text-white/60"}>没有找到想要的网站？试试&nbsp;</span>
                <button
                  type="button"
                  onClick={triggerAiRecommend}
                  className={cn(
                    "inline-flex items-center gap-1 font-semibold transition",
                    themeMode === "light" ? "text-purple-600 hover:text-purple-500" : "text-purple-300 hover:text-purple-200",
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  AI 智能推荐
                </button>
              </div>
            ) : null}

            {showAiPanel ? (
              <div className={cn(
                "mb-3 rounded-[22px] border p-4",
                themeMode === "light" ? "border-purple-300/30 bg-purple-50/60" : "border-purple-400/20 bg-purple-500/8",
              )}>
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
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-xl border transition",
                      themeMode === "light" ? "border-slate-200/50 bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600" : "border-white/12 bg-white/8 text-white/60 hover:bg-white/14 hover:text-white",
                    )}
                    aria-label="关闭 AI 推荐"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                {aiError ? (
                  <div className={cn(
                    "flex items-center gap-2 rounded-[22px] border border-dashed px-4 py-3 text-sm",
                    themeMode === "light" ? "border-amber-300/30 bg-amber-50/60 text-amber-600" : "border-amber-400/20 bg-amber-500/8 text-amber-300",
                  )}>
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    {aiError}
                  </div>
                ) : aiResultsBusy && !aiResults.length ? (
                  <div className={cn(
                    "flex items-center gap-2 rounded-[22px] border border-dashed px-4 py-5 text-sm",
                    themeMode === "light" ? "border-purple-300/30 bg-purple-50/60 text-purple-500/70" : "border-purple-400/20 bg-purple-500/6 text-purple-300/70",
                  )}>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    AI 正在分析所有网站，为你寻找最匹配的结果...
                  </div>
                ) : aiResults.length ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {aiResults.map(({ site, reason }) => (
                      <a
                        key={site.id}
                        href={site.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "group rounded-[22px] border p-4 transition hover:-translate-y-0.5",
                          themeMode === "light" ? "border-purple-200/40 bg-purple-50/40 hover:bg-purple-100/60" : "border-purple-400/16 bg-purple-500/8 hover:bg-purple-500/14",
                        )}
                        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); showSiteContextMenu(site, e.clientX, e.clientY); }}
                      >
                        <div className="flex items-start gap-3">
                          {site.iconUrl ? (
                            <>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={site.iconUrl}
                                alt={`${site.name} icon`}
                                className={cn("h-11 w-11 rounded-2xl border object-cover", themeMode === "light" ? "border-purple-200/40 bg-purple-100/40" : "border-purple-400/14 bg-purple-400/14")}
                              />
                            </>
                          ) : (
                            <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-semibold", themeMode === "light" ? "border-purple-200/40 bg-purple-100/40" : "border-purple-400/14 bg-purple-400/14")}>
                              {site.name.charAt(0)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <h5 className="truncate text-sm font-semibold">{site.name}</h5>
                            {reason ? (
                              <p className={cn("mt-1 text-xs", themeMode === "light" ? "text-purple-600/80" : "text-purple-300/90")}>
                                <span className={themeMode === "light" ? "text-purple-500/60" : "text-purple-400/70"}>推荐理由：</span>{reason}
                              </p>
                            ) : null}
                            {site.description ? (
                              <p className={cn("mt-1 line-clamp-2 text-xs", themeMode === "light" ? "text-slate-500" : "text-white/55")}>{site.description}</p>
                            ) : null}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {!localSearchQuery ? (
              <div className={cn(
                "flex items-center justify-center rounded-[22px] border border-dashed px-4 py-5 text-sm",
                themeMode === "light" ? "border-slate-200/50 bg-slate-50/40 text-slate-400" : "border-white/12 bg-white/4 text-white/58",
              )}>
                输入关键词开始搜索。
              </div>
            ) : localResultsBusy ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className={cn("h-28 animate-pulse rounded-[22px] border", themeMode === "light" ? "bg-slate-100 border-slate-200/50" : "border-white/18 bg-white/12")}
                  />
                ))}
              </div>
            ) : localResults.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {localResults.map((site) => (
                  <a
                    key={site.id}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "group rounded-[22px] border p-4 transition hover:-translate-y-0.5",
                      themeMode === "light" ? "border-slate-200/60 bg-slate-100/75 hover:bg-slate-200/88" : "border-white/12 bg-white/7 hover:bg-white/11",
                    )}
                    onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); showSiteContextMenu(site, e.clientX, e.clientY); }}
                  >
                    <div className="flex items-start gap-3">
                      {site.iconUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={site.iconUrl}
                            alt={`${site.name} icon`}
                            className={cn("h-11 w-11 rounded-2xl border object-cover", themeMode === "light" ? "border-slate-200/60 bg-slate-100/80" : "border-white/14 bg-white/14")}
                          />
                        </>
                      ) : (
                        <span className={cn("inline-flex h-11 w-11 items-center justify-center rounded-2xl border text-sm font-semibold", themeMode === "light" ? "border-slate-200/60 bg-slate-100/80" : "border-white/14 bg-white/14")}>
                          {site.name.charAt(0)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold">{site.name}</h4>
                        <p className={cn("mt-1 line-clamp-2 text-sm", themeMode === "light" ? "text-slate-500" : "text-white/65")}>{site.description}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className={cn(
                "flex items-center justify-center rounded-[22px] border border-dashed px-4 py-5 text-sm",
                themeMode === "light" ? "border-slate-200/50 bg-slate-50/40 text-slate-400" : "border-white/12 bg-white/4 text-white/58",
              )}>
                当前范围内没有匹配的网站。
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
