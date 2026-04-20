/**
 * 卡片头部组件
 * @description 所有卡片的共用头部：左侧类型 Logo（带悬浮提示） + 中间拖拽手柄 + 右侧编辑按钮
 * 横向 flex 布局，Logo 和编辑按钮等高对齐，大小不受卡片内容影响
 */

"use client";

import { PencilLine } from "lucide-react";
import { cn } from "@/lib/utils/utils";
import type { ThemeMode } from "@/lib/base/types";
import { SiteCardPopover } from "./site-card-popover";

/** 网站卡片类型 Logo (Globe) */
function SiteTypeLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

/** 社交卡片类型 Logo (Users) */
function SocialTypeLogo({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function CardHeader({
  cardType,
  cardLabel,
  editable,
  draggable,
  themeMode,
  wallpaperAware,
  dragHandleProps,
  onEdit,
}: {
  /** 卡片大类：site / social */
  cardType: "site" | "social";
  /** 悬浮提示文字，如 "网站卡片" / "社交卡片" */
  cardLabel: string;
  editable: boolean;
  draggable: boolean;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  dragHandleProps?: Record<string, unknown>;
  onEdit?: () => void;
}) {
  const isDark = themeMode === "dark";
  const TypeLogo = cardType === "site" ? SiteTypeLogo : SocialTypeLogo;

  /** 编辑按钮主题样式 */
  const editBtnClass = wallpaperAware
    ? isDark
      ? "border-white/14 bg-white/10 hover:bg-white/16 text-white/80"
      : "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700"
    : isDark
      ? "border-white/12 bg-white/10 hover:bg-white/18 text-white/80"
      : "border-slate-900/8 bg-white/30 hover:bg-white/42 text-slate-700";

  return (
    <div className="-mt-1 flex w-full shrink-0 items-center justify-between">
      {/* 左侧：卡片类型 Logo + 悬浮提示 */}
      <SiteCardPopover
        themeMode={themeMode}
        placement="bottom"
        variant="desc"
        trigger={(hovered) => (
          <div className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-lg transition -ml-0.5",
            isDark
              ? "text-white/50 hover:text-white/80"
              : "text-slate-400 hover:text-slate-600",
            hovered && (isDark ? "text-white/80" : "text-slate-600"),
          )}>
            <TypeLogo size={15} />
          </div>
        )}
      >
        <p className={cn(
          "whitespace-pre-wrap text-sm leading-6",
          isDark ? "text-white/88" : "text-slate-700",
        )}>
          {cardLabel}
        </p>
      </SiteCardPopover>

      {/* 中间：拖拽手柄 */}
      <div
        className={cn("group/drag rounded-full", draggable && "cursor-grab active:cursor-grabbing")}
        style={{ touchAction: "none" }}
        {...(draggable ? dragHandleProps : {})}
      >
        {draggable ? (
          <div className="h-[3px] w-20 rounded-full bg-current opacity-20 transition-all duration-200 group-hover/drag:w-24 group-hover/drag:opacity-40" />
        ) : (
          <div className="h-[3px] w-20" aria-hidden="true" />
        )}
      </div>

      {/* 右侧：编辑按钮（或等宽占位保持拖拽手柄居中） */}
      {editable ? (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit?.(); }}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-lg border transition hover:scale-110 hover:shadow-md -mr-0.5",
            editBtnClass,
          )}
        >
          <PencilLine className="h-3.5 w-3.5 opacity-80" />
        </button>
      ) : (
        <div className="h-7 w-7" aria-hidden="true" />
      )}
    </div>
  );
}
