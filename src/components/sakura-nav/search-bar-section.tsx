/**
 * 搜索栏组件
 * @description 包含搜索引擎选择器、搜索建议、站内搜索按钮、搜索输入框
 * 编辑模式下左侧自动出现搜索引擎编辑按钮
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
import { Tooltip } from "@/components/ui/tooltip";
import type { ThemeMode } from "@/lib/base/types";
import type { RefObject } from "react";
import {
  getSiteSearchButtonClass,
  getSearchSubmitButtonClass,
  getSearchClearButtonClass,
  getSearchDropdownClass,
  getSearchDropdownActiveClass,
  getSearchDropdownInactiveClass,
  getSearchDropdownDismissClass,
  getSearchDropdownDividerClass,
  getSearchDropdownLoadingClass,
  getSearchBarChromeClass,
  getSearchInputAreaClass,
  getFrostedGlassStyle,
} from "./style-helpers";

type SearchBarSectionProps = {
  themeMode: ThemeMode;
  hasActiveWallpaper: boolean;
  desktopCardFrosted: number;
  mobileCardFrosted: number;
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
  setActiveSuggestionIndex: (index: number | ((prev: number) => number)) => void;
  setHoveredSuggestionIndex: (index: number) => void;
  setSuggestionInteractionMode: (mode: "keyboard" | "pointer") => void;
  /** 点击搜索引擎编辑按钮 */
  onOpenEngineEditor?: () => void;
};

export function SearchBarSection({
  themeMode,
  hasActiveWallpaper,
  desktopCardFrosted,
  mobileCardFrosted,
  isAuthenticated: _isAuthenticated,
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
  setActiveSuggestionIndex,
  setHoveredSuggestionIndex,
  setSuggestionInteractionMode,
  onOpenEngineEditor,
}: SearchBarSectionProps) {
  const frostedStyle = getFrostedGlassStyle(themeMode, desktopCardFrosted, mobileCardFrosted);

  return (
    <form
      ref={searchFormRef}
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      className={cn(getSearchBarChromeClass(themeMode, desktopCardFrosted, mobileCardFrosted))}
      style={frostedStyle}
    >
      {/* 搜索引擎区域：编辑按钮 + 搜索引擎按钮 */}
      <div className="flex items-center max-lg:justify-center gap-2">
        {/* 编辑模式：搜索引擎编辑按钮 */}
        {editMode && onOpenEngineEditor ? (
          <Tooltip tip="编辑搜索引擎配置" themeMode={themeMode}>
            <button
              type="button"
              onClick={onOpenEngineEditor}
              className={cn(
                "shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl border transition hover:opacity-70",
                themeMode === "light"
                  ? "border-slate-300/60 bg-white/70 text-slate-600 shadow-sm backdrop-blur-sm"
                  : "border-white/20 bg-white/14 text-white shadow-sm backdrop-blur-sm",
              )}
            >
              <Settings2 className="h-4 w-4" />
            </button>
          </Tooltip>
        ) : null}
        <div className="relative">
          <button
          type="button"
          onClick={onCycleEngine}
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
          <div className={cn("absolute left-0 top-[calc(100%+10px)] z-50 w-full overflow-hidden rounded-3xl border p-2 text-left shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl", getSearchDropdownClass(themeMode))}>
            {engineList.map((engine) => (
              <button
                key={engine.id}
                type="button"
                onClick={() => onSelectEngine(engine.id)}
                className={cn(
                  "flex w-full items-center rounded-2xl px-3 py-3 text-sm transition",
                  engineMeta?.name === engine.name
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
      </div>
      <div className={getSearchInputAreaClass(themeMode, desktopCardFrosted, mobileCardFrosted)} style={frostedStyle}>
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

        {/* 桌面端：站内搜索 + 搜索提交按钮内嵌在输入框中 */}
        <div className="hidden sm:flex items-center gap-0">
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
            className={cn(getSearchSubmitButtonClass(themeMode, hasActiveWallpaper))}
          >
            <Search className="h-4 w-4" />
          </button>
        </div>

        {searchSuggestionsOpen ? (
          <div className={cn("absolute left-0 top-[calc(100%+10px)] z-50 w-full overflow-hidden rounded-3xl border p-2 text-left shadow-[0_22px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl", getSearchDropdownClass(themeMode))}>
            <button
              type="button"
              onClick={onDismissSuggestions}
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
                    ? getSearchDropdownActiveClass(themeMode)
                    : getSearchDropdownInactiveClass(themeMode),
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
          onClick={onActivateLocalSearch}
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
  );
}
