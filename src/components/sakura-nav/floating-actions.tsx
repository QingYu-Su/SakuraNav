/**
 * 悬浮操作按钮
 * @description 包含回到顶部、悬浮搜索、问题反馈按钮，hover 时显示描述提示
 */

import { ArrowUp, CircleHelp, Search } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";

type FloatingActionsProps = {
  themeMode: ThemeMode;
  showScrollTopButton: boolean;
  onScrollToTop: () => void;
  onOpenFloatingSearch: () => void;
};

/** 悬浮提示标签 — 视觉风格与 SiteCardPopover 保持一致 */
function ActionTooltip({ label, isLight }: { label: string; isLight: boolean }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute right-full mr-3 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium opacity-0 transition-all duration-200 group-hover:opacity-100",
        isLight
          ? "border border-slate-200/50 bg-white/96 text-slate-700 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur-2xl"
          : "border border-white/14 bg-[#0f172aee] text-white shadow-[0_12px_40px_rgba(15,23,42,0.48)] backdrop-blur-xl",
      )}
    >
      {label}
    </span>
  );
}

export function FloatingActions({
  themeMode,
  showScrollTopButton,
  onScrollToTop,
  onOpenFloatingSearch,
}: FloatingActionsProps) {
  const isLight = themeMode === "light";
  return (
    <div className="fixed bottom-6 right-6 z-[45] flex flex-col items-end gap-3">
      {showScrollTopButton ? (
        <div className="group relative">
          <button
            type="button"
            onClick={onScrollToTop}
            className={cn(
              "inline-flex h-14 w-14 items-center justify-center rounded-full border backdrop-blur-xl transition hover:-translate-y-0.5",
              isLight
                ? "border-slate-200/50 bg-white/90 text-slate-600 shadow-[0_18px_48px_rgba(0,0,0,0.08)] hover:bg-white"
                : "border-white/18 bg-[#0f172ae0] text-white shadow-[0_18px_48px_rgba(15,23,42,0.34)] hover:bg-[#0f172af0]",
            )}
            aria-label="回到顶部"
          >
            <ArrowUp className="h-5 w-5" />
          </button>
          <ActionTooltip label="回到顶部" isLight={isLight} />
        </div>
      ) : null}
      <div className="group relative">
        <button
          type="button"
          onClick={onOpenFloatingSearch}
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,255,255,0.18)] bg-[#4f7cff] shadow-[0_18px_52px_rgba(79,124,255,0.38)] transition hover:-translate-y-0.5 hover:bg-[#678cff]"
          style={{ color: "#fff" }}
          aria-label="快速搜索"
        >
          <Search className="h-5 w-5" />
        </button>
        <ActionTooltip label="快速搜索" isLight={isLight} />
      </div>
      <div className="group relative">
        <a
          href="https://github.com/QingYu-Su/SakuraNav/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,255,255,0.18)] bg-[#4f7cff] shadow-[0_18px_52px_rgba(79,124,255,0.38)] transition hover:-translate-y-0.5 hover:bg-[#678cff]"
          style={{ color: "#fff" }}
          aria-label="反馈问题"
        >
          <CircleHelp className="h-5 w-5" />
        </a>
        <ActionTooltip label="反馈问题" isLight={isLight} />
      </div>
    </div>
  );
}
