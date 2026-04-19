/**
 * 标签行内容组件
 * @description 标签行的内部内容展示，包括名称、站点数量等，支持描述悬浮窗
 */

"use client";

import { type Tag, type ThemeMode } from "@/lib/base/types";
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
      {/* 拖拽手柄：顶部细横线 */}
      {draggable ? (
        <div
          className="absolute left-1/2 top-2 -translate-x-1/2 cursor-grab rounded-full active:cursor-grabbing"
          style={{ touchAction: "none" }}
          {...dragHandleProps}
        >
          <div className="h-[3px] w-8 rounded-full bg-current opacity-20" />
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
                "block truncate text-base font-medium",
                hovered && "opacity-100",
              )}>
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
          <span className="truncate text-sm font-medium">{tag.name}</span>
        </button>
      )}
    </>
  );
}
