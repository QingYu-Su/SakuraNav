/**
 * 搜索栏组件
 * @description 包含搜索引擎选择器、搜索建议、站内搜索按钮、搜索输入框
 */

import {
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Search,
  Settings2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";
import type { RefObject } from "react";
import {
  getEngineEditorButtonClass,
  getSiteSearchButtonClass,
  getSearchSubmitButtonClass,
  getSearchClearButtonClass,
} from "./style-helpers";

type SearchBarSectionProps = {
  themeMode: ThemeMode;
  hasActiveWallpaper: boolean;
  isAuthenticated: boolean;
  editMode: boolean;
  searchFormRef: RefObject<HTMLFormElement | null>;
  query: string;
  searchMenuOpen: boolean;
  searchSuggestionsOpen: boolean;
  searchSuggestionsBusy: boolean;
  searchSuggestions: Array<{ kind: string; value: string }>;
  activeSuggestionIndex: number;
  hoveredSuggestionIndex: number;
  highlightedSuggestionIndex: number;
  suggestionInteractionMode: "keyboard" | "pointer";
  engineMeta: { name: string; iconUrl?: string; accent: string } | null;
  engineList: Array<{ id: string; name: string; iconUrl?: string; accent: string }>;
  onSubmit: (e: React.FormEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onQueryChange: (value: string) => void;
  onSuggestionFocus: () => void;
  onCycleEngine: () => void;
  onSelectEngine: (id: string) => void;
  onClearInput: () => void;
  onActivateLocalSearch: () => void;
  onApplySuggestion: (value: string) => void;
  onDismissSuggestions: () => void;
  onOpenEngineEditor: () => void;
  setActiveSuggestionIndex: (index: number | ((prev: number) => number)) => void;
  setHoveredSuggestionIndex: (index: number) => void;
  setSuggestionInteractionMode: (mode: "keyboard" | "pointer") => void;
};

export function SearchBarSection({
  themeMode,
  hasActiveWallpaper,
  isAuthenticated,
  editMode,
  searchFormRef,
  query,
  searchMenuOpen,
  searchSuggestionsOpen,
  searchSuggestionsBusy,
  searchSuggestions,
  activeSuggestionIndex: _activeSuggestionIndex,
  hoveredSuggestionIndex,
  highlightedSuggestionIndex,
  suggestionInteractionMode,
  engineMeta,
  engineList,
  onSubmit,
  onKeyDown,
  onQueryChange,
  onSuggestionFocus,
  onCycleEngine,
  onSelectEngine,
  onClearInput,
  onActivateLocalSearch,
  onApplySuggestion,
  onDismissSuggestions,
  onOpenEngineEditor,
  setActiveSuggestionIndex,
  setHoveredSuggestionIndex,
  setSuggestionInteractionMode,
}: SearchBarSectionProps) {
  return (
    <form
      ref={searchFormRef}
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className={cn(
        "relative z-40 mx-auto flex w-full max-w-[980px] min-[1280px]:max-w-[1120px] flex-col gap-3 rounded-[30px] border p-3 sm:flex-row sm:items-center",
        hasActiveWallpaper
          ? themeMode === "light"
            ? "border-slate-900/10 bg-white/40 shadow-[0_12px_32px_rgba(148,163,184,0.12)] backdrop-blur-[22px]"
            : "border-white/14 bg-white/10 shadow-[0_12px_34px_rgba(2,6,23,0.22)] backdrop-blur-[22px]"
          : "border-white/20 bg-white/12",
      )}
    >
      {isAuthenticated && editMode ? (
        <button
          type="button"
          onClick={onOpenEngineEditor}
          className={getEngineEditorButtonClass(themeMode, hasActiveWallpaper)}
          title="编辑搜索引擎配置"
        >
          <Settings2 className="h-5 w-5" />
        </button>
      ) : null}
      <div className="relative">
        <button
          type="button"
          onClick={onCycleEngine}
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
          <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-full overflow-hidden rounded-3xl border border-white/16 bg-[#0f172ae8] p-2 text-left text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            {engineList.map((engine) => (
              <button
                key={engine.id}
                type="button"
                onClick={() => onSelectEngine(engine.id)}
                className={cn(
                  "flex w-full items-center rounded-2xl px-3 py-3 text-sm transition",
                  engineMeta?.name === engine.name
                    ? "bg-white/16 text-white"
                    : "text-white/78 hover:bg-white/10",
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
        hasActiveWallpaper
          ? themeMode === "light"
            ? "border-slate-900/8 bg-white/30"
            : "border-white/12 bg-white/8"
          : "border-white/18 bg-white/18",
      )}>
        <button
          type="button"
          disabled={!query}
          onClick={onClearInput}
          className={getSearchClearButtonClass(themeMode, hasActiveWallpaper, !!query)}
          aria-label="清除输入"
        >
          <X className="h-4 w-4" />
        </button>
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          onFocus={onSuggestionFocus}
          placeholder="输入搜索内容，按 Tab 切换搜索引擎"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:opacity-60"
        />
        <button
          type="button"
          disabled={!query.trim()}
          onClick={onActivateLocalSearch}
          className={cn(
            getSiteSearchButtonClass(themeMode, hasActiveWallpaper),
            query.trim() ? "" : "cursor-default opacity-40",
          )}
        >
          <Search className="h-3.5 w-3.5" />
          站内搜索
        </button>
        <button
          type="submit"
          className={getSearchSubmitButtonClass(themeMode, hasActiveWallpaper)}
        >
          <Search className="h-4 w-4" />
        </button>
        {searchSuggestionsOpen ? (
          <div className="absolute left-0 top-[calc(100%+10px)] z-50 w-full overflow-hidden rounded-3xl border border-white/16 bg-[#0f172ae8] p-2 text-left text-white shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
            <button
              type="button"
              onClick={onDismissSuggestions}
              onMouseEnter={() => {
                setActiveSuggestionIndex(-1);
                setHoveredSuggestionIndex(-1);
                setSuggestionInteractionMode("keyboard");
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-2xl px-3 py-3 text-sm text-white/50 transition hover:bg-white/8"
            >
              <ChevronUp className="h-3.5 w-3.5" />
              收起搜索建议
            </button>
            <div className="my-1 border-t border-white/8" />
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
                onClick={() => onApplySuggestion(suggestion.value)}
                onMouseEnter={() => {
                  setSuggestionInteractionMode("pointer");
                  setHoveredSuggestionIndex(index);
                }}
                onMouseMove={() => {
                  if (suggestionInteractionMode !== "pointer" || hoveredSuggestionIndex !== index) {
                    setSuggestionInteractionMode("pointer");
                    setHoveredSuggestionIndex(index);
                  }
                }}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between rounded-2xl px-3 py-3 text-sm transition",
                  highlightedSuggestionIndex === index
                    ? "bg-white/16 text-white"
                    : "text-white/78",
                )}
              >
                <span className="truncate">{suggestion.value}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </form>
  );
}
