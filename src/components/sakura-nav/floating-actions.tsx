/**
 * 悬浮操作按钮
 * @description 根据 buttons 配置顺序渲染，条件按钮消失时由后续按钮自动补位
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, CircleHelp, History, Plus, PlusCircle, Search, Tag } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode, FloatingButtonItem } from "@/lib/base/types";
import { DEFAULT_FEEDBACK_URL } from "@/lib/base/types";

type FloatingActionsProps = {
  themeMode: ThemeMode;
  showScrollTopButton: boolean;
  buttons: FloatingButtonItem[];
  isAuthenticated: boolean;
  onScrollToTop: () => void;
  onOpenFloatingSearch: () => void;
  onOpenSnapshotHistory: () => void;
  onOpenTagCreator: () => void;
  onOpenCardTypePicker: () => void;
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

/** 按钮视觉类型：强调（蓝色）/ 普通（透明） */
function FloatingBtnShell({
  variant,
  isLight,
  label,
  children,
  ...rest
}: {
  variant: "accent" | "default";
  isLight: boolean;
  label: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "type">) {
  if ("href" in rest && rest.href) {
    return (
      <div className="group relative">
        <a
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "inline-flex h-14 w-14 items-center justify-center rounded-full border transition hover:-translate-y-0.5",
            variant === "accent"
              ? "border-[rgba(255,255,255,0.18)] bg-[#4f7cff] shadow-[0_18px_52px_rgba(79,124,255,0.38)] hover:bg-[#678cff]"
              : isLight
                ? "border-slate-200/50 bg-white/90 text-slate-600 shadow-[0_18px_48px_rgba(0,0,0,0.08)] hover:bg-white backdrop-blur-xl"
                : "border-white/18 bg-[#0f172ae0] text-white shadow-[0_18px_48px_rgba(15,23,42,0.34)] hover:bg-[#0f172af0]",
          )}
          style={variant === "accent" ? { color: "#fff" } : undefined}
          aria-label={label}
          {...rest}
        >
          {children}
        </a>
        <ActionTooltip label={label} isLight={isLight} />
      </div>
    );
  }

  return (
    <div className="group relative">
      <button
        type="button"
        className={cn(
          "inline-flex h-14 w-14 items-center justify-center rounded-full border transition hover:-translate-y-0.5",
          variant === "accent"
            ? "border-[rgba(255,255,255,0.18)] bg-[#4f7cff] shadow-[0_18px_52px_rgba(79,124,255,0.38)] hover:bg-[#678cff]"
            : isLight
              ? "border-slate-200/50 bg-white/90 text-slate-600 shadow-[0_18px_48px_rgba(0,0,0,0.08)] hover:bg-white backdrop-blur-xl"
              : "border-white/18 bg-[#0f172ae0] text-white shadow-[0_18px_48px_rgba(15,23,42,0.34)] hover:bg-[#0f172af0]",
        )}
        style={variant === "accent" ? { color: "#fff" } : undefined}
        aria-label={label}
        {...rest}
      >
        {children}
      </button>
      <ActionTooltip label={label} isLight={isLight} />
    </div>
  );
}

/** 按钮渲染器：根据 id 分发到对应组件 */
function FloatingButtonByType({
  btn,
  isLight,
  scrollTopVisible,
  onScrollToTop,
  onOpenFloatingSearch,
  onOpenSnapshotHistory,
}: {
  btn: FloatingButtonItem;
  isLight: boolean;
  scrollTopVisible: boolean;
  onScrollToTop: () => void;
  onOpenFloatingSearch: () => void;
  onOpenSnapshotHistory: () => void;
}) {
  const feedbackUrl = btn.customData?.url || DEFAULT_FEEDBACK_URL;

  switch (btn.id) {
    case "scroll-top":
      /* 回到顶部是条件按钮：仅在 scrollTopVisible 时渲染 */
      if (!scrollTopVisible) return null;
      return (
        <FloatingBtnShell variant="default" isLight={isLight} label={btn.label} onClick={onScrollToTop}>
          <ArrowUp className="h-5 w-5" />
        </FloatingBtnShell>
      );
    case "quick-search":
      return (
        <FloatingBtnShell variant="accent" isLight={isLight} label={btn.label} onClick={onOpenFloatingSearch}>
          <Search className="h-5 w-5" />
        </FloatingBtnShell>
      );
    case "snapshot-history":
      return (
        <FloatingBtnShell variant="accent" isLight={isLight} label={btn.label} onClick={onOpenSnapshotHistory}>
          <History className="h-5 w-5" />
        </FloatingBtnShell>
      );
    case "feedback":
      return (
        <FloatingBtnShell variant="accent" isLight={isLight} label={btn.label} href={feedbackUrl}>
          <CircleHelp className="h-5 w-5" />
        </FloatingBtnShell>
      );
    default:
      return null;
  }
}

