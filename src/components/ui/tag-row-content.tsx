/**
 * 标签行内容组件
 * @description 标签行的内部内容展示，包括名称、站点数量等，支持描述悬浮窗
 */

"use client";

import { type Tag, type ThemeMode, SOCIAL_TAG_ID } from "@/lib/base/types";
import { cn } from "@/lib/utils/utils";
import { SiteCardPopover } from "./site-card-popover";

export function TagRowContent({
  tag,
  collapsed,
  themeMode,
  wallpaperAware,
  draggable,
  onSelect,
  dragHandleProps,
}: {
  tag: Tag;
  collapsed: boolean;
  themeMode: ThemeMode;
  wallpaperAware: boolean;
  editable: boolean;
  draggable: boolean;
  onSelect?: () => void;
  onEdit?: () => void;
  dragHandleProps?: Record<string, unknown>;
  reserveActionSpace?: boolean;
}) {
  const hasDescription = !!tag.description;
  const isSocialTag = tag.id === SOCIAL_TAG_ID;

  /** 描述文本样式 */
  const descStyle = wallpaperAware
    ? themeMode === "light"
      ? "opacity-85 drop-shadow-[0_1px_3px_rgba(0,0,0,0.25)]"
      : "opacity-90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.35)]"
    : themeMode === "light"
      ? "opacity-85"
      : "opacity-75";

  /** 悬浮窗内容：标签名 + 完整描述 / 站点数量 */
  const popoverContent = (
    <p className={cn(
      "whitespace-pre-wrap text-sm leading-6 select-text cursor-text",
      themeMode === "light" ? "text-slate-700" : "text-white/88",
    )}>
      <strong className={cn(
        "font-semibold",
        themeMode === "light" ? "text-slate-900" : "text-white",
      )}>
        {tag.name}：
      </strong>
      {tag.description || `${tag.siteCount} 个站点`}
    </p>
  );

  return (
    <>
      {/* 拖拽手柄：命名 group/drag 隔离，仅光标在横条区域时才显示悬浮动画 */}
      {draggable ? (
        <div
          className="group/drag absolute left-1/2 top-0 -translate-x-1/2 cursor-grab rounded-full py-1.5 active:cursor-grabbing"
          style={{ touchAction: "none" }}
          {...dragHandleProps}
        >
          <div className="h-[3px] w-8 rounded-full bg-current opacity-20 transition-all duration-200 group-hover/drag:w-10 group-hover/drag:opacity-40" />
        </div>
      ) : null}

      {!collapsed ? (
        /* 展开状态：SiteCardPopover 包裹整个按钮区域，wrapperClassName 让触发区填满卡片 */
        <SiteCardPopover
          themeMode={themeMode}
          placement="right"
          variant="desc"
          wrapperClassName="flex-1 w-full h-full"
          trigger={(hovered) => (
            <button
              type="button"
              onClick={onSelect}
              className="flex min-w-0 w-full flex-col items-center text-center transition"
            >
              <span className={cn(
                "flex items-center justify-center gap-1.5 truncate text-base font-medium",
                hovered && "opacity-100",
              )}>
                {isSocialTag ? (
                  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                ) : null}
                {tag.name}
              </span>
              {hasDescription ? (
                <span className={cn("block truncate text-sm", descStyle, hovered && "opacity-100")}>
                  {tag.description}
                </span>
              ) : (
                <span className="block text-sm opacity-65">
                  {tag.siteCount} 个站点
                </span>
              )}
            </button>
          )}
        >
          {popoverContent}
        </SiteCardPopover>
      ) : (
        /* 折叠状态：仅展示标签名，无悬浮窗 */
        <button
          type="button"
          onClick={onSelect}
          className="flex min-w-0 flex-1 items-center justify-center text-center transition"
        >
          <span className="flex items-center justify-center gap-1 truncate text-sm font-medium">
            {isSocialTag ? (
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            ) : null}
            {tag.name}
          </span>
        </button>
      )}
    </>
  );
}
