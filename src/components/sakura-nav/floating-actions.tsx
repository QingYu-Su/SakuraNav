/**
 * 悬浮操作按钮
 * @description 根据 buttons 配置顺序渲染，条件按钮消失时由后续按钮自动补位
 */

import { ArrowUp, CircleHelp, Search } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode, FloatingButtonItem } from "@/lib/base/types";
import { DEFAULT_FEEDBACK_URL } from "@/lib/base/types";

type FloatingActionsProps = {
  themeMode: ThemeMode;
  showScrollTopButton: boolean;
  buttons: FloatingButtonItem[];
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
}: {
  btn: FloatingButtonItem;
  isLight: boolean;
  scrollTopVisible: boolean;
  onScrollToTop: () => void;
  onOpenFloatingSearch: () => void;
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

export function FloatingActions({
  themeMode,
  showScrollTopButton,
  buttons,
  onScrollToTop,
  onOpenFloatingSearch,
}: FloatingActionsProps) {
  const isLight = themeMode === "light";

  return (
    <div className="fixed bottom-6 right-6 z-[45] flex flex-col items-end gap-3">
      {buttons
        .filter((b) => b.enabled)
        .map((btn) => (
          <FloatingButtonByType
            key={btn.id}
            btn={btn}
            isLight={isLight}
            scrollTopVisible={showScrollTopButton}
            onScrollToTop={onScrollToTop}
            onOpenFloatingSearch={onOpenFloatingSearch}
          />
        ))}
    </div>
  );
}