/** 快捷新建按钮：点击展开向左的气泡菜单，含"新建标签"和"新建卡片" */
function QuickCreateButton({
  isLight,
  onOpenTagCreator,
  onOpenCardTypePicker,
}: {
  isLight: boolean;
  onOpenTagCreator: () => void;
  onOpenCardTypePicker: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击外部区域收起
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expanded]);

  const accentBtn =
    "inline-flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(255,255,255,0.18)] bg-[#4f7cff] shadow-[0_18px_52px_rgba(79,124,255,0.38)] transition hover:-translate-y-0.5 hover:bg-[#678cff]";

  return (
    <div ref={containerRef} className="flex items-center gap-3">
      {/* ── 展开的子按钮（向左） ── */}
      <div className="flex items-center gap-2">
        {/* 新建卡片 */}
        <div className="group relative">
          <button
            type="button"
            className={cn(
              accentBtn,
              "transition-all duration-300",
              expanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none",
            )}
            style={{ color: "#fff" }}
            aria-label="新建卡片"
            onClick={() => {
              setExpanded(false);
              onOpenCardTypePicker();
            }}
          >
            <PlusCircle className="h-5 w-5" />
          </button>
          <ActionTooltip label="新建卡片" isLight={isLight} />
        </div>

        {/* 新建标签 */}
        <div className="group relative">
          <button
            type="button"
            className={cn(
              accentBtn,
              "transition-all duration-300",
              expanded ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4 pointer-events-none",
            )}
            style={{ color: "#fff" }}
            aria-label="新建标签"
            onClick={() => {
              setExpanded(false);
              onOpenTagCreator();
            }}
          >
            <Tag className="h-5 w-5" />
          </button>
          <ActionTooltip label="新建标签" isLight={isLight} />
        </div>
      </div>

      {/* ── "+" 主按钮 ── */}
      <FloatingBtnShell variant="accent" isLight={isLight} label="快捷新建" onClick={() => setExpanded((v) => !v)}>
        <Plus
          className={cn(
            "h-5 w-5 transition-transform duration-300",
            expanded && "rotate-45",
          )}
        />
      </FloatingBtnShell>
    </div>
  );
}

export function FloatingActions({
  themeMode,
  showScrollTopButton,
  buttons,
  isAuthenticated,
  onScrollToTop,
  onOpenFloatingSearch,
  onOpenSnapshotHistory,
  onOpenTagCreator,
  onOpenCardTypePicker,
}: FloatingActionsProps) {
  const isLight = themeMode === "light";

  // 快照历史按钮仅在登录时可见
  const filteredButtons = buttons.filter((b) => {
    if (!b.enabled) return false;
    if (b.id === "undo") return false;
    if (b.id === "snapshot-history" && !isAuthenticated) return false;
    return true;
  });

  const scrollTopBtn = filteredButtons.find((b) => b.id === "scroll-top");
  const otherButtons = filteredButtons.filter((b) => b.id !== "scroll-top");

  return (
    <div className="fixed bottom-6 right-6 z-[45] flex flex-col items-end gap-3">
      {/* 回到顶部按钮 */}
      {scrollTopBtn && showScrollTopButton && (
        <FloatingBtnShell variant="default" isLight={isLight} label={scrollTopBtn.label} onClick={onScrollToTop}>
          <ArrowUp className="h-5 w-5" />
        </FloatingBtnShell>
      )}

      {/* 快捷新建按钮：与回到顶部同步显隐，且仅登录后可见 */}
      {showScrollTopButton && isAuthenticated && (
        <QuickCreateButton
          isLight={isLight}
          onOpenTagCreator={onOpenTagCreator}
          onOpenCardTypePicker={onOpenCardTypePicker}
        />
      )}

      {/* 其余常驻按钮 */}
      {otherButtons.map((btn) => (
        <FloatingButtonByType
          key={btn.id}
          btn={btn}
          isLight={isLight}
          scrollTopVisible={showScrollTopButton}
          onScrollToTop={onScrollToTop}
          onOpenFloatingSearch={onOpenFloatingSearch}
          onOpenSnapshotHistory={onOpenSnapshotHistory}
        />
      ))}
    </div>
  );
}
