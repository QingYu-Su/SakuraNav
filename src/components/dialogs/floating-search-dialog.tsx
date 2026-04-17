/**
 * 浮动搜索对话框组件
 * @description 提供全局搜索功能，支持站内搜索和外部搜索引擎切换
 */

/**
 * 浮动搜索对话框组件
 * @description 提供全局搜索功能，支持多搜索引擎切换、站内搜索、搜索建议等
 */

"use client";

import {
  ChevronDown,
  LoaderCircle,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import { siteConfig } from "@/lib/config";
import { type PaginatedSites, type SearchEngine, type Site } from "@/lib/types";
import { cn } from "@/lib/utils";
import { postJson, requestJson } from "@/lib/api";

type SearchSuggestion = {
  value: string;
  kind: "query" | "site" | "tag";
};
type SuggestionInteractionMode = "keyboard" | "pointer";

function buildClientFallbackSuggestions(query: string): SearchSuggestion[] {
  const candidates = [query, `${query} 官网`, `${query} 教程`, `${query} 下载`, `${query} github`];
  const seen = new Set<string>();
  return candidates
    .map((item) => item.trim())
    .filter((item) => {
      if (!item || seen.has(item)) return false;
      seen.add(item);
      return true;
    })
    .map((value) => ({ value, kind: "query" as const }));
}

export function FloatingSearchDialog({
  open,
  activeTagId,
  activeTagName,
  onClose,
}: {
  open: boolean;
  activeTagId: string | null;
  activeTagName: string;
  onClose: () => void;
}) {
  const [searchEngine, setSearchEngine] = useState<SearchEngine>(siteConfig.defaultSearchEngine);
  const [query, setQuery] = useState("");
  const [searchMenuOpen, setSearchMenuOpen] = useState(false);
  const [searchSuggestions, setSearchSuggestions] = useState<SearchSuggestion[]>([]);
  const [searchSuggestionsOpen, setSearchSuggestionsOpen] = useState(false);
  const [searchSuggestionsBusy, setSearchSuggestionsBusy] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [hoveredSuggestionIndex, setHoveredSuggestionIndex] = useState(-1);
  const [suggestionInteractionMode, setSuggestionInteractionMode] =
    useState<SuggestionInteractionMode>("keyboard");
  const [localResults, setLocalResults] = useState<Site[]>([]);
  const [localResultsBusy, setLocalResultsBusy] = useState(false);
  const [aiResults, setAiResults] = useState<Array<{ site: Site; reason: string }>>([]);
  const [aiResultsBusy, setAiResultsBusy] = useState(false);
  const [aiReasoning, setAiReasoning] = useState("");
  const searchFormRef = useRef<HTMLFormElement | null>(null);
  const suggestionRequestIdRef = useRef(0);
  const localResultsRequestIdRef = useRef(0);
  const deferredQuery = useDeferredValue(query.trim());
  const highlightedSuggestionIndex =
    suggestionInteractionMode === "pointer" && hoveredSuggestionIndex >= 0
      ? hoveredSuggestionIndex
      : activeSuggestionIndex;
  const engineMeta = siteConfig.searchEngines[searchEngine];

  useEffect(() => {
    if (!open) {
      setSearchMenuOpen(false);
      setSearchSuggestionsOpen(false);
      setActiveSuggestionIndex(-1);
      setHoveredSuggestionIndex(-1);
      setSuggestionInteractionMode("keyboard");
      setAiResults([]);
      setAiReasoning("");
    }
  }, [open]);

  useEffect(() => {
    if (!open || searchEngine === "local" || !query.trim()) {
      setSearchSuggestions([]);
      setSearchSuggestionsOpen(false);
      setSearchSuggestionsBusy(false);
      setActiveSuggestionIndex(-1);
      setHoveredSuggestionIndex(-1);
      setSuggestionInteractionMode("keyboard");
      return;
    }

    const requestId = ++suggestionRequestIdRef.current;
    setSearchSuggestionsBusy(true);

    const timeoutId = window.setTimeout(() => {
      void (async () => {
        try {
          const params = new URLSearchParams({
            engine: searchEngine,
            q: query.trim(),
          });
          const data = await requestJson<{ items: SearchSuggestion[] }>(
            `/api/search/suggest?${params.toString()}`,
          );
          if (requestId !== suggestionRequestIdRef.current) return;
          const items =
            searchEngine === "google" && data.items.length === 0
              ? buildClientFallbackSuggestions(query.trim())
              : data.items;
          setSearchSuggestions(items);
          setSearchSuggestionsOpen(items.length > 0);
          setActiveSuggestionIndex(items.length ? 0 : -1);
          setHoveredSuggestionIndex(-1);
          setSuggestionInteractionMode("keyboard");
        } catch {
          if (requestId !== suggestionRequestIdRef.current) return;
          const fallbackItems =
            searchEngine === "google" ? buildClientFallbackSuggestions(query.trim()) : [];
          setSearchSuggestions(fallbackItems);
          setSearchSuggestionsOpen(fallbackItems.length > 0);
          setActiveSuggestionIndex(fallbackItems.length ? 0 : -1);
          setHoveredSuggestionIndex(-1);
          setSuggestionInteractionMode("keyboard");
        } finally {
          if (requestId === suggestionRequestIdRef.current) {
            setSearchSuggestionsBusy(false);
          }
        }
      })();
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [open, query, searchEngine]);

  useEffect(() => {
    if (!open || searchEngine !== "local" || !deferredQuery) {
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
          params.set("q", deferredQuery);
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
  }, [activeTagId, deferredQuery, open, searchEngine]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (!searchFormRef.current?.contains(event.target as Node)) {
        setSearchMenuOpen(false);
        setSearchSuggestionsOpen(false);
        setActiveSuggestionIndex(-1);
        setHoveredSuggestionIndex(-1);
        setSuggestionInteractionMode("keyboard");
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
  }, [onClose, open]);

  function cycleSearchEngine() {
    setSearchMenuOpen((current) => !current);
  }

  function stepSearchEngine(direction: 1 | -1) {
    setSearchEngine((current) => {
      const engines = siteConfig.supportedSearchEngines;
      const currentIndex = engines.indexOf(current);
      const nextIndex = (currentIndex + direction + engines.length) % engines.length;
      return engines[nextIndex] ?? current;
    });
    setSearchMenuOpen(false);
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");
  }

  function submitSearch() {
    setSearchMenuOpen(false);
    setSearchSuggestionsOpen(false);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");

    if (searchEngine === "local") {
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) return;

    const searchUrl = siteConfig.searchEngines[searchEngine].searchUrl;
    window.open(`${searchUrl}${encodeURIComponent(trimmed)}`, "_blank", "noopener,noreferrer");
  }

  function applySuggestion(value: string) {
    setSearchSuggestionsOpen(false);
    setActiveSuggestionIndex(-1);
    setHoveredSuggestionIndex(-1);
    setSuggestionInteractionMode("keyboard");

    if (searchEngine === "local") {
      return;
    }

    window.open(
      `${siteConfig.searchEngines[searchEngine].searchUrl}${encodeURIComponent(value)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (!open) return null;

  return (
    <div
      className="animate-drawer-fade fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/56 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="animate-panel-rise w-full max-w-[980px] rounded-[34px] border border-white/12 bg-[#0c1526eb] p-5 text-white shadow-[0_40px_120px_rgba(2,6,23,0.42)] backdrop-blur-2xl sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-white/50">Quick Search</p>
            <h2 className="mt-1 text-2xl font-semibold">悬浮搜索</h2>
            <p className="mt-2 text-sm text-white/68">
              {searchEngine === "local"
                ? `搜索范围：${activeTagId ? activeTagName : "全部网站"}`
                : "在这里可以单独发起搜索。"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/12 bg-white/8 transition hover:bg-white/14"
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
              if (event.key === "Escape") {
                setSearchMenuOpen(false);
                setSearchSuggestionsOpen(false);
                setActiveSuggestionIndex(-1);
                setHoveredSuggestionIndex(-1);
                setSuggestionInteractionMode("keyboard");
              }
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
          className="mx-auto flex w-full flex-col gap-3 rounded-[30px] border border-white/20 bg-white/10 p-3 sm:flex-row sm:items-center"
        >
          <div className="relative">
            <button
              type="button"
              onClick={cycleSearchEngine}
              className="inline-flex min-w-[156px] items-center justify-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:opacity-90"
              style={{ backgroundColor: engineMeta.accent }}
            >
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/18 text-sm">
                {engineMeta.label.charAt(0)}
              </span>
              {engineMeta.label}
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  searchMenuOpen ? "rotate-180" : "",
                )}
              />
            </button>
            {searchMenuOpen ? (
              <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-56 overflow-hidden rounded-3xl border border-white/16 bg-[#0f172ae8] p-2 text-left text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                {siteConfig.supportedSearchEngines.map((engine) => (
                  <button
                    key={engine}
                    type="button"
                    onClick={() => {
                      setSearchEngine(engine);
                      setSearchMenuOpen(false);
                      setSearchSuggestionsOpen(false);
                      setActiveSuggestionIndex(-1);
                      setHoveredSuggestionIndex(-1);
                      setSuggestionInteractionMode("keyboard");
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-3 py-3 text-sm transition",
                      searchEngine === engine
                        ? "bg-white/16 text-white"
                        : "text-white/78 hover:bg-white/10",
                    )}
                  >
                    <span className="flex items-center gap-3">
                      <span
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                        style={{ backgroundColor: siteConfig.searchEngines[engine].accent }}
                      >
                        {siteConfig.searchEngines[engine].label.charAt(0)}
                      </span>
                      {siteConfig.searchEngines[engine].label}
                    </span>
                    {searchEngine === engine ? <span>当前</span> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="relative flex flex-1 items-center gap-3 rounded-2xl border border-white/18 bg-white/18 px-4 py-3">
            <Search className="h-4 w-4 opacity-70" />
            <input
              autoFocus
              value={query}
              onChange={(event) => {
                        setQuery(event.target.value);
                        setActiveSuggestionIndex(-1);
                        setHoveredSuggestionIndex(-1);
                        setSuggestionInteractionMode("keyboard");
              }}
              onFocus={() => {
                if (searchSuggestions.length) {
                  setSearchSuggestionsOpen(true);
                }
              }}
              placeholder={searchEngine === "local" ? "搜索站点名、描述或标签" : "输入搜索内容"}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-60"
            />
            {searchEngine === "local" ? (
              <button
                type="button"
                disabled={!query.trim() || aiResultsBusy}
                onClick={() => {
                  if (!query.trim()) return;
                  setAiResults([]);
                  setAiReasoning("");
                  setAiResultsBusy(true);
                  void requestJson<{
                    items: Array<{ site: Site; reason: string }>;
                    reasoning: string;
                  }>("/api/ai/recommend", postJson({ query: query.trim() }))
                    .then((data) => {
                      setAiResults(data.items);
                      setAiReasoning(data.reasoning);
                    })
                    .catch(() => {
                      setAiResults([]);
                      setAiReasoning("");
                    })
                    .finally(() => setAiResultsBusy(false));
                }}
                className={cn(
                  "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-2xl border px-3 text-xs font-semibold transition",
                  aiResultsBusy
                    ? "animate-pulse border-purple-400/30 bg-purple-500/20 text-purple-300"
                    : "border-purple-400/40 bg-purple-500/20 text-purple-200 hover:bg-purple-500/30",
                  !query.trim() && "opacity-40",
                )}
              >
                {aiResultsBusy ? (
                  <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                AI 推荐
              </button>
            ) : null}
            <button
              type="submit"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/18 transition hover:bg-white/26"
            >
              <Search className="h-4 w-4" />
            </button>
            {searchSuggestionsOpen ? (
              <div className="absolute left-0 top-[calc(100%+10px)] z-20 w-full overflow-hidden rounded-3xl border border-white/16 bg-[#0f172ae8] p-2 text-left text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                {searchSuggestionsBusy && !searchSuggestions.length ? (
                  <div className="flex items-center gap-2 rounded-2xl px-3 py-3 text-sm text-white/70">
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
                      highlightedSuggestionIndex === index ? "bg-white/16 text-white" : "text-white/78",
                    )}
                  >
                    <span className="truncate">{suggestion.value}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </form>

        {searchEngine === "local" && (aiResultsBusy || aiResults.length > 0) ? (
          <div className="mt-5 rounded-[28px] border border-purple-400/20 bg-purple-500/8 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  AI 智能推荐
                </h3>
                {aiReasoning ? (
                  <p className="mt-1 text-sm text-purple-300/80">{aiReasoning}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {aiResultsBusy ? <LoaderCircle className="h-4 w-4 animate-spin text-purple-400" /> : null}
                <button
                  type="button"
                  onClick={() => { setAiResults([]); setAiReasoning(""); }}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-white/12 bg-white/8 text-white/60 transition hover:bg-white/14 hover:text-white"
                  aria-label="关闭 AI 推荐"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {aiResultsBusy && !aiResults.length ? (
              <div className="flex items-center gap-2 rounded-[22px] border border-dashed border-purple-400/20 bg-purple-500/6 px-4 py-5 text-sm text-purple-300/70">
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
                    className="group rounded-[22px] border border-purple-400/16 bg-purple-500/8 p-4 transition hover:-translate-y-0.5 hover:bg-purple-500/14"
                  >
                    <div className="flex items-start gap-3">
                      {site.iconUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={site.iconUrl}
                            alt={`${site.name} icon`}
                            className="h-11 w-11 rounded-2xl border border-purple-400/14 bg-purple-400/14 object-cover"
                          />
                        </>
                      ) : (
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-purple-400/14 bg-purple-400/14 text-sm font-semibold">
                          {site.name.charAt(0)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold">{site.name}</h4>
                        {reason ? (
                          <p className="mt-1 text-xs text-purple-300/90">
                            <span className="text-purple-400/70">推荐理由：</span>{reason}
                          </p>
                        ) : null}
                        {site.description ? (
                          <p className="mt-1 line-clamp-2 text-xs text-white/55">{site.description}</p>
                        ) : null}
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {searchEngine === "local" ? (
          <div className="mt-5 rounded-[28px] border border-white/10 bg-white/6 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">站内搜索结果</h3>
                <p className="mt-1 text-sm text-white/62">
                  这里会显示这次搜索的结果。
                </p>
              </div>
              {localResultsBusy ? <LoaderCircle className="h-4 w-4 animate-spin text-white/68" /> : null}
            </div>

            {!query.trim() ? (
              <div className="rounded-[22px] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-white/58">
                输入关键词开始搜索。
              </div>
            ) : localResults.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {localResults.map((site) => (
                  <a
                    key={site.id}
                    href={site.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group rounded-[22px] border border-white/12 bg-white/7 p-4 transition hover:-translate-y-0.5 hover:bg-white/11"
                  >
                    <div className="flex items-start gap-3">
                      {site.iconUrl ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={site.iconUrl}
                            alt={`${site.name} icon`}
                            className="h-11 w-11 rounded-2xl border border-white/14 bg-white/14 object-cover"
                          />
                        </>
                      ) : (
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/14 bg-white/14 text-sm font-semibold">
                          {site.name.charAt(0)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <h4 className="truncate text-sm font-semibold">{site.name}</h4>
                        <p className="mt-1 line-clamp-2 text-sm text-white/65">{site.description}</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/12 bg-white/4 px-4 py-5 text-sm text-white/58">
                当前范围内没有匹配的网站。
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
