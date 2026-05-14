/**
 * 悬浮操作按钮
 * @description 根据 buttons 配置顺序渲染，条件按钮消失时由后续按钮自动补位
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, CircleHelp, History, Plus, PlusCircle, Search, Tag } from "lucide-react";
import { cn, isMobileViewport } from "@/lib/utils/utils";
import type { ThemeMode, FloatingButtonItem } from "@/lib/base/types";
import { DEFAULT_FEEDBACK_URL } from "@/lib/base/types";

type FloatingActionsProps = {
  themeMode: ThemeMode;
  showScrollTopButton: boolean;
  buttons: FloatingButtonItem[];
  isAuthenticated: boolean;
  editMode: boolean;
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
    const href = rest.href;
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
          onClick={isMobileViewport() ? (e) => { e.preventDefault(); window.location.href = href; } : undefined}
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

/* ─── 移动端底部栏按钮 ─── */

/** 移动端底部栏按钮的统一交互样式 */
function MobileBarBtn({
  isLight,
  isAccent,
  label,
  children,
  ...rest
}: {
  isLight: boolean;
  isAccent: boolean;
  label: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type"> &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "type">) {
  const iconColor = isAccent
    ? "text-[#4f7cff]"
    : isLight
      ? "text-slate-500"
      : "text-white/60";
  const labelColor = iconColor;

  const inner = (
    <>
      {children}
      <span className={cn("text-[10px] leading-tight", labelColor)}>{label}</span>
    </>
  );

  const className = "flex flex-1 flex-col items-center justify-center gap-0.5 py-2.5 active:opacity-70 transition-opacity";

  if ("href" in rest && rest.href) {
    const href = rest.href;
    return (
      <a
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        aria-label={label}
        onClick={isMobileViewport() ? (e) => { e.preventDefault(); window.location.href = href; } : undefined}
        {...rest}
      >
        {inner}
      </a>
    );
  }

  return (
    <button type="button" className={className} aria-label={label} {...rest}>
      {inner}
    </button>
  );
}

/** 移动端底部栏：按 id 分发按钮渲染 */
function MobileBarButtonType({
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
  const iconClass = "h-5 w-5";

  switch (btn.id) {
    case "scroll-top":
      /* 回到顶部：仅在滚动后可见 */
      if (!scrollTopVisible) return null;
      return (
        <MobileBarBtn isLight={isLight} isAccent={false} label={btn.label} onClick={onScrollToTop}>
          <ArrowUp className={iconClass} />
        </MobileBarBtn>
      );
    case "quick-search":
      return (
        <MobileBarBtn isLight={isLight} isAccent label={btn.label} onClick={onOpenFloatingSearch}>
          <Search className={iconClass} />
        </MobileBarBtn>
      );
    case "snapshot-history":
      return (
        <MobileBarBtn isLight={isLight} isAccent label={btn.label} onClick={onOpenSnapshotHistory}>
          <History className={iconClass} />
        </MobileBarBtn>
      );
    case "feedback":
      return (
        <MobileBarBtn isLight={isLight} isAccent label={btn.label} href={feedbackUrl}>
          <CircleHelp className={iconClass} />
        </MobileBarBtn>
      );
    default:
      return null;
  }
}

/** 移动端快捷新建按钮：点击向上弹出子菜单 */
function MobileQuickCreateButton({
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

  useEffect(() => {
    if (!expanded) return;
    const dismiss = () => setExpanded(false);
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        dismiss();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [expanded]);

  return (
    <div ref={containerRef} className="relative flex flex-1 flex-col items-center justify-center">
      {/* 向上弹出的子菜单 */}
      {expanded && (
        <div
          className={cn(
            "absolute bottom-full right-0 z-10 mb-2 flex flex-col gap-0.5 rounded-2xl border p-1.5 shadow-xl",
            isLight
              ? "border-slate-200/60 bg-white/96 backdrop-blur-2xl"
              : "border-white/14 bg-[#0f172af5] backdrop-blur-xl",
          )}
        >
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isLight ? "text-slate-700 hover:bg-slate-50" : "text-white/90 hover:bg-white/10",
            )}
            onClick={() => { setExpanded(false); onOpenCardTypePicker(); }}
          >
            <PlusCircle className="h-4 w-4 text-[#4f7cff]" />
            新建卡片
          </button>
          <button
            type="button"
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition",
              isLight ? "text-slate-700 hover:bg-slate-50" : "text-white/90 hover:bg-white/10",
            )}
            onClick={() => { setExpanded(false); onOpenTagCreator(); }}
          >
            <Tag className="h-4 w-4 text-[#4f7cff]" />
            新建标签
          </button>
        </div>
      )}
      <button
        type="button"
        className="flex flex-col items-center justify-center gap-0.5 py-2.5 active:opacity-70 transition-opacity"
        aria-label="快捷新建"
        onClick={() => setExpanded((v) => !v)}
      >
        <Plus className={cn("h-5 w-5 text-[#4f7cff] transition-transform duration-300", expanded && "rotate-45")} />
        <span className="text-[10px] leading-tight text-[#4f7cff]">新建</span>
      </button>
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
  editMode,
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

  // 移动端：收集所有可见按钮（scroll-top 条件为滚动后可见）
  const mobileVisibleButtons = filteredButtons.filter((b) => {
    if (b.id === "scroll-top") return showScrollTopButton;
    return true;
  });
  const hasMobileButtons = mobileVisibleButtons.length > 0 || (isAuthenticated && editMode);

  return (
    <>
      {/* ── 移动端：底部固定按钮栏 ── */}
      {hasMobileButtons && (
        <div
          className={cn(
            "fixed bottom-0 left-0 right-0 z-[45] flex h-14 items-center justify-evenly border-t backdrop-blur-xl lg:hidden",
            isLight
              ? "border-slate-200/60 bg-white/80"
              : "border-white/10 bg-[#0f172a]/80",
          )}
          style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
        >
          {mobileVisibleButtons.map((btn) => (
            <MobileBarButtonType
              key={btn.id}
              btn={btn}
              isLight={isLight}
              scrollTopVisible={showScrollTopButton}
              onScrollToTop={onScrollToTop}
              onOpenFloatingSearch={onOpenFloatingSearch}
              onOpenSnapshotHistory={onOpenSnapshotHistory}
            />
          ))}
          {/* 快捷新建按钮：仅编辑模式下可见 */}
          {isAuthenticated && editMode && (
            <MobileQuickCreateButton
              isLight={isLight}
              onOpenTagCreator={onOpenTagCreator}
              onOpenCardTypePicker={onOpenCardTypePicker}
            />
          )}
        </div>
      )}

      {/* ── 桌面端：右下角悬浮按钮列 ── */}
      <div className="fixed bottom-6 right-6 z-[45] hidden flex-col items-end gap-3 lg:flex">
        {/* 回到顶部按钮 */}
        {scrollTopBtn && showScrollTopButton && (
          <FloatingBtnShell variant="default" isLight={isLight} label={scrollTopBtn.label} onClick={onScrollToTop}>
            <ArrowUp className="h-5 w-5" />
          </FloatingBtnShell>
        )}

        {/* 快捷新建按钮：与回到顶部同步显隐，且仅编辑模式下可见 */}
        {showScrollTopButton && isAuthenticated && editMode && (
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
    </>
  );
}
